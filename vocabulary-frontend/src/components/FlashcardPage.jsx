import React from 'react';
import { ArrowLeft, Edit3, Play } from 'lucide-react';
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
      <div style={topRowStyle}>
        <div>
          <span style={eyebrowStyle}>Flashcard Review</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={titleStyle}>{setInfo.title}</h1>
            {hasPracticed && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700,
                backgroundColor: `${pctColor}14`, color: pctColor, border: `1px solid ${pctColor}30`,
              }}>
                {pct}% mastered
              </span>
            )}
          </div>
          {hasPracticed && setInfo.last_practiced && (
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Last practiced: {new Date(setInfo.last_practiced).toLocaleDateString()}
            </p>
          )}
        </div>

        <div style={actionsRowStyle}>
          <button onClick={onBack} style={iconBtnStyle} aria-label="Back to Sets">
            <ArrowLeft size={18} />
          </button>
          <button onClick={onPractice} style={iconBtnStyle} aria-label="Practice Words">
            <Play size={18} />
          </button>
          <button onClick={onEdit} style={iconBtnStyle} aria-label="Edit Words">
            <Edit3 size={18} />
          </button>
        </div>
      </div>

      <div style={viewerContainerStyle}>
        <FlashcardViewer cards={cards} />
      </div>
    </div>
  );
}

const pageStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  maxWidth: '1000px',
  margin: '0 auto',
  color: '#0f172a',
  background: '#f8fafc',
};

const topRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '14px',
  marginBottom: '10px',
};

const headerCardStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '18px',
  background: 'rgba(255,255,255,0.98)',
  border: '1px solid rgba(148,163,184,0.16)',
  boxShadow: '0 10px 22px rgba(15,23,42,0.06)',
  alignItems: 'center',
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
  letterSpacing: '-0.02em',
};

const descriptionStyle = {
  margin: '6px 0 0',
  color: '#475569',
  maxWidth: '620px',
  fontSize: '0.85rem',
  lineHeight: 1.4,
};

const statsCardStyle = {
  minWidth: '100px',
  padding: '10px 12px',
  background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
  borderRadius: '14px',
  boxShadow: '0 8px 18px rgba(15,23,42,0.06)',
  textAlign: 'center',
};

const statsLabelStyle = {
  display: 'block',
  color: '#334155',
  fontSize: '0.72rem',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const statsValueStyle = {
  margin: 0,
  fontSize: '1.35rem',
  color: '#0f172a',
};

const actionsRowStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
  marginTop: '10px',
  marginBottom: '10px',
  alignItems: 'center',
};

const buttonBase = {
  borderRadius: '14px',
  padding: '10px 16px',
  border: 'none',
  fontSize: '0.88rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const primaryBtnStyle = {
  ...buttonBase,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  boxShadow: '0 10px 20px rgba(37,99,235,0.15)',
};

const secondaryBtnStyle = {
  ...buttonBase,
  backgroundColor: '#f8fafc',
  color: '#334155',
  boxShadow: '0 8px 16px rgba(15,23,42,0.08)',
};

const iconBtnStyle = {
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
  boxShadow: '0 10px 18px rgba(15,23,42,0.06)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const viewerContainerStyle = {
  marginTop: '10px',
  padding: '18px',
  borderRadius: '22px',
  background: 'radial-gradient(circle at top right, rgba(59,130,246,0.1), transparent 40%), #ffffff',
  border: '1px solid rgba(148,163,184,0.18)',
};
