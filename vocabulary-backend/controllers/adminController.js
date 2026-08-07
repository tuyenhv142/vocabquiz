const db = require('../db');

const ADMIN_EMAIL = 'tuyenhv.142@gmail.com';

function checkAdminAuth(req, res) {
  const userEmail = (req.headers['x-user-email'] || req.query.adminEmail || '').trim().toLowerCase();
  if (userEmail !== ADMIN_EMAIL) {
    res.status(403).json({ error: 'Access Denied (403 Forbidden). Admin privileges required.' });
    return false;
  }
  return true;
}

/**
 * GET /api/admin/stats - High-level system analytics
 */
async function getAdminStats(req, res) {
  if (!checkAdminAuth(req, res)) return;
  try {
    const userCountRes = await db.query('SELECT COUNT(*)::int AS count FROM users');
    const setCountRes = await db.query('SELECT COUNT(*)::int AS count FROM study_sets');
    const cardCountRes = await db.query('SELECT COUNT(*)::int AS count FROM cards');
    
    const masteryRes = await db.query(
      `SELECT 
         ROUND(AVG(practice_percentage))::int AS avg_mastery,
         COUNT(last_practiced)::int AS total_practiced_sets
       FROM study_sets 
       WHERE practice_percentage IS NOT NULL`
    );

    const recentSetsRes = await db.query(
      `SELECT s.id, s.title, s.created_at, u.email AS owner_email, COUNT(c.id)::int AS card_count
       FROM study_sets s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN cards c ON s.id = c.set_id
       GROUP BY s.id, u.email
       ORDER BY s.created_at DESC
       LIMIT 5`
    );

    res.json({
      totalUsers: userCountRes.rows[0].count,
      totalSets: setCountRes.rows[0].count,
      totalCards: cardCountRes.rows[0].count,
      avgMastery: masteryRes.rows[0]?.avg_mastery || 0,
      totalPracticedSets: masteryRes.rows[0]?.total_practiced_sets || 0,
      recentSets: recentSetsRes.rows,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
}

/**
 * GET /api/admin/users - All registered users with details
 */
async function getAllUsers(req, res) {
  if (!checkAdminAuth(req, res)) return;
  try {
    const result = await db.query(
      `SELECT 
         u.id, u.email, u.created_at,
         COUNT(DISTINCT s.id)::int AS set_count,
         COUNT(c.id)::int AS card_count
       FROM users u
       LEFT JOIN study_sets s ON u.id = s.user_id
       LEFT JOIN cards c ON s.id = c.set_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users list' });
  }
}

/**
 * DELETE /api/admin/users/:id - Admin force delete user
 */
async function deleteUserByAdmin(req, res) {
  if (!checkAdminAuth(req, res)) return;
  const { id: userId } = req.params;

  try {
    const userCheck = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length > 0 && userCheck.rows[0].email.toLowerCase() === 'tuyenhv.142@gmail.com') {
      return res.status(403).json({ error: 'System Administrator account (tuyenhv.142@gmail.com) is protected and cannot be deleted.' });
    }
  } catch (err) {
    console.error('Check admin account error:', err);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM cards WHERE set_id IN (SELECT id FROM study_sets WHERE user_id = $1)`,
      [userId]
    );

    await client.query(`DELETE FROM study_sets WHERE user_id = $1`, [userId]);

    const result = await client.query(`DELETE FROM users WHERE id = $1 RETURNING id, email`, [userId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    await client.query('COMMIT');
    res.json({ message: `User ${result.rows[0].email} deleted permanently.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  } finally {
    client.release();
  }
}

/**
 * GET /api/admin/sets - All study sets across system
 */
async function getAllSets(req, res) {
  if (!checkAdminAuth(req, res)) return;
  try {
    const result = await db.query(
      `SELECT 
         s.id, s.title, s.description, s.is_public, s.practice_percentage, s.last_practiced, s.created_at,
         u.email AS owner_email,
         COUNT(c.id)::int AS card_count
       FROM study_sets s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN cards c ON s.id = c.set_id
       GROUP BY s.id, u.email
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin get sets error:', err);
    res.status(500).json({ error: 'Failed to fetch sets list' });
  }
}

/**
 * DELETE /api/admin/sets/:id - Admin force delete set
 */
async function deleteSetByAdmin(req, res) {
  if (!checkAdminAuth(req, res)) return;
  const { id: setId } = req.params;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM cards WHERE set_id = $1', [setId]);
    const result = await client.query('DELETE FROM study_sets WHERE id = $1 RETURNING *', [setId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Study set not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Set deleted successfully by admin' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin delete set error:', err);
    res.status(500).json({ error: 'Failed to delete set' });
  } finally {
    client.release();
  }
}

/**
 * GET /api/admin/cards - All vocabulary cards across system
 */
async function getAllCards(req, res) {
  if (!checkAdminAuth(req, res)) return;
  try {
    const result = await db.query(
      `SELECT 
         c.id, c.term, c.definition, c.example_sentence, c.part_of_speech, c.position, c.created_at,
         s.id AS set_id, s.title AS set_title,
         u.email AS owner_email
       FROM cards c
       JOIN study_sets s ON c.set_id = s.id
       LEFT JOIN users u ON s.user_id = u.id
       ORDER BY c.created_at DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin get cards error:', err);
    res.status(500).json({ error: 'Failed to fetch cards list' });
  }
}

module.exports = {
  getAdminStats,
  getAllUsers,
  deleteUserByAdmin,
  getAllSets,
  deleteSetByAdmin,
  getAllCards,
};
