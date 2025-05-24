import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type';
import sanitizeFilename from 'sanitize-filename';
import clamd from 'clamdjs';
import db from './db.js'

// Initialize ClamAV scanner
const scanner = clamd.createScanner('127.0.0.1', 3310);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const resend = new Resend(process.env.RESEND_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');

const fileTypes = ['file'];

// Check for required environment variables
if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.EMAIL_TO) {
  console.error('Missing required environment variables.');
  process.exit(1); // Exit the application
}
app.set('trust proxy', 1);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Enable CORS for local frontend
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
  

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    // Normalize Unicode and remove non-ASCII characters
    const normalized = file.originalname.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
    const sanitizedFilename = sanitizeFilename(normalized);
    const filePath = `${Date.now()}-${sanitizedFilename}`;
    cb(null, filePath);

    // Set file permissions to read/write only for the owner (600)
    fs.chmod(path.join('uploads', filePath), 0o600, (err) => {
      if (err) console.error(`Error setting file permissions for ${filePath}:`, err);
    });
  },
});

const allowedImageTypes = ['image/jpeg', 'image/png'];
const allowedVideoTypes = ['video/mp4'];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
});

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/submit', limiter);

async function scanFileForViruses(filePath) {
  try {
    const result = await scanner.scanFile(filePath, 3000, 1024 * 1024); // Timeout: 3000ms, Max size: 1MB
    if (result.includes('FOUND')) {
      const virus = result.split('FOUND')[0].trim();
      throw new Error(`File is infected with ${virus}`);
    }
    console.log('File is clean:', result);
  } catch (error) {
    console.error('Error scanning file:', error.message);
    throw error;
  }
}

// POST endpoint to handle form submission
app.post(
  '/submit',
  (req, res, next) => {
    upload.any()(req, res, async (err) => {
      if (err instanceof multer.MulterError || err) {
        return res.status(400).json({ errors: [{ msg: err.message }] });
      }
      console.log('req.files:', req.files);
console.log('req.body:', req.body);
      try {
        // Scan each uploaded file for viruses
        //for (const file of req.files || []) {
         // await scanFileForViruses(file.path);
        //}
        next();
      } catch (error) {
        return res.status(400).json({ errors: [{ msg: error.message }] });
      }
    });
  },
  [
    body('userRole').trim().notEmpty(),
    body('issueType').trim().notEmpty(),
    body('description')
      .trim()
      .isLength({ min: 50 })
      .withMessage('Issue description must be at least 50 characters.'),
    body('fullName').trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('contactEmail').isEmail().normalizeEmail(),
    body('formName').optional({ checkFalsy: true }).trim().escape(),
    body('formURL').optional({ checkFalsy: true }).isURL().trim(),
    body('school').optional({ checkFalsy: true }).trim().escape(),
    body('studentFullName').optional({ checkFalsy: true }).trim().escape(),
    body('studentNRIC').optional({ checkFalsy: true }).trim().escape(),
    body('studentMIMS').optional({ checkFalsy: true }).trim().escape(),
    body('studentRelated').toBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Collect file metadata for DB
    let fileMetadata = [];
    for (const file of req.files || []) {
      fileMetadata.push({
        field: file.fieldname,
        filename: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      });
    }
    const attachmentsJson = JSON.stringify(fileMetadata);

    try {
      const data = req.body;
      const clickedFAQ = data.clickedFAQ === 'yes' ? 'Yes' : 'No';
      const relevantGuide = data.relevantGuide || '{}';

      // --- DB INSERTION ---
      const insertQuery = `
        INSERT INTO submissions (
          user_role, issue_type, description, form_name, form_url,
          full_name, email, contact_email, school, clicked_faq, relevant_guide, attachments,student_related, student_full_name, student_nric, student_mims
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,$13, $14, $15, $16)
        RETURNING id
      `;
      const values = [
        data.userRole,
        data.issueType,
        data.description,
        data.formName,
        data.formURL,
        data.fullName,
        data.email,
        data.contactEmail,
        data.school,
        clickedFAQ,
        relevantGuide,
        attachmentsJson,
        data.studentRelated,
        data.studentFullName,
        data.studentNRIC,
        data.studentMIMS
      ];
      const result = await db.query(insertQuery, values);
      const newId = result.rows[0].id;

      // Prepare guide info for email
      let guideInfo = '';
      if (data.relevantGuide) {
        try {
          const guide = JSON.parse(data.relevantGuide);
          if (guide.url) {
            guideInfo = `<p><strong>Relevant Link:</strong> <a href="${guide.url}">${guide.title}</a></p>`;
          } else if (guide.title) {
            guideInfo = `<p><strong>Relevant Info:</strong> ${guide.title}</p>`;
          }
        } catch (e) {
          console.error('Failed to parse relevantGuide:', e);
        }
      }

      // Prepare attachments for Resend
      let attachments = [];
      for (const file of req.files || []) {
        const content = await fs.promises.readFile(file.path, 'base64');
        attachments.push({
          filename: file.originalname,
          content,
          type: file.mimetype,
          disposition: 'attachment',
        });
      }
      console.log('Email attachments:', attachments);

      const htmlBody = `
        <h3>New Helpdesk Ticket</h3>
        <p><strong>Role:</strong> ${data.userRole}</p>
        <p><strong>School:</strong> ${data.school}</p>
        <p><strong>Issue:</strong> ${data.issueType}</p>
        ${guideInfo}
        <p><strong>Clicked FAQ before submitting:</strong> ${clickedFAQ}</p>
        <p><strong>Description:</strong><br>${data.description}</p>
        <p><strong>Contact:</strong> ${data.fullName}, ${data.contactEmail} (MIMS: ${data.email})</p>
        ${data.studentRelated ? `
          <hr>
          <p><strong>Student Full Name:</strong> ${escapeHtml(data.studentFullName || '')}</p>
          <p><strong>Student NRIC:</strong> ${escapeHtml(data.studentNRIC || '')}</p>
          <p><strong>Student MIMS ID:</strong> ${escapeHtml(data.studentMIMS || '')}</p>
        ` : ''}
      `;

      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM,
          to: process.env.EMAIL_TO,
          subject: `Helpdesk Ticket: ${data.fullName} | ${data.userRole} | ${data.issueType}`,
          html: htmlBody,
          attachments,
        });
        console.log('Email sent successfully');
      } catch (error) {
        console.error('Error sending email:', error);
      }

      res.json({ success: true, id: newId });
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).send(`
        <html>
          <head>
            <title>Submission Error</title>
            <link rel="icon" type="image/png" href="/Favicon/warning.png">
            <style>
              body { font-family: sans-serif; text-align: center; margin-top: 5em; }
              .error { color: red; font-size: 1.5em; }
            </style>
          </head>
          <body>
            <div class="error">⚠️ Oops! Something went wrong while submitting your request.<br>
            Please try again or email us directly at <a href="mailto:allears@estl.edu.sg">allears@estl.edu.sg</a></div>
            <br>
            <a href="/">Back to Helpdesk Form</a>
          </body>
        </html>
      `);
    } finally {
      // Clean up uploaded files after processing the request
      for (const file of req.files || []) {
        fs.unlink(file.path, (err) => {
          if (err) console.error(`Error deleting file ${file.path}:`, err);
        });
      }
    }
  }
);
    
    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Success page route
    app.get('/success/:id', async (req, res) => {
      const { id } = req.params;
      const query = 'SELECT * FROM submissions WHERE id = $1';
      try {
        const result = await db.query(query, [id]);
        const submission = result.rows[0];
    
        if (!submission) {
          return res.status(404).send('Submission not found');
        }
    
        let guideInfo = '';
        try {
          const guide = JSON.parse(submission.relevant_guide);
          if (guide?.url && guide?.title) {
            guideInfo = `<p><strong>Relevant Link:</strong> <a href="${escapeHtml(guide.url)}">${escapeHtml(guide.title)}</a></p>`;
          } else if (guide?.title) {
            guideInfo = `<p><strong>Relevant Info:</strong> ${escapeHtml(guide.title)}</p>`;
          }
        } catch {}
    
        res.send(`
          <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>Submission Successful</title>
                <link rel="icon" type="image/png" href="/Favicon/Party-popper.png">
                <link rel="stylesheet" href="/style.css">
              </head>
              <body>
                <h1>🎉 Thank you ${escapeHtml(submission.full_name)}</h1>
                 <div class="email-summary">
                      <h3>Email sent to helpdesk:</h3>
                      <p><strong>Role:</strong> ${escapeHtml(submission.user_role)}</p>
                      <p><strong>Issue Type:</strong> ${escapeHtml(submission.issue_type)}</p>
                      <p><strong>Description:</strong><br>${escapeHtml(submission.description)}</p>
                      ${guideInfo}
                      <p><strong>Attached file:</strong> ${
                        JSON.parse(submission.attachments || '[]')
                          .map(file => escapeHtml(file.filename))
                          .join(', ')
                      }
                      ${submission.student_related ? `
                        <hr>
                        <p><strong>Student Full Name:</strong> ${escapeHtml(submission.student_full_name || '')}</p>
                        <p><strong>Student NRIC:</strong> ${escapeHtml(submission.student_nric || '')}</p>
                        <p><strong>Student MIMS ID:</strong> ${escapeHtml(submission.student_mims || '')}</p>
                      ` : ''}
                      <p><strong>Email Contact:</strong> ${escapeHtml(submission.contact_email)} (MIMS: ${escapeHtml(submission.email)})</p>
                </div>
                  <div style="text-align:center; font-size:0.98em;">
                    🕒 You can expect a response within 1–2 working days.
                  </div>
                <div class="actions">
                  <a href="/" class="link-card">⬅ Back to Helpdesk</a>
                </div>
              </body>
            </html>
        `);
      } catch (e) {
        res.status(500).send('Error retrieving submission');
      }
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });