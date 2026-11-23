const nodemailer = require('nodemailer');

async function sendPasswordResetEmail({ to, name, role, resetUrl }) {
    if (!process.env.SMTP_HOST) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('SMTP_HOST is required in production');
        }
        return false;
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) throw new Error('SMTP_FROM or SMTP_USER must be configured');

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined
    });

    await transporter.sendMail({
        from,
        to,
        subject: 'Reset your DineFlow password',
        text: `Hello ${name},\n\nWe received a request to reset the password for your DineFlow account. Open this link within 60 minutes to choose a new password:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`
    });
    return true;
}

module.exports = sendPasswordResetEmail;