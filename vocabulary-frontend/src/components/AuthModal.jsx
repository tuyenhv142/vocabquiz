import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, KeyRound, CheckCircle2, Loader2 } from 'lucide-react';
import { API_BASE } from '../config';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [authView, setAuthView] = useState('login'); // 'login', 'signup', 'forgot'
  const [isAwaitingOtp, setIsAwaitingOtp] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: request code, 2: verify code & set new password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setLoading(false);
      if (onAuthSuccess) onAuthSuccess(data.user, false);
      onClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setIsAwaitingOtp(true);
      if (data.devCode) {
        setOtpCode(data.devCode);
        setInfoMessage(`🔑 Verification Code: ${data.devCode} (Auto-filled)`);
      } else {
        setInfoMessage(`A 6-digit verification code has been sent to ${email}`);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setLoading(false);
      if (onAuthSuccess) onAuthSuccess(data.user, true);
      onClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSendForgotOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request reset code');
      }

      setForgotStep(2);
      if (data.devCode) {
        setOtpCode(data.devCode);
        setInfoMessage(`🔑 Reset Code: ${data.devCode} (Auto-filled)`);
      } else {
        setInfoMessage(`A 6-digit password reset code has been sent to ${email}`);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode, newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      setLoading(false);
      setAuthView('login');
      setForgotStep(1);
      setOtpCode('');
      setNewPassword('');
      setPassword('');
      setInfoMessage('🎉 Password reset successfully! Please log in with your new password.');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setAuthView((prev) => (prev === 'login' ? 'signup' : 'login'));
    setIsAwaitingOtp(false);
    setForgotStep(1);
    setError('');
    setInfoMessage('');
    setOtpCode('');
  };

  const resetForm = () => {
    setIsAwaitingOtp(false);
    setForgotStep(1);
    setError('');
    setInfoMessage('');
    setOtpCode('');
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContainerStyle}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 6px 0', color: '#0f172a' }}>
            {authView === 'login'
              ? 'Welcome Back'
              : authView === 'forgot'
              ? forgotStep === 1 ? 'Forgot Password?' : 'Reset Your Password'
              : isAwaitingOtp ? 'Enter Verification Code' : 'Create an Account'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            {authView === 'login'
              ? 'Sign in to access your study sets & progress'
              : authView === 'forgot'
              ? forgotStep === 1 ? 'Enter your registered email to receive a 6-digit reset code' : `Enter code sent to ${email} and your new password`
              : isAwaitingOtp
              ? `Check your inbox (${email}) for the code`
              : 'Enter email to receive your 6-digit activation code'}
          </p>
        </div>

        {/* Info Alert */}
        {infoMessage && (
          <div style={infoBoxStyle}>
            <CheckCircle2 size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={errorBoxStyle}>
            <AlertCircle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <style>{`
          @keyframes authSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>

        {authView === 'login' ? (
          /* LOGIN FORM */
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email Address</label>
              <div style={{ ...inputWrapperStyle, opacity: loading ? 0.7 : 1 }}>
                <Mail size={18} color="#94a3b8" style={{ marginLeft: '12px' }} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('forgot');
                    setForgotStep(1);
                    setError('');
                    setInfoMessage('');
                  }}
                  style={{ ...linkBtnStyle, fontSize: '0.8rem' }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ ...inputWrapperStyle, opacity: loading ? 0.7 : 1 }}>
                <Lock size={18} color="#94a3b8" style={{ marginLeft: '12px' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  disabled={loading}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...submitBtnStyle,
                opacity: loading ? 0.75 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ marginRight: '8px', animation: 'authSpin 1s linear infinite' }} />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn size={18} style={{ marginRight: '8px' }} /> Sign In
                </>
              )}
            </button>
          </form>
        ) : authView === 'forgot' ? (
          forgotStep === 1 ? (
            /* FORGOT PASSWORD STEP 1: Enter Email */
            <form onSubmit={handleSendForgotOtp}>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Your Registered Email</label>
                <div style={{ ...inputWrapperStyle, opacity: loading ? 0.7 : 1 }}>
                  <Mail size={18} color="#94a3b8" style={{ marginLeft: '12px' }} />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  ...submitBtnStyle,
                  backgroundColor: '#dc2626',
                  opacity: (loading || !email.trim()) ? 0.75 : 1,
                  cursor: (loading || !email.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ marginRight: '8px', animation: 'authSpin 1s linear infinite' }} />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Mail size={18} style={{ marginRight: '8px' }} /> Send Reset Code
                  </>
                )}
              </button>
            </form>
          ) : (
            /* FORGOT PASSWORD STEP 2: Enter Code & New Password */
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>6-Digit Reset Code</label>
                <div style={{ ...inputWrapperStyle, opacity: loading ? 0.7 : 1 }}>
                  <KeyRound size={18} color="#94a3b8" style={{ marginLeft: '12px' }} />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    style={{ ...inputStyle, fontSize: '18px', letterSpacing: '4px', fontWeight: 'bold' }}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>New Password</label>
                <div style={{ ...inputWrapperStyle, opacity: loading ? 0.7 : 1 }}>
                  <Lock size={18} color="#94a3b8" style={{ marginLeft: '12px' }} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={inputStyle}
                    disabled={loading}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6 || newPassword.length < 6}
                style={{
                  ...submitBtnStyle,
                  backgroundColor: '#dc2626',
                  opacity: (loading || otpCode.length < 6 || newPassword.length < 6) ? 0.75 : 1,
                  cursor: (loading || otpCode.length < 6 || newPassword.length < 6) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ marginRight: '8px', animation: 'authSpin 1s linear infinite' }} />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <KeyRound size={18} style={{ marginRight: '8px' }} /> Set New Password
                  </>
                )}
              </button>
            </form>
          )
        ) : !isAwaitingOtp ? (
          /* SIGNUP STEP 1: Email & Password */
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email Address</label>
              <div style={{ ...inputWrapperStyle, opacity: loading ? 0.7 : 1 }}>
                <Mail size={18} color="#94a3b8" style={{ marginLeft: '12px' }} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Create Password</label>
              <div style={{ ...inputWrapperStyle, opacity: loading ? 0.7 : 1 }}>
                <Lock size={18} color="#94a3b8" style={{ marginLeft: '12px' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  disabled={loading}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...submitBtnStyle,
                opacity: loading ? 0.75 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ marginRight: '8px', animation: 'authSpin 1s linear infinite' }} />
                  Sending Code...
                </>
              ) : (
                <>
                  <Mail size={18} style={{ marginRight: '8px' }} /> Send Verification Code
                </>
              )}
            </button>
          </form>
        ) : (
          /* SIGNUP STEP 2: 6-Digit OTP Verification Code */
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>6-Digit Verification Code</label>
              <div style={{ ...inputWrapperStyle, opacity: loading ? 0.7 : 1 }}>
                <KeyRound size={18} color="#94a3b8" style={{ marginLeft: '12px' }} />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  style={{ ...inputStyle, fontSize: '18px', letterSpacing: '4px', fontWeight: 'bold' }}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              style={{
                ...submitBtnStyle,
                opacity: (loading || otpCode.length < 6) ? 0.75 : 1,
                cursor: (loading || otpCode.length < 6) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ marginRight: '8px', animation: 'authSpin 1s linear infinite' }} />
                  Verifying & Registering...
                </>
              ) : (
                <>
                  <UserPlus size={18} style={{ marginRight: '8px' }} /> Verify & Register
                </>
              )}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '12px' }}>
              <button
                type="button"
                onClick={handleSendOtp}
                style={{ ...linkBtnStyle, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Resend Code'}
              </button>
              <button type="button" onClick={resetForm} style={linkBtnStyle} disabled={loading}>
                Change Email
              </button>
            </div>
          </form>
        )}

        {/* Mode Toggle Footer */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748b' }}>
          {authView === 'forgot' ? (
            <button
              type="button"
              onClick={() => {
                setAuthView('login');
                setForgotStep(1);
                setError('');
                setInfoMessage('');
              }}
              style={toggleBtnStyle}
              disabled={loading}
            >
              ← Back to Log In
            </button>
          ) : (
            <>
              {authView === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={toggleMode} style={toggleBtnStyle} disabled={loading}>
                {authView === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// --- Inline Styles ---
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' };
const modalContainerStyle = { backgroundColor: '#ffffff', borderRadius: '24px', padding: '36px 32px', width: '90%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' };
const labelStyle = { display: 'block', fontSize: '0.825rem', fontWeight: 800, color: '#334155', marginBottom: '6px' };
const inputWrapperStyle = { display: 'flex', alignItems: 'center', border: '1.5px solid #cbd5e1', borderRadius: '14px', backgroundColor: '#ffffff', overflow: 'hidden' };
const inputStyle = { width: '100%', padding: '12px 14px', border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 };
const infoBoxStyle = { display: 'flex', alignItems: 'center', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '12px 16px', borderRadius: '14px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid #bfdbfe', fontWeight: 600 };
const errorBoxStyle = { display: 'flex', alignItems: 'center', backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '14px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid #fecaca', fontWeight: 600 };
const submitBtnStyle = { width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '14px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.2)' };
const toggleBtnStyle = { background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, cursor: 'pointer', padding: 0 };
const linkBtnStyle = { background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0 };