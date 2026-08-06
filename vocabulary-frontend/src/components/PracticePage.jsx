import React, { useEffect, useMemo, useState } from 'react';
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

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function buildSessionQueue(cards) {
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
    isEngToVie: Math.random() > 0.5,
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

export default function PracticePage({ setInfo, cards = [], onBack }) {
  const [sessionQueue, setSessionQueue] = useState(() => buildSessionQueue(cards));
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

  // Live Silent Timer for question start
  useEffect(() => {
    if (isFinished || !cards.length || feedback) return;
    setQuestionStartTime(Date.now());
    setShowHint(false);
  }, [currentIndex, isFinished, feedback, cards.length]);

  useEffect(() => {
    setSessionQueue(buildSessionQueue(cards));
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
  }, [cards]);

  const currentCard = sessionQueue[currentIndex] || null;
  const questionText = currentCard ? getQuestionText(currentCard) : '';
  const correctAnswer = currentCard ? getCorrectAnswer(currentCard) : '';

  const choices = useMemo(() => {
    if (!currentCard) return [];
    return buildOptions(cards.length > 0 ? cards : sessionQueue, currentCard);
  }, [currentCard?.id, currentCard?.isEngToVie, cards, sessionQueue]);

  // Keyboard Shortcuts (1, 2, 3, 4 for options & Space for audio)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFinished || feedback) return;

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
  }, [isFinished, feedback, practiceMode, choices, currentCard, questionText]);

  const completed = isFinished;

  const finishPractice = async (finalScore, finalTotal) => {
    setIsFinished(true);
    setFeedback(null);
    setShowCorrection(false);

    if (setInfo?.id && finalTotal > 0) {
      const pct = Math.round((finalScore / finalTotal) * 100);
      const API_BASE = typeof window !== 'undefined' && window.location.origin.includes('5173')
        ? 'http://localhost:5000'
        : '';
      try {
        await fetch(`${API_BASE}/api/sets/${setInfo.id}/practice`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ percentage: pct, score: finalScore, total: finalTotal }),
        });
      } catch (err) {
        console.error('Failed to save practice results:', err);
      }
    }
  };

  const processQuestionAnswer = (isCorrect, chosenText) => {
    if (!currentCard || feedback) return;

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
        return [...prev, { id: currentCard.id, term: currentCard.term, definition: currentCard.definition, timeTaken }];
      });
    }

    if (!isCorrect) {
      setWrongCards((prev) => {
        if (prev.some((c) => c.term === currentCard.term)) return prev;
        return [...prev, { id: currentCard.id, term: currentCard.term, definition: currentCard.definition }];
      });
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
      message: feedbackMsg,
    });

    // Silent Adaptive Re-Queuing:
    // If answer was wrong OR took too long (>7s), queue extra practice for this term!
    let nextQueue = [...sessionQueue];
    if (!isCorrect || isSlow) {
      const extraPracticeCard = {
        ...currentCard,
        id: `${currentCard.id}-extra-${Date.now()}`,
        isEngToVie: !currentCard.isEngToVie,
      };
      nextQueue = reinsertCard(sessionQueue, currentCard.id, extraPracticeCard, 3);
      setSessionQueue(nextQueue);
    }

    setTimeout(() => {
      setSelectedAnswer('');
      setFeedback(null);

      const nextIdx = currentIndex + 1;
      if (nextIdx >= nextQueue.length) {
        finishPractice(newScore, nextQueue.length);
      } else {
        setCurrentIndex(nextIdx);
      }
    }, 1100);
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
    if (!currentCard || feedback) return;
    const normalizedInput = normalizeText(inputValue);
    const normalizedCorrect = normalizeText(correctAnswer);
    const exactMatch = normalizedInput === normalizedCorrect;
    const typoMatch = !exactMatch && isTypo(inputValue, correctAnswer);
    const isCorrect = exactMatch || typoMatch;

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
    const totalCount = sessionQueue.length;
    const percentage = totalCount > 0 ? Math.round((score / totalCount) * 100) : 0;
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
                      <span style={{ fontWeight: 700, color: '#0f172a', marginRight: '8px' }}>{sc.term}</span>
                      <span style={{ color: '#64748b' }}>{sc.definition}</span>
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
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{wc.term}</span>
                    <span style={{ color: '#64748b' }}>{wc.definition}</span>
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

        {/* Mode Switcher & Hotkey Banner */}
        <div style={modeToolbarStyle}>
          <div style={{ display: 'flex', gap: '6px' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={hotkeyBadgeStyle}>[{index + 1}]</span>
                    <span>{choice}</span>
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
              style={inputStyle}
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
  padding: '18px',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  maxWidth: '1000px',
  margin: '0 auto',
  color: '#0f172a',
  background: '#f8fafc',
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

const streakBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: '#fef3c7',
  color: '#d97706',
  padding: '3px 10px',
  borderRadius: '20px',
  fontSize: '0.75rem',
  fontWeight: 800,
};

const titleStyle = {
  margin: 0,
  fontSize: '1.4rem',
  fontWeight: 800,
  color: '#0f172a',
};

const progressBarContainerStyle = {
  width: '100%',
  height: '8px',
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
  justify: 'space-between',
  alignItems: 'center',
  backgroundColor: '#f1f5f9',
  padding: '4px 8px',
  borderRadius: '12px',
  flexWrap: 'wrap',
  gap: '8px',
};

const modeBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '0.75rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  padding: '36px 28px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.07)',
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
  marginBottom: '20px',
  gap: '12px',
  flexWrap: 'wrap',
};

const questionContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '14px',
  margin: '10px 0 28px',
  width: '100%',
};

const hintBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  borderRadius: '12px',
  border: '1px solid #fef08a',
  backgroundColor: '#fefce8',
  color: '#854d0e',
  fontSize: '0.75rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const hintBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  backgroundColor: '#fefce8',
  border: '1px solid #fef08a',
  borderRadius: '14px',
  padding: '12px 18px',
  marginBottom: '24px',
  maxWidth: '560px',
  width: '100%',
  boxSizing: 'border-box',
  textAlign: 'center',
};

const questionStyle = {
  fontSize: '2.2rem',
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
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  border: '1px solid #bfdbfe',
  backgroundColor: '#eff6ff',
  color: '#2563eb',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
  transition: 'all 0.15s ease',
  flexShrink: 0,
};

const optionsGridStyle = {
  display: 'grid',
  gap: '14px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  width: '100%',
  maxWidth: '720px',
  margin: '0 auto',
};

const optionBtnStyle = {
  padding: '16px 20px',
  borderRadius: '16px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  fontSize: '1rem',
  cursor: 'pointer',
  textAlign: 'center',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  minHeight: '60px',
  boxSizing: 'border-box',
  transition: 'all 0.15s ease',
  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.02)',
};

const hotkeyBadgeStyle = {
  fontSize: '0.7rem',
  fontWeight: 800,
  color: '#64748b',
  backgroundColor: '#f1f5f9',
  padding: '2px 6px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
};

const correctBadgeStyle = {
  padding: '3px 10px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 800,
  backgroundColor: '#16a34a',
  color: '#ffffff',
  flexShrink: 0,
};

const wrongBadgeStyle = {
  padding: '3px 10px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 800,
  backgroundColor: '#dc2626',
  color: '#ffffff',
  flexShrink: 0,
};

const feedbackStyle = {
  padding: '12px 16px',
  borderRadius: '14px',
  fontSize: '0.9rem',
};

const achievementCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '28px',
  border: '1px solid #e2e8f0',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
};

const timeStatCardStyle = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '16px',
  padding: '12px 20px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  minWidth: '110px',
};

const nextBtnStyle = {
  padding: '12px 24px',
  borderRadius: '14px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.9rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '14px',
  border: '1px solid #cbd5e1',
  fontSize: '1rem',
  boxSizing: 'border-box',
  outline: 'none',
};

const emptyStyle = {
  textAlign: 'center',
  padding: '40px',
  color: '#64748b',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
};
