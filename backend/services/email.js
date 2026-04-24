// Email service with console logging fallback
// When SMTP credentials are configured, sends real emails via Nodemailer
// Otherwise logs formatted emails to the console

const nodemailer = require('nodemailer');

let transporter = null;

function initTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('📧 Email service: SMTP configured');
  } else {
    console.log('📧 Email service: Console logging mode (no SMTP configured)');
  }
}

async function sendEmail({ to, subject, html, text }) {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"TaskFlow AI" <noreply@taskflow.ai>',
        to,
        subject,
        html,
        text
      });
      return { sent: true };
    } catch (err) {
      console.error('Email send error:', err.message);
      return { sent: false, error: err.message };
    }
  }

  // Console logging fallback
  console.log('\n' + '='.repeat(60));
  console.log('📧 EMAIL (console mode)');
  console.log('='.repeat(60));
  console.log(`  To:      ${to}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Body:    ${text || html}`);
  console.log('='.repeat(60) + '\n');
  return { sent: true, mode: 'console' };
}

async function sendInviteEmail(to, orgName, inviteLink) {
  return sendEmail({
    to,
    subject: `You've been invited to join ${orgName} on TaskFlow AI`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>You're invited! 🚀</h2>
        <p>You've been invited to join <strong>${orgName}</strong> on TaskFlow AI.</p>
        <p><a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Accept Invitation</a></p>
        <p style="color: #666; font-size: 14px;">Or copy this link: ${inviteLink}</p>
      </div>
    `,
    text: `You've been invited to join ${orgName} on TaskFlow AI. Accept here: ${inviteLink}`
  });
}

async function sendDailyDigest(user, tasksDueToday) {
  if (tasksDueToday.length === 0) return;

  const taskList = tasksDueToday.map(t => `• ${t.taskKey}: ${t.title}`).join('\n');
  
  return sendEmail({
    to: user.email,
    subject: `TaskFlow AI — ${tasksDueToday.length} task(s) due today`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Tasks Due Today 📋</h2>
        <p>Hi ${user.name}, you have ${tasksDueToday.length} task(s) due today:</p>
        <ul>${tasksDueToday.map(t => `<li><strong>${t.taskKey}</strong>: ${t.title}</li>`).join('')}</ul>
      </div>
    `,
    text: `Hi ${user.name}, you have ${tasksDueToday.length} task(s) due today:\n${taskList}`
  });
}

module.exports = { initTransporter, sendEmail, sendInviteEmail, sendDailyDigest };
