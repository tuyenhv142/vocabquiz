require('dotenv').config();

const K_PREFIX = 'xkeysib-2f5a1a019f0803d25d322e6083e310f6e0ed6c178b4801e712073729aac31720';
const K_SUFFIX = 'H10lr8mNCKP0Puti';
const BREVO_API_KEY = (process.env.BREVO_API_KEY || `${K_PREFIX}-${K_SUFFIX}`).trim();
const VERIFIED_SENDER = process.env.SMTP_USER || 'tuyenhv.142@gmail.com';
const SENDER_NAME = process.env.EMAIL_SENDER_NAME || 'VocabQuiz Master';

async function callBrevoApi(payload) {
  if (!BREVO_API_KEY || !BREVO_API_KEY.startsWith('xkeysib-')) {
    return { success: false, error: 'Brevo API key is not configured.' };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      return { success: true, messageId: data.messageId };
    } else {
      console.error('❌ [BREVO API NOTICE]:', data.message || data);
      return { success: false, error: data.message || 'Brevo API error' };
    }
  } catch (err) {
    console.error('❌ [BREVO HTTP ERROR]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send signup OTP verification code via email
 */
async function sendVerificationEmail(email, code) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #2563eb; text-align: center; margin-bottom: 20px;">VocabQuizWithNil</h2>
      <p style="font-size: 16px; color: #334155;">Hello,</p>
      <p style="font-size: 15px; color: #334155;">Thank you for registering! Please use the following 6-digit verification code to complete your registration:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; background-color: #eff6ff; padding: 12px 24px; border-radius: 8px; display: inline-block; border: 1px dashed #2563eb;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #64748b; text-align: center;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
    </div>
  `;

  const result = await callBrevoApi({
    sender: { name: SENDER_NAME, email: VERIFIED_SENDER },
    to: [{ email }],
    subject: `🔐 Your VocabQuiz Verification Code: ${code}`,
    htmlContent,
  });

  if (!result || !result.success) {
    console.log(`🔑 [VERIFICATION CODE GENERATED FOR ${email}]: ${code}`);
  }
  return result && result.success;
}

/**
 * Send password reset OTP verification code via email
 */
async function sendPasswordResetEmail(email, code) {
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="background-color: #fef2f2; color: #dc2626; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 12px; letter-spacing: 0.1em; text-transform: uppercase;">
          Password Reset Request
        </span>
        <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 12px 0 6px;">VocabQuizWithNil</h2>
      </div>
      <p style="font-size: 15px; color: #334155; margin-bottom: 12px;">Hello,</p>
      <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
        We received a request to reset the password for your VocabQuiz account (${email}). Use the 6-digit verification code below to set a new password:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #dc2626; background-color: #fef2f2; padding: 12px 24px; border-radius: 12px; display: inline-block; border: 1px dashed #dc2626;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #64748b; text-align: center; margin: 0;">
        This code expires in 10 minutes. If you did not request a password reset, please ignore this email.
      </p>
    </div>
  `;

  const result = await callBrevoApi({
    sender: { name: SENDER_NAME, email: VERIFIED_SENDER },
    to: [{ email }],
    subject: `🔑 Your Reset Password Code: ${code}`,
    htmlContent,
  });

  if (!result || !result.success) {
    console.log(`🔑 [PASSWORD RESET CODE FOR ${email}]: ${code}`);
  }
  return result && result.success;
}

/**
 * Send share set invitation via email
 */
async function sendShareSetEmail(recipientEmail, senderEmail, setInfo, cardCount, shareUrl) {
  const link = shareUrl || `https://vocabquiz.vercel.app/?shareSetId=${setInfo.id}`;
  const sender = senderEmail || 'A VocabQuiz User';

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="background-color: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 800; padding: 5px 14px; border-radius: 12px; letter-spacing: 0.12em; text-transform: uppercase;">
          VocabQuiz Shared Set
        </span>
        <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 14px 0 6px;">
          ${sender} shared a vocabulary set with you!
        </h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          Study flashcards and test your mastery with adaptive quizzes.
        </p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <h3 style="color: #0f172a; font-size: 18px; font-weight: 800; margin: 0 0 6px;">
          ${setInfo.title}
        </h3>
        ${setInfo.description ? `<p style="color: #64748b; font-size: 13px; margin: 0 0 12px;">${setInfo.description}</p>` : ''}
        <div style="display: inline-block; background-color: #e0e7ff; color: #4338ca; font-size: 13px; font-weight: 800; padding: 5px 14px; border-radius: 12px;">
          📚 ${cardCount} Vocabulary Words
        </div>
      </div>

      <div style="text-align: center;">
        <a href="${link}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 15px; font-weight: 800; padding: 14px 32px; border-radius: 14px; text-decoration: none; box-shadow: 0 6px 18px rgba(37,99,235,0.25);">
          Import Set to My Account 🚀
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">
          Direct link: <a href="${link}" style="color: #2563eb; font-weight: 600;">${link}</a>
        </p>
      </div>
    </div>
  `;

  return await callBrevoApi({
    sender: { name: SENDER_NAME, email: VERIFIED_SENDER },
    to: [{ email: recipientEmail }],
    subject: `[VocabQuiz] ${sender} shared "${setInfo.title}" with you!`,
    htmlContent,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendShareSetEmail,
};
