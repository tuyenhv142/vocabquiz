/**
 * Daily Discovery & Word of the Day Engine
 * Provides a new curated English word every single day based on date seed
 * and generates quick 10-word daily practice sessions without set selection.
 */

const CURATED_DAILY_WORDS = [
  {
    term: 'Resilience',
    phonetic: '/rɪˈzɪliəns/',
    definition: 'Khả năng phục hồi, sự kiên cường',
    example_sentence: 'Her resilience helped her overcome every obstacle in her career.',
    part_of_speech: 'noun',
    level: 'B2',
  },
  {
    term: 'Perseverance',
    phonetic: '/ˌpɜːsɪˈvɪərəns/',
    definition: 'Sự kiên trì, sự bền bỉ',
    example_sentence: 'Great achievements require hard work and perseverance.',
    part_of_speech: 'noun',
    level: 'C1',
  },
  {
    term: 'Meticulous',
    phonetic: '/məˈtɪkjələs/',
    definition: 'Tỉ mỉ, cẩn thận, chi tiết',
    example_sentence: 'He is always meticulous about keeping his study notes organized.',
    part_of_speech: 'adjective',
    level: 'C1',
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
    term: 'Elaborate',
    phonetic: '/ɪˈlæbərət/',
    definition: 'Phức tạp, công phu, giải thích chi tiết',
    example_sentence: 'Could you please elaborate on your proposed strategy?',
    part_of_speech: 'verb',
    level: 'B2',
  },
  {
    term: 'Eloquent',
    phonetic: '/ˈeləkwənt/',
    definition: 'Hùng hồn, lưu loát, truyền cảm',
    example_sentence: 'The speaker delivered an eloquent speech about education.',
    part_of_speech: 'adjective',
    level: 'C1',
  },
  {
    term: 'Inevitably',
    phonetic: '/ɪnˈevɪtəbli/',
    definition: 'Chắc chắn xảy ra, không thể tránh khỏi',
    example_sentence: 'Daily practice will inevitably lead to fluent speaking.',
    part_of_speech: 'adverb',
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
    term: 'Ambitious',
    phonetic: '/æmˈbɪʃəs/',
    definition: 'Tham vọng, nhiều hoài bão',
    example_sentence: 'She set an ambitious goal to learn 1000 new words this year.',
    part_of_speech: 'adjective',
    level: 'B2',
  },
  {
    term: 'Substantial',
    phonetic: '/səbˈstænʃl/',
    definition: 'Đáng kể, quan trọng',
    example_sentence: 'Regular practice leads to a substantial gain in confidence.',
    part_of_speech: 'adjective',
    level: 'B2',
  },
  {
    term: 'Empathy',
    phonetic: '/ˈempəθi/',
    definition: 'Sự thấu cảm, sự đồng cảm',
    example_sentence: 'Empathy allows us to build stronger connections with people.',
    part_of_speech: 'noun',
    level: 'B2',
  },
  {
    term: 'Phenomenal',
    phonetic: '/fəˈnɒmɪnl/',
    definition: 'Phi thường, xuất sắc',
    example_sentence: 'Your daily progress in learning English is phenomenal.',
    part_of_speech: 'adjective',
    level: 'C1',
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
 * Deterministically retrieves Word of the Day based on current date (YYYY-MM-DD)
 */
export function getWordOfTheDay() {
  const todayStr = new Date().toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < todayStr.length; i++) {
    hash = (hash * 31 + todayStr.charCodeAt(i)) % CURATED_DAILY_WORDS.length;
  }
  const word = CURATED_DAILY_WORDS[Math.abs(hash) % CURATED_DAILY_WORDS.length];
  return {
    ...word,
    dateString: todayStr,
  };
}

/**
 * Generates a 10-word Daily Discovery Practice Set without set selection.
 * Combines Word of the Day + Curated words + User's existing set words.
 */
export function buildDailyDiscoverySet(userSets = []) {
  const todayWord = getWordOfTheDay();
  const pool = [...CURATED_DAILY_WORDS];

  // Extract cards from user's existing sets
  if (Array.isArray(userSets)) {
    userSets.forEach((s) => {
      if (Array.isArray(s.cards)) {
        s.cards.forEach((c) => {
          if (c.term && c.definition) {
            pool.push({
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

  // Shuffle & pick unique 10 cards including todayWord
  const uniqueMap = new Map();
  uniqueMap.set(todayWord.term.toLowerCase(), {
    id: `daily-wod-${todayWord.term}`,
    term: todayWord.term,
    definition: todayWord.definition,
    example_sentence: todayWord.example_sentence,
    part_of_speech: todayWord.part_of_speech,
  });

  // Shuffle pool
  const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
  for (const item of shuffledPool) {
    if (uniqueMap.size >= 10) break;
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
    title: '🌟 Daily 10-Word Practice Challenge',
    description: `Daily curated English practice session for ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    cards,
    isDailyDiscovery: true,
  };
}
