import React from 'react';
import { ArrowLeft, Edit3, Play, BookOpen } from 'lucide-react';
import FlashcardViewer from '../components/common/FlashcardViewer';

export default function FlashcardPage({ setInfo, cards = [], onBack, onEdit, onPractice }) {
  const pct = setInfo?.practice_percentage;
  const hasPracticed = pct != null;
  let pctColor = '#64748b';
  if (hasPracticed) {
    if (pct >= 90) pctColor = '#15803d';
    else if (pct >= 70) pctColor = '#ca8a04';
    else if (pct >= 50) pctColor = '#ea580c';
    else pctColor = '#dc2626';
  }

  return (
    <div style={pageStyle}>
      {/* Header Bar */}
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtnStyle} aria-label="Back to Sets">
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <span style={eyebrowStyle}>Flashcard Study</span>
            {hasPracticed && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 10px', borderRadius: '20px', fontSize: '0.725rem', fontWeight: 800,
                backgroundColor: `${pctColor}14`, color: pctColor, border: `1px solid ${pctColor}30`,
              }}>
                {pct}% Mastered
              </span>
            )}
          </div>
          <h1 style={titleStyle}>{setInfo?.title || 'Flashcard Viewer'}</h1>
        </div>
      </div>

      {/* Main Flashcard Card Container */}
      <div style={cardStyle}>
        {(setInfo?.isDailyDiscovery || setInfo?.id === 'daily-discovery-set') && (
          <div style={{
            marginBottom: '16px',
            padding: '14px 18px',
            borderRadius: '14px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e40af' }}>
              💡 Learn these 5 words using flashcards first! When ready, click <strong>"Start Practice Quiz"</strong> to take the quiz and earn +50 XP!
            </div>
            <button onClick={onPractice} style={{ ...primaryBtnStyle, height: '36px', fontSize: '0.8rem', backgroundColor: '#16a34a' }}>
              <Play size={14} fill="currentColor" /> Ready! Take Quiz Now 🚀
            </button>
          </div>
        )}

        <div style={actionToolbarStyle}>
          <button onClick={onPractice} style={primaryBtnStyle}>
            <Play size={15} /> Start Practice Quiz
          </button>
          <button onClick={onEdit} style={secondaryBtnStyle}>
            <Edit3 size={15} /> Edit Vocabulary Cards
          </button>
        </div>

        <FlashcardViewer cards={cards} />
      </div>
    </div>
  );
}

// --- Styles matching Practice Page design system ---
const pageStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 14px',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  maxWidth: '900px',
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

const titleStyle = {
  margin: 0,
  fontSize: '1.25rem',
  fontWeight: 800,
  color: '#0f172a',
};

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '14px 18px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 8px 20px -6px rgba(0, 0, 0, 0.04)',
};

const actionToolbarStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '10px',
  marginBottom: '12px',
  flexWrap: 'wrap',
};

const primaryBtnStyle = {
  padding: '8px 18px',
  borderRadius: '12px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.825rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: '0 4px 12px rgba(37,99,235,0.18)',
};

const secondaryBtnStyle = {
  padding: '8px 16px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#334155',
  fontSize: '0.825rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};
