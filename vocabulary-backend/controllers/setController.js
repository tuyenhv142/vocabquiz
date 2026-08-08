const db = require('../db');
const { sendShareSetEmail } = require('../services/emailService');
const defaultLevels = require('../config/cefrDefaults');

/**
 * GET /api/sets
 */
async function getSets(req, res) {
  const { userId } = req.query;

  try {
    if (userId) {
      const result = await db.query(
        `SELECT s.*, COUNT(c.id)::int AS card_count 
         FROM study_sets s 
         LEFT JOIN cards c ON s.id = c.set_id 
         WHERE s.user_id = $1
         GROUP BY s.id 
         ORDER BY s.created_at DESC`,
        [userId]
      );
      return res.json(result.rows);
    }

    const result = await db.query(
      `SELECT s.*, COUNT(c.id)::int AS card_count 
       FROM study_sets s 
       LEFT JOIN cards c ON s.id = c.set_id 
       GROUP BY s.id 
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
}

/**
 * POST /api/sets
 */
async function createSet(req, res) {
  const { userId, title, description, isPublic } = req.body;

  if (!userId || !title) {
    return res.status(400).json({ error: 'userId and title are required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO study_sets (user_id, title, description, is_public) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, title, description || '', isPublic ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create study set' });
  }
}

/**
 * GET /api/sets/:id
 */
async function getSetById(req, res) {
  const { id } = req.params;
  try {
    const setRes = await db.query('SELECT * FROM study_sets WHERE id = $1', [id]);
    if (setRes.rows.length === 0) {
      return res.status(404).json({ error: 'Study set not found' });
    }

    const cardsRes = await db.query(
      'SELECT * FROM cards WHERE set_id = $1 ORDER BY position ASC',
      [id]
    );

    res.json({
      ...setRes.rows[0],
      cards: cardsRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch study set' });
  }
}

/**
 * PUT /api/sets/:id
 */
async function updateSet(req, res) {
  const { id } = req.params;
  const { title, description, isPublic } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required.' });
  }

  try {
    const result = await db.query(
      `UPDATE study_sets 
       SET title = $1, description = $2, is_public = $3, updated_at = NOW() 
       WHERE id = $4 
       RETURNING *`,
      [title, description || '', isPublic ?? true, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Study set not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update study set' });
  }
}

/**
 * DELETE /api/sets/:id
 */
async function deleteSet(req, res) {
  const { id } = req.params;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM cards WHERE set_id = $1', [id]);
    const result = await client.query('DELETE FROM study_sets WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Study set not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Study set deleted successfully', set: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to delete study set' });
  } finally {
    client.release();
  }
}

/**
 * PUT /api/sets/:id/practice
 */
async function updatePracticeResult(req, res) {
  const { id: setId } = req.params;
  const { percentage } = req.body;

  if (percentage == null || percentage < 0 || percentage > 100) {
    return res.status(400).json({ error: 'Valid percentage (0-100) is required.' });
  }

  try {
    const result = await db.query(
      `UPDATE study_sets SET practice_percentage = $1, last_practiced = NOW() WHERE id = $2 RETURNING id, practice_percentage, last_practiced`,
      [percentage, setId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Study set not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to save practice results:', err);
    res.status(500).json({ error: 'Failed to save practice results' });
  }
}

/**
 * POST /api/sets/:id/clone
 */
async function cloneSet(req, res) {
  const { id: sourceSetId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required to clone a set.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const setRes = await client.query('SELECT * FROM study_sets WHERE id = $1', [sourceSetId]);
    if (setRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Source study set not found' });
    }

    const sourceSet = setRes.rows[0];

    // Check if user already has this set (by matching title or title + " (Shared)")
    const existingCheck = await client.query(
      `SELECT id, title FROM study_sets WHERE user_id = $1 AND (LOWER(title) = LOWER($2) OR LOWER(title) = LOWER($3))`,
      [userId, sourceSet.title, `${sourceSet.title} (Shared)`]
    );

    if (existingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        alreadyExists: true,
        error: `Bộ từ vựng "${sourceSet.title}" đã có trong tài khoản của bạn rồi!`,
      });
    }

    const cardsRes = await client.query('SELECT * FROM cards WHERE set_id = $1 ORDER BY position ASC', [sourceSetId]);
    const sourceCards = cardsRes.rows;

    const newSetRes = await client.query(
      `INSERT INTO study_sets (user_id, title, description, is_public)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        userId,
        `${sourceSet.title} (Shared)`,
        sourceSet.description || '',
        true,
      ]
    );

    const newSet = newSetRes.rows[0];
    const insertedCards = [];
    for (let i = 0; i < sourceCards.length; i++) {
      const c = sourceCards[i];
      const cardRes = await client.query(
        `INSERT INTO cards (set_id, term, definition, example_sentence, part_of_speech, position)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [newSet.id, c.term, c.definition, c.example_sentence, c.part_of_speech, i + 1]
      );
      insertedCards.push(cardRes.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      ...newSet,
      card_count: insertedCards.length,
      cards: insertedCards,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to clone study set:', err);
    res.status(500).json({ error: 'Failed to clone study set' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/sets/:id/share-email
 */
async function shareEmail(req, res) {
  const { id: setId } = req.params;
  const { recipientEmail, senderEmail, shareUrl } = req.body;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid recipient email address is required.' });
  }

  const cleanRecipient = recipientEmail.trim().toLowerCase();

  try {
    const setRes = await db.query('SELECT * FROM study_sets WHERE id = $1', [setId]);
    if (setRes.rows.length === 0) {
      return res.status(404).json({ error: 'Study set not found' });
    }

    const setInfo = setRes.rows[0];
    const cardsRes = await db.query('SELECT COUNT(*)::int as card_count FROM cards WHERE set_id = $1', [setId]);
    const cardCount = cardsRes.rows[0]?.card_count || 0;

    const emailResult = await sendShareSetEmail(cleanRecipient, senderEmail, setInfo, cardCount, shareUrl);
    if (!emailResult || !emailResult.success) {
      return res.status(400).json({
        error: emailResult?.error || 'Failed to send share invitation email via Brevo.'
      });
    }

    res.json({ success: true, messageId: emailResult.messageId });
  } catch (err) {
    console.error('Failed to send share email:', err);
    res.status(500).json({ error: err.message || 'Failed to send share email' });
  }
}

/**
 * POST /api/sets/seed-defaults
 */
async function seedDefaults(req, res) {
  const { userId, levels } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  const levelsToSeed = (Array.isArray(levels) && levels.length > 0)
    ? levels
    : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Check existing titles for user
    const existingSetsRes = await client.query(
      `SELECT LOWER(title) as title FROM study_sets WHERE user_id = $1`,
      [userId]
    );
    const existingTitles = existingSetsRes.rows.map((r) => r.title.trim().toLowerCase());

    const createdSets = [];
    const skippedTitles = [];

    for (const level of levelsToSeed) {
      const defaultData = defaultLevels[level];
      if (!defaultData) continue;

      if (existingTitles.includes(defaultData.title.trim().toLowerCase())) {
        skippedTitles.push(defaultData.title);
        continue;
      }

      const setRes = await client.query(
        `INSERT INTO study_sets (user_id, title, description, is_public) 
         VALUES ($1, $2, $3, true) 
         RETURNING *`,
        [userId, defaultData.title, defaultData.description]
      );

      const newSet = setRes.rows[0];
      const insertedCards = [];

      for (let i = 0; i < defaultData.cards.length; i++) {
        const c = defaultData.cards[i];
        const cardRes = await client.query(
          `INSERT INTO cards (set_id, term, definition, example_sentence, part_of_speech, position) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING *`,
          [newSet.id, c.term, c.definition, c.example_sentence, c.part_of_speech, i + 1]
        );
        insertedCards.push(cardRes.rows[0]);
      }

      createdSets.push({
        ...newSet,
        card_count: insertedCards.length,
        cards: insertedCards,
      });
    }

    if (createdSets.length === 0 && skippedTitles.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        alreadyExists: true,
        error: `Tất cả các bộ từ CEFR được chọn (${skippedTitles.join(', ')}) đã có trong tài khoản của bạn rồi!`,
      });
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Default sets processed.',
      sets: createdSets,
      skipped: skippedTitles,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed default sets:', err);
    res.status(500).json({ error: 'Failed to import default vocabulary sets.' });
  } finally {
    client.release();
  }
}

module.exports = {
  getSets,
  createSet,
  getSetById,
  updateSet,
  deleteSet,
  updatePracticeResult,
  cloneSet,
  shareEmail,
  seedDefaults,
};
