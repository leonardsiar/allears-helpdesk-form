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
import clamdjs from 'clamdjs';
const { NodeClam } = clamdjs;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const resend = new Resend(process.env.RESEND_API_KEY);
const clam = await NodeClam.create();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');

app.set('trust proxy', 1);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// test /submit page HTML
app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'testsuccess.html'));
});

// Enable CORS for local frontend
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html file at the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'success.html'));
});

// Configure multer for file uploads
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const sanitizedFilename = sanitizeFilename(file.originalname);
    const filePath = `${Date.now()}-${sanitizedFilename}`;
    cb(null, filePath);

    // Set file permissions to read/write only for the owner (600)
    fs.chmod(path.join('uploads', filePath), 0o600, (err) => {
      if (err) console.error(`Error setting file permissions for ${filePath}:`, err);
    });
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
  fileFilter: async (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png'];
    const allowedVideoTypes = ['video/mp4'];

    try {
      // Validate file content
      const fileBuffer = file.buffer || fs.readFileSync(file.path);
      const fileType = await fileTypeFromBuffer(fileBuffer);

      if (
        (file.fieldname === 'screenshot' && !allowedImageTypes.includes(fileType?.mime)) ||
        (file.fieldname === 'video' && !allowedVideoTypes.includes(fileType?.mime))
      ) {
        return cb(new Error('Invalid file type!'));
      }

      cb(null, true);
    } catch (err) {
      cb(err);
    }
  },
});

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/submit', limiter);

// POST endpoint to handle form submission
app.post(
  '/submit',
  (req, res, next) => {
    upload.fields([{ name: 'screenshot' }, { name: 'video' }])(req, res, (err) => {
      if (err instanceof multer.MulterError || err) {
        return res.status(400).json({ errors: [{ msg: err.message }] });
      }
      next();
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
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return errors as JSON
      console.log(errors.array()); // Debug the errors
      return res.status(400).json({ errors: errors.array() });
    }
      

    try {
      const data = req.body;
      const clickedFAQ = data.clickedFAQ === "yes" ? "Yes" : "No";
      const relevantGuide = data.relevantGuide || "{}"; // Default to an empty JSON string
      
      const files = req.files || {};
      let guideInfo = "";
      if (data.relevantGuide) {
        try {
          const guide = JSON.parse(data.relevantGuide);
          if (guide.url) {
            guideInfo = `<p><strong>Relevant Link:</strong> <a href="${guide.url}">${guide.title}</a></p>`;
          } else if (guide.title) {
            guideInfo = `<p><strong>Relevant Info:</strong> ${guide.title}</p>`;
          }
        } catch (e) {
          console.error("Failed to parse relevantGuide:", e); // Log the error for debugging
        }
      }

      // Prepare attachments for Resend (if needed)
      // Resend supports attachments as base64-encoded strings
      let attachments = [];
      const fileTypes = ['screenshot', 'video'];
      for (const type of fileTypes) {
        if (files[type]) {
          for (const file of files[type]) {
            const content = await fs.promises.readFile(file.path, 'base64'); // Now this works
            attachments.push({
              filename: file.originalname,
              content,
              type: file.mimetype,
              disposition: 'attachment',
            });
          }
        }
      }

      const htmlBody = `
        <h3>New Helpdesk Ticket</h3>
        <p><strong>Role:</strong> ${data.userRole}</p>
        <p><strong>School:</strong> ${data.school}</p>
        <p><strong>Issue:</strong> ${data.issueType}</p>
        ${guideInfo}
        <p><strong>Clicked FAQ before submitting:</strong> ${clickedFAQ}</p>
        <p><strong>Description:</strong><br>${data.description}</p>
        <p><strong>Contact:</strong> ${data.fullName}, ${data.contactEmail} (MIMS: ${data.email})</p>
      `;

      await resend.emails.send({
        from: process.env.EMAIL_FROM, // e.g. "AllEars Helpdesk <support@yourdomain.com>"
        to: process.env.EMAIL_TO,
        subject: `Helpdesk Ticket: ${data.fullName} | ${data.userRole} | ${data.issueType}`,
        html: htmlBody,
        attachments
      });

      // After sending the email, render the success page with the email preview
      const emailPreview = htmlBody; // This is your email HTML content
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Submission Successful</title>
          <link rel="icon" type="image/png" href="Favicon/Party popper.png">
          <link rel="stylesheet" href="style.css">
        </head>
        <body>
          <h1>All Ears Helpdesk</h1>
          <div class="success" style="max-width:520px;margin:32px auto 24px auto;">
        🎉 <strong>Thanks! Your request has been successfully submitted.</strong><br>
        We’ve received your details and our team will follow up shortly.<br>
        <span style="font-size:0.98em;">🕒 You can expect a response within 1–2 working days.</span>
          </div>
          <div class="email-summary">
        <h3 class="email-header">Email sent to helpdesk:</h3>
        ${emailPreview}
          </div>
          <div class="actions" style="max-width:480px; margin: 32px auto 64px auto; text-align: center;">
        <button type="button" id="submitRequest" onclick="window.location='/'">🏠 Back to Helpdesk Home</button>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).send(`
        <html>
          <head>
            <title>Submission Error</title>
            <link rel="icon" type="image/png" href="Favicon/warning.png">
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
      const fileTypes = ['screenshot', 'video'];
      fileTypes.forEach((type) => {
        if (files[type]) {
          for (const file of files[type]) {
            fs.unlink(file.path, (err) => {
              if (err) console.error(`Error deleting file ${file.path}:`, err);
            });
          }
        }
      });
    }
  }
);

// Check for required environment variables
if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.EMAIL_TO) {
  console.error("Missing required environment variables.");
  process.exit(1); // Exit the application
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));