import React, { useEffect, useRef, useState } from 'react';
import { formatChinesePinyin } from '../utils/pinyin';
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Sparkles,
  BookOpen,
  Tag,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Loader2,
  Globe,
} from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { code: 'vi', label: '🇻🇳 Vietnamese (Tiếng Việt)' },
  { code: 'zh-TW', label: '🇹🇼 Chinese Traditional (繁體中文)' },
  { code: 'zh-CN', label: '🇨🇳 Chinese Simplified (简体中文)' },
  { code: 'es', label: '🇪🇸 Spanish (Español)' },
  { code: 'fr', label: '🇫🇷 French (Français)' },
  { code: 'de', label: '🇩🇪 German (Deutsch)' },
  { code: 'ja', label: '🇯🇵 Japanese (日本語)' },
  { code: 'ko', label: '🇰🇷 Korean (한국어)' },
  { code: 'ru', label: '🇷🇺 Russian (Русский)' },
  { code: 'en', label: '🇬🇧 English (English)' },
];

function normalizeTerm(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ');
}

function levenshteinDistance(a, b) {
  const lenA = a.length;
  const lenB = b.length;
  const matrix = Array.from({ length: lenA + 1 }, (_, i) => Array(lenB + 1).fill(0));

  for (let i = 0; i <= lenA; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= lenB; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= lenA; i += 1) {
    for (let j = 1; j <= lenB; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[lenA][lenB];
}

function computeTermSuggestions(value, cards, currentIndex) {
  const normalizedValue = normalizeTerm(value);
  if (!normalizedValue) return [];

  return cards
    .map((card, idx) => ({
      ...card,
      idx,
      normalizedTerm: normalizeTerm(card.term || ''),
    }))
    .filter((item) => item.idx !== currentIndex && item.normalizedTerm)
    .map((item) => ({
      ...item,
      score: item.normalizedTerm.includes(normalizedValue)
        ? 0
        : levenshteinDistance(item.normalizedTerm, normalizedValue),
      source: 'existing',
    }))
    .filter((item) => item.score <= 4)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);
}

async function fetchWordSuggestions(value, termLang = 'en') {
  if (!value || !value.trim()) return [];
  const query = value.trim();
  const langCode = (termLang || 'en').split('-')[0];

  try {
    if (langCode === 'en') {
      const response = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(query)}&max=6`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data
            .filter((item) => item.word)
            .map((item) => ({
              term: item.word,
              source: 'api',
            }));
        }
      }
    }

    // Wiktionary opensearch for all languages (Chinese, Vietnamese, Spanish, French, German, etc.)
    const wikUrl = `https://${langCode}.wiktionary.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=6&origin=*`;
    const wikResponse = await fetch(wikUrl);
    if (wikResponse.ok) {
      const wikData = await wikResponse.json();
      if (Array.isArray(wikData) && Array.isArray(wikData[1])) {
        return wikData[1].map((word) => ({
          term: word,
          source: 'api',
        }));
      }
    }

    return [];
  } catch {
    return [];
  }
}

function simplifyDefinition(text) {
  if (!text) return '';
  let cleaned = String(text).trim().replace(/\s+/g, ' ');
  return cleaned;
}

function ensureText(value) {
  const normalized = String(value ?? '').trim();
  const lower = normalized.toLowerCase();
  if (lower === 'null' || lower === 'undefined') return '';
  return normalized;
}

function buildTranslationPhrase(term, partOfSpeech) {
  const cleanedTerm = ensureText(term);
  const normalizedPos = String(partOfSpeech || '').toLowerCase();
  if (!cleanedTerm) return '';

  if (normalizedPos.includes('verb')) {
    return `to ${cleanedTerm}`;
  }
  if (normalizedPos.includes('noun')) {
    return `a ${cleanedTerm}`;
  }
  if (normalizedPos.includes('adj') || normalizedPos.includes('adjective')) {
    return `${cleanedTerm} (adjective)`;
  }
  return cleanedTerm;
}

function isSameText(a, b) {
  return ensureText(a).toLowerCase() === ensureText(b).toLowerCase();
}

function normalizeCard(card = {}, defaultTermLang = 'en', defaultDefLang = 'vi') {
  if (!card || typeof card !== 'object') card = {};
  const rawDef = ensureText(card.definition || card.meaning);
  const termL = typeof card.termLang === 'string' ? card.termLang : (typeof card.term_lang === 'string' ? card.term_lang : (typeof defaultTermLang === 'string' ? defaultTermLang : 'en'));
  const defL = typeof card.definitionLang === 'string' ? card.definitionLang : (typeof card.definition_lang === 'string' ? card.definition_lang : (typeof defaultDefLang === 'string' ? defaultDefLang : 'vi'));

  return {
    term: ensureText(card.term || card.word),
    definition: defL.startsWith('zh') ? formatChinesePinyin(rawDef) : rawDef,
    exampleSentence: ensureText(card.exampleSentence ?? card.example_sentence ?? card.example),
    partOfSpeech: ensureText(card.partOfSpeech ?? card.part_of_speech ?? card.pos),
    termLang: termL,
    definitionLang: defL,
  };
}

function inferPartOfSpeech(term) {
  const t = String(term || '').toLowerCase().trim();
  if (t.endsWith('tion') || t.endsWith('ment') || t.endsWith('ness') || t.endsWith('ance') || t.endsWith('ence') || t.endsWith('ity')) return 'noun';
  if (t.endsWith('ly')) return 'adverb';
  if (t.endsWith('able') || t.endsWith('ive') || t.endsWith('ous') || t.endsWith('ful') || t.endsWith('ic') || t.endsWith('al') || t.endsWith('less')) return 'adjective';
  if (t.endsWith('ize') || t.endsWith('ise') || t.endsWith('ate') || t.endsWith('fy')) return 'verb';
  return 'noun';
}

const POS_TRANSLATIONS = {
  en: { noun: 'noun', verb: 'verb', adjective: 'adjective', adverb: 'adverb' },
  vi: { noun: 'Danh từ', verb: 'Động từ', adjective: 'Tính từ', adverb: 'Phó từ' },
  'zh-TW': { noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞' },
  'zh-CN': { noun: '名词', verb: '动词', adjective: '形容词', adverb: '副词' },
  es: { noun: 'Sustantivo', verb: 'Verbo', adjective: 'Adjetivo', adverb: 'Adverbio' },
  fr: { noun: 'Nom', verb: 'Verbe', adjective: 'Adjectif', adverb: 'Adverbe' },
  de: { noun: 'Substantiv', verb: 'Verb', adjective: 'Adjektiv', adverb: 'Adverb' },
  ja: { noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞' },
  ko: { noun: '명사', verb: '동사', adjective: '형용사', adverb: '부사' },
  ru: { noun: 'Существительное', verb: 'Глагол', adjective: 'Прилагательное', adverb: 'Наречие' },
};

function formatPosForLang(pos, lang = 'en') {
  if (!pos) return '';
  const normalized = String(pos).toLowerCase();
  let category = 'noun';
  if (normalized.includes('verb')) category = 'verb';
  else if (normalized.includes('adj')) category = 'adjective';
  else if (normalized.includes('adv')) category = 'adverb';
  else if (normalized.includes('noun')) category = 'noun';

  const dict = POS_TRANSLATIONS[lang] || POS_TRANSLATIONS['en'];
  return dict[category] || pos;
}

function cleanExampleSentence(raw, term) {
  if (!raw) return '';
  let cleaned = String(raw)
    .replace(/ *\[([^\]]+)\] */g, '$1')
    .replace(/ *\([^)]*\) */g, ' ')
    .replace(/ — .*/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  if (term && !cleaned.toLowerCase().includes(term.toLowerCase())) {
    return '';
  }

  return cleaned;
}

function generateExampleSentence(term, partOfSpeech) {
  const cleanTerm = ensureText(term);
  if (!cleanTerm) return '';
  const pos = String(partOfSpeech || inferPartOfSpeech(cleanTerm)).toLowerCase();

  if (pos.includes('verb')) {
    return `It is important to ${cleanTerm} new skills through continuous practice.`;
  }
  if (pos.includes('noun')) {
    return `We learned about the concept of ${cleanTerm} in our lesson today.`;
  }
  if (pos.includes('adj')) {
    return `The results were surprisingly ${cleanTerm} and exceeded expectations.`;
  }
  if (pos.includes('adv')) {
    return `The team worked ${cleanTerm} to complete the task on time.`;
  }
  return `This sentence demonstrates how to use the word "${cleanTerm}".`;
}



async function fetchDictionaryInfo(term) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data)) return null;

    let foundDef = '';
    let foundPos = '';
    let foundExample = '';

    for (const entry of data) {
      if (!Array.isArray(entry.meanings)) continue;
      for (const meaning of entry.meanings) {
        if (!foundPos && meaning.partOfSpeech) {
          foundPos = meaning.partOfSpeech;
        }
        if (!Array.isArray(meaning.definitions)) continue;
        for (const defObj of meaning.definitions) {
          if (!foundDef && defObj.definition) {
            foundDef = defObj.definition;
          }
          if (!foundExample && defObj.example) {
            foundExample = defObj.example;
          }
          if (foundDef && foundPos && foundExample) break;
        }
        if (foundDef && foundPos && foundExample) break;
      }
      if (foundDef && foundPos && foundExample) break;
    }

    const pos = foundPos || inferPartOfSpeech(term);
    const cleanedEx = cleanExampleSentence(foundExample, term);
    const example = cleanedEx || generateExampleSentence(term, pos);

    return {
      definition: foundDef,
      partOfSpeech: pos,
      exampleSentence: example,
    };
  } catch {
    const pos = inferPartOfSpeech(term);
    return {
      definition: '',
      partOfSpeech: pos,
      exampleSentence: generateExampleSentence(term, pos),
    };
  }
}

function stripPinyin(text) {
  if (!text) return '';
  return String(text)
    .replace(/\s*\([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s,.'"-]+\)/gi, '')
    .trim();
}

async function translateToLanguage(text, targetLang = 'vi', sourceLang = 'auto') {
  if (!text || !text.trim()) return '';
  const cleanText = stripPinyin(text);
  if (!cleanText) return '';

  try {
    const sl = (sourceLang && sourceLang !== 'auto') ? encodeURIComponent(sourceLang) : 'auto';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(cleanText)}`;
    const response = await fetch(url);
    if (!response.ok) return '';
    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0].map((item) => item[0]).join('').trim();
      if (!translated) return '';

      if (targetLang.startsWith('zh')) {
        return formatChinesePinyin(translated);
      }

      return translated;
    }
    return '';
  } catch {
    return '';
  }
}

function detectScriptLanguage(text) {
  if (!text || !text.trim()) return null;
  const str = text.trim();

  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(str)) return 'ja';
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(str)) return 'ko';
  if (/[\u0400-\u04ff]/.test(str)) return 'ru';
  if (/[\u4e00-\u9fa5\u3400-\u4dbf]/.test(str)) {
    if (/[繁體點個國會華語書]/.test(str)) return 'zh-TW';
    return 'zh-CN';
  }
  if (/[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(str)) {
    return 'vi';
  }
  return null;
}

async function autoDetectLanguage(text) {
  if (!text || !text.trim() || text.trim().length < 2) return null;
  const clean = stripPinyin(text);
  if (!clean) return null;

  const scriptLang = detectScriptLanguage(clean);
  if (scriptLang) return scriptLang;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data[2]) {
      const detected = String(data[2]);
      if (detected.startsWith('zh-TW') || detected.startsWith('zh-HK')) return 'zh-TW';
      if (detected.startsWith('zh')) return 'zh-CN';
      if (SUPPORTED_LANGUAGES.some((l) => l.code === detected)) {
        return detected;
      }
    }
  } catch (err) {
    console.error('Language detection error:', err);
  }
  return null;
}

export default function SetReviewPage({ setInfo, cards = [], onClose, onSaved, onDeleted }) {
  const [editCards, setEditCards] = useState(() => (Array.isArray(cards) ? cards : []).map((c) => normalizeCard(c)));
  const [termSuggestions, setTermSuggestions] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [translatingIndex, setTranslatingIndex] = useState(null);
  const [termLang, setTermLang] = useState(() => {
    return localStorage.getItem('vocab_term_lang') || 'en';
  });
  const [definitionLang, setDefinitionLang] = useState(() => {
    return localStorage.getItem('vocab_def_lang') || 'vi';
  });
  const suggestionQueries = useRef({});

  const handleTermLangChange = async (e) => {
    const newLang = e.target.value;
    const oldLang = termLang;
    setTermLang(newLang);
    localStorage.setItem('vocab_term_lang', newLang);

    setLoading(true);
    setStatus(`Translating terms, POS & examples to ${SUPPORTED_LANGUAGES.find((l) => l.code === newLang)?.label || newLang}...`);

    try {
      const updated = await Promise.all(
        editCards.map(async (card) => {
          const cardOldTermLang = card.termLang || oldLang || 'auto';
          const cDefLang = card.definitionLang || definitionLang;
          const currentTerm = stripPinyin(card.term);

          let newTermText = currentTerm;
          if (currentTerm) {
            const translatedTerm = await translateToLanguage(currentTerm, newLang, cardOldTermLang);
            if (translatedTerm) {
              newTermText = stripPinyin(translatedTerm);
            }
          }

          const posFormatted = formatPosForLang(card.partOfSpeech || inferPartOfSpeech(newTermText), newLang);

          let translatedEx = stripPinyin(card.exampleSentence);
          if (card.exampleSentence && newLang !== 'en') {
            const rawTransEx = await translateToLanguage(card.exampleSentence, newLang, 'auto');
            translatedEx = stripPinyin(rawTransEx);
          } else if (!card.exampleSentence && newTermText) {
            const baseEx = generateExampleSentence(newTermText, card.partOfSpeech);
            const rawTransEx = newLang === 'en' ? baseEx : await translateToLanguage(baseEx, newLang, 'auto');
            translatedEx = stripPinyin(rawTransEx);
          }

          let translatedDef = card.definition;
          if (newTermText) {
            translatedDef = await translateToLanguage(newTermText, cDefLang, newLang);
          }

          return {
            ...card,
            term: newTermText || card.term,
            termLang: newLang,
            partOfSpeech: posFormatted || card.partOfSpeech,
            exampleSentence: translatedEx || card.exampleSentence,
            definition: simplifyDefinition(translatedDef) || card.definition,
          };
        })
      );
      setEditCards(updated);
      setStatus('Terms and cards updated to new term language!');
    } catch (err) {
      console.error(err);
      setError('Failed to update card terms.');
    } finally {
      setLoading(false);
    }
  };

  const handleDefLangChange = (e) => {
    const newLang = e.target.value;
    setDefinitionLang(newLang);
    localStorage.setItem('vocab_def_lang', newLang);
  };

  useEffect(() => {
    setTermSuggestions({});
    setEditCards(cards.map((c) => normalizeCard(c, termLang, definitionLang)));
    setStatus('');
    setError('');
    setTranslatingIndex(null);
    suggestionQueries.current = {};
  }, [cards]);

  const handleCardLangChange = async (index, field, value) => {
    const prevCard = editCards[index] || {};
    const card = { ...prevCard, [field]: value };
    const next = [...editCards];
    next[index] = card;
    setEditCards(next);

    const query = stripPinyin(card.term || '').trim();

    if (field === 'termLang') {
      const newTermLang = value;
      let newTermText = query;

      setTranslatingIndex(index);
      try {
        if (query) {
          const translatedTerm = await translateToLanguage(query, newTermLang, 'auto');
          if (translatedTerm) newTermText = stripPinyin(translatedTerm);
        }

        const posFormatted = formatPosForLang(card.partOfSpeech || inferPartOfSpeech(newTermText), newTermLang);
        let translatedEx = stripPinyin(card.exampleSentence);

        if (card.exampleSentence && newTermLang !== 'en') {
          const rawEx = await translateToLanguage(card.exampleSentence, newTermLang, 'auto');
          translatedEx = stripPinyin(rawEx);
        } else if (newTermText) {
          const baseEx = generateExampleSentence(newTermText, card.partOfSpeech);
          const rawEx = newTermLang === 'en' ? baseEx : await translateToLanguage(baseEx, newTermLang, 'auto');
          translatedEx = stripPinyin(rawEx);
        }

        const cDefLang = card.definitionLang || definitionLang || 'vi';
        let translatedDef = card.definition;
        if (newTermText) {
          translatedDef = await translateToLanguage(newTermText, cDefLang, newTermLang);
        }

        setEditCards((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            term: newTermText || updated[index].term,
            termLang: newTermLang,
            partOfSpeech: posFormatted || updated[index].partOfSpeech,
            exampleSentence: translatedEx || updated[index].exampleSentence,
            definition: simplifyDefinition(translatedDef) || updated[index].definition,
          };
          return updated;
        });

        if (newTermText) {
          fetchWordSuggestions(newTermText, newTermLang).then((remoteSuggestions) => {
            setTermSuggestions((prev) => ({
              ...prev,
              [index]: { items: remoteSuggestions.slice(0, 5), loading: false, query: newTermText },
            }));
          });
        }
      } catch (err) {
        console.error('Card lang change error:', err);
      } finally {
        setTranslatingIndex(null);
      }
    } else if (field === 'definitionLang') {
      const newDefLang = value;
      const cTermLang = card.termLang || termLang || 'en';
      setTranslatingIndex(index);
      try {
        if (query) {
          const translatedDef = await translateToLanguage(query, newDefLang, cTermLang);
          if (translatedDef) {
            setEditCards((prev) => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                definitionLang: newDefLang,
                definition: simplifyDefinition(translatedDef),
              };
              return updated;
            });
          }
        }
      } catch (err) {
        console.error('Def lang change error:', err);
      } finally {
        setTranslatingIndex(null);
      }
    }
  };

  const handleCardChange = (index, field, value) => {
    const next = [...editCards];
    next[index] = { ...next[index], [field]: value };
    setEditCards(next);

    const card = next[index];
    const cTermLang = card.termLang || termLang;
    const cDefLang = card.definitionLang || definitionLang;

    if (field === 'term') {
      const query = value.trim();
      suggestionQueries.current[index] = query;

      if (query.length >= 2) {
        autoDetectLanguage(query).then((detectedLang) => {
          if (detectedLang && detectedLang !== cTermLang) {
            setEditCards((prev) => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                termLang: detectedLang,
                partOfSpeech: formatPosForLang(updated[index].partOfSpeech || inferPartOfSpeech(query), detectedLang),
              };
              return updated;
            });
          }
        });
      }

      const localSuggestions = computeTermSuggestions(value, next, index);
      setTermSuggestions((prev) => ({
        ...prev,
        [index]: { items: localSuggestions, loading: query.length >= 2, query: value },
      }));

      if (query.length >= 2) {
        fetchWordSuggestions(query, cTermLang).then((remoteSuggestions) => {
          if (suggestionQueries.current[index] !== query) return;
          const merged = [
            ...localSuggestions,
            ...remoteSuggestions.filter(
              (apiItem) => !localSuggestions.some((existing) => existing.term.toLowerCase() === apiItem.term.toLowerCase()),
            ),
          ].slice(0, 5);
          setTermSuggestions((prev) => ({
            ...prev,
            [index]: { items: merged, loading: false, query: value },
          }));
        });

        if (!card.definition) {
          const translationQuery = query;
          translateToLanguage(translationQuery, cDefLang, cTermLang).then((translatedText) => {
            if (suggestionQueries.current[index] !== translationQuery) return;
            const translated = simplifyDefinition(translatedText || '');
            if (!translated) return;
            setEditCards((prev) => {
              const nextState = [...prev];
              if (!nextState[index].definition) {
                nextState[index] = { ...nextState[index], definition: translated };
              }
              return nextState;
            });
          });
        }
      } else {
        setTermSuggestions((prev) => ({
          ...prev,
          [index]: { items: localSuggestions, loading: false, query: value },
        }));
      }
    } else if (field === 'definition') {
      const query = value.trim();
      if (query.length >= 2) {
        autoDetectLanguage(query).then((detectedLang) => {
          if (detectedLang && detectedLang !== cDefLang) {
            setEditCards((prev) => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                definitionLang: detectedLang,
              };
              return updated;
            });
          }
        });
      }
    }
  };

  const applyTermSuggestion = async (index, suggestion) => {
    const next = [...editCards];
    const current = next[index] || {};
    const term = suggestion.term;
    const cTermLang = current.termLang || termLang;
    const cDefLang = current.definitionLang || definitionLang;

    setTranslatingIndex(index);

    const translatedDefinition = await translateToLanguage(term, cDefLang, cTermLang);
    const dictionaryInfo = await fetchDictionaryInfo(term);

    const inferredPos =
      suggestion.partOfSpeech ||
      suggestion.part_of_speech ||
      dictionaryInfo?.partOfSpeech ||
      current.partOfSpeech ||
      inferPartOfSpeech(term);

    const rawExample =
      current.exampleSentence ||
      current.example_sentence ||
      suggestion.exampleSentence ||
      suggestion.example_sentence ||
      dictionaryInfo?.exampleSentence ||
      generateExampleSentence(term, inferredPos);

    const posInTermLang = formatPosForLang(inferredPos, cTermLang);
    let finalExample = rawExample;
    if (cTermLang !== 'en' && rawExample) {
      const translatedEx = await translateToLanguage(rawExample, cTermLang, 'en');
      if (translatedEx) finalExample = translatedEx;
    }

    const finalDefinition = simplifyDefinition(
      translatedDefinition || dictionaryInfo?.definition || current.definition || term,
    );

    const selected = normalizeCard({
      ...current,
      term: term,
      definition: finalDefinition,
      partOfSpeech: posInTermLang,
      exampleSentence: ensureText(finalExample),
      termLang: cTermLang,
      definitionLang: cDefLang,
    }, cTermLang, cDefLang);

    next[index] = selected;
    setEditCards(next);
    setTermSuggestions((prev) => ({ ...prev, [index]: { items: [], loading: false, query: term } }));
    setTranslatingIndex(null);
  };

  const handleTranslateCard = async (index) => {
    const card = editCards[index];
    const cleanTerm = stripPinyin(card?.term);
    if (!cleanTerm) return;
    const cTermLang = card.termLang || termLang || 'en';
    const cDefLang = card.definitionLang || definitionLang || 'vi';

    setTranslatingIndex(index);
    try {
      const translatedText = await translateToLanguage(cleanTerm, cDefLang, 'auto');
      const simplified = simplifyDefinition(translatedText);

      let translatedEx = card.exampleSentence;
      if (card.exampleSentence && cTermLang !== 'en') {
        const rawEx = await translateToLanguage(card.exampleSentence, cTermLang, 'auto');
        translatedEx = stripPinyin(rawEx);
      } else if (!card.exampleSentence && cleanTerm) {
        const baseEx = generateExampleSentence(cleanTerm, card.partOfSpeech);
        const rawEx = cTermLang === 'en' ? baseEx : await translateToLanguage(baseEx, cTermLang, 'auto');
        translatedEx = stripPinyin(rawEx);
      }

      const posFormatted = formatPosForLang(card.partOfSpeech || inferPartOfSpeech(cleanTerm), cTermLang);

      if (simplified) {
        setEditCards((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            definition: simplified,
            partOfSpeech: posFormatted || next[index].partOfSpeech,
            exampleSentence: translatedEx || next[index].exampleSentence,
          };
          return next;
        });
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setTranslatingIndex(null);
    }
  };

  const handleAutoTranslateAll = async () => {
    if (editCards.length === 0) return;
    setLoading(true);
    const targetLabel = SUPPORTED_LANGUAGES.find((l) => l.code === definitionLang)?.label || definitionLang;
    setStatus(`Auto-detecting term languages and translating definitions to ${targetLabel}...`);
    setError('');

    try {
      const updated = await Promise.all(
        editCards.map(async (card) => {
          const cleanTerm = stripPinyin(card.term);
          if (!cleanTerm) return card;

          // 1. Auto-detect true term language
          const detectedTermLang = (await autoDetectLanguage(cleanTerm)) || card.termLang || termLang || 'en';

          // 2. Translate definition into selected header definitionLang
          const translatedDef = await translateToLanguage(cleanTerm, definitionLang, 'auto');
          const simplifiedDef = simplifyDefinition(translatedDef);

          // 3. Format POS for detected term language
          const posFormatted = formatPosForLang(card.partOfSpeech || inferPartOfSpeech(cleanTerm), detectedTermLang);

          // 4. Translate or generate example sentence in term's language
          let translatedEx = stripPinyin(card.exampleSentence);
          if (card.exampleSentence && detectedTermLang !== 'en') {
            const rawEx = await translateToLanguage(card.exampleSentence, detectedTermLang, 'auto');
            translatedEx = stripPinyin(rawEx);
          } else if (!card.exampleSentence && cleanTerm) {
            const baseEx = generateExampleSentence(cleanTerm, card.partOfSpeech);
            const rawEx = detectedTermLang === 'en' ? baseEx : await translateToLanguage(baseEx, detectedTermLang, 'auto');
            translatedEx = stripPinyin(rawEx);
          }

          return {
            ...card,
            term: cleanTerm,
            termLang: detectedTermLang,
            definitionLang: definitionLang,
            definition: simplifiedDef || card.definition,
            partOfSpeech: posFormatted || card.partOfSpeech,
            exampleSentence: translatedEx || card.exampleSentence,
          };
        })
      );
      setEditCards(updated);
      setStatus(`All cards auto-detected and translated to ${targetLabel}!`);
    } catch (err) {
      console.error('Translate All Error:', err);
      setError('Failed to translate cards.');
    } finally {
      setLoading(false);
    }
  };

  const addCard = () => {
    setEditCards((prev) => [
      ...prev,
      { term: '', definition: '', exampleSentence: '', partOfSpeech: '', termLang, definitionLang },
    ]);
  };

  const removeCard = (index) => {
    setEditCards((prev) => prev.filter((_, i) => i !== index));
  };

  const API_BASE = typeof window !== 'undefined' && window.location.origin.includes('5173')
    ? 'http://localhost:5000'
    : '';

  const deleteSet = async () => {
    if (!window.confirm('Delete this set and all its cards?')) return;
    try {
      const response = await fetch(`${API_BASE}/api/sets/${setInfo.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete set.');
      }
      if (onDeleted) {
        onDeleted();
      }
    } catch (err) {
      setError(err.message || 'Unable to delete set.');
    }
  };

  const saveChanges = async () => {
    setError('');
    setStatus('');

    const cardsToSave = editCards
      .map((card) => ({
        term: ensureText(card.term || card.word),
        definition: ensureText(card.definition || card.meaning),
        exampleSentence: ensureText(card.exampleSentence ?? card.example_sentence),
        partOfSpeech: ensureText(card.partOfSpeech ?? card.part_of_speech ?? card.pos),
      }))
      .filter((card) => card.term && card.definition);

    if (cardsToSave.length === 0) {
      setError('Please keep at least one card with both term and definition.');
      return;
    }

    const seenTerms = new Map();
    for (let i = 0; i < editCards.length; i += 1) {
      const norm = normalizeTerm(editCards[i].term);
      if (!norm) continue;
      if (seenTerms.has(norm)) {
        const firstIdx = seenTerms.get(norm);
        setError(
          `Duplicate word "${editCards[i].term.trim()}" found in Card #${firstIdx + 1} and Card #${i + 1}. Duplicate words are not allowed in the same set.`,
        );
        return;
      }
      seenTerms.set(norm, i);
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/sets/${setInfo.id}/cards`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: cardsToSave }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save changes.');
      }
      setStatus('Changes saved successfully.');
      if (onSaved) {
        await onSaved();
      }
    } catch (err) {
      setError(err.message || 'Unable to save changes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      {/* Top Header Bar matching PracticePage & FlashcardPage */}
      <div style={headerStyle}>
        <button onClick={onClose} style={backBtnStyle} aria-label="Back to Set">
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={eyebrowStyle}>Edit Set</span>
            <span style={countBadgeStyle}>
              <Layers size={12} style={{ marginRight: 4 }} /> {editCards.length} {editCards.length === 1 ? 'Word' : 'Words'}
            </span>
          </div>
          <h1 style={titleStyle}>{setInfo?.title || 'Study Set'}</h1>
        </div>
      </div>

      {/* Action Toolbar */}
      <div style={pageHeaderStyle}>
        <div style={pageActionsStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={langSelectorBoxStyle} title="Select language of terms (words)">
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Term:</span>
              <select
                value={termLang}
                onChange={handleTermLangChange}
                style={langSelectInputStyle}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem' }}>→</span>

            <div style={langSelectorBoxStyle} title="Select language for definitions & translations">
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Def:</span>
              <select
                value={definitionLang}
                onChange={handleDefLangChange}
                style={langSelectInputStyle}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleAutoTranslateAll}
            type="button"
            style={translateAllBtnStyle}
            title="Auto-translate all cards to selected definition language"
          >
            <Wand2 size={14} /> Translate All
          </button>
          <button onClick={deleteSet} type="button" style={deleteBtnActionStyle}>
            <Trash2 size={16} /> Delete Set
          </button>
        </div>
      </div>

      <div style={contentCardStyle}>
        {error && (
          <div style={errorStyle}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        {status && (
          <div style={successStyle}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{status}</span>
          </div>
        )}

        <div style={cardsGridStyle}>
          {editCards.map((card, index) => {
            const normTerm = normalizeTerm(card.term);
            const duplicateIndex = normTerm
              ? editCards.findIndex((c, i) => i !== index && normalizeTerm(c.term) === normTerm)
              : -1;

            return (
              <div key={index} style={wordCardStyle}>
                <div style={cardHeaderStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={wordBadgeStyle}>
                      <Sparkles size={12} /> Card #{index + 1}
                    </div>
                    <div style={wordTitleStyle}>{card.term || 'New Word'}</div>
                    <div style={cardLangBoxStyle} title="Language for this card: Term -> Definition">
                      <select
                        value={card.termLang || termLang}
                        onChange={(e) => handleCardLangChange(index, 'termLang', e.target.value)}
                        style={cardLangSelectStyle}
                      >
                        {SUPPORTED_LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.label.split(' ')[0]} {l.code.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 700 }}>→</span>
                      <select
                        value={card.definitionLang || definitionLang}
                        onChange={(e) => handleCardLangChange(index, 'definitionLang', e.target.value)}
                        style={cardLangSelectStyle}
                      >
                        {SUPPORTED_LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.label.split(' ')[0]} {l.code.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCard(index)}
                    style={deleteBtnStyle}
                    title="Remove card"
                    aria-label={`Remove word ${index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={fieldGridStyle}>
                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>
                      <BookOpen size={13} style={{ marginRight: 4 }} /> Term
                    </label>
                    <input
                      value={card.term || ''}
                      onChange={(e) => handleCardChange(index, 'term', e.target.value)}
                      placeholder="e.g. abundant"
                      style={{
                        ...inputStyle,
                        borderColor: duplicateIndex !== -1 ? '#f59e0b' : '#cbd5e1',
                        backgroundColor: duplicateIndex !== -1 ? '#fffbeb' : '#f8fafc',
                      }}
                    />
                    {duplicateIndex !== -1 && (
                      <div style={duplicateWarningStyle}>
                        <AlertCircle size={12} /> Duplicate word (Card #{duplicateIndex + 1})
                      </div>
                    )}
                    {termSuggestions[index] && termSuggestions[index].items?.length > 0 && (
                      <div style={suggestionsBoxStyle}>
                        <div style={suggestionHeaderStyle}>
                          <Wand2 size={12} /> Suggestions
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {termSuggestions[index].items.map((suggestion, suggestionIndex) => (
                            <button
                              key={`${suggestion.term}-${suggestionIndex}`}
                              type="button"
                              onClick={() => applyTermSuggestion(index, suggestion)}
                              style={suggestionBtnStyle}
                            >
                              <span>{suggestion.term}</span>
                              <span style={suggestionSourceBadgeStyle(suggestion.source)}>
                                {suggestion.source === 'api' ? 'API' : 'Set'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={fieldBlockStyle}>
                    <label style={labelStyle}>
                      <Tag size={13} style={{ marginRight: 4 }} /> Part of Speech
                    </label>
                    <input
                      value={card.partOfSpeech || card.part_of_speech || ''}
                      onChange={(e) => handleCardChange(index, 'partOfSpeech', e.target.value)}
                      placeholder="noun, verb, adj..."
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={singleFieldStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={labelStyle}>Definition</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {translatingIndex === index ? (
                        <span style={translatingIndicatorStyle}>
                          <Wand2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Translating...
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTranslateCard(index)}
                          style={translateCardBtnStyle}
                          title={`Auto-translate term to ${SUPPORTED_LANGUAGES.find((l) => l.code === definitionLang)?.label.split(' ')[1] || definitionLang}`}
                        >
                          <Wand2 size={12} /> Auto-Translate
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={card.definition || ''}
                    onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                    placeholder="Enter definition or translation..."
                    rows={2}
                    style={textareaStyle}
                  />
                </div>

                <div style={singleFieldStyle}>
                  <label style={labelStyle}>Example Sentence</label>
                  <textarea
                    value={card.exampleSentence || card.example_sentence || ''}
                    onChange={(e) => handleCardChange(index, 'exampleSentence', e.target.value)}
                    placeholder="e.g. There is abundant sunshine today."
                    rows={2}
                    style={textareaStyle}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={bottomActionRowStyle}>
          <button onClick={addCard} type="button" style={addCardBtnStyle}>
            <Plus size={15} /> Add Word
          </button>
          <button onClick={saveChanges} type="button" disabled={loading} style={primaryBtnStyle}>
            {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '20px 20px 40px',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  maxWidth: '1000px',
  margin: '0 auto',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  marginBottom: '16px',
};

const backBtnStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '14px',
  border: '1px solid rgba(148,163,184,0.18)',
  backgroundColor: '#ffffff',
  color: '#334155',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
  flexShrink: 0,
};

const eyebrowStyle = {
  display: 'inline-block',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#2563eb',
  fontSize: '9px',
  fontWeight: 800,
  marginBottom: '2px',
};

const titleStyle = {
  margin: 0,
  fontSize: '1.4rem',
  fontWeight: 800,
  color: '#0f172a',
};

const pageHeaderStyle = {
  display: 'flex',
  justify: 'space-between',
  gap: '16px',
  alignItems: 'center',
  marginBottom: '20px',
  padding: '16px 20px',
  borderRadius: '20px',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
  flexWrap: 'wrap',
};

const headerTagGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '6px',
};

const tagStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 12px',
  borderRadius: '999px',
  backgroundColor: '#e0e7ff',
  color: '#4338ca',
  fontSize: '0.725rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

const countBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 12px',
  borderRadius: '999px',
  backgroundColor: '#f1f5f9',
  color: '#475569',
  fontSize: '0.725rem',
  fontWeight: 600,
};

const pageTitleStyle = {
  margin: 0,
  fontSize: '1.5rem',
  fontWeight: 800,
  lineHeight: 1.2,
  color: '#0f172a',
  letterSpacing: '-0.02em',
};

const pageActionsStyle = {
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const ghostBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#334155',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const primaryBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  borderRadius: '12px',
  border: 'none',
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
  transition: 'all 0.2s ease',
};

const deleteBtnActionStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  borderRadius: '12px',
  border: '1px solid #fecaca',
  backgroundColor: '#fff1f2',
  color: '#e11d48',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const contentCardStyle = {
  padding: '20px',
  borderRadius: '24px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#ffffff',
  boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.05)',
};

const errorStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '16px',
  padding: '12px 16px',
  borderRadius: '14px',
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#991b1b',
  fontSize: '0.875rem',
  fontWeight: 500,
};

const successStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '16px',
  padding: '12px 16px',
  borderRadius: '14px',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  color: '#166534',
  fontSize: '0.875rem',
  fontWeight: 500,
};

const cardsGridStyle = {
  display: 'grid',
  gap: '14px',
};

const wordCardStyle = {
  width: '100%',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  padding: '14px 18px',
  backgroundColor: '#ffffff',
  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.02)',
  boxSizing: 'border-box',
};

const cardHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '12px',
  paddingBottom: '8px',
  borderBottom: '1px solid #f1f5f9',
};

const wordBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '3px 10px',
  borderRadius: '999px',
  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  color: '#ffffff',
  fontSize: '0.725rem',
  fontWeight: 700,
  letterSpacing: '0.03em',
};

const wordTitleStyle = {
  fontSize: '1rem',
  fontWeight: 700,
  color: '#0f172a',
};

const deleteBtnStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  border: '1px solid #fee2e2',
  backgroundColor: '#fff1f2',
  color: '#e11d48',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const fieldGridStyle = {
  display: 'grid',
  gap: '12px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  alignItems: 'start',
};

const singleFieldStyle = {
  display: 'grid',
  gap: '4px',
  marginTop: '10px',
};

const fieldBlockStyle = {
  display: 'grid',
  gap: '4px',
};

const labelStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: '0.8rem',
  color: '#475569',
  fontWeight: 600,
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#f8fafc',
  outline: 'none',
  fontSize: '0.875rem',
  color: '#0f172a',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease, background-color 0.2s ease',
};

const textareaStyle = {
  ...inputStyle,
  minHeight: '42px',
  resize: 'vertical',
  fontFamily: 'inherit',
  lineHeight: 1.4,
};

const suggestionsBoxStyle = {
  marginTop: '10px',
  padding: '12px',
  borderRadius: '16px',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
};

const suggestionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#15803d',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '8px',
};

const suggestionBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  border: '1px solid #86efac',
  backgroundColor: '#ffffff',
  color: '#15803d',
  borderRadius: '999px',
  padding: '5px 12px',
  cursor: 'pointer',
  fontSize: '0.825rem',
  fontWeight: 500,
};

const suggestionSourceBadgeStyle = (source) => ({
  fontSize: '0.65rem',
  fontWeight: 700,
  padding: '2px 6px',
  borderRadius: '999px',
  backgroundColor: source === 'api' ? '#dbeafe' : '#fef3c7',
  color: source === 'api' ? '#1e40af' : '#92400e',
});

const translatingIndicatorStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.775rem',
  color: '#6366f1',
  fontWeight: 600,
};

const duplicateWarningStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  marginTop: '4px',
  color: '#b45309',
  backgroundColor: '#fef3c7',
  padding: '3px 8px',
  borderRadius: '8px',
  fontSize: '0.75rem',
  fontWeight: 600,
};

const bottomActionRowStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '12px',
  marginTop: '16px',
  paddingTop: '14px',
  borderTop: '1px dashed #e2e8f0',
};

const addCardBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  borderRadius: '12px',
  border: 'none',
  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
  boxShadow: '0 4px 10px rgba(99, 102, 241, 0.25)',
  transition: 'all 0.2s ease',
};

const langSelectorBoxStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  padding: '6px 10px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
};

const langSelectInputStyle = {
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  fontSize: '0.825rem',
  fontWeight: 600,
  color: '#1e293b',
  cursor: 'pointer',
};

const translateCardBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#4f46e5',
  backgroundColor: '#eef2ff',
  border: '1px solid #c7d2fe',
  borderRadius: '6px',
  padding: '3px 8px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const translateAllBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '10px',
  border: '1px solid #c7d2fe',
  backgroundColor: '#eef2ff',
  color: '#4338ca',
  fontWeight: 600,
  fontSize: '0.825rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const cardLangBoxStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '2px 6px',
};

const cardLangSelectStyle = {
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  fontSize: '0.725rem',
  fontWeight: 700,
  color: '#334155',
  cursor: 'pointer',
};
