import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, RotateCcw, Trophy, Target, Volume2 } from 'lucide-react';

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

function randomItem(array) {
  if (!array.length) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

function buildSessionQueue(cards) {
  return cards.map((card, index) => ({
    id: card.id ?? `${card.term}-${card.definition}-${index}`,
    term: card.term || '',
    definition: card.definition || '',
    status: LearningStatus.UNLEARNED,
    streak: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: null,
    lastReviewedAt: null,
    isEngToVie: Math.random() > 0.5,
  }));
}

function getQuestionType() {
  return QuestionType.MULTIPLE_CHOICE;
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
  if (currentIndex === -1) return queue;
  const remaining = queue.filter((c) => c.id !== currentId);
  if (updatedCard.status === LearningStatus.MASTERED) {
    return remaining;
  }
  const insertAt = Math.min(currentIndex + stepsAhead, remaining.length);
  remaining.splice(insertAt, 0, updatedCard);
  return remaining;
}

export default function PracticePage({ setInfo, cards = [], onBack }) {
  const [sessionQueue, setSessionQueue] = useState(() => buildSessionQueue(cards));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [wrongCards, setWrongCards] = useState([]);

  useEffect(() => {
    setSessionQueue(buildSessionQueue(cards));
    setCurrentIndex(0);
    setInputValue('');
    setSelectedAnswer('');
    setFeedback(null);
    setShowCorrection(false);
    setScore(0);
    setIsFinished(false);
    setWrongCards([]);
  }, [cards]);

  const currentCard = sessionQueue[currentIndex] || null;
  const questionType = getQuestionType(currentCard);
  const questionText = currentCard ? getQuestionText(currentCard) : '';
  const correctAnswer = currentCard ? getCorrectAnswer(currentCard) : '';

  const choices = useMemo(() => {
    if (!currentCard) return [];
    return buildOptions(cards.length > 0 ? cards : sessionQueue, currentCard);
  }, [currentCard?.id, currentCard?.isEngToVie, cards, sessionQueue]);

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

  const handleContinue = () => {
    setShowCorrection(false);
    setFeedback(null);
    setSelectedAnswer('');
    setInputValue('');
  };

  const handleChoice = (choice) => {
    if (!currentCard || feedback) return;
    setSelectedAnswer(choice);
    const isCorrect = choice === correctAnswer;
    let newScore = score;

    if (isCorrect) {
      newScore = score + 1;
      setFeedback({ isCorrect: true, message: '✓ Correct!' });
    } else {
      setFeedback({ isCorrect: false, message: `✗ Incorrect — correct answer: "${correctAnswer}"` });
      setWrongCards((prev) => {
        if (prev.some((c) => c.id === currentCard.id)) return prev;
        return [...prev, { id: currentCard.id, term: currentCard.term, definition: currentCard.definition }];
      });
    }

    setScore(newScore);

    setTimeout(() => {
      setSelectedAnswer('');
      setFeedback(null);

      const nextIdx = currentIndex + 1;
      if (nextIdx >= sessionQueue.length) {
        finishPractice(newScore, sessionQueue.length);
      } else {
        setCurrentIndex(nextIdx);
      }
    }, 1400);
  };

  const handlePracticeWrong = () => {
    const wrongOnly = wrongCards.map((wc) => ({
      id: wc.id,
      term: wc.term,
      definition: wc.definition,
      status: LearningStatus.UNLEARNED,
      streak: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      nextReviewAt: null,
      lastReviewedAt: null,
      isEngToVie: Math.random() > 0.5,
    }));
    setSessionQueue(shuffle(wrongOnly));
    setCurrentIndex(0);
    setInputValue('');
    setSelectedAnswer('');
    setFeedback(null);
    setShowCorrection(false);
    setScore(0);
    setIsFinished(false);
    setWrongCards([]);
  };

  const handleWrittenSubmit = () => {
    if (!currentCard || feedback) return;
    const normalizedInput = normalizeText(inputValue);
    const normalizedCorrect = normalizeText(correctAnswer);
    const exactMatch = normalizedInput === normalizedCorrect;
    const typoMatch = !exactMatch && isTypo(inputValue, correctAnswer);
    const isCorrect = exactMatch || typoMatch;
    const nextCard = { ...currentCard };

    if (isCorrect) {
      nextCard.status = LearningStatus.MASTERED;
      nextCard.streak = Math.max(2, nextCard.streak + 1);
      nextCard.lastReviewedAt = new Date().toISOString();
      nextCard.intervalDays = Math.max(1, Math.round(nextCard.intervalDays * nextCard.easeFactor || 1));
      setScore((prev) => prev + 1);
      setFeedback({
        isCorrect: true,
        message: typoMatch
          ? `Correct, with a typo. The right answer is “${correctAnswer}”.`
          : 'Correct! This card is now mastered.',
      });
      setSessionQueue((prev) => prev.filter((card) => card.id !== currentCard.id));
      return;
    }

    nextCard.status = LearningStatus.LEARNING;
    nextCard.streak = 0;
    nextCard.lastReviewedAt = new Date().toISOString();
    nextCard.intervalDays = 0;
    setFeedback({
      isCorrect: false,
      message: `Not quite. The right answer is “${correctAnswer}”.`,
    });
    setShowCorrection(true);
    setSessionQueue((prevQueue) => {
      const filtered = prevQueue.filter((card) => card.id !== currentCard.id);
      const newQueue = reinsertCard(filtered, currentIndex, nextCard, 3);
      return newQueue;
    });
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
            <h1 style={titleStyle}>{setInfo.title}</h1>
          </div>
        </div>
        <div style={emptyStyle}>No cards available for practice.</div>
      </div>
    );
  }

  if (completed) {
    const totalCount = sessionQueue.length;
    const percentage = totalCount > 0 ? Math.round((score / totalCount) * 100) : 0;
    const hasWrongCards = wrongCards.length > 0;
    let recommendation = '';
    let recColor = '#15803d';
    if (percentage >= 90) {
      recommendation = 'Excellent! You have mastered this set. No more practice needed! 🎉';
      recColor = '#15803d';
    } else if (percentage >= 70) {
      recommendation = 'Good job! A few more rounds of practice on the wrong answers will help solidify your knowledge.';
      recColor = '#ca8a04';
    } else if (percentage >= 50) {
      recommendation = 'Keep practicing! Focus on the words you got wrong to improve your score.';
      recColor = '#ea580c';
    } else {
      recommendation = 'You need more practice. Review the vocabulary and try again!';
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
            <h1 style={titleStyle}>{setInfo.title}</h1>
          </div>
        </div>
        <div style={achievementCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Trophy size={28} color='#f59e0b' />
            <h2 style={{ margin: 0 }}>Practice Results</h2>
          </div>

          {/* Percentage circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: '12px 0' }}>
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              background: `conic-gradient(${recColor} ${percentage * 3.6}deg, #e2e8f0 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1.2rem', color: recColor,
              }}>
                {percentage}%
              </div>
            </div>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
              {score} correct out of {sessionQueue.length} questions
            </span>
          </div>

          {/* Recommendation */}
          <div style={{
            padding: '12px 16px', borderRadius: '14px',
            backgroundColor: `${recColor}12`, border: `1px solid ${recColor}30`,
            color: recColor, fontWeight: 600, fontSize: '0.9rem', textAlign: 'center',
          }}>
            <Target size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            {recommendation}
          </div>

          {/* Wrong cards list */}
          {hasWrongCards && (
            <div style={{ textAlign: 'left', width: '100%' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.9rem', color: '#475569' }}>
                Words to review ({wrongCards.length}):
              </p>
              <div style={{ display: 'grid', gap: '6px' }}>
                {wrongCards.map((wc) => (
                  <div key={wc.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: '10px',
                    backgroundColor: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.88rem',
                  }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{wc.term}</span>
                    <span style={{ color: '#64748b' }}>{wc.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
            {hasWrongCards && (
              <button onClick={handlePracticeWrong} style={{
                ...nextBtnStyle,
                backgroundColor: '#dc2626',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}>
                <RotateCcw size={15} />
                Practice Wrong Questions ({wrongCards.length})
              </button>
            )}
            <button onClick={onBack} style={{
              ...nextBtnStyle,
              backgroundColor: hasWrongCards ? '#64748b' : '#2563eb',
            }}>
              Back to Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showCorrection && feedback && !feedback.isCorrect) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <button onClick={onBack} style={backBtnStyle}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <span style={eyebrowStyle}>Correction</span>
            <h1 style={titleStyle}>{setInfo.title}</h1>
          </div>
        </div>
        <div style={correctionCardStyle}>
          <p style={{ margin: 0, color: '#475569' }}>Your answer:</p>
          <div style={correctionAnswerStyle}>{inputValue || 'No answer provided'}</div>
          <p style={{ margin: '16px 0 0 0', color: '#475569' }}>Correct answer:</p>
          <div style={correctionCorrectStyle}>{correctAnswer}</div>
          <button onClick={handleContinue} style={nextBtnStyle}>
            Continue Practice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtnStyle} aria-label="Back to Review">
          <ArrowLeft size={16} />
        </button>
        <div>
          <span style={eyebrowStyle}>Practice Mode</span>
          <h1 style={titleStyle}>{setInfo.title}</h1>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={questionMetaStyle}>
          <span style={questionLabelStyle}>Question {currentIndex + 1} of {sessionQueue.length}</span>
          <span style={questionTypeStyle}>Multiple Choice</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div style={{ ...questionStyle, marginBottom: 0 }}>{questionText}</div>
          <button
            onClick={() => playPronunciation(currentCard?.term || questionText)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#2563eb',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.08)',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            title="Listen to English pronunciation"
            aria-label="Listen to English pronunciation"
          >
            <Volume2 size={19} />
          </button>
        </div>

        {questionType === QuestionType.MULTIPLE_CHOICE ? (
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    borderColor: (showAsCorrect || revealCorrect) ? '#16a34a' : showAsWrong ? '#dc2626' : '#cbd5e1',
                    borderWidth: highlighted ? '2px' : '1px',
                    backgroundColor: (showAsCorrect || revealCorrect) ? '#dcfce7' : showAsWrong ? '#fee2e2' : '#ffffff',
                    color: (showAsCorrect || revealCorrect) ? '#15803d' : showAsWrong ? '#b91c1c' : '#0f172a',
                    fontWeight: highlighted ? 700 : 500,
                    opacity: feedback && !highlighted ? 0.5 : 1,
                  }}
                >
                  <span>{choice}</span>
                  {showAsCorrect && (
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 800,
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}>
                      Correct ✓
                    </span>
                  )}
                  {showAsWrong && (
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 800,
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}>
                      Wrong ✗
                    </span>
                  )}
                  {revealCorrect && (
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 800,
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}>
                      Correct ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
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
              placeholder="Enter your answer"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={handleWrittenSubmit}
              disabled={!inputValue.trim() || Boolean(feedback)}
              style={nextBtnStyle}
            >
              Submit Answer
            </button>
          </div>
        )}

        {feedback && (
          <div
            style={{
              ...feedbackStyle,
              backgroundColor: feedback.isCorrect ? '#dcfce7' : '#fee2e2',
              border: feedback.isCorrect ? '1px solid #86efac' : '1px solid #fecaca',
              color: feedback.isCorrect ? '#15803d' : '#991b1b',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '14px',
            }}
          >
            {feedback.isCorrect ? (
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

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
  marginBottom: '18px',
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
  fontSize: '8px',
  fontWeight: 700,
  marginBottom: '4px',
};

const titleStyle = {
  margin: 0,
  fontSize: '1.2rem',
  lineHeight: 1.16,
};

const cardStyle = {
  padding: '20px',
  borderRadius: '22px',
  background: '#ffffff',
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: '0 12px 24px rgba(15,23,42,0.06)',
};

const questionMetaStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '18px',
  flexWrap: 'wrap',
};

const questionLabelStyle = {
  color: '#475569',
  fontSize: '0.82rem',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const questionTypeStyle = {
  color: '#0f172a',
  fontSize: '0.9rem',
  fontWeight: 600,
};

const questionStyle = {
  marginBottom: '18px',
  fontSize: '1.1rem',
  lineHeight: 1.5,
  color: '#0f172a',
};

const optionsGridStyle = {
  display: 'grid',
  gap: '12px',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  marginBottom: '18px',
};

const optionBtnStyle = {
  width: '100%',
  padding: '16px',
  borderRadius: '16px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: '0.95rem',
  lineHeight: 1.4,
};

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '16px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#f8fafc',
  outline: 'none',
  fontSize: '1rem',
};

const footerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
};

const feedbackStyle = {
  padding: '12px 14px',
  borderRadius: '14px',
  flex: '1 1 260px',
};

const correctionCardStyle = {
  padding: '24px',
  borderRadius: '22px',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: '0 12px 24px rgba(15,23,42,0.06)',
  display: 'grid',
  gap: '16px',
};

const correctionAnswerStyle = {
  padding: '16px',
  borderRadius: '16px',
  backgroundColor: '#f8fafc',
  color: '#0f172a',
  minHeight: '56px',
  display: 'grid',
  placeItems: 'center start',
};

const correctionCorrectStyle = {
  padding: '16px',
  borderRadius: '16px',
  backgroundColor: '#ecfdf5',
  color: '#166534',
  minHeight: '56px',
  display: 'grid',
  placeItems: 'center start',
};

const nextBtnStyle = {
  padding: '12px 18px',
  borderRadius: '14px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  cursor: 'pointer',
  fontWeight: 700,
  minWidth: '180px',
};

const achievementCardStyle = {
  padding: '28px',
  borderRadius: '22px',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(148,163,184,0.2)',
  boxShadow: '0 14px 28px rgba(15,23,42,0.08)',
  display: 'grid',
  gap: '16px',
  textAlign: 'center',
};

const emptyStyle = {
  padding: '30px',
  borderRadius: '18px',
  backgroundColor: '#f8fafc',
  textAlign: 'center',
  color: '#64748b',
};
