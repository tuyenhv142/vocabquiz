import React, { useState } from 'react';
import { Share2, Copy, Check, Send, Mail, X, Link as LinkIcon, Sparkles } from 'lucide-react';

export default function ShareSetModal({ setInfo, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sentMessage, setSentMessage] = useState(null);

  if (!isOpen || !setInfo) return null;

  const shareUrl = `${window.location.origin}/?shareSetId=${setInfo.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    if (!recipientEmail.trim()) return;

    // Mailto fallback link or toast notification
    const subject = encodeURIComponent(`Study Vocabulary Set: ${setInfo.title}`);
    const body = encodeURIComponent(
      `Hi!\n\nI want to share my vocabulary set "${setInfo.title}" with you on VocabQuiz.\n\nClick the link below to import and practice this set:\n${shareUrl}\n\nHappy learning!`
    );
    window.open(`mailto:${recipientEmail.trim()}?subject=${subject}&body=${body}`, '_blank');

    setSentMessage(`Share link opened in email client for ${recipientEmail.trim()}!`);
    setRecipientEmail('');
    setTimeout(() => setSentMessage(null), 3500);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={iconBadgeStyle}>
              <Share2 size={20} color="#2563eb" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Share Study Set</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>"{setInfo.title}"</p>
            </div>
          </div>

          <button onClick={onClose} style={closeBtnStyle} title="Close modal">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Option 1: Copy Direct Link */}
          <div>
            <label style={labelStyle}>
              <LinkIcon size={14} color="#2563eb" /> Direct Share Link
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input
                type="text"
                readOnly
                value={shareUrl}
                style={inputStyle}
                onClick={handleCopyLink}
              />
              <button
                onClick={handleCopyLink}
                style={{
                  ...copyBtnStyle,
                  backgroundColor: copied ? '#16a34a' : '#2563eb',
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Option 2: Share via Email */}
          <div>
            <label style={labelStyle}>
              <Mail size={14} color="#2563eb" /> Send to Email
            </label>
            <form onSubmit={handleSendEmail} style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input
                type="email"
                placeholder="friend@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={!recipientEmail.trim()}
                style={{
                  ...sendBtnStyle,
                  opacity: recipientEmail.trim() ? 1 : 0.6,
                }}
              >
                <Send size={15} />
                <span>Send</span>
              </button>
            </form>

            {sentMessage && (
              <div style={toastStyle}>
                <Sparkles size={14} /> {sentMessage}
              </div>
            )}
          </div>

          {/* Share Info Box */}
          <div style={infoBoxStyle}>
            <span style={{ fontWeight: 700, color: '#1e40af' }}>💡 How sharing works:</span>
            <p style={{ margin: '4px 0 0', color: '#334155', fontSize: '0.8rem', lineHeight: 1.4 }}>
              Anyone with this link can view and import <strong>"{setInfo.title}"</strong> into their account to study flashcards and practice quizzes.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Styles ---
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  padding: '16px',
};

const modalStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  width: '100%',
  maxWidth: '480px',
  boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
  overflow: 'hidden',
  border: '1px solid #e2e8f0',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '18px 20px',
  borderBottom: '1px solid #f1f5f9',
  backgroundColor: '#f8fafc',
};

const iconBadgeStyle = {
  width: '38px',
  height: '38px',
  borderRadius: '12px',
  backgroundColor: '#eff6ff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #bfdbfe',
};

const closeBtnStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#64748b',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const labelStyle = {
  fontSize: '0.85rem',
  fontWeight: 700,
  color: '#334155',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

const inputStyle = {
  flex: 1,
  padding: '10px 14px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  fontSize: '0.875rem',
  outline: 'none',
  backgroundColor: '#f8fafc',
  color: '#0f172a',
};

const copyBtnStyle = {
  padding: '10px 16px',
  borderRadius: '12px',
  border: 'none',
  color: '#ffffff',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s ease',
};

const sendBtnStyle = {
  padding: '10px 16px',
  borderRadius: '12px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

const toastStyle = {
  marginTop: '10px',
  padding: '8px 12px',
  borderRadius: '10px',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  color: '#15803d',
  fontSize: '0.8rem',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const infoBoxStyle = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '14px',
  padding: '12px 16px',
};
