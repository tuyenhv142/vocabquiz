const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_12345';

// OTP memory stores
const signupOtpStore = new Map();
const forgotPasswordOtpStore = new Map();

/**
 * POST /api/auth/send-otp
 */
async function sendOtp(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const existingUser = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already registered. Please log in.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    signupOtpStore.set(cleanEmail, {
      code,
      passwordHash,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    let emailSent = false;
    try {
      emailSent = await Promise.race([
        sendVerificationEmail(cleanEmail, code),
        new Promise((resolve) => setTimeout(() => resolve(false), 1000)),
      ]);
    } catch (e) {
      emailSent = false;
    }

    res.json({
      message: emailSent
        ? 'Verification code sent to your email.'
        : 'Verification code generated!',
      devCode: emailSent ? undefined : code,
    });
  } catch (err) {
    console.error('Send OTP Error:', err);
    res.status(500).json({ error: 'Failed to generate verification code.' });
  }
}

/**
 * POST /api/auth/verify-otp
 */
async function verifyOtp(req, res) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const record = signupOtpStore.get(cleanEmail);

  if (!record) {
    return res.status(400).json({ error: 'No verification code found. Please request a new code.' });
  }

  if (Date.now() > record.expiresAt) {
    signupOtpStore.delete(cleanEmail);
    return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
  }

  if (record.code !== code.trim()) {
    return res.status(400).json({ error: 'Incorrect verification code. Please try again.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [cleanEmail, record.passwordHash]
    );

    const user = result.rows[0];
    signupOtpStore.delete(cleanEmail);

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, user, message: 'Registration verified and completed!' });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    res.status(500).json({ error: 'Failed to complete registration.' });
  }
}

/**
 * POST /api/auth/signup (Direct / legacy)
 */
async function signup(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const existingUser = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [cleanEmail, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed. Internal server error.' });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const result = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: { id: user.id, email: user.email, created_at: user.created_at },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed. Internal server error.' });
  }
}

/**
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const userCheck = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    forgotPasswordOtpStore.set(cleanEmail, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    let emailSent = false;
    try {
      emailSent = await Promise.race([
        sendPasswordResetEmail(cleanEmail, code),
        new Promise((resolve) => setTimeout(() => resolve(false), 1000)),
      ]);
    } catch (e) {
      emailSent = false;
    }

    res.json({
      message: 'Password reset code sent to your email.',
      devCode: emailSent ? undefined : code,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
}

/**
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const record = forgotPasswordOtpStore.get(cleanEmail);

  if (!record) {
    return res.status(400).json({ error: 'No reset request found. Please request a new reset code.' });
  }

  if (Date.now() > record.expiresAt) {
    forgotPasswordOtpStore.delete(cleanEmail);
    return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
  }

  if (record.code !== code.trim()) {
    return res.status(400).json({ error: 'Incorrect verification code. Please try again.' });
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await db.query('UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2', [passwordHash, cleanEmail]);
    forgotPasswordOtpStore.delete(cleanEmail);

    console.log(`🔐 [PASSWORD RESET SUCCESS] Updated password for ${cleanEmail}`);
    res.json({ success: true, message: 'Password updated successfully! You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
}

/**
 * DELETE /api/users/:id
 */
async function deleteAccount(req, res) {
  const { id: userId } = req.params;

  try {
    const userCheck = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length > 0 && userCheck.rows[0].email.toLowerCase() === 'tuyenhv.142@gmail.com') {
      return res.status(403).json({ error: 'System Administrator account (tuyenhv.142@gmail.com) is protected and cannot be deleted.' });
    }
  } catch (err) {
    console.error('Check user error:', err);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM cards WHERE set_id IN (SELECT id FROM study_sets WHERE user_id = $1)`,
      [userId]
    );

    await client.query(`DELETE FROM study_sets WHERE user_id = $1`, [userId]);

    const userResult = await client.query(
      `DELETE FROM users WHERE id = $1 RETURNING id, email`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User account not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'User account and all associated vocabulary sets permanently deleted.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account. Internal server error.' });
  } finally {
    client.release();
  }
}

/**
 * GET /api/leaderboard - Community leaderboard ranking
 */
async function getLeaderboard(req, res) {
  const currentUserId = req.query.userId;
  const currentUserXP = req.query.userXP ? parseInt(req.query.userXP, 10) : null;
  const currentUserStreak = req.query.userStreak ? parseInt(req.query.userStreak, 10) : null;

  try {
    const result = await db.query(
      `SELECT 
         u.id, 
         u.email, 
         COALESCE(COUNT(s.id), 0)::int AS set_count,
         COALESCE(MAX(s.practice_percentage), 0)::int AS top_score,
         COALESCE(COUNT(s.last_practiced), 0)::int AS practiced_count,
         COALESCE(SUM(CASE WHEN s.practice_percentage >= 80 THEN 1 ELSE 0 END), 0)::int AS mastered_sets
       FROM users u
       LEFT JOIN study_sets s ON u.id = s.user_id
       GROUP BY u.id, u.email
       ORDER BY mastered_sets DESC, practiced_count DESC, set_count DESC
       LIMIT 20`
    );

    const leaderboard = result.rows.map((row) => {
      const parts = row.email.split('@');
      const name = parts[0].length > 4 ? `${parts[0].slice(0, 3)}***` : `${parts[0].slice(0, 1)}***`;
      const maskedEmail = `${name}@${parts[1] || 'email.com'}`;
      
      const isCurrentUser = currentUserId && String(row.id) === String(currentUserId);
      
      let totalXP = row.practiced_count * 50;
      if (isCurrentUser && currentUserXP != null) {
        totalXP = currentUserXP;
      }

      let streakDays = row.practiced_count > 0 ? Math.max(1, Math.min(30, row.mastered_sets * 2 + 1)) : 0;
      if (isCurrentUser && currentUserStreak != null) {
        streakDays = currentUserStreak;
      }

      return {
        id: row.id,
        email: maskedEmail,
        setCount: row.set_count,
        topScore: row.top_score,
        masteredSets: row.mastered_sets,
        totalXP,
        streakDays,
        isCurrentUser,
      };
    });

    // Sort leaderboard by totalXP descending
    leaderboard.sort((a, b) => b.totalXP - a.totalXP || b.masteredSets - a.masteredSets);
    leaderboard.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  signup,
  login,
  forgotPassword,
  resetPassword,
  deleteAccount,
  getLeaderboard,
};
