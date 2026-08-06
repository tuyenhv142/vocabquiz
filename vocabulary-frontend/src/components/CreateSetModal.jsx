import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Upload,
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  Wand2,
  Globe,
  Sparkles,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { formatChinesePinyin } from '../utils/pinyin';

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

function stripPinyin(text) {
  if (!text) return '';
  return String(text)
    .replace(/\s*\([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s,.'"-]+\)/gi, '')
    .trim();
}

function simplifyDefinition(text) {
  if (!text) return '';
  return String(text).trim().replace(/\s+/g, ' ');
}

function inferPartOfSpeech(term) {
  const t = String(term || '').toLowerCase().trim();
  if (t.endsWith('tion') || t.endsWith('ment') || t.endsWith('ness') || t.endsWith('ance') || t.endsWith('ence') || t.endsWith('ity')) return 'noun';
  if (t.endsWith('ly')) return 'adverb';
  if (t.endsWith('able') || t.endsWith('ive') || t.endsWith('ous') || t.endsWith('ful') || t.endsWith('ic') || t.endsWith('al') || t.endsWith('less')) return 'adjective';
  if (t.endsWith('ize') || t.endsWith('ise') || t.endsWith('ate') || t.endsWith('fy')) return 'verb';
  return 'noun';
}

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

function generateExampleSentence(term, partOfSpeech) {
  const cleanTerm = stripPinyin(term);
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

export default function CreateSetModal({ userId, onClose, onSetCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [termLang, setTermLang] = useState(() => localStorage.getItem('vocab_term_lang') || 'en');
  const [definitionLang, setDefinitionLang] = useState(() => localStorage.getItem('vocab_def_lang') || 'vi');
  
  const [cards, setCards] = useState([
    { term: '', definition: '', exampleSentence: '', partOfSpeech: '', termLang: 'en', definitionLang: 'vi' },
  ]);

  const [termSuggestions, setTermSuggestions] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [importStats, setImportStats] = useState(null);
  const suggestionQueries = useRef({});

  const handleHeaderTermLangChange = (e) => {
    const newLang = e.target.value;
    setTermLang(newLang);
    localStorage.setItem('vocab_term_lang', newLang);
  };

  const handleHeaderDefLangChange = (e) => {
    const newLang = e.target.value;
    setDefinitionLang(newLang);
    localStorage.setItem('vocab_def_lang', newLang);
  };

  // --- Handlers for Single Cards ---
  const handleCardChange = (index, field, value) => {
    const updatedCards = [...cards];
    updatedCards[index] = { ...updatedCards[index], [field]: value };
    setCards(updatedCards);

    const card = updatedCards[index];
    const cTermLang = card.termLang || termLang;
    const cDefLang = card.definitionLang || definitionLang;

    if (field === 'term') {
      const query = value.trim();
      suggestionQueries.current[index] = query;

      if (query.length >= 2) {
        autoDetectLanguage(query).then((detectedLang) => {
          if (detectedLang && detectedLang !== cTermLang) {
            setCards((prev) => {
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

      setTermSuggestions((prev) => ({
        ...prev,
        [index]: { items: [], loading: query.length >= 2, query: value },
      }));

      if (query.length >= 2) {
        fetchWordSuggestions(query, cTermLang).then((remoteSuggestions) => {
          if (suggestionQueries.current[index] !== query) return;
          setTermSuggestions((prev) => ({
            ...prev,
            [index]: { items: remoteSuggestions.slice(0, 5), loading: false, query: value },
          }));
        });

        if (!card.definition) {
          const translationQuery = query;
          translateToLanguage(translationQuery, cDefLang, cTermLang).then((translatedText) => {
            if (suggestionQueries.current[index] !== translationQuery) return;
            const translated = simplifyDefinition(translatedText || '');
            if (!translated) return;
            setCards((prev) => {
              const nextState = [...prev];
              if (!nextState[index].definition) {
                nextState[index] = { ...nextState[index], definition: translated };
              }
              return nextState;
            });
          });
        }
      }
    } else if (field === 'definition') {
      const query = value.trim();
      if (query.length >= 2) {
        autoDetectLanguage(query).then((detectedLang) => {
          if (detectedLang && detectedLang !== cDefLang) {
            setCards((prev) => {
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

  const handleCardLangChange = async (index, field, value) => {
    const prevCard = cards[index] || {};
    const card = { ...prevCard, [field]: value };
    const updatedCards = [...cards];
    updatedCards[index] = card;
    setCards(updatedCards);

    const query = stripPinyin(card.term || '').trim();

    if (field === 'termLang') {
      const newTermLang = value;
      let newTermText = query;

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

        setCards((prev) => {
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
      }
    } else if (field === 'definitionLang') {
      const newDefLang = value;
      const cTermLang = card.termLang || termLang || 'en';
      try {
        if (query) {
          const translatedDef = await translateToLanguage(query, newDefLang, cTermLang);
          if (translatedDef) {
            setCards((prev) => {
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
      }
    }
  };

  const applyTermSuggestion = async (index, suggestion) => {
    const current = cards[index] || {};
    const term = suggestion.term;
    const cTermLang = current.termLang || termLang;
    const cDefLang = current.definitionLang || definitionLang;

    const translatedDefinition = await translateToLanguage(term, cDefLang, cTermLang);
    const inferredPos = inferPartOfSpeech(term);
    const rawExample = generateExampleSentence(term, inferredPos);

    const posInTermLang = formatPosForLang(inferredPos, cTermLang);
    let finalExample = rawExample;
    if (cTermLang !== 'en' && rawExample) {
      const translatedEx = await translateToLanguage(rawExample, cTermLang, 'en');
      if (translatedEx) finalExample = stripPinyin(translatedEx);
    }

    const finalDefinition = simplifyDefinition(translatedDefinition || term);

    setCards((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...current,
        term: term,
        definition: finalDefinition,
        partOfSpeech: posInTermLang,
        exampleSentence: finalExample,
        termLang: cTermLang,
        definitionLang: cDefLang,
      };
      return updated;
    });

    setTermSuggestions((prev) => ({ ...prev, [index]: { items: [], loading: false, query: term } }));
  };

  const handleAutoTranslateAll = async () => {
    if (cards.length === 0) return;
    setLoading(true);
    const targetLabel = SUPPORTED_LANGUAGES.find((l) => l.code === definitionLang)?.label || definitionLang;
    setStatus(`Auto-detecting term languages and translating definitions to ${targetLabel}...`);
    setError('');

    try {
      const updated = await Promise.all(
        cards.map(async (card) => {
          const cleanTerm = stripPinyin(card.term);
          if (!cleanTerm) return card;

          const detectedTermLang = (await autoDetectLanguage(cleanTerm)) || card.termLang || termLang || 'en';
          const translatedDef = await translateToLanguage(cleanTerm, definitionLang, 'auto');
          const simplifiedDef = simplifyDefinition(translatedDef);
          const posFormatted = formatPosForLang(card.partOfSpeech || inferPartOfSpeech(cleanTerm), detectedTermLang);

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
      setCards(updated);
      setStatus(`All cards auto-detected and translated to ${targetLabel}!`);
    } catch (err) {
      console.error('Translate All Error:', err);
      setError('Failed to translate cards.');
    } finally {
      setLoading(false);
    }
  };

  const addEmptyCard = () => {
    setCards([...cards, { term: '', definition: '', exampleSentence: '', partOfSpeech: '', termLang, definitionLang }]);
  };

  const removeCard = (index) => {
    if (cards.length === 1) return;
    setCards(cards.filter((_, i) => i !== index));
  };

  // --- Handlers for File Upload (CSV & Excel) ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv' || fileExtension === 'tsv' || fileExtension === 'txt') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processParsedData(results.data);
        },
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        processParsedData(json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file format. Please upload a .csv, .xlsx, or .txt file.');
    }
  };

  const getColumnValue = (row, possibleNames) => {
    if (!row || typeof row !== 'object') return '';
    const keys = Object.keys(row);
    for (const name of possibleNames) {
      const normTarget = name.toLowerCase().replace(/[\s_]/g, '');
      const foundKey = keys.find((k) => k.toLowerCase().replace(/[\s_]/g, '') === normTarget);
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
        return String(row[foundKey]).trim();
      }
    }
    return '';
  };

  const processParsedData = (parsedRows) => {
    const formattedCards = parsedRows
      .map((row) => {
        const term = getColumnValue(row, ['term', 'word', 'vocabulary', 'vocab']);
        const definition = getColumnValue(row, ['definition', 'meaning', 'translation', 'def']);
        const exampleSentence = getColumnValue(row, ['exampleSentence', 'example_sentence', 'example', 'sentence', 'examples']);
        const partOfSpeech = getColumnValue(row, ['partOfSpeech', 'part_of_speech', 'pos', 'type']);

        return {
          term,
          definition: definitionLang.startsWith('zh') ? formatChinesePinyin(definition) : definition,
          exampleSentence,
          partOfSpeech,
          termLang,
          definitionLang,
        };
      })
      .filter((c) => c.term || c.definition);

    if (formattedCards.length === 0) {
      alert('No valid words found in file. Make sure your file has headers like "Term" and "Definition".');
      return;
    }

    setCards((prevCards) => {
      const cleanedExisting = prevCards.filter((c) => c.term || c.definition);
      return [...cleanedExisting, ...formattedCards];
    });

    setImportStats(`Successfully imported ${formattedCards.length} words from file!`);
  };

  // --- Submit Everything to Backend ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      alert('Please log in before creating a new set.');
      return;
    }
    if (!title.trim()) return alert('Please enter a set title.');

    const validCards = cards
      .map((c) => ({
        term: stripPinyin(c.term),
        definition: c.definition,
        exampleSentence: c.exampleSentence,
        partOfSpeech: c.partOfSpeech,
      }))
      .filter((c) => c.term && c.definition);

    if (validCards.length === 0) return alert('Please add at least one card with a term and definition.');

    setLoading(true);
    const API_BASE = typeof window !== 'undefined' && window.location.origin.includes('5173')
      ? 'http://localhost:5000'
      : '';

    try {
      const setRes = await fetch(`${API_BASE}/api/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title, description, isPublic: true }),
      });
      const newSet = await setRes.json();

      if (!setRes.ok) throw new Error(newSet.error || 'Failed to create set');

      const cardsRes = await fetch(`${API_BASE}/api/sets/${newSet.id}/cards/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: validCards }),
      });

      if (!cardsRes.ok) {
        const cardsData = await cardsRes.json();
        throw new Error(cardsData.error || 'Failed to save cards');
      }

      setLoading(false);
      if (onSetCreated) onSetCreated(newSet.id);
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error saving set.');
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContainerStyle}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', pb: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                <Sparkles size={12} style={{ marginRight: 4 }} /> New Vocabulary Set
              </span>
            </div>
            <h2 style={{ margin: '6px 0 0', fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>Create Vocabulary Set</h2>
          </div>
          <button onClick={onClose} style={closeBtnStyle} title="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Metadata Section */}
          <div style={{ marginBottom: '20px', display: 'grid', gap: '12px' }}>
            <input
              type="text"
              placeholder="Set Title (e.g. TOEFL Core Vocabulary 500)*"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, height: '60px', resize: 'vertical' }}
            />
          </div>

          {/* Import Dropzone Section & Global Language Toolbar */}
          <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
            
            <div style={dropzoneStyle}>
              <Upload size={28} color="#3b82f6" />
              <div style={{ marginLeft: '12px', textAlign: 'left', flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>Import Words from File</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Upload .csv, .tsv, or .xlsx (Auto-detects Term, Definition, Example headers)</div>
              </div>
              <input
                type="file"
                accept=".csv, .tsv, .xlsx, .xls, .txt"
                onChange={handleFileUpload}
                style={fileInputStyle}
              />
            </div>

            {importStats && (
              <div style={badgeStyle}>
                <CheckCircle size={16} color="#16a34a" style={{ marginRight: '6px' }} />
                {importStats}
              </div>
            )}

            {/* Global Language Selector & Batch Translate Toolbar */}
            <div style={toolbarBoxStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={langSelectorBoxStyle} title="Select language of terms (words)">
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Term:</span>
                  <select
                    value={termLang}
                    onChange={handleHeaderTermLangChange}
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

                <div style={langSelectorBoxStyle} title="Select target definition language">
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Def:</span>
                  <select
                    value={definitionLang}
                    onChange={handleHeaderDefLangChange}
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
                type="button"
                onClick={handleAutoTranslateAll}
                disabled={loading}
                style={translateAllBtnStyle}
                title="Auto-detect terms and translate all definitions to selected definition language"
              >
                <Wand2 size={14} /> Translate All
              </button>
            </div>
          </div>

          {status && (
            <div style={successStyle}>
              <CheckCircle size={16} style={{ marginRight: '6px' }} />
              {status}
            </div>
          )}

          {error && (
            <div style={errorStyle}>
              <AlertCircle size={16} style={{ marginRight: '6px' }} />
              {error}
            </div>
          )}

          {/* Words Preview / Edit List */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: 700 }}>
              Word Cards ({cards.length})
            </h3>
          </div>

          <div style={{ maxHeight: '540px', overflowY: 'auto', paddingRight: '8px', paddingBottom: '160px', display: 'grid', gap: '14px' }}>
            {cards.map((card, index) => (
              <div key={index} style={{ ...cardRowContainerStyle, zIndex: termSuggestions[index]?.items?.length ? 100 : cards.length - index, position: 'relative' }}>
                
                {/* Row Header */}
                <div style={cardRowHeaderStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '12px' }}>
                      #{index + 1}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                      {card.term || 'New Word'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={cardLangBoxStyle} title="Languages for this card">
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

                    <button
                      type="button"
                      onClick={() => removeCard(index)}
                      style={iconBtnStyle}
                      title="Delete Card"
                      disabled={cards.length === 1}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  </div>
                </div>

                {/* Fields Grid */}
                <div style={cardRowGridStyle}>
                  
                  {/* Term Input & Suggestions */}
                  <div style={{ position: 'relative', zIndex: termSuggestions[index]?.items?.length ? 101 : 1 }}>
                    <label style={fieldLabelStyle}>Term (Word)*</label>
                    <input
                      type="text"
                      placeholder="e.g. abundant"
                      value={card.term}
                      onChange={(e) => handleCardChange(index, 'term', e.target.value)}
                      style={rowInputStyle}
                    />
                    {termSuggestions[index] && termSuggestions[index].items?.length > 0 && (
                      <div style={suggestionsBoxStyle}>
                        <div style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ✨ Word Suggestions
                        </div>
                        {termSuggestions[index].items.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => applyTermSuggestion(index, sug)}
                            style={suggestionItemStyle}
                          >
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{sug.term}</span>
                            <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 600 }}>Select</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Definition Input */}
                  <div>
                    <label style={fieldLabelStyle}>Definition*</label>
                    <input
                      type="text"
                      placeholder="e.g. Dồi dào"
                      value={card.definition}
                      onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                      style={rowInputStyle}
                    />
                  </div>

                  {/* POS Input */}
                  <div>
                    <label style={fieldLabelStyle}>POS</label>
                    <input
                      type="text"
                      placeholder="e.g. noun / Tính từ"
                      value={card.partOfSpeech}
                      onChange={(e) => handleCardChange(index, 'partOfSpeech', e.target.value)}
                      style={rowInputStyle}
                    />
                  </div>

                  {/* Example Sentence Input */}
                  <div>
                    <label style={fieldLabelStyle}>Example Sentence</label>
                    <input
                      type="text"
                      placeholder="e.g. Results were abundant."
                      value={card.exampleSentence}
                      onChange={(e) => handleCardChange(index, 'exampleSentence', e.target.value)}
                      style={rowInputStyle}
                    />
                  </div>

                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={addEmptyCard}
              style={addBtnStyle}
            >
              <Plus size={16} style={{ marginRight: '6px' }} /> Add Word Card
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} style={cancelBtnStyle}>
                Cancel
              </button>
              <button type="submit" disabled={loading} style={saveBtnStyle}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Loader2 size={16} className="spin" /> Saving...
                  </span>
                ) : (
                  'Create & Save Set'
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}

// --- Inline Styles ---
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.75)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  justify: 'center',
  alignItems: 'center',
  zIndex: 1000,
};

const modalContainerStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '28px',
  width: '92%',
  maxWidth: '960px',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
};

const dropzoneStyle = {
  position: 'relative',
  border: '2px dashed #93c5fd',
  backgroundColor: '#eff6ff',
  borderRadius: '14px',
  padding: '16px 20px',
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  transition: 'border-color 0.2s ease',
};

const fileInputStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
};

const badgeStyle = {
  backgroundColor: '#dcfce7',
  color: '#15803d',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
};

const toolbarBoxStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '10px 14px',
  flexWrap: 'wrap',
  gap: '10px',
};

const langSelectorBoxStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '4px 10px',
};

const langSelectInputStyle = {
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#1e293b',
  cursor: 'pointer',
};

const translateAllBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 14px',
  borderRadius: '8px',
  border: '1px solid #c7d2fe',
  backgroundColor: '#eef2ff',
  color: '#4338ca',
  fontWeight: 700,
  fontSize: '0.8rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const cardRowContainerStyle = {
  backgroundColor: '#f8fafc',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  padding: '14px',
  display: 'grid',
  gap: '10px',
};

const cardRowHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #e2e8f0',
  paddingBottom: '8px',
};

const cardRowGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '10px',
};

const fieldLabelStyle = {
  display: 'block',
  fontSize: '0.725rem',
  fontWeight: 700,
  color: '#64748b',
  marginBottom: '4px',
};

const rowInputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  boxSizing: 'border-box',
  outline: 'none',
  backgroundColor: '#ffffff',
};

const cardLangBoxStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '2px 6px',
};

const cardLangSelectStyle = {
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: '#334155',
  cursor: 'pointer',
};

const suggestionsBoxStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  backgroundColor: '#ffffff',
  border: '2px solid #6366f1',
  borderRadius: '12px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  zIndex: 99999,
  marginTop: '4px',
  overflow: 'hidden',
};

const suggestionItemStyle = {
  width: '100%',
  textAlign: 'left',
  padding: '10px 14px',
  backgroundColor: '#ffffff',
  border: 'none',
  borderBottom: '1px solid #f1f5f9',
  cursor: 'pointer',
  fontSize: '13px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  transition: 'background-color 0.15s ease',
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#64748b',
  padding: '4px',
  borderRadius: '6px',
};

const iconBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '6px',
  display: 'inline-flex',
  alignItems: 'center',
};

const addBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '10px 16px',
  backgroundColor: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: 700,
  color: '#334155',
  fontSize: '0.875rem',
};

const cancelBtnStyle = {
  padding: '10px 18px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
  color: '#475569',
};

const saveBtnStyle = {
  padding: '10px 22px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '0.875rem',
};

const successStyle = {
  backgroundColor: '#dcfce7',
  color: '#15803d',
  padding: '10px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  marginBottom: '12px',
};

const errorStyle = {
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  padding: '10px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  marginBottom: '12px',
};