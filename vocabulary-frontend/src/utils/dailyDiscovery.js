/**
 * Daily Discovery & Word of the Day Engine
 * Provides beginner-friendly and curated high-yield English words.
 * Limits daily quick practice sessions to 5 words max to prevent overwhelm for beginners.
 * Features 3-day word cooldown so mastered words don't repeat for 3 days!
 */

const HISTORY_STORAGE_KEY = 'vocab_daily_word_history';

// Easy & Everyday English Words (A1 - B1 Level) — Perfect for beginners
const EASY_DAILY_WORDS = [
  {
    term: 'Improve',
    phonetic: '/ɪmˈpruːv/',
    definition: 'Cải thiện, nâng cao',
    example_sentence: 'I practice English every day to improve my speaking skills.',
    part_of_speech: 'verb',
    level: 'A2',
  },
  {
    term: 'Discover',
    phonetic: '/dɪˈskʌvər/',
    definition: 'Khám phá, phát hiện',
    example_sentence: 'You will discover many interesting new words today.',
    part_of_speech: 'verb',
    level: 'A2',
  },
  {
    term: 'Inspire',
    phonetic: '/ɪnˈspaɪər/',
    definition: 'Truyền cảm hứng',
    example_sentence: 'Good books always inspire people to achieve great things.',
    part_of_speech: 'verb',
    level: 'B1',
  },
  {
    term: 'Journey',
    phonetic: '/ˈdʒɜːni/',
    definition: 'Hành trình, chuyến đi',
    example_sentence: 'Learning a language is a wonderful journey.',
    part_of_speech: 'noun',
    level: 'A2',
  },
  {
    term: 'Success',
    phonetic: '/səkˈses/',
    definition: 'Thành công',
    example_sentence: 'Persistence is the key to learning success.',
    part_of_speech: 'noun',
    level: 'A2',
  },
  {
    term: 'Confidence',
    phonetic: '/ˈkɒnfɪdəns/',
    definition: 'Sự tự tin',
    example_sentence: 'Daily practice builds confidence in real conversations.',
    part_of_speech: 'noun',
    level: 'B1',
  },
  {
    term: 'Opportunity',
    phonetic: '/ˌɒpəˈtjuːnəti/',
    definition: 'Cơ hội',
    example_sentence: 'Every mistake is an opportunity to learn something new.',
    part_of_speech: 'noun',
    level: 'B1',
  },
  {
    term: 'Patience',
    phonetic: '/ˈpeɪʃns/',
    definition: 'Sự kiên nhẫn',
    example_sentence: 'Learning vocabulary requires patience and practice.',
    part_of_speech: 'noun',
    level: 'B1',
  },
  {
    term: 'Focus',
    phonetic: '/ˈfəʊkəs/',
    definition: 'Tập trung',
    example_sentence: 'Focus on learning 5 new words each day.',
    part_of_speech: 'verb',
    level: 'A2',
  },
  {
    term: 'Achieve',
    phonetic: '/əˈtʃiːv/',
    definition: 'Đạt được, hoàn thành',
    example_sentence: 'You can achieve your goals with regular daily review.',
    part_of_speech: 'verb',
    level: 'B1',
  },
];

// Curated High-Yield Words (B2 - C1 Level) — Light 5-word challenge
const ADVANCED_DAILY_WORDS = [
  {
    term: 'Resilience',
    phonetic: '/rɪˈzɪliəns/',
    definition: 'Khả năng phục hồi, sự kiên cường',
    example_sentence: 'Her resilience helped her overcome every obstacle in her career.',
    part_of_speech: 'noun',
    level: 'B2',
  },
  {
    term: 'Versatile',
    phonetic: '/ˈvɜːsətaɪl/',
    definition: 'Linh hoạt, đa năng',
    example_sentence: 'English is a versatile tool for international communication.',
    part_of_speech: 'adjective',
    level: 'B2',
  },
  {
    term: 'Collaborate',
    phonetic: '/kəˈlæbəreɪt/',
    definition: 'Cộng tác, hợp tác',
    example_sentence: 'Teams collaborate seamlessly using modern digital tools.',
    part_of_speech: 'verb',
    level: 'B2',
  },
  {
    term: 'Proactive',
    phonetic: '/ˌprəʊˈæktɪv/',
    definition: 'Chủ động, tiên phong',
    example_sentence: 'Be proactive in reviewing words before your memory fades.',
    part_of_speech: 'adjective',
    level: 'B2',
  },
  {
    term: 'Authentic',
    phonetic: '/ɔːˈθentɪk/',
    definition: 'Chân thật, đích thực',
    example_sentence: 'Listening to native speakers helps you learn authentic English.',
    part_of_speech: 'adjective',
    level: 'B2',
  },
];

/**
 * Gets word practice history map from localStorage
 */
function getDailyWordHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

/**
 * Marks words as completed today so they are excluded for the next 3 days
 */
export function recordDailyWordHistory(cards = []) {
  if (!Array.isArray(cards)) return;
  const history = getDailyWordHistory();
  const now = Date.now();

  cards.forEach((c) => {
    if (c.term) {
      history[c.term.toLowerCase()] = now;
    }
  });

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save daily word history:', err);
  }
}

/**
 * Checks if a word was practiced within the last 3 days
 */
function isWordIn3DayCooldown(term) {
  const history = getDailyWordHistory();
  const lastTime = history[term.toLowerCase()];
  if (!lastTime) return false;

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  return Date.now() - lastTime < THREE_DAYS_MS;
}

/**
 * Deterministically retrieves Word of the Day based on current date (YYYY-MM-DD)
 */
export function getWordOfTheDay() {
  const todayStr = new Date().toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < todayStr.length; i++) {
    hash = (hash * 31 + todayStr.charCodeAt(i)) % EASY_DAILY_WORDS.length;
  }
  const word = EASY_DAILY_WORDS[Math.abs(hash) % EASY_DAILY_WORDS.length];
  return {
    ...word,
    dateString: todayStr,
  };
}

/**
 * Generates a light 5-word Daily Discovery Practice Set.
 * Excludes words completed within the last 3 days!
 *
 * @param {Array} userSets - User's existing saved sets
 * @param {string} mode - 'easy' (beginner) or 'challenge' (5 high-yield words)
 */
export function buildDailyDiscoverySet(userSets = [], mode = 'easy') {
  const todayWord = getWordOfTheDay();
  const rawPool = mode === 'easy' ? [...EASY_DAILY_WORDS] : [...ADVANCED_DAILY_WORDS];

  // Extract cards from user's existing sets
  if (Array.isArray(userSets)) {
    userSets.forEach((s) => {
      if (Array.isArray(s.cards)) {
        s.cards.forEach((c) => {
          if (c.term && c.definition) {
            rawPool.push({
              term: c.term,
              definition: c.definition,
              example_sentence: c.example_sentence || c.exampleSentence || '',
              part_of_speech: c.part_of_speech || c.partOfSpeech || '',
            });
          }
        });
      }
    });
  }

  // Filter out words that are in 3-day cooldown
  const availablePool = rawPool.filter((item) => !isWordIn3DayCooldown(item.term));

  // Fallback to rawPool if availablePool is less than 5 words
  const finalPool = availablePool.length >= 5 ? availablePool : rawPool;

  // Shuffle & pick unique 5 cards including todayWord
  const uniqueMap = new Map();
  uniqueMap.set(todayWord.term.toLowerCase(), {
    id: `daily-wod-${todayWord.term}`,
    term: todayWord.term,
    definition: todayWord.definition,
    example_sentence: todayWord.example_sentence,
    part_of_speech: todayWord.part_of_speech,
  });

  const targetCount = 5;

  const shuffledPool = [...finalPool].sort(() => 0.5 - Math.random());
  for (const item of shuffledPool) {
    if (uniqueMap.size >= targetCount) break;
    const key = item.term.toLowerCase();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, {
        id: `daily-${key}-${uniqueMap.size}`,
        term: item.term,
        definition: item.definition,
        example_sentence: item.example_sentence || '',
        part_of_speech: item.part_of_speech || '',
      });
    }
  }

  const cards = Array.from(uniqueMap.values());

  return {
    id: 'daily-discovery-set',
    title: mode === 'easy' ? '🌱 Daily 5-Word Beginner Quiz' : '⚡ Quick 5-Word Challenge Quiz',
    description: `Lightweight 5-word English practice session for ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    cards,
    isDailyDiscovery: true,
  };
}
