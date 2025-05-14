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

    res.status(200).json({ message: 'Submission received and email sent!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));