import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from '../config';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Trophy,
  Target,
  Volume2,
  Clock,
  Zap,
  HelpCircle,
  Hourglass,
  Flame,
  Lightbulb,
  Keyboard,
  Type,
  ListFilter,
} from 'lucide-react';

const LearningStatus = {
  UNLEARNED: 'UNLEARNED',
  LEARNING: 'LEARNING',
  MASTERED: 'MASTERED',
};

const QuestionType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  WRITTEN_INPUT: 'WRITTEN_INPUT',
};

const PUNCTUATION_REGEX = /[.,\/#!$%\^&\*;:{}=\-_`~()\[\]\"']/g;

function normalizeText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(PUNCTUATION_REGEX, '')
    .replace(/\s+/g, ' ');
}

function levenshtein(a, b) {
  const matrix = [];
  const lenA = a.length;
  const lenB = b.length;

  for (let i = 0; i <= lenA; i += 1) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= lenB; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= lenA; i += 1) {
    for (let j = 1; j <= lenB; j += 1) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }

  return matrix[lenA][lenB];
}

function isTypo(input, target) {
  const cleanedInput = normalizeText(input);
  const cleanedTarget = normalizeText(target);
  return cleanedTarget.length > 5 && levenshtein(cleanedInput, cleanedTarget) === 1;
}

function stripParentheses(text) {
  if (!text) return '';
  return String(text)
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .trim();
}

function removeAccents(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function checkWrittenAnswer(input, target) {
  if (!input || !target) return false;
  const cleanTarget = stripParentheses(target);
  const normInput = normalizeText(input);
  const normTarget = normalizeText(cleanTarget);

  if (normInput === normTarget) return true;
  if (removeAccents(normInput) === removeAccents(normTarget)) return true;

  const subDefinitions = cleanTarget.split(/[,;/]/).map((d) => normalizeText(d));
  if (subDefinitions.some((sub) => sub === normInput || removeAccents(sub) === removeAccents(normInput))) {
    return true;
  }

  if (normTarget.length > 5 && isTypo(input, cleanTarget)) return true;

  return false;
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function buildSessionQueue(cards, isEngToVie = true) {
  return cards.map((card, index) => ({
    id: card.id ?? `${card.term}-${card.definition}-${index}`,
    term: card.term || '',
    definition: card.definition || '',
    partOfSpeech: card.partOfSpeech || card.part_of_speech || '',
    exampleSentence: card.exampleSentence || card.example_sentence || '',
    status: LearningStatus.UNLEARNED,
    streak: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: null,
    lastReviewedAt: null,
    isEngToVie: isEngToVie,
  }));
}

function getQuestionText(card) {
  return card.isEngToVie ? card.term : card.definition;
}

function getCorrectAnswer(card) {
  return card.isEngToVie ? card.definition : card.term;
}

function playPronunciation(text) {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const cleanText = text.replace(/^[“"'\s]+|[”"'\s]+$/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

const FALLBACK_VIETNAMESE_DISTRACTORS = [
  'phổ biến',
  'quan trọng',
  'chính xác',
  'bất ngờ',
  'sáng tạo',
  'đa dạng',
  'hiệu quả',
  'linh hoạt',
  'thiết yếu',
  'phát hiện',
  'tự nhiên',
  'cơ bản',
];

const FALLBACK_ENGLISH_DISTRACTORS = [
  'important',
  'accurate',
  'unexpected',
  'creative',
  'diverse',
  'effective',
  'flexible',
  'essential',
  'discover',
  'natural',
  'basic',
  'popular',
];

function buildOptions(allCards, currentCard) {
  if (!currentCard) return [];
  const isEngToVie = currentCard.isEngToVie;
  const correct = isEngToVie ? currentCard.definition : currentCard.term;

  const candidates = allCards
    .filter((card) => card.id !== currentCard.id)
    .map((card) => (isEngToVie ? card.definition : card.term))
    .filter((ans) => ans && ans.trim().toLowerCase() !== correct.trim().toLowerCase());

  const uniqueCandidates = [...new Set(candidates)];
  const selected = shuffle(uniqueCandidates).slice(0, 3);

  const fallbackList = isEngToVie ? FALLBACK_VIETNAMESE_DISTRACTORS : FALLBACK_ENGLISH_DISTRACTORS;
  const shuffledFallbacks = shuffle(fallbackList);

  for (const fallback of shuffledFallbacks) {
    if (selected.length >= 3) break;
    if (
      fallback.toLowerCase() !== correct.trim().toLowerCase() &&
      !selected.some((s) => s.toLowerCase() === fallback.toLowerCase())
    ) {
      selected.push(fallback);
    }
  }

  return shuffle([correct, ...selected]);
}

function reinsertCard(queue, currentId, updatedCard, stepsAhead = 3) {
  const currentIndex = queue.findIndex((c) => c.id === currentId);
  const remaining = queue.filter((c) => c.id !== currentId);
  const insertAt = currentIndex >= 0 ? Math.min(currentIndex + stepsAhead, remaining.length) : remaining.length;
  remaining.splice(insertAt, 0, updatedCard);
  return remaining;
}

const SLOW_TIME_THRESHOLD_SECONDS = 7;

export default function PracticePage({ setInfo, cards = [], onBack, onPracticeComplete }) {
  const [questionDirection, setQuestionDirection] = useState('termToDef'); // 'termToDef' | 'defToTerm'
  const [sessionQueue, setSessionQueue] = useState(() => buildSessionQueue(cards, true));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [practiceMode, setPracticeMode] = useState(QuestionType.MULTIPLE_CHOICE);

  const [inputValue, setInputValue] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Time & Analytics State
  const [questionStartTime, setQuestionStartTime] = useState(() => Date.now());
  const [questionTimings, setQuestionTimings] = useState([]);
  const [wrongCards, setWrongCards] = useState([]);
  const [slowCards, setSlowCards] = useState([]);

  // Ref-backed accuracy tracking to prevent state lag
  const firstAttemptSetRef = useRef(new Set());
  const firstAttemptWrongSetRef = useRef(new Set());
  const wrongCardsRef = useRef([]);

  const handleDirectionChange = (dir) => {
    setQuestionDirection(dir);
    const isEng = dir === 'termToDef';
    setSessionQueue((prev) =>
      prev.map((c) => ({
        ...c,
        isEngToVie: isEng,
      }))
    );
  };

  const inputRef = useRef(null);

  // Auto-focus input box whenever question changes or written mode is activated
  useEffect(() => {
    if (practiceMode === QuestionType.WRITTEN_INPUT && !feedback && !isFinished) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, practiceMode, feedback, isFinished]);

  // Live Silent Timer for question start
  useEffect(() => {
    if (isFinished || !cards.length || feedback) return;
    setQuestionStartTime(Date.now());
    setShowHint(false);
  }, [currentIndex, isFinished, feedback, cards.length]);

  useEffect(() => {
    setSessionQueue(buildSessionQueue(cards, questionDirection === 'termToDef'));
    setCurrentIndex(0);
    setInputValue('');
    setSelectedAnswer('');
    setFeedback(null);
    setShowCorrection(false);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setShowHint(false);
    setIsFinished(false);
    setWrongCards([]);
    setSlowCards([]);
    setQuestionTimings([]);
    firstAttemptSetRef.current.clear();
    firstAttemptWrongSetRef.current.clear();
    wrongCardsRef.current = [];
  }, [cards, questionDirection]);

  const currentCard = sessionQueue[currentIndex] || null;
  const questionText = currentCard ? getQuestionText(currentCard) : '';
  const correctAnswer = currentCard ? getCorrectAnswer(currentCard) : '';

  const choices = useMemo(() => {
    if (!currentCard) return [];
    return buildOptions(cards.length > 0 ? cards : sessionQueue, currentCard);
  }, [currentCard?.id, currentCard?.term, currentCard?.definition, currentCard?.isEngToVie]);

  // Keyboard Shortcuts (1, 2, 3, 4 for options, Space for audio, Enter to advance on wrong answer)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFinished) return;

      if (feedback && !feedback.isCorrect) {
        if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          handleContinueNext();
          return;
        }
      }

      if (feedback) return;

      // Don't intercept number keys if typing in text input
      if (practiceMode === QuestionType.WRITTEN_INPUT) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        playPronunciation(currentCard?.term || questionText);
        return;
      }

      if (practiceMode === QuestionType.MULTIPLE_CHOICE && choices.length > 0) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= choices.length) {
          e.preventDefault();
          handleChoice(choices[num - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinished, feedback, practiceMode, choices, currentCard, questionText, sessionQueue, currentIndex]);

  const completed = isFinished;

  const finishPractice = async () => {
    setIsFinished(true);
    setFeedback(null);
    setShowCorrection(false);

    const totalUnique = cards.length > 0 ? cards.length : (sessionQueue.length || 1);
    const wrongUniqueCount = firstAttemptWrongSetRef.current.size;
    const masteredCount = Math.max(0, totalUnique - wrongUniqueCount);
    const pct = Math.min(100, Math.max(0, Math.round((masteredCount / totalUnique) * 100)));

    console.log(`📊 [PRACTICE FINISHED] ${masteredCount}/${totalUnique} correct (${pct}%)`);

    if (setInfo?.id && totalUnique > 0) {
      try {
        const res = await fetch(`${API_BASE}/api/sets/${setInfo.id}/practice`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ percentage: pct, score: masteredCount, total: totalUnique }),
        });
        if (res.ok) {
          const updatedSet = await res.json();
          console.log(`✅ Backend returned updated set:`, updatedSet);
          onPracticeComplete?.(updatedSet);
        } else {
          console.error(`❌ Backend error status ${res.status}`);
        }
      } catch (err) {
        console.error('Failed to save practice results:', err);
      }
    }
  };

  const processQuestionAnswer = (isCorrect, chosenText) => {
    if (!currentCard || feedback) return;

    const cardId = currentCard.id || currentCard.term;

    // Track first-attempt accuracy
    if (!firstAttemptSetRef.current.has(cardId)) {
      firstAttemptSetRef.current.add(cardId);
      if (!isCorrect) {
        firstAttemptWrongSetRef.current.add(cardId);
      }
    }

    const timeTaken = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));
    const isSlow = timeTaken >= SLOW_TIME_THRESHOLD_SECONDS;
    let newScore = score;
    let newStreak = streak;

    const timingRecord = {
      term: currentCard.term,
      definition: currentCard.definition,
      timeTaken,
      isCorrect,
      isSlow,
    };

    setQuestionTimings((prev) => [...prev, timingRecord]);

    if (isSlow) {
      setSlowCards((prev) => {
        if (prev.some((c) => c.term === currentCard.term)) return prev;
        return [...prev, {
          id: cardId,
          term: currentCard.term,
          definition: currentCard.definition,
          questionText,
          correctAnswer,
          timeTaken,
        }];
      });
    }

    if (!isCorrect) {
      if (!wrongCardsRef.current.some((c) => c.id === cardId)) {
        wrongCardsRef.current.push({
          id: cardId,
          term: currentCard.term,
          definition: currentCard.definition,
          questionText,
          correctAnswer,
          userAnswer: chosenText,
        });
        setWrongCards([...wrongCardsRef.current]);
      }
    }

    let feedbackMsg = '';
    if (isCorrect) {
      newScore = score + 1;
      newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      feedbackMsg = '✓ Correct!';
    } else {
      setStreak(0);
      feedbackMsg = `✗ Incorrect — correct answer: "${correctAnswer}"`;
    }

    setFeedback({
      isCorrect,
      isSlow,
      timeTaken,
      userAnswer: chosenText,
      message: feedbackMsg,
    });

    // Re-queue card to end of session if wrong or slow for extra practice:
    if (!isCorrect || isSlow) {
      setSessionQueue((prevQueue) => [...prevQueue, currentCard]);
    }

    // Auto-advance: 2.4s for written mistakes so user can study correct answer, 1.1s for others
    const delay = !isCorrect && practiceMode === QuestionType.WRITTEN_INPUT ? 2400 : 1100;
    setTimeout(() => {
      setSelectedAnswer('');
      setInputValue('');
      setFeedback(null);

      const nextIdx = currentIndex + 1;
      setSessionQueue((latestQueue) => {
        if (nextIdx >= latestQueue.length) {
          finishPractice();
        } else {
          setCurrentIndex(nextIdx);
        }
        return latestQueue;
      });
    }, delay);
  };

  const handleContinueNext = () => {
    setSelectedAnswer('');
    setInputValue('');
    setFeedback(null);

    const nextIdx = currentIndex + 1;
    setSessionQueue((latestQueue) => {
      if (nextIdx >= latestQueue.length) {
        finishPractice();
      } else {
        setCurrentIndex(nextIdx);
      }
      return latestQueue;
    });
  };

  const handleChoice = (choice) => {
    setSelectedAnswer(choice);
    const isCorrect = choice === correctAnswer;
    processQuestionAnswer(isCorrect, choice);
  };

  const handlePracticeWrongOrSlow = () => {
    const combinedNeedPractice = [...new Set([...wrongCards, ...slowCards].map((c) => c.term))];
    const targetCards = cards.filter((c) => combinedNeedPractice.includes(c.term));
    const practiceOnly = (targetCards.length > 0 ? targetCards : cards).map((c, idx) => ({
      id: c.id ?? `${c.term}-${idx}`,
      term: c.term,
      definition: c.definition,
      partOfSpeech: c.partOfSpeech || c.part_of_speech || '',
      exampleSentence: c.exampleSentence || c.example_sentence || '',
      status: LearningStatus.UNLEARNED,
      streak: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      nextReviewAt: null,
      lastReviewedAt: null,
      isEngToVie: Math.random() > 0.5,
    }));

    setSessionQueue(shuffle(practiceOnly));
    setCurrentIndex(0);
    setInputValue('');
    setSelectedAnswer('');
    setFeedback(null);
    setShowCorrection(false);
    setScore(0);
    setStreak(0);
    setIsFinished(false);
    setWrongCards([]);
    setSlowCards([]);
    setQuestionTimings([]);
  };

  const handleWrittenSubmit = () => {
    if (!currentCard || feedback || !inputValue.trim()) return;
    const isCorrect = checkWrittenAnswer(inputValue, correctAnswer);
    processQuestionAnswer(isCorrect, inputValue);
  };

  if (!cards.length) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <button onClick={onBack} style={backBtnStyle}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <span style={eyebrowStyle}>Practice Mode</span>
            <h1 style={titleStyle}>{setInfo?.title || 'Vocabulary Practice'}</h1>
          </div>
        </div>
        <div style={emptyStyle}>No cards available for practice.</div>
      </div>
    );
  }

  // --- Session Completion Summary ---
  if (completed) {
    const initialTotal = cards.length > 0 ? cards.length : sessionQueue.length;
    const wrongCount = wrongCards.length;
    const masteredCount = Math.max(0, initialTotal - wrongCount);
    const percentage = initialTotal > 0 ? Math.round((masteredCount / initialTotal) * 100) : 0;
    const hasWrongCards = wrongCards.length > 0;
    const hasSlowCards = slowCards.length > 0;

    const totalTimeTaken = questionTimings.reduce((sum, t) => sum + t.timeTaken, 0);
    const avgTimePerQuestion = questionTimings.length > 0 ? (totalTimeTaken / questionTimings.length).toFixed(1) : 0;

    let recommendation = '';
    let recColor = '#15803d';
    if (percentage >= 90 && !hasSlowCards) {
      recommendation = 'Outstanding speed & accuracy! You have fully mastered this vocabulary set! 🎉';
      recColor = '#15803d';
    } else if (percentage >= 75) {
      recommendation = 'Great job! A few extra speed rounds will make your recall effortless.';
      recColor = '#ca8a04';
    } else if (percentage >= 50) {
      recommendation = 'Good effort! Focus on the slow and incorrect words to build faster recall.';
      recColor = '#ea580c';
    } else {
      recommendation = 'Practice makes perfect! Review the slow words below and test again.';
      recColor = '#dc2626';
    }

    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <button onClick={onBack} style={backBtnStyle}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <span style={eyebrowStyle}>Practice Completed</span>
            <h1 style={titleStyle}>{setInfo?.title || 'Vocabulary Practice'}</h1>
          </div>
        </div>

        <div style={achievementCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Trophy size={28} color="#f59e0b" />
            <h2 style={{ margin: 0 }}>Practice Results</h2>
          </div>

          {/* Percentage Circle & Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', alignItems: 'center', margin: '16px 0', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: `conic-gradient(${recColor} ${percentage * 3.6}deg, #e2e8f0 0deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    color: recColor,
                  }}
                >
                  {percentage}%
                </div>
              </div>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Accuracy</span>
            </div>

            {/* Streak Stat Card */}
            <div style={timeStatCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem' }}>
                <Flame size={16} /> Max Streak
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                {maxStreak} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>in a row</span>
              </div>
            </div>

            {/* Response Time Metric Card */}
            <div style={timeStatCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 700, fontSize: '0.85rem' }}>
                <Clock size={16} /> Avg Speed
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                {avgTimePerQuestion}s <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>/ ques</span>
              </div>
            </div>
          </div>

          {/* Recommendation Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '14px',
              backgroundColor: `${recColor}12`,
              border: `1px solid ${recColor}30`,
              color: recColor,
              fontWeight: 600,
              fontSize: '0.9rem',
              textAlign: 'center',
            }}
          >
            <Target size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            {recommendation}
          </div>

          {/* Slow Words List */}
          {hasSlowCards && (
            <div style={{ textAlign: 'left', width: '100%', marginTop: '12px' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.9rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Hourglass size={16} /> Slow Recall Terms (&gt;{SLOW_TIME_THRESHOLD_SECONDS}s):
              </p>
              <div style={{ display: 'grid', gap: '6px' }}>
                {slowCards.map((sc) => (
                  <div
                    key={sc.id}
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#fffbe3',
                      border: '1px solid #fef08a',
                      fontSize: '0.88rem',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a', marginRight: '8px' }}>{sc.questionText || sc.term}</span>
                      <span style={{ color: '#64748b' }}>➔ {sc.correctAnswer || sc.definition}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wrong Cards List */}
          {hasWrongCards && (
            <div style={{ textAlign: 'left', width: '100%', marginTop: '12px' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.9rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} /> Incorrect Terms ({wrongCards.length}):
              </p>
              <div style={{ display: 'grid', gap: '6px' }}>
                {wrongCards.map((wc) => (
                  <div
                    key={wc.id}
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      fontSize: '0.88rem',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{wc.questionText || wc.term}</span>
                      <span style={{ color: '#64748b', marginLeft: '8px' }}>➔ {wc.correctAnswer || wc.definition}</span>
                    </div>
                    {wc.userAnswer && (
                      <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
                        Your answer: "{wc.userAnswer}"
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '14px' }}>
            {(hasWrongCards || hasSlowCards) && (
              <button
                onClick={handlePracticeWrongOrSlow}
                style={{
                  ...nextBtnStyle,
                  backgroundColor: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RotateCcw size={15} />
                Retest Slow & Incorrect Words ({wrongCards.length + slowCards.length})
              </button>
            )}
            <button
              onClick={onBack}
              style={{
                ...nextBtnStyle,
                backgroundColor: hasWrongCards || hasSlowCards ? '#64748b' : '#2563eb',
              }}
            >
              Back to Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = Math.round(((currentIndex + 1) / sessionQueue.length) * 100);

  return (
    <div style={pageStyle}>
      {/* Header Bar */}
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtnStyle} aria-label="Back to Review">
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={eyebrowStyle}>Practice Mode</span>
            {streak > 1 && (
              <span style={streakBadgeStyle}>
                <Flame size={14} color="#f59e0b" /> {streak} Streak!
              </span>
            )}
          </div>
          <h1 style={titleStyle}>{setInfo?.title || 'Vocabulary Practice'}</h1>
        </div>
      </div>

      {/* Progress Bar & Practice Mode Switcher */}
      <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
          <span>Question {currentIndex + 1} of {sessionQueue.length}</span>
          <span>{progressPct}% Complete</span>
        </div>

        {/* Animated Progress Bar */}
        <div style={progressBarContainerStyle}>
          <div style={{ ...progressBarFillStyle, width: `${progressPct}%` }} />
        </div>

        {/* Mode Switcher & Direction Toolbar */}
        <div style={modeToolbarStyle}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setPracticeMode(QuestionType.MULTIPLE_CHOICE)}
              style={{
                ...modeBtnStyle,
                backgroundColor: practiceMode === QuestionType.MULTIPLE_CHOICE ? '#ffffff' : 'transparent',
                color: practiceMode === QuestionType.MULTIPLE_CHOICE ? '#2563eb' : '#64748b',
                boxShadow: practiceMode === QuestionType.MULTIPLE_CHOICE ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <ListFilter size={14} /> Multiple Choice
            </button>
            <button
              type="button"
              onClick={() => setPracticeMode(QuestionType.WRITTEN_INPUT)}
              style={{
                ...modeBtnStyle,
                backgroundColor: practiceMode === QuestionType.WRITTEN_INPUT ? '#ffffff' : 'transparent',
                color: practiceMode === QuestionType.WRITTEN_INPUT ? '#2563eb' : '#64748b',
                boxShadow: practiceMode === QuestionType.WRITTEN_INPUT ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <Type size={14} /> Written Input
            </button>

            <div style={{ width: '1px', backgroundColor: '#cbd5e1', margin: '0 4px' }} />

            {/* Direction Selector */}
            <button
              type="button"
              onClick={() => handleDirectionChange('termToDef')}
              style={{
                ...modeBtnStyle,
                backgroundColor: questionDirection === 'termToDef' ? '#ffffff' : 'transparent',
                color: questionDirection === 'termToDef' ? '#16a34a' : '#64748b',
                boxShadow: questionDirection === 'termToDef' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
              title="Test Term → Definition (Default)"
            >
              Term ➔ Definition
            </button>
            <button
              type="button"
              onClick={() => handleDirectionChange('defToTerm')}
              style={{
                ...modeBtnStyle,
                backgroundColor: questionDirection === 'defToTerm' ? '#ffffff' : 'transparent',
                color: questionDirection === 'defToTerm' ? '#16a34a' : '#64748b',
                boxShadow: questionDirection === 'defToTerm' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
              title="Test Definition → Term"
            >
              Definition ➔ Term
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.725rem', color: '#64748b' }}>
            <Keyboard size={13} />
            <span>Keys 1-4 for options • Space for Audio</span>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div style={cardStyle}>
        
        {/* Question Header & Hint */}
        <div style={questionMetaStyle}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', backgroundColor: '#e0e7ff', padding: '4px 12px', borderRadius: '12px' }}>
            {currentCard?.isEngToVie ? '🇬🇧 English → 🇻🇳 Definition' : '🇻🇳 Definition → 🇬🇧 English'}
          </span>

          <button
            type="button"
            onClick={() => setShowHint(!showHint)}
            style={hintBtnStyle}
            title="Reveal hint for this term"
          >
            <Lightbulb size={13} color="#ca8a04" /> Hint
          </button>
        </div>

        {/* Question Word & Audio (Centered) */}
        <div style={questionContainerStyle}>
          <div style={questionStyle}>{questionText}</div>
          <button
            onClick={() => playPronunciation(currentCard?.term || questionText)}
            style={audioBtnStyle}
            title="Listen to English pronunciation (Press Spacebar)"
            aria-label="Listen to English pronunciation"
          >
            <Volume2 size={22} />
          </button>
        </div>

        {/* Hint Box (Centered) */}
        {showHint && currentCard && (
          <div style={hintBoxStyle}>
            <Lightbulb size={18} color="#ca8a04" style={{ flexShrink: 0 }} />
            <div>
              {currentCard.partOfSpeech && (
                <div style={{ fontWeight: 700, color: '#854d0e', fontSize: '0.85rem' }}>
                  Part of Speech: {currentCard.partOfSpeech}
                </div>
              )}
              {currentCard.exampleSentence && (
                <div style={{ color: '#713f12', fontSize: '0.9rem', marginTop: '2px', fontStyle: 'italic' }}>
                  "{currentCard.exampleSentence}"
                </div>
              )}
              {!currentCard.partOfSpeech && !currentCard.exampleSentence && (
                <div style={{ color: '#854d0e', fontSize: '0.85rem' }}>
                  Starts with: "{correctAnswer.slice(0, 2)}..." ({correctAnswer.length} letters)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Options / Input (Centered Grid) */}
        {practiceMode === QuestionType.MULTIPLE_CHOICE ? (
          <div style={optionsGridStyle}>
            {choices.map((choice, index) => {
              const isSelected = feedback && choice === selectedAnswer;
              const isCorrectAnswer = feedback && choice === correctAnswer;
              const userWasWrong = feedback && !feedback.isCorrect;
              const showAsCorrect = isSelected && feedback.isCorrect;
              const showAsWrong = isSelected && userWasWrong;
              const revealCorrect = !isSelected && isCorrectAnswer && userWasWrong;
              const highlighted = showAsCorrect || showAsWrong || revealCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleChoice(choice)}
                  disabled={Boolean(feedback)}
                  style={{
                    ...optionBtnStyle,
                    borderColor: (showAsCorrect || revealCorrect) ? '#16a34a' : showAsWrong ? '#dc2626' : '#cbd5e1',
                    borderWidth: highlighted ? '2px' : '1px',
                    backgroundColor: (showAsCorrect || revealCorrect) ? '#dcfce7' : showAsWrong ? '#fee2e2' : '#ffffff',
                    color: (showAsCorrect || revealCorrect) ? '#15803d' : showAsWrong ? '#b91c1c' : '#0f172a',
                    fontWeight: highlighted ? 700 : 600,
                    opacity: feedback && !highlighted ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={hotkeyBadgeStyle}>[{index + 1}]</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{choice}</span>
                  </div>

                  {showAsCorrect && (
                    <span style={correctBadgeStyle}>Correct ✓</span>
                  )}
                  {showAsWrong && (
                    <span style={wrongBadgeStyle}>Wrong ✗</span>
                  )}
                  {revealCorrect && (
                    <span style={correctBadgeStyle}>Correct ✓</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={inputContainerStyle}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue.trim() && !feedback) {
                  e.preventDefault();
                  handleWrittenSubmit();
                }
              }}
              placeholder="Type your answer here..."
              disabled={Boolean(feedback)}
              style={{
                ...inputStyle,
                borderColor: feedback ? (feedback.isCorrect ? '#16a34a' : '#dc2626') : '#cbd5e1',
                backgroundColor: feedback ? (feedback.isCorrect ? '#dcfce7' : '#fee2e2') : '#ffffff',
                color: feedback ? (feedback.isCorrect ? '#15803d' : '#b91c1c') : '#0f172a',
                fontWeight: feedback ? 700 : 500,
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleWrittenSubmit}
              disabled={!inputValue.trim() || Boolean(feedback)}
              style={{ ...nextBtnStyle, width: '100%' }}
            >
              Submit Answer (Enter)
            </button>

            {/* Explicit Written Answer Correction Box */}
            {feedback && !feedback.isCorrect && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '14px',
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)',
                }}
              >
                <div style={{ fontSize: '0.9rem', color: '#991b1b' }}>
                  <span>Your answer: </span>
                  <span style={{ fontWeight: 700, textDecoration: 'line-through' }}>
                    "{feedback.userAnswer || inputValue}"
                  </span>
                </div>
                <div style={{ fontSize: '1.05rem', color: '#15803d', fontWeight: 800 }}>
                  <span>Correct answer: </span>
                  <span>"{correctAnswer}"</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback Banner (Centered) */}
        {feedback && (
          <div
            style={{
              ...feedbackStyle,
              backgroundColor: feedback.isCorrect ? '#dcfce7' : '#fee2e2',
              border: feedback.isCorrect ? '1px solid #86efac' : '1px solid #fecaca',
              color: feedback.isCorrect ? '#15803d' : '#991b1b',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {feedback.isCorrect ? (
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Styles ---
const pageStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 14px',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  maxWidth: '920px',
  margin: '0 auto',
  color: '#0f172a',
  background: '#f8fafc',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '10px',
};

const backBtnStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '12px',
  border: '1px solid rgba(148,163,184,0.18)',
  backgroundColor: '#ffffff',
  color: '#334155',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
};

const eyebrowStyle = {
  display: 'inline-block',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#2563eb',
  fontSize: '9px',
  fontWeight: 800,
  marginBottom: '1px',
};

const streakBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: '#fef3c7',
  color: '#d97706',
  padding: '2px 8px',
  borderRadius: '16px',
  fontSize: '0.725rem',
  fontWeight: 800,
};

const titleStyle = {
  margin: 0,
  fontSize: '1.2rem',
  fontWeight: 800,
  color: '#0f172a',
};

const progressBarContainerStyle = {
  width: '100%',
  height: '6px',
  backgroundColor: '#e2e8f0',
  borderRadius: '10px',
  overflow: 'hidden',
};

const progressBarFillStyle = {
  height: '100%',
  backgroundColor: '#2563eb',
  borderRadius: '10px',
  transition: 'width 0.3s ease-in-out',
};

const modeToolbarStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#f1f5f9',
  padding: '4px 8px',
  borderRadius: '12px',
  flexWrap: 'wrap',
  gap: '6px',
};

const modeBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '5px 10px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '0.75rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '16px 20px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 8px 24px -8px rgba(0, 0, 0, 0.05)',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const questionMetaStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  marginBottom: '10px',
  gap: '10px',
  flexWrap: 'wrap',
};

const questionContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  margin: '4px 0 16px',
  width: '100%',
  flexWrap: 'wrap',
};

const hintBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 8px',
  borderRadius: '10px',
  border: '1px solid #fef08a',
  backgroundColor: '#fefce8',
  color: '#854d0e',
  fontSize: '0.725rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const hintBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  backgroundColor: '#fefce8',
  border: '1px solid #fef08a',
  borderRadius: '12px',
  padding: '8px 14px',
  marginBottom: '14px',
  maxWidth: '520px',
  width: '100%',
  boxSizing: 'border-box',
  textAlign: 'center',
};

const questionStyle = {
  fontSize: '1.75rem',
  fontWeight: 800,
  color: '#0f172a',
  textAlign: 'center',
  lineHeight: 1.25,
  margin: 0,
};

const audioBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '38px',
  height: '38px',
  borderRadius: '50%',
  border: '1px solid #bfdbfe',
  backgroundColor: '#eff6ff',
  color: '#2563eb',
  cursor: 'pointer',
  boxShadow: '0 3px 10px rgba(37, 99, 235, 0.12)',
  transition: 'all 0.15s ease',
  flexShrink: 0,
};

const optionsGridStyle = {
  display: 'grid',
  gap: '12px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  width: '100%',
  maxWidth: '680px',
  margin: '0 auto',
};

const optionBtnStyle = {
  padding: '12px 16px',
  borderRadius: '14px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  fontSize: '0.925rem',
  cursor: 'pointer',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  minHeight: '52px',
  height: '100%',
  boxSizing: 'border-box',
  transition: 'all 0.15s ease',
  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
};

const hotkeyBadgeStyle = {
  fontSize: '0.675rem',
  fontWeight: 800,
  color: '#64748b',
  backgroundColor: '#f1f5f9',
  padding: '2px 5px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
};

const correctBadgeStyle = {
  padding: '2px 8px',
  borderRadius: '10px',
  fontSize: '11px',
  fontWeight: 800,
  backgroundColor: '#16a34a',
  color: '#ffffff',
  flexShrink: 0,
};

const wrongBadgeStyle = {
  padding: '2px 8px',
  borderRadius: '10px',
  fontSize: '11px',
  fontWeight: 800,
  backgroundColor: '#dc2626',
  color: '#ffffff',
  flexShrink: 0,
};

const feedbackStyle = {
  padding: '8px 14px',
  borderRadius: '12px',
  fontSize: '0.85rem',
  marginTop: '12px',
  width: '100%',
  maxWidth: '680px',
};

const achievementCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '20px',
  border: '1px solid #e2e8f0',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  boxShadow: '0 8px 20px -6px rgba(0, 0, 0, 0.04)',
};

const timeStatCardStyle = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '14px',
  padding: '10px 16px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
  minWidth: '100px',
};

const inputContainerStyle = {
  width: '100%',
  maxWidth: '520px',
  margin: '0 auto',
  display: 'grid',
  gap: '10px',
};

const nextBtnStyle = {
  padding: '10px 20px',
  borderRadius: '12px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
  outline: 'none',
};

const emptyStyle = {
  textAlign: 'center',
  padding: '30px',
  color: '#64748b',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
};
