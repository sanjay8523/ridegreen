// ========== server/utils/sendEmail.js ==========
const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Required for some providers like Outlook/Live
    tls: {
      ciphers: "SSLv3",
    },
  });

  const mailOptions = {
    from: `"RideGreen Carpooling" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
