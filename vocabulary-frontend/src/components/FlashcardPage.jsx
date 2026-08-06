import React from 'react';
import { ArrowLeft, Edit3, Play, BookOpen } from 'lucide-react';
import FlashcardViewer from './FlashcardViewer';

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
      {/* Header Bar matching Practice Page */}
      <div style={headerStyle}>
        <button onClick={onBack} style={backBtnStyle} aria-label="Back to Sets">
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={eyebrowStyle}>Flashcard Study</span>
            {hasPracticed && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800,
                backgroundColor: `${pctColor}14`, color: pctColor, border: `1px solid ${pctColor}30`,
              }}>
                {pct}% Mastered
              </span>
            )}
          </div>
          <h1 style={titleStyle}>{setInfo?.title || 'Flashcard Viewer'}</h1>
        </div>
      </div>

      {/* Main Flashcard Card Container matching Practice Page cardStyle */}
      <div style={cardStyle}>
        <div style={actionToolbarStyle}>
          <button onClick={onPractice} style={primaryBtnStyle}>
            <Play size={16} /> Start Practice Quiz
          </button>
          <button onClick={onEdit} style={secondaryBtnStyle}>
            <Edit3 size={16} /> Edit Vocabulary Cards
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
  marginBottom: '20px',
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

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  padding: '28px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.07)',
};

const actionToolbarStyle = {
  display: 'flex',
  justify: 'center',
  gap: '12px',
  marginBottom: '24px',
  flexWrap: 'wrap',
};

const primaryBtnStyle = {
  padding: '12px 24px',
  borderRadius: '14px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.9rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  boxShadow: '0 4px 14px rgba(37,99,235,0.2)',
};

const secondaryBtnStyle = {
  padding: '12px 20px',
  borderRadius: '14px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#334155',
  fontSize: '0.9rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
};
