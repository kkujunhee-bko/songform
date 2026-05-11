const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendPasswordResetEmail({ toEmail, toName, newPassword }) {
  const transporter = createTransport();

  await transporter.sendMail({
    from: `"SongForm" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: '[SongForm] 임시 비밀번호 안내',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
        <h2 style="color: #1d4ed8; margin-bottom: 8px;">SongForm 임시 비밀번호</h2>
        <p style="color: #374151;">안녕하세요, <strong>${toName}</strong>님.</p>
        <p style="color: #374151;">요청하신 임시 비밀번호가 발급되었습니다.</p>
        <div style="background: #1e293b; color: #f1f5f9; font-size: 22px; font-weight: bold; letter-spacing: 4px; text-align: center; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${newPassword}
        </div>
        <p style="color: #6b7280; font-size: 13px;">보안을 위해 로그인 후 마이페이지에서 비밀번호를 변경해 주세요.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">본 메일은 발신 전용입니다.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
