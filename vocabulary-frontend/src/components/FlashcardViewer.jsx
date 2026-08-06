import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { formatChinesePinyin } from '../utils/pinyin';

export default function FlashcardViewer({ cards = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = cards[currentIndex];

  // Play word pronunciation using browser-native Web Speech API
  const speakTerm = (text, e) => {
    e.stopPropagation(); // Stop card from flipping when clicking audio button
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop current speech
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

  // Keyboard Navigation Controls
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
    return <div style={{ padding: '20px', textAlign: 'center' }}>No cards in this set yet.</div>;
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Progress Counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontWeight: 'bold' }}>
        <span>Card {currentIndex + 1} of {cards.length}</span>
        <span style={{ fontSize: '12px', color: '#666' }}>Space = Flip | ← → = Navigate</span>
      </div>

      {/* 3D Flip Card Container */}
      <div 
        className="perspective-1000"
        style={{ height: '320px', cursor: 'pointer' }}
        onClick={handleFlip}
      >
        <div 
          className={`flashcard transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0'
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
              padding: '24px',
              boxSizing: 'border-box'
            }}
          >
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {currentCard?.part_of_speech || currentCard?.partOfSpeech || 'Term'}
            </span>
            <h2 style={{ fontSize: '36px', margin: '16px 0', color: '#0f172a' }}>
              {currentCard?.term}
            </h2>
            <button 
              onClick={(e) => speakTerm(currentCard?.term, e)}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Volume2 size={20} color="#3b82f6" />
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
              justifyContent: 'center',
              padding: '32px',
              boxSizing: 'border-box',
              backgroundColor: '#f8fafc',
              borderRadius: '16px'
            }}
          >
            <p style={{ fontSize: '20px', color: '#1e293b', textAlign: 'center', margin: '0 0 16px 0' }}>
              {formatChinesePinyin(currentCard?.definition)}
            </p>
            {(currentCard?.example_sentence || currentCard?.exampleSentence) && (
              <p style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                "{currentCard.example_sentence || currentCard.exampleSentence}"
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
        <button 
          onClick={handlePrev} 
          disabled={currentIndex === 0}
          style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer' }}
        >
          <ChevronLeft size={20} />
        </button>

        <button 
          onClick={handleFlip} 
          style={{ padding: '10px 20px', borderRadius: '8px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <RotateCw size={16} style={{ marginRight: '8px' }} /> Flip
        </button>

        <button 
          onClick={handleNext} 
          disabled={currentIndex === cards.length - 1}
          style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer' }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

    </div>
  );
}