import React, { useState, useEffect } from 'react';
import { Download, BookOpen, UserCheck, X, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { API_BASE } from '../../config';
import LoadingOverlay from '../common/LoadingOverlay';

export default function ImportSharedSetModal({ setId, user, isOpen, onClose, onImportSuccess, onOpenAuth }) {
  const [setDetails, setSetDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !setId) return;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/sets/${setId}`)
      .then(async (res) => {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Shared set not found or server is updating.');
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Shared set not found.');
        return data;
      })
      .then((data) => {
        setSetDetails(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || 'Failed to load shared set.');
        setLoading(false);
      });
  }, [isOpen, setId]);

  if (!isOpen || !setId) return null;

  const handleImport = async () => {
    if (!user?.id) {
      onOpenAuth?.();
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/sets/${setId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server API is updating on Render. Please try again in 30 seconds.');
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import set.');
      }

      setImporting(false);
      onImportSuccess?.(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to import shared set.');
      setImporting(false);
    }
  };

  const isBusy = loading || importing;

  return (
    <div style={overlayStyle} onClick={isBusy ? undefined : onClose}>
      <div style={{ ...modalStyle, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Loading/Importing Overlay */}
        {isBusy && (
          <LoadingOverlay
            title={importing ? 'Importing Set...' : 'Loading Details...'}
            subtitle={importing ? 'Adding vocabulary set to your account' : 'Fetching shared vocabulary set'}
          />
        )}

        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={iconBadgeStyle}>
              <Download size={20} color="#2563eb" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Shared Vocabulary Set</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Import set to your account</p>
            </div>
          </div>

          <button onClick={isBusy ? undefined : onClose} disabled={isBusy} style={{ ...closeBtnStyle, opacity: isBusy ? 0.5 : 1, cursor: isBusy ? 'not-allowed' : 'pointer' }} title="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          {loading ? (
            <div style={{ padding: '30px', color: '#64748b', fontWeight: 600 }}>
              Loading shared set details...
            </div>
          ) : error ? (
            <div style={{ padding: '20px', color: '#dc2626', backgroundColor: '#fef2f2', borderRadius: '14px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <AlertCircle size={18} /> {error}
            </div>
          ) : setDetails ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              
              <div style={previewCardStyle}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', backgroundColor: '#eff6ff', padding: '3px 10px', borderRadius: '12px' }}>
                  READY TO IMPORT
                </span>
                <h2 style={{ margin: '8px 0 4px', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                  {setDetails.title}
                </h2>
                {setDetails.description && (
                  <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '0.875rem' }}>
                    {setDetails.description}
                  </p>
                )}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  <BookOpen size={16} color="#2563eb" />
                  <span>{setDetails.cards?.length || 0} vocabulary words</span>
                </div>
              </div>

              {!user ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Please log in or sign up to add this set to your account.
                  </p>
                  <button
                    onClick={isBusy ? undefined : onOpenAuth}
                    disabled={isBusy}
                    style={{ ...primaryBtnStyle, opacity: isBusy ? 0.6 : 1, cursor: isBusy ? 'not-allowed' : 'pointer' }}
                  >
                    <UserCheck size={16} /> Log In / Sign Up to Import
                  </button>
                </div>
              ) : (
                <button
                  onClick={isBusy ? undefined : handleImport}
                  disabled={isBusy}
                  style={{
                    ...primaryBtnStyle,
                    opacity: isBusy ? 0.7 : 1,
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Sparkles size={16} />
                  <span>{importing ? 'Importing Set...' : 'Add Set to My Account 🚀'}</span>
                </button>
              )}

            </div>
          ) : null}
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
  zIndex: 1200,
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
  justify: 'space-between',
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
  justify: 'center',
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
  justify: 'center',
  cursor: 'pointer',
};

const previewCardStyle = {
  width: '100%',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '18px',
  padding: '20px',
  boxSizing: 'border-box',
};

const primaryBtnStyle = {
  width: '100%',
  padding: '14px',
  borderRadius: '14px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.95rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  boxShadow: '0 4px 14px rgba(37,99,235,0.2)',
};
