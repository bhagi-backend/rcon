const nodemailer = require("nodemailer");

const sendEmail = async ({ email, subject, message, from }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS?.trim(),
      },
    });

    await transporter.sendMail({
      from: from || process.env.EMAIL_USER,
      to: email,
      subject,
      text: message,
    });

    return { status: "success" };
  } catch (err) {
    console.error("Email sending failed:", err.message);
    return { status: "failed", message: err.message };
  }
};

module.exports = sendEmail;
