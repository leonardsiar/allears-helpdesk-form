const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for local frontend
app.use(cors());
app.use(express.json());

// Serve the index.html file at the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Serve all static files from the project root
app.use(express.static(path.join(__dirname, '../')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Email handler
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS
  }
});

// POST endpoint to handle form submission
app.post('/submit', upload.fields([{ name: 'screenshot' }, { name: 'video' }]), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files;

    let attachments = [];
    if (files.screenshot) attachments.push({ path: files.screenshot[0].path });
    if (files.video) attachments.push({ path: files.video[0].path });

    const htmlBody = `
      <h3>New Helpdesk Ticket</h3>
      <p><strong>Role:</strong> ${data.userRole}</p>
      <p><strong>School:</strong> ${data.school}</p>
      <p><strong>Issue:</strong> ${data.issueType}</p>
      <p><strong>Description:</strong><br>${data.description}</p>
      <p><strong>Form:</strong> ${data.formName} (<a href="${data.formURL}">${data.formURL}</a>)</p>
      <p><strong>Contact:</strong> ${data.fullName}, ${data.contactEmail} (MIMS: ${data.email})</p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
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
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));