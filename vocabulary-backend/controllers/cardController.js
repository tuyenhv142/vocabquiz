const db = require('../db');

/**
 * GET /api/cards?setId=...
 */
async function getCards(req, res) {
  const { setId } = req.query;

  try {
    if (setId) {
      const result = await db.query(
        'SELECT * FROM cards WHERE set_id = $1 ORDER BY position ASC',
        [setId]
      );
      return res.json(result.rows);
    }

    const result = await db.query('SELECT * FROM cards ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
}

/**
 * POST /api/cards
 */
async function createCard(req, res) {
  const { setId, term, definition, exampleSentence, partOfSpeech } = req.body;

  if (!setId || !term || !definition) {
    return res.status(400).json({ error: 'setId, term, and definition are required.' });
  }

  try {
    const posRes = await db.query(
      'SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM cards WHERE set_id = $1',
      [setId]
    );
    const nextPos = posRes.rows[0].next_pos;

    const result = await db.query(
      `INSERT INTO cards (set_id, term, definition, example_sentence, part_of_speech, position) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [setId, term, definition, exampleSentence || '', partOfSpeech || '', nextPos]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create card' });
  }
}

/**
 * PUT /api/cards/:id
 */
async function updateCard(req, res) {
  const { id } = req.params;
  const { term, definition, exampleSentence, partOfSpeech } = req.body;

  if (!term || !definition) {
    return res.status(400).json({ error: 'term and definition are required.' });
  }

  try {
    const result = await db.query(
      `UPDATE cards 
       SET term = $1, definition = $2, example_sentence = $3, part_of_speech = $4 
       WHERE id = $5 
       RETURNING *`,
      [term, definition, exampleSentence || '', partOfSpeech || '', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update card' });
  }
}

/**
 * DELETE /api/cards/:id
 */
async function deleteCard(req, res) {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM cards WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ message: 'Card deleted successfully', card: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
}

/**
 * POST /api/sets/:id/cards/batch
 */
async function batchCreateCards(req, res) {
  const { id: setId } = req.params;
  const { cards } = req.body;

  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: 'No cards provided for import.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const insertedCards = [];
    for (let i = 0; i < cards.length; i++) {
      const { term, definition, exampleSentence, partOfSpeech } = cards[i];
      const result = await client.query(
        `INSERT INTO cards (set_id, term, definition, example_sentence, part_of_speech, position) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [setId, term, definition, exampleSentence || '', partOfSpeech || '', i + 1]
      );
      insertedCards.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: `${insertedCards.length} cards imported successfully.`, cards: insertedCards });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to bulk import cards.' });
  } finally {
    client.release();
  }
}

module.exports = {
  getCards,
  createCard,
  updateCard,
  deleteCard,
  batchCreateCards,
};
