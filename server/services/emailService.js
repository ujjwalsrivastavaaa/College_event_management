const nodemailer = require('nodemailer');

let transporter;

const getTransporter = async () => {
  if (transporter) return transporter;

  const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  if (hasCredentials) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: parseInt(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log('Nodemailer SMTP Transporter configured.');
  } else {
    // Generate test SMTP service account from ethereal.email
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`Nodemailer Ethereal Mock SMTP Transporter initialized (User: ${testAccount.user}).`);
    } catch (err) {
      console.error('Failed to create Nodemailer Ethereal account, using console logging fallback:', err.message);
      transporter = {
        sendMail: async (mailOptions) => {
          console.log('\n--- EMAIL FALLBACK LOG ---');
          console.log(`To: ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log(`Body: ${mailOptions.html}`);
          console.log('--------------------------\n');
          return { messageId: 'console-log-id' };
        },
      };
    }
  }
  return transporter;
};

// Send an email
const sendEmail = async ({ to, subject, html }) => {
  try {
    const activeTransporter = await getTransporter();
    const mailOptions = {
      from: '"College Events & Clubs" <noreply@collegeevents.com>',
      to,
      subject,
      html,
    };

    const info = await activeTransporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);

    // If using Ethereal, log url to view email
    if (nodemailer.getTestMessageUrl) {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) {
        console.log(`Ethereal Mock Email URL: ${url}`);
      }
    }
    return info;
  } catch (error) {
    console.error(`Error sending email to ${to}: ${error.message}`);
    return null;
  }
};

// Preset templates
const sendWelcomeEmail = async (userEmail, userName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #fafafa;">
      <h2 style="color: #6366f1; text-align: center;">Welcome to College Event & Club Portal</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>Thank you for registering on our platform! You can now browse active student clubs, submit membership requests, register for exciting college events, and download certificates upon attendance.</p>
      <p>By default, your account role has been set to <strong>Student</strong>.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Log In to Portal</a>
      </div>
      <p style="font-size: 12px; color: #777; text-align: center;">This is an automated system email. Please do not reply directly.</p>
    </div>
  `;
  return await sendEmail({ to: userEmail, subject: 'Welcome to College Event & Club Management', html });
};

const sendEventRegistrationEmail = async (userEmail, userName, eventTitle, eventDate, eventVenue) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #fafafa;">
      <h2 style="color: #3b82f6; text-align: center;">Event Registration Confirmed</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>Your registration for the event <strong>${eventTitle}</strong> has been successfully confirmed!</p>
      <div style="background-color: #eff6ff; padding: 15px; border-left: 5px solid #3b82f6; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 5px 0;"><strong>Event:</strong> ${eventTitle}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(eventDate).toLocaleString()}</p>
        <p style="margin: 5px 0;"><strong>Venue:</strong> ${eventVenue}</p>
      </div>
      <p>Please make sure to arrive on time and scan the attendance QR code at the venue to secure your certificate.</p>
      <p style="font-size: 12px; color: #777; text-align: center;">This is an automated system email. Please do not reply directly.</p>
    </div>
  `;
  return await sendEmail({ to: userEmail, subject: `Registration Confirmed: ${eventTitle}`, html });
};

module.exports = { sendEmail, sendWelcomeEmail, sendEventRegistrationEmail };
