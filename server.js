const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { Resend } = require('resend');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const resend = new Resend(process.env.RESEND_API_KEY);

app.set('trust proxy', 1);

// Enable CORS for local frontend
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve the index.html file at the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
  fileFilter: (req, file, cb) => {
    if (
      (file.fieldname === 'screenshot' && !file.mimetype.startsWith('image/')) ||
      (file.fieldname === 'video' && !file.mimetype.startsWith('video/'))
    ) {
      return cb(new Error('Invalid file type!'));
    }
    cb(null, true);
  }
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
  upload.fields([{ name: 'screenshot' }, { name: 'video' }]),
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
      // If AJAX, return JSON
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(400).json({ errors: errors.array() });
      }
      // Otherwise, return HTML as before
      const errorList = errors.array().map(err => `<li>${err.msg} (${err.param})</li>`).join('');
      return res.status(400).send(`
        <html>
          <head>
            <title>Invalid Input</title>
            <style>
              body { font-family: sans-serif; text-align: center; margin-top: 5em; }
              .error { color: red; font-size: 1.2em; }
              ul { display: inline-block; text-align: left; }
            </style>
          </head>
          <body>
            <div class="error">
              ⚠️ Invalid input. Please check your entries and try again.
              <ul>${errorList}</ul>
            </div>
            <a href="/">Back to Helpdesk Form</a>
          </body>
        </html>
      `);
    }

    try {
      const data = req.body;
      const files = req.files;

      // Prepare attachments for Resend (if needed)
      // Resend supports attachments as base64-encoded strings
      let attachments = [];
      if (files.screenshot) {
        for (const file of files.screenshot) {
          attachments.push({
            filename: file.originalname,
            content: require('fs').readFileSync(file.path).toString('base64'),
            type: file.mimetype,
            disposition: 'attachment'
          });
        }
      }
      if (files.video) {
        for (const file of files.video) {
          attachments.push({
            filename: file.originalname,
            content: require('fs').readFileSync(file.path).toString('base64'),
            type: file.mimetype,
            disposition: 'attachment'
          });
        }
      }

      const htmlBody = `
        <h3>New Helpdesk Ticket</h3>
        <p><strong>Role:</strong> ${data.userRole}</p>
        <p><strong>School:</strong> ${data.school}</p>
        <p><strong>Issue:</strong> ${data.issueType}</p>
        <p><strong>Description:</strong><br>${data.description}</p>
        <p><strong>Form:</strong> ${data.formName} (<a href="${data.formURL}">${data.formURL}</a>)</p>
        <p><strong>Contact:</strong> ${data.fullName}, ${data.contactEmail} (MIMS: ${data.email})</p>
      `;
      console.log("=== EMAIL PREVIEW ===");
      console.log(htmlBody);
      console.log("=====================");

      await resend.emails.send({
        from: process.env.EMAIL_FROM, // e.g. "AllEars Helpdesk <support@yourdomain.com>"
        to: process.env.EMAIL_TO,
        subject: `Helpdesk Ticket: ${data.userRole} | ${data.issueType}`,
        html: htmlBody,
        attachments
      });

      // Respond with a success HTML page
      res.send(`
        <html>
          <head>
            <title>Submission Successful</title>
            <style>
              body { font-family: sans-serif; text-align: center; margin-top: 5em; }
              .success { color: green; font-size: 1.5em; }
            </style>
          </head>
          <body>
            <div class="success">🎉 Your request has been submitted successfully!<br>
            Check your inbox for confirmation — our team will follow up shortly.</div>
            <br>
            <a href="/">Back to Helpdesk Form</a>
          </body>
        </html>
      `);
    } catch (error) {
      console.error(error);
      // Respond with an error HTML page
      res.status(500).send(`
        <html>
          <head>
            <title>Submission Error</title>
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
    }
  }
);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));