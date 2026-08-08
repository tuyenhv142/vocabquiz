import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Centralized, standardized loading state component for VocabQuiz
 * 
 * Props:
 * - fullScreen: boolean (if true, fixed to viewport; if false, positioned absolute in parent container)
 * - title: string (main title, e.g. "Loading Vocabulary Sets...")
 * - subtitle: string (optional detail, e.g. "Fetching your saved data")
 * - inline: boolean (if true, rendered as inline component inside card container rather than overlay)
 */
export default function LoadingOverlay({
  fullScreen = false,
  title = 'Processing...',
  subtitle = 'Please wait a moment',
  inline = false,
}) {
  if (inline) {
    return (
      <div style={{
        padding: '40px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '28px 36px',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          textAlign: 'center',
          minWidth: '240px',
        }}>
          <Loader2 size={36} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>{subtitle}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: fullScreen ? 'fixed' : 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: fullScreen ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.92)',
      backdropFilter: fullScreen ? 'blur(6px)' : 'blur(5px)',
      zIndex: fullScreen ? 9999 : 100,
      borderRadius: fullScreen ? '0' : 'inherit',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '28px 36px',
        borderRadius: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: fullScreen ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        textAlign: 'center',
        minWidth: '240px',
      }}>
        <Loader2 size={36} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}
