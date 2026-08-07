const path = require('path');
const express = require('express');
const cors = require('cors');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_12345';

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// 1. GET /api/sets - Fetch study sets, optionally filtered by user
// ----------------------------------------------------
app.get('/api/sets', async (req, res) => {
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
});

// ----------------------------------------------------
// 2. POST /api/sets - Create a new study set
// ----------------------------------------------------
app.post('/api/sets', async (req, res) => {
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
});

// ----------------------------------------------------
// 3. GET /api/sets/:id - Fetch single set with all cards
// ----------------------------------------------------
app.get('/api/sets/:id', async (req, res) => {
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
});

// ----------------------------------------------------
// 4. PUT /api/sets/:id/cards - Replace all cards for a set
// ----------------------------------------------------
app.put('/api/sets/:id/cards', async (req, res) => {
  const { id: setId } = req.params;
  const { cards } = req.body;

  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: 'No cards provided for update.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const setRes = await client.query('SELECT * FROM study_sets WHERE id = $1', [setId]);
    if (setRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Study set not found' });
    }

    await client.query('DELETE FROM cards WHERE set_id = $1', [setId]);

    const insertedCards = [];
    for (let i = 0; i < cards.length; i++) {
      const { term, definition, exampleSentence, partOfSpeech } = cards[i];
      const result = await client.query(
        `INSERT INTO cards (set_id, term, definition, example_sentence, part_of_speech, position)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [setId, term, definition, exampleSentence || null, partOfSpeech || null, i + 1]
      );
      insertedCards.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.json({ count: insertedCards.length, cards: insertedCards });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update cards' });
  } finally {
    client.release();
  }
});

app.delete('/api/sets/:id', async (req, res) => {
  const { id: setId } = req.params;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM cards WHERE set_id = $1', [setId]);
    const result = await client.query('DELETE FROM study_sets WHERE id = $1 RETURNING *', [setId]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Study set not found' });
    }

    await client.query('COMMIT');
    res.json({ deleted: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to delete study set' });
  } finally {
    client.release();
  }
});

// ----------------------------------------------------
// 4b. PUT /api/sets/:id/practice - Save practice mastery percentage & last_practiced date
// ----------------------------------------------------
app.put('/api/sets/:id/practice', async (req, res) => {
  const { id: setId } = req.params;
  const { percentage } = req.body;

  if (percentage === undefined || percentage === null) {
    return res.status(400).json({ error: 'percentage is required.' });
  }

  const pct = Math.min(100, Math.max(0, Math.round(Number(percentage))));

  try {
    const result = await db.query(
      `UPDATE study_sets 
       SET practice_percentage = $1, last_practiced = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [pct, setId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Study set not found' });
    }

    console.log(`✅ [PRACTICE RESULT SAVED] Set ${setId}: ${pct}% Mastered`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update practice result:', err);
    res.status(500).json({ error: 'Failed to update practice result' });
  }
});

// ----------------------------------------------------
// 4c. POST /api/sets/:id/clone - Clone / Import a shared study set
// ----------------------------------------------------
app.post('/api/sets/:id/clone', async (req, res) => {
  const { id: sourceSetId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required to clone a set.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch original set
    const setRes = await client.query('SELECT * FROM study_sets WHERE id = $1', [sourceSetId]);
    if (setRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Source study set not found' });
    }

    const sourceSet = setRes.rows[0];

    // 2. Fetch original cards
    const cardsRes = await client.query('SELECT * FROM cards WHERE set_id = $1 ORDER BY position ASC', [sourceSetId]);
    const sourceCards = cardsRes.rows;

    // 3. Create new cloned set for target user
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

    // 4. Copy all cards
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
    console.log(`✅ [SET CLONED] Cloned set ${sourceSetId} -> ${newSet.id} for user ${userId}`);
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
});

// ----------------------------------------------------
// 4d. POST /api/sets/:id/share-email - Send share set invitation via Brevo Email API
// ----------------------------------------------------
app.post('/api/sets/:id/share-email', async (req, res) => {
  const { id: setId } = req.params;
  const { recipientEmail, senderEmail, shareUrl } = req.body;

  if (!recipientEmail) {
    return res.status(400).json({ error: 'recipientEmail is required.' });
  }

  const cleanRecipient = recipientEmail.trim().toLowerCase();

  try {
    // 1. Check if recipient email exists in registered users table
    const userCheck = await db.query('SELECT id, email FROM users WHERE LOWER(email) = $1', [cleanRecipient]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        error: `Account "${cleanRecipient}" is not registered on VocabQuiz yet. Please ask them to sign up first, or share via direct link!`
      });
    }

    // 2. Check study set
    const setRes = await db.query('SELECT * FROM study_sets WHERE id = $1', [setId]);
    if (setRes.rows.length === 0) {
      return res.status(404).json({ error: 'Study set not found' });
    }

    const setInfo = setRes.rows[0];
    const cardsRes = await db.query('SELECT COUNT(*)::int as card_count FROM cards WHERE set_id = $1', [setId]);
    const cardCount = cardsRes.rows[0]?.card_count || 0;

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      return res.status(500).json({ error: 'BREVO_API_KEY is not configured on server.' });
    }

    const link = shareUrl || `https://vocabquiz.vercel.app/?shareSetId=${setId}`;
    const sender = senderEmail || 'A VocabQuiz User';
    const verifiedSenderEmail = process.env.SMTP_USER || 'tuyenhv.142@gmail.com';

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

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'VocabQuiz Master', email: verifiedSenderEmail },
        to: [{ email: cleanRecipient }],
        subject: `[VocabQuiz] ${sender} shared "${setInfo.title}" with you!`,
        htmlContent: htmlContent,
      }),
    });

    const brevoData = await brevoResponse.json();

    if (!brevoResponse.ok) {
      console.error('Brevo API Error:', brevoData);
      return res.status(brevoResponse.status).json({ error: brevoData.message || 'Failed to send email via Brevo' });
    }

    console.log(`✉️ [EMAIL SENT VIA BREVO] Shared set ${setId} sent to ${cleanRecipient}`);
    res.json({ success: true, messageId: brevoData.messageId });
  } catch (err) {
    console.error('Failed to send share email:', err);
    res.status(500).json({ error: 'Failed to send share email' });
  }
});

// ----------------------------------------------------
// 5. POST /api/sets/:id/cards/batch - Bulk Import Words
// ----------------------------------------------------
app.post('/api/sets/:id/cards/batch', async (req, res) => {
  const { id: setId } = req.params;
  const { cards } = req.body; // Array of { term, definition, exampleSentence, partOfSpeech }

  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: 'No cards provided for import.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN'); // Start transaction

    const insertedCards = [];
    for (let i = 0; i < cards.length; i++) {
      const { term, definition, exampleSentence, partOfSpeech } = cards[i];
      const result = await client.query(
        `INSERT INTO cards (set_id, term, definition, example_sentence, part_of_speech, position)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [setId, term, definition, exampleSentence || null, partOfSpeech || null, i + 1]
      );
      insertedCards.push(result.rows[0]);
    }

    await client.query('COMMIT'); // Commit all inserts
    res.status(201).json({ count: insertedCards.length, cards: insertedCards });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Bulk import transaction failed' });
  } finally {
    client.release();
  }
});

const DEFAULT_CEFR_SETS = [
  {
    key: 'A1',
    title: 'English Level A1 - Beginner (Căn Bản)',
    description: 'Essential vocabulary for beginners (A1 CEFR) with Vietnamese meanings.',
    cards: [
      { term: 'hello', definition: 'xin chào', exampleSentence: 'Hello, how are you today?', partOfSpeech: 'interjection' },
      { term: 'apple', definition: 'quả táo', exampleSentence: 'She eats a red apple every morning.', partOfSpeech: 'noun' },
      { term: 'book', definition: 'quyển sách', exampleSentence: 'I read an interesting book.', partOfSpeech: 'noun' },
      { term: 'family', definition: 'gia đình', exampleSentence: 'Family is very important to everyone.', partOfSpeech: 'noun' },
      { term: 'happy', definition: 'vui vẻ, hạnh phúc', exampleSentence: 'They live a happy life.', partOfSpeech: 'adjective' },
      { term: 'water', definition: 'nước', exampleSentence: 'Please drink plenty of water.', partOfSpeech: 'noun' },
      { term: 'friend', definition: 'bạn bè', exampleSentence: 'He is a good friend of mine.', partOfSpeech: 'noun' },
      { term: 'school', definition: 'trường học', exampleSentence: 'Children go to school to learn.', partOfSpeech: 'noun' },
    ],
  },
  {
    key: 'A2',
    title: 'English Level A2 - Elementary (Sơ Cấp)',
    description: 'Foundational vocabulary for elementary learners (A2 CEFR) with Vietnamese meanings.',
    cards: [
      { term: 'journey', definition: 'chuyến đi, hành trình', exampleSentence: 'The journey took three hours by train.', partOfSpeech: 'noun' },
      { term: 'describe', definition: 'mô tả, miêu tả', exampleSentence: 'Can you describe your hometown?', partOfSpeech: 'verb' },
      { term: 'opportunity', definition: 'cơ hội', exampleSentence: 'This job offer is a great opportunity.', partOfSpeech: 'noun' },
      { term: 'advise', definition: 'khuyên bảo, tư vấn', exampleSentence: 'The doctor advised him to rest.', partOfSpeech: 'verb' },
      { term: 'expensive', definition: 'đắt đỏ, tốn kém', exampleSentence: 'Living in big cities can be expensive.', partOfSpeech: 'adjective' },
      { term: 'protect', definition: 'bảo vệ', exampleSentence: 'Wearing helmets protects your head.', partOfSpeech: 'verb' },
      { term: 'improve', definition: 'cải thiện, nâng cao', exampleSentence: 'Practice daily to improve your English.', partOfSpeech: 'verb' },
      { term: 'curious', definition: 'tò mò, ham học hỏi', exampleSentence: 'She is curious about science.', partOfSpeech: 'adjective' },
    ],
  },
  {
    key: 'B1',
    title: 'English Level B1 - Intermediate (Trung Cấp)',
    description: 'Core vocabulary for intermediate learners (B1 CEFR) with Vietnamese meanings.',
    cards: [
      { term: 'accomplish', definition: 'hoàn thành, đạt được', exampleSentence: 'She accomplished all her goals this year.', partOfSpeech: 'verb' },
      { term: 'benefit', definition: 'lợi ích, phúc lợi', exampleSentence: 'Regular exercise brings many health benefits.', partOfSpeech: 'noun' },
      { term: 'challenge', definition: 'thử thách, thách thức', exampleSentence: 'Learning a new language is an exciting challenge.', partOfSpeech: 'noun' },
      { term: 'determine', definition: 'xác định, quyết định', exampleSentence: 'Hard work determines your future success.', partOfSpeech: 'verb' },
      { term: 'efficient', definition: 'hiệu quả, năng suất', exampleSentence: 'They found an efficient way to solve the problem.', partOfSpeech: 'adjective' },
      { term: 'flexible', definition: 'linh hoạt, ứng biến', exampleSentence: 'Working from home offers flexible hours.', partOfSpeech: 'adjective' },
      { term: 'guarantee', definition: 'bảo hành, cam kết', exampleSentence: 'The company guarantees product quality.', partOfSpeech: 'verb' },
      { term: 'hesitate', definition: 'do dự, ngập ngừng', exampleSentence: 'Do not hesitate to ask questions if you need help.', partOfSpeech: 'verb' },
    ],
  },
  {
    key: 'B2',
    title: 'English Level B2 - Upper Intermediate (Trung Cấp Cao)',
    description: 'Advanced-intermediate vocabulary (B2 CEFR) with Vietnamese meanings.',
    cards: [
      { term: 'ambitious', definition: 'có hoài bão, tham vọng', exampleSentence: 'She is an ambitious student striving for excellence.', partOfSpeech: 'adjective' },
      { term: 'collaborate', definition: 'hợp tác, phối hợp', exampleSentence: 'Teams collaborate to complete major projects.', partOfSpeech: 'verb' },
      { term: 'demonstrate', definition: 'chứng minh, minh họa', exampleSentence: 'The statistics demonstrate steady progress.', partOfSpeech: 'verb' },
      { term: 'enhance', definition: 'tăng cường, nâng cao', exampleSentence: 'New features enhance the user experience.', partOfSpeech: 'verb' },
      { term: 'inevitable', definition: 'không thể tránh khỏi', exampleSentence: 'Change is an inevitable part of growth.', partOfSpeech: 'adjective' },
      { term: 'negotiate', definition: 'đàm phán, thương lượng', exampleSentence: 'Managers negotiate contracts with new partners.', partOfSpeech: 'verb' },
      { term: 'resilience', definition: 'khả năng phục hồi, kiên cường', exampleSentence: 'Her resilience helped her overcome adversity.', partOfSpeech: 'noun' },
      { term: 'substantial', definition: 'đáng kể, quan trọng', exampleSentence: 'The investment generated substantial returns.', partOfSpeech: 'adjective' },
    ],
  },
  {
    key: 'C1',
    title: 'English Level C1 - Advanced (Cao Cấp)',
    description: 'High-level academic and professional vocabulary (C1 CEFR) with Vietnamese meanings.',
    cards: [
      { term: 'articulate', definition: 'diễn đạt lưu loát', exampleSentence: 'He was able to articulate his ideas clearly.', partOfSpeech: 'verb' },
      { term: 'comprehensive', definition: 'toàn diện, bao quát', exampleSentence: 'The report provides a comprehensive analysis.', partOfSpeech: 'adjective' },
      { term: 'discrepancy', definition: 'sự khác biệt, bất đồng', exampleSentence: 'Audit reports revealed a discrepancy in financial figures.', partOfSpeech: 'noun' },
      { term: 'exemplary', definition: 'gương mẫu, mẫu mực', exampleSentence: 'Her dedication to quality is exemplary.', partOfSpeech: 'adjective' },
      { term: 'meticulous', definition: 'tỉ mỉ, cẩn trọng', exampleSentence: 'The artist was meticulous about every detail.', partOfSpeech: 'adjective' },
      { term: 'pragmatic', definition: 'thực tế, thực dụng', exampleSentence: 'We need a pragmatic strategy to address current issues.', partOfSpeech: 'adjective' },
      { term: 'scrutinize', definition: 'xem xét kỹ lưỡng, kiểm tra', exampleSentence: 'Inspectors scrutinize the safety measures thoroughly.', partOfSpeech: 'verb' },
      { term: 'ubiquitous', definition: 'khắp nơi, phổ biến', exampleSentence: 'Smartphones have become ubiquitous worldwide.', partOfSpeech: 'adjective' },
    ],
  },
  {
    key: 'C2',
    title: 'English Level C2 - Proficiency (Thành Thạo)',
    description: 'Mastery-level vocabulary (C2 CEFR) for sophisticated expression with Vietnamese meanings.',
    cards: [
      { term: 'acquiesce', definition: 'bằng lòng, chấp thuận', exampleSentence: 'The board decided to acquiesce to the demands.', partOfSpeech: 'verb' },
      { term: 'ephemeral', definition: 'phù du, chóng khánh', exampleSentence: 'Fame can be ephemeral in today digital era.', partOfSpeech: 'adjective' },
      { term: 'fastidious', definition: 'cầu kỳ, kỹ tính', exampleSentence: 'The chef is fastidious about selecting fresh ingredients.', partOfSpeech: 'adjective' },
      { term: 'ineffable', definition: 'không thể diễn tả bằng lời', exampleSentence: 'The beauty of the mountain sunset was ineffable.', partOfSpeech: 'adjective' },
      { term: 'magnanimous', definition: 'hào hiệp, cao thượng', exampleSentence: 'The winner was magnanimous in victory.', partOfSpeech: 'adjective' },
      { term: 'perspicacious', definition: 'sáng suốt, mẫn tuệ', exampleSentence: 'Her perspicacious analysis solved the mystery.', partOfSpeech: 'adjective' },
      { term: 'quintessential', definition: 'tinh túy, điển hình', exampleSentence: 'This restaurant offers the quintessential Italian dining experience.', partOfSpeech: 'adjective' },
      { term: 'truculent', definition: 'hung hăng, ngổ ngáo', exampleSentence: 'His truculent attitude created unnecessary friction.', partOfSpeech: 'adjective' },
    ],
  },
];

async function seedUserCEFRSets(userId, selectedKeys = null) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const targetSets = (Array.isArray(selectedKeys) && selectedKeys.length > 0)
      ? DEFAULT_CEFR_SETS.filter((set) => selectedKeys.includes(set.key))
      : DEFAULT_CEFR_SETS;

    for (const setDef of targetSets) {
      const setRes = await client.query(
        `INSERT INTO study_sets (user_id, title, description, is_public) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, setDef.title, setDef.description, true]
      );
      const setId = setRes.rows[0].id;
      for (let i = 0; i < setDef.cards.length; i++) {
        const card = setDef.cards[i];
        await client.query(
          `INSERT INTO cards (set_id, term, definition, example_sentence, part_of_speech, position)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [setId, card.term, card.definition, card.exampleSentence, card.partOfSpeech, i]
        );
      }
    }
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed CEFR sets:', err);
    throw err;
  } finally {
    client.release();
  }
}

// ----------------------------------------------------
// POST /api/sets/seed-defaults - Manual seed endpoint
// ----------------------------------------------------
app.post('/api/sets/seed-defaults', async (req, res) => {
  const { userId, levels } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  try {
    await seedUserCEFRSets(userId, levels);
    res.json({ message: 'Successfully imported selected CEFR sets.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to seed default vocabulary sets.' });
  }
});

const nodemailer = require('nodemailer');

// Temporary memory store for OTP verification codes
const otpStore = new Map();

function getMailTransporter() {
  const smtpUser = (process.env.BREVO_SMTP_USER || process.env.SMTP_USER || 'tuyenhv.142@gmail.com').trim();
  const rawPass = process.env.BREVO_API_KEY || process.env.SMTP_PASS || 'xsmtpsib-2f5a1a019f0803d25d322e6083e310f6e0ed6c178b4801e712073729aac31720-g1ptXH89jboMGeYG';
  const smtpPass = rawPass.replace(/\s+/g, '');

  if (!smtpUser || !smtpPass) return null;

  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const isSecure = process.env.SMTP_SECURE === 'true';

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: isSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 2000,
    greetingTimeout: 2000,
    socketTimeout: 2000,
  });
}

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

  const brevoApiKey = (process.env.BREVO_API_KEY || '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').trim();

  // 1. Send via Brevo HTTPS REST API if a valid xkeysib API key is configured
  if (brevoApiKey && brevoApiKey.startsWith('xkeysib-')) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: process.env.EMAIL_SENDER_NAME || 'VocabQuizWithNil',
            email: process.env.SMTP_USER || 'tuyenhv.142@gmail.com',
          },
          to: [{ email }],
          subject: `🔐 Your VocabQuiz Verification Code: ${code}`,
          htmlContent: htmlContent,
        }),
      });

      if (res.ok) {
        console.log(`✅ [BREVO EMAIL SENT] Verification code ${code} sent to ${email}`);
        return true;
      } else {
        const errData = await res.json();
        console.error(`❌ [BREVO API NOTICE for ${email}]:`, errData.message || errData);
      }
    } catch (err) {
      console.error(`❌ [BREVO HTTP ERROR for ${email}]:`, err.message);
    }
  }

  // 2. Default instantaneous fallback (0ms) when no xkeysib API key is configured
  console.log(`\n==============================================`);
  console.log(`🔑 [VERIFICATION CODE GENERATED FOR ${email}]`);
  console.log(`👉 CODE: ${code}`);
  console.log(`==============================================\n`);
  return false;
}

// ----------------------------------------------------
// POST /api/auth/send-otp - Send email OTP for signup
// ----------------------------------------------------
app.post('/api/auth/send-otp', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already registered. Please log in.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    otpStore.set(email.toLowerCase(), {
      code,
      passwordHash,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    let emailSent = false;
    try {
      emailSent = await Promise.race([
        sendVerificationEmail(email, code),
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
});

// ----------------------------------------------------
// POST /api/auth/verify-otp - Verify code & complete signup
// ----------------------------------------------------
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  const record = otpStore.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ error: 'No verification code found. Please request a new code.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
  }

  if (record.code !== code.trim()) {
    return res.status(400).json({ error: 'Incorrect verification code. Please try again.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase(), record.passwordHash]
    );

    const user = result.rows[0];
    otpStore.delete(email.toLowerCase());

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, user, message: 'Registration verified and completed!' });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    res.status(500).json({ error: 'Failed to complete registration.' });
  }
});

// ----------------------------------------------------
// SIGNUP ENDPOINT (Legacy / direct)
// ----------------------------------------------------
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT Token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed. Internal server error.' });
  }
});

// ----------------------------------------------------
// DELETE /api/users/:id - Delete user account & all data
// ----------------------------------------------------
app.delete('/api/users/:id', async (req, res) => {
  const { id: userId } = req.params;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Delete all cards belonging to the user's study sets
    await client.query(
      `DELETE FROM cards WHERE set_id IN (SELECT id FROM study_sets WHERE user_id = $1)`,
      [userId]
    );

    // 2. Delete all study sets belonging to the user
    await client.query(`DELETE FROM study_sets WHERE user_id = $1`, [userId]);

    // 3. Delete the user record
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
});

// ----------------------------------------------------
// LOGIN ENDPOINT
// ----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Find user by email
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT Token
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
});

// ----------------------------------------------------
// PUT /api/sets/:id/practice - Save practice results
// ----------------------------------------------------
app.put('/api/sets/:id/practice', async (req, res) => {
  const { id: setId } = req.params;
  const { percentage, score, total } = req.body;

  if (percentage == null || percentage < 0 || percentage > 100) {
    return res.status(400).json({ error: 'Valid percentage (0-100) is required.' });
  }

  try {
    // Only update if new percentage is higher (best score)
    const existing = await db.query('SELECT practice_percentage FROM study_sets WHERE id = $1', [setId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Study set not found' });
    }

    const currentBest = existing.rows[0].practice_percentage;
    const newPct = (currentBest != null && currentBest > percentage) ? currentBest : percentage;

    const result = await db.query(
      `UPDATE study_sets SET practice_percentage = $1, last_practiced = NOW() WHERE id = $2 RETURNING practice_percentage, last_practiced`,
      [newPct, setId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save practice results' });
  }
});

// Serve static production build of vocabulary-frontend if dist exists, or healthcheck
const frontendDist = path.join(__dirname, '../vocabulary-frontend/dist');
const indexPath = path.join(frontendDist, 'index.html');

if (require('fs').existsSync(indexPath)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexPath);
  });
} else {
  app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'VocabQuiz Backend API is running!' });
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
