import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatChinesePinyin } from '../../utils/pinyin';

export default function FlashcardViewer({ cards = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = cards[currentIndex];
  const progressPct = cards.length > 0 ? Math.round(((currentIndex + 1) / cards.length) * 100) : 0;

  const speakTerm = (text, e) => {
    if (e) e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, cards.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleFlip = () => setIsFlipped((prev) => !prev);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Control' || event.code === 'ControlLeft' || event.code === 'ControlRight') {
        if (currentCard?.term) {
          speakTerm(currentCard.term);
        }
      } else if (event.code === 'Space') {
        event.preventDefault();
        handleFlip();
      } else if (event.code === 'ArrowRight') {
        handleNext();
      } else if (event.code === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, currentCard?.term]);

  if (!cards.length) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
        No vocabulary cards in this set yet.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      
      {/* Top Header & Progress Bar */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontWeight: 700, fontSize: '0.8rem', color: '#475569' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Card <strong>{currentIndex + 1}</strong> of <strong>{cards.length}</strong>
          </span>
          <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '10px' }}>
            {progressPct}% Completed
          </span>
        </div>

        {/* Animated Progress Bar */}
        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{
            width: `${progressPct}%`,
            height: '100%',
            backgroundColor: '#2563eb',
            borderRadius: '10px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* 3D Flip Card Container (Compact 230px Height - No Scroll Required) */}
      <div 
        className="perspective-1000"
        style={{ height: '230px', cursor: 'pointer', userSelect: 'none' }}
        onClick={handleFlip}
      >
        <div 
          className={`flashcard transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '20px',
            boxShadow: '0 12px 28px -8px rgba(37, 99, 235, 0.1), 0 4px 12px rgba(15, 23, 42, 0.03)',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* FRONT SIDE (Term) */}
          <div 
            className="backface-hidden"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 20px',
              boxSizing: 'border-box',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '20px',
            }}
          >
            {/* Part of Speech Badge */}
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              color: '#2563eb',
              backgroundColor: '#eff6ff',
              padding: '3px 10px',
              borderRadius: '10px',
              border: '1px solid #bfdbfe',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '10px'
            }}>
              {currentCard?.part_of_speech || currentCard?.partOfSpeech || 'Word'}
            </span>

            {/* Term Title */}
            <h2 style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              margin: '0 0 10px 0',
              color: '#0f172a',
              textAlign: 'center',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              {currentCard?.term}
            </h2>

            {/* Pronunciation Audio Button */}
            <button 
              onClick={(e) => speakTerm(currentCard?.term, e)}
              style={audioBtnStyle}
              title="Click to listen to pronunciation"
            >
              <Volume2 size={18} />
              <span style={{ fontSize: '0.775rem', fontWeight: 700 }}>Listen</span>
            </button>

            {/* Flip Hint Footer */}
            <div style={{ position: 'absolute', bottom: '10px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RotateCw size={11} /> Click or press Space to flip
            </div>
          </div>

          {/* BACK SIDE (Definition & Example) */}
          <div 
            className="backface-hidden rotate-y-180"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 20px',
              boxSizing: 'border-box',
              background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '20px',
            }}
          >
            {/* Audio Button on Back Side */}
            <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
              <button 
                onClick={(e) => speakTerm(currentCard?.term, e)}
                style={miniAudioBtnStyle}
                title="Listen to pronunciation"
              >
                <Volume2 size={15} />
              </button>
            </div>

            {/* Definition */}
            <div style={{ textAlign: 'center', marginBottom: '10px', width: '100%' }}>
              <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }}>
                Meaning / Definition
              </span>
              <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                {formatChinesePinyin(currentCard?.definition)}
              </p>
            </div>

            {/* Example Sentence Box */}
            {(currentCard?.example_sentence || currentCard?.exampleSentence) && (
              <div style={{
                width: '100%',
                backgroundColor: '#ffffff',
                borderLeft: '3px solid #2563eb',
                borderRadius: '10px',
                padding: '8px 12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                boxSizing: 'border-box',
              }}>
                <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#2563eb', display: 'block', marginBottom: '2px', textTransform: 'uppercase' }}>
                  Example Sentence:
                </span>
                <p style={{ fontSize: '0.8rem', color: '#334155', fontStyle: 'italic', margin: 0, lineHeight: 1.35 }}>
                  "{currentCard.example_sentence || currentCard.exampleSentence}"
                </p>
              </div>
            )}

            {/* Flip Hint Footer */}
            <div style={{ position: 'absolute', bottom: '10px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RotateCw size={11} /> Click to flip back
            </div>
          </div>

        </div>
      </div>

      {/* Control Action Buttons Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '10px' }}>
        <button 
          onClick={handlePrev} 
          disabled={currentIndex === 0}
          style={{
            ...navBtnStyle,
            opacity: currentIndex === 0 ? 0.4 : 1,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft size={18} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Prev</span>
        </button>

        <button 
          onClick={handleFlip} 
          style={flipBtnStyle}
        >
          <RotateCw size={15} /> Flip Card
        </button>

        <button 
          onClick={handleNext} 
          disabled={currentIndex === cards.length - 1}
          style={{
            ...navBtnStyle,
            opacity: currentIndex === cards.length - 1 ? 0.4 : 1,
            cursor: currentIndex === cards.length - 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Next</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Keyboard Shortcuts Footer */}
      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.725rem', color: '#94a3b8', fontWeight: 600 }}>
        Shortcuts: <span style={keyBadgeStyle}>Ctrl</span> Audio • <span style={keyBadgeStyle}>Space</span> Flip • <span style={keyBadgeStyle}>←</span> Prev • <span style={keyBadgeStyle}>→</span> Next
      </div>

    </div>
  );
}

const audioBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '8px 18px',
  borderRadius: '20px',
  border: '1px solid #bfdbfe',
  backgroundColor: '#eff6ff',
  color: '#2563eb',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
  transition: 'all 0.15s ease',
};

const miniAudioBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#2563eb',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
};

const navBtnStyle = {
  padding: '10px 18px',
  borderRadius: '14px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#334155',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
  transition: 'all 0.15s ease',
};

const flipBtnStyle = {
  padding: '12px 32px',
  borderRadius: '14px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.95rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
  transition: 'all 0.15s ease',
};

const keyBadgeStyle = {
  backgroundColor: '#f1f5f9',
  color: '#475569',
  padding: '2px 6px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '0.7rem',
  fontWeight: 700,
  margin: '0 2px',
};