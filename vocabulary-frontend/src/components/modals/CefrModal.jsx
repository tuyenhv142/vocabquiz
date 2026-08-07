import React, { useState } from 'react';
import { BookOpen, Check, ArrowRight, X, Sparkles, Layers, ShieldCheck } from 'lucide-react';
import { API_BASE } from '../../config';

const CEFR_LEVELS = [
  { key: 'A1', name: 'Level A1', title: 'Beginner (Căn Bản)', desc: 'Basic everyday words: hello, apple, book, family...' },
  { key: 'A2', name: 'Level A2', title: 'Elementary (Sơ Cấp)', desc: 'Foundational words: journey, describe, opportunity, protect...' },
  { key: 'B1', name: 'Level B1', title: 'Intermediate (Trung Cấp)', desc: 'Core intermediate words: accomplish, benefit, challenge, efficient...' },
  { key: 'B2', name: 'Level B2', title: 'Upper Intermediate (Trung Cấp Cao)', desc: 'Advanced-intermediate words: ambitious, collaborate, resilience...' },
  { key: 'C1', name: 'Level C1', title: 'Advanced (Cao Cấp)', desc: 'High-level academic words: articulate, comprehensive, meticulous...' },
  { key: 'C2', name: 'Level C2', title: 'Proficiency (Thành Thạo)', desc: 'Mastery-level words: acquiesce, ephemeral, fastidious, perspicacious...' },
];

export default function CefrModal({ isOpen, onClose, onImport, isNewUser = false }) {
  const [selectedKeys, setSelectedKeys] = useState(['A1', 'A2', 'B1']);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const toggleKey = (key) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAll = () => {
    if (selectedKeys.length === CEFR_LEVELS.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(CEFR_LEVELS.map((l) => l.key));
    }
  };

  const handleSubmit = async () => {
    if (selectedKeys.length === 0) {
      onClose();
      return;
    }
    setLoading(true);
    await onImport(selectedKeys);
    setLoading(false);
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
              {isNewUser ? 'Choose Your CEFR Starter Sets' : 'Import Official CEFR Vocabulary Sets'}
            </h3>
          </div>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p style={subtitleStyle}>
          Select which English level vocabulary sets (with Vietnamese meanings & examples) you want to add to your account:
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <button onClick={toggleAll} style={toggleAllBtnStyle}>
            {selectedKeys.length === CEFR_LEVELS.length ? 'Deselect All' : 'Select All Levels'}
          </button>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
            {selectedKeys.length} of {CEFR_LEVELS.length} selected
          </span>
        </div>

        <div style={gridStyle}>
          {CEFR_LEVELS.map((lvl) => {
            const isChecked = selectedKeys.includes(lvl.key);
            return (
              <div
                key={lvl.key}
                onClick={() => toggleKey(lvl.key)}
                style={{
                  ...cardStyle,
                  borderColor: isChecked ? '#2563eb' : '#e2e8f0',
                  backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ ...badgeStyle, backgroundColor: isChecked ? '#2563eb' : '#94a3b8' }}>
                      {lvl.key}
                    </span>
                    <strong style={{ marginLeft: '8px', fontSize: '0.9rem', color: '#0f172a' }}>{lvl.title}</strong>
                  </div>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    border: `2px solid ${isChecked ? '#2563eb' : '#cbd5e1'}`,
                    backgroundColor: isChecked ? '#2563eb' : '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#ffffff', flexShrink: 0
                  }}>
                    {isChecked && <Check size={13} strokeWidth={3} />}
                  </div>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                  {lvl.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle} disabled={loading}>
            {isNewUser ? 'Skip for Now' : 'Cancel'}
          </button>
          <button onClick={handleSubmit} style={submitBtnStyle} disabled={loading}>
            {loading ? 'Importing...' : `Import Selected (${selectedKeys.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.55)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 1000, padding: '16px', backdropFilter: 'blur(4px)',
};

const modalStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  width: '100%', maxWidth: '640px',
  padding: '32px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  boxSizing: 'border-box',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  border: '1px solid #e2e8f0',
};

const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  paddingBottom: '14px', borderBottom: '1px solid #f1f5f9',
};

const subtitleStyle = {
  margin: '12px 0 16px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5,
};

const closeBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
  padding: '6px', borderRadius: '10px', display: 'flex', alignItems: 'center',
};

const toggleAllBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb',
  fontSize: '0.85rem', fontWeight: 800, padding: 0,
};

const gridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '12px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px',
};

const cardStyle = {
  padding: '16px', borderRadius: '18px', border: '1px solid #e2e8f0',
  cursor: 'pointer', transition: 'all 0.15s ease',
};

const badgeStyle = {
  color: '#ffffff', fontSize: '11px', fontWeight: 800, padding: '3px 8px',
  borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.05em',
};

const footerStyle = {
  display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px',
  paddingTop: '16px', borderTop: '1px solid #f1f5f9',
};

const cancelBtnStyle = {
  padding: '12px 20px', backgroundColor: '#ffffff', color: '#475569',
  border: '1px solid #cbd5e1', borderRadius: '14px', cursor: 'pointer', fontWeight: 700,
  fontSize: '0.9rem',
};

const submitBtnStyle = {
  padding: '12px 24px', backgroundColor: '#2563eb', color: '#ffffff',
  border: 'none', borderRadius: '14px', cursor: 'pointer', fontWeight: 800,
  fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(37,99,235,0.2)',
};
