import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCw, Sparkles } from 'lucide-react';
import { formatChinesePinyin } from '../utils/pinyin';

export default function FlashcardViewer({ cards = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = cards[currentIndex];

  const speakTerm = (text, e) => {
    e.stopPropagation();
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
      if (event.code === 'Space') {
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
  }, [handleNext, handlePrev]);

  if (!cards.length) {
    return <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>No cards in this set yet.</div>;
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      
      {/* Progress Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontWeight: 700, fontSize: '0.8rem', color: '#475569' }}>
        <span>Card {currentIndex + 1} of {cards.length}</span>
        <span style={{ fontSize: '0.725rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '10px' }}>
          Space = Flip • ← → = Navigate
        </span>
      </div>

      {/* Compact 3D Flip Card Container */}
      <div 
        className="perspective-1000"
        style={{ height: '240px', cursor: 'pointer' }}
        onClick={handleFlip}
      >
        <div 
          className={`flashcard transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '20px',
            boxShadow: '0 12px 24px -6px rgba(0, 0, 0, 0.08)',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
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
              justify: 'center',
              padding: '20px',
              boxSizing: 'border-box'
            }}
          >
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6366f1', backgroundColor: '#e0e7ff', padding: '3px 10px', borderRadius: '10px', marginBottom: '8px' }}>
              {currentCard?.part_of_speech || currentCard?.partOfSpeech || 'Term'}
            </span>
            <h2 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '6px 0 14px', color: '#0f172a', textAlign: 'center' }}>
              {currentCard?.term}
            </h2>
            <button 
              onClick={(e) => speakTerm(currentCard?.term, e)}
              style={audioBtnStyle}
              title="Listen to pronunciation"
            >
              <Volume2 size={20} />
            </button>
          </div>

          {/* BACK SIDE (Definition) */}
          <div 
            className="backface-hidden rotate-y-180"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justify: 'center',
              padding: '20px',
              boxSizing: 'border-box',
              backgroundColor: '#f8fafc',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
            }}
          >
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', textAlign: 'center', margin: '0 0 10px 0' }}>
              {formatChinesePinyin(currentCard?.definition)}
            </p>
            {(currentCard?.example_sentence || currentCard?.exampleSentence) && (
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', maxWidth: '460px', margin: 0 }}>
                "{currentCard.example_sentence || currentCard.exampleSentence}"
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
        <button 
          onClick={handlePrev} 
          disabled={currentIndex === 0}
          style={navBtnStyle}
        >
          <ChevronLeft size={18} />
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
          style={navBtnStyle}
        >
          <ChevronRight size={18} />
        </button>
      </div>

    </div>
  );
}

const audioBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justify: 'center',
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  border: '1px solid #bfdbfe',
  backgroundColor: '#eff6ff',
  color: '#2563eb',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(37,99,235,0.15)',
};

const navBtnStyle = {
  width: '44px',
  height: '44px',
  borderRadius: '14px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#334155',
  display: 'inline-flex',
  alignItems: 'center',
  justify: 'center',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
};

const flipBtnStyle = {
  padding: '12px 28px',
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
  boxShadow: '0 4px 14px rgba(37,99,235,0.2)',
};