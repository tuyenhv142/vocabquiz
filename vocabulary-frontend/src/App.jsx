import React, { useState, useEffect } from 'react';
import AuthModal from './components/AuthModal';
import CreateSetModal from './components/CreateSetModal';
import FlashcardPage from './components/FlashcardPage';
import SetReviewPage from './components/SetReviewPage';
import PracticePage from './components/PracticePage';
import CefrModal from './components/CefrModal';
import logoImg from './assets/logo.jpg';
import { Plus, BookOpen, LogOut, Trash2, Sparkles, UserCheck, Layers, Clock, Trophy, Play, Calendar } from 'lucide-react';

import { API_BASE } from './config';

export default function App() {
  const [user, setUser] = useState(null);
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [isEditingSet, setIsEditingSet] = useState(false);
  const [isPracticing, setIsPracticing] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCefrOpen, setIsCefrOpen] = useState(false);
  const [isNewUserSignup, setIsNewUserSignup] = useState(false);
  const [loadingSets, setLoadingSets] = useState(false);

  const loadUserSets = async (userId) => {
    if (!userId) return;
    setLoadingSets(true);

    try {
      const response = await fetch(`${API_BASE}/api/sets?userId=${userId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not load your sets.');
      }
      setSets(data);
      return data;
    } catch (err) {
      console.error(err);
      setSets([]);
      return [];
    } finally {
      setLoadingSets(false);
    }
  };

  const loadSetDetails = async (setId) => {
    try {
      const response = await fetch(`${API_BASE}/api/sets/${setId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not load set details.');
      }
      setSelectedSet(data);
      setSelectedCards(data.cards || []);
      setIsEditingSet(false);
      setIsPracticing(false);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Unable to load the selected set.');
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      loadUserSets(parsedUser.id);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setSets([]);
    setSelectedSet(null);
    setSelectedCards([]);
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your account and all your vocabulary sets? This action CANNOT be undone.'
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account.');
      }
      handleLogout();
      alert('Your account and all associated vocabulary sets have been permanently deleted.');
    } catch (err) {
      alert(err.message || 'Unable to delete account.');
    }
  };

  const handleAuthSuccess = async (loggedUser, isSignup = false) => {
    setUser(loggedUser);
    await loadUserSets(loggedUser.id);
    if (isSignup) {
      setIsCefrOpen(true);
      setIsNewUserSignup(true);
    }
  };

  const handleSetCreated = async (newSetId) => {
    if (!user?.id) return;
    await loadUserSets(user.id);
    await loadSetDetails(newSetId);
  };

  const handleReviewSaved = async () => {
    if (!user?.id || !selectedSet?.id) return;
    await loadUserSets(user.id);
    await loadSetDetails(selectedSet.id);
  };

  const handleReviewDeleted = async () => {
    if (!user?.id) return;
    await loadUserSets(user.id);
    setSelectedSet(null);
    setSelectedCards([]);
    setIsEditingSet(false);
    setIsPracticing(false);
  };

  const handleDeleteSet = async (setId, title, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}" and all its cards?`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/sets/${setId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete set.');
      }
      if (user?.id) {
        await loadUserSets(user.id);
      }
    } catch (err) {
      alert(err.message || 'Unable to delete set.');
    }
  };

  const handleImportCefrLevels = async (selectedLevels) => {
    if (!user?.id || !selectedLevels || selectedLevels.length === 0) return;
    setLoadingSets(true);
    try {
      const response = await fetch(`${API_BASE}/api/sets/seed-defaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, levels: selectedLevels }),
      });
      if (response.ok) {
        await loadUserSets(user.id);
      }
    } catch (err) {
      console.error('Failed to load default sets:', err);
    } finally {
      setLoadingSets(false);
    }
  };

  const openCefrModal = () => {
    setIsNewUserSignup(false);
    setIsCefrOpen(true);
  };

  const closeSetView = () => {
    setSelectedSet(null);
    setSelectedCards([]);
    setIsEditingSet(false);
    setIsPracticing(false);
  };

  const startPractice = () => setIsPracticing(true);
  const endPractice = async () => {
    setIsPracticing(false);
    if (user?.id) {
      await loadUserSets(user.id);
    }
    if (selectedSet?.id) {
      await loadSetDetails(selectedSet.id);
    }
  };

  return (
    <div style={pageStyle}>

      {/* Top Navigation Bar */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={logoImg}
            alt="VocabQuiz Logo"
            style={{ width: '48px', height: '48px', borderRadius: '16px', objectFit: 'cover', boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }}
          />
          <div>
            <span style={eyebrowStyle}>Vocabulary Master</span>
            <h1 style={titleStyle}>VocabQuizWithNil</h1>
          </div>
        </div>

        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={userBadgeStyle}>
                <UserCheck size={14} color="#2563eb" /> {user.email}
              </span>

              <button
                onClick={handleLogout}
                style={secondaryBtnStyle}
                title="Log Out"
              >
                <LogOut size={15} /> Log Out
              </button>
              <button
                onClick={handleDeleteAccount}
                style={dangerBtnStyle}
                title="Permanently delete your account"
              >
                <Trash2 size={15} /> Delete Account
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              style={primaryBtnStyle}
            >
              Log In / Sign Up
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        {!user ? (
          <div style={welcomeCardStyle}>
            <Sparkles size={36} color="#2563eb" style={{ marginBottom: '12px' }} />
            <h2 style={{ margin: '0 0 8px', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>Welcome to VocabQuizWithNil</h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 20px', maxWidth: '500px' }}>
              Create custom vocabulary sets, auto-translate terms with AI, and master words with fast adaptive practice!
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              style={{ ...primaryBtnStyle, padding: '14px 28px', fontSize: '1rem' }}
            >
              Get Started
            </button>
          </div>
        ) : selectedSet ? (
          isEditingSet ? (
            <SetReviewPage
              setInfo={selectedSet}
              cards={selectedCards}
              onClose={() => setIsEditingSet(false)}
              onSaved={handleReviewSaved}
              onDeleted={handleReviewDeleted}
            />
          ) : isPracticing ? (
            <PracticePage
              setInfo={selectedSet}
              cards={selectedCards}
              onBack={endPractice}
            />
          ) : (
            <FlashcardPage
              setInfo={selectedSet}
              cards={selectedCards}
              onBack={closeSetView}
              onEdit={() => setIsEditingSet(true)}
              onPractice={startPractice}
            />
          )
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={eyebrowStyle}>Your Dashboard</span>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Your Vocabulary Sets</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>{sets.length} set{sets.length === 1 ? '' : 's'} saved in your account.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={openCefrModal}
                  style={secondaryBtnStyle}
                  title="Browse official CEFR English Vocabulary Sets (A1 to C2)"
                >
                  <BookOpen size={16} /> Browse CEFR Sets (A1-C2)
                </button>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  style={primaryBtnStyle}
                >
                  <Plus size={16} /> New Set
                </button>
              </div>
            </div>

            {loadingSets ? (
              <div style={cardContainerStyle}>
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Loading your sets...</div>
              </div>
            ) : sets.length === 0 ? (
              <div style={{ ...welcomeCardStyle, padding: '40px 20px' }}>
                <BookOpen size={32} color="#94a3b8" style={{ marginBottom: '10px' }} />
                <p style={{ color: '#475569', fontWeight: 600, margin: 0 }}>
                  You don't have any sets yet. Click <strong>"+ New Set"</strong> or <strong>"Browse CEFR Sets"</strong> to get started!
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {sets.map((set) => {
                  const pct = set.practice_percentage;
                  const hasPracticed = pct != null;
                  let pctColor = '#64748b';
                  let pctBg = '#f1f5f9';
                  if (hasPracticed) {
                    if (pct >= 90) { pctColor = '#16a34a'; pctBg = '#f0fdf4'; }
                    else if (pct >= 70) { pctColor = '#ca8a04'; pctBg = '#fefce8'; }
                    else if (pct >= 50) { pctColor = '#ea580c'; pctBg = '#fff7ed'; }
                    else { pctColor = '#dc2626'; pctBg = '#fef2f2'; }
                  }

                  return (
                    <div key={set.id} style={setCardStyle}>
                      {/* Top Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>
                          <Layers size={14} />
                          <span>Set</span>
                        </div>

                        {hasPracticed ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800,
                            backgroundColor: pctBg, color: pctColor, border: `1px solid ${pctColor}30`,
                          }}>
                            <Trophy size={12} /> {pct}% Mastered
                          </span>
                        ) : (
                          <span style={{
                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                            backgroundColor: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0',
                          }}>
                            New Set
                          </span>
                        )}
                      </div>

                      {/* Content Section */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '16px' }}>
                        <h3 style={{
                          margin: '0 0 8px 0',
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          color: '#0f172a',
                          lineHeight: 1.35,
                          minHeight: '2.7rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {set.title}
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <BookOpen size={14} color="#3b82f6" />
                              <strong>{set.card_count}</strong> {set.card_count === 1 ? 'word' : 'words'}
                            </span>
                            {set.created_at && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }} title="Ngày tạo bộ từ">
                                <Calendar size={13} color="#94a3b8" />
                                {new Date(set.created_at).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>

                          {hasPracticed && set.last_practiced && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.775rem', color: '#64748b' }} title="Lần luyện tập gần nhất">
                              <Clock size={13} color="#64748b" />
                              <span>Đã luyện: {new Date(set.last_practiced).toLocaleDateString('vi-VN')}</span>
                            </div>
                          )}
                        </div>

                        {/* Visual Progress Bar */}
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', marginTop: 'auto' }}>
                          <div style={{
                            width: `${hasPracticed ? Math.min(100, Math.max(5, pct)) : 0}%`,
                            height: '100%',
                            backgroundColor: hasPracticed ? pctColor : 'transparent',
                            borderRadius: '10px',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>

                      {/* Bottom Actions Row */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          onClick={() => loadSetDetails(set.id)}
                          style={{
                            ...primaryBtnStyle,
                            flex: 1,
                            justifyContent: 'center',
                            padding: '10px 14px',
                            fontSize: '0.85rem',
                          }}
                        >
                          <Play size={15} fill="currentColor" /> Practice Set
                        </button>
                        <button
                          onClick={(e) => handleDeleteSet(set.id, set.title, e)}
                          style={{
                            ...dangerBtnStyle,
                            padding: '10px 12px',
                            borderRadius: '14px',
                          }}
                          title="Delete this set"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Create Set Modal */}
      {isCreateOpen && (
        <CreateSetModal
          userId={user?.id}
          onClose={() => setIsCreateOpen(false)}
          onSetCreated={handleSetCreated}
        />
      )}

      {/* CEFR Level Picker Modal */}
      <CefrModal
        isOpen={isCefrOpen}
        onClose={() => setIsCefrOpen(false)}
        onImport={handleImportCefrLevels}
        isNewUser={isNewUserSignup}
      />

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
  justify: 'space-between',
  alignItems: 'center',
  marginBottom: '28px',
  paddingBottom: '18px',
  borderBottom: '1px solid #e2e8f0',
  flexWrap: 'wrap',
  gap: '16px',
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

const primaryBtnStyle = {
  padding: '12px 20px',
  borderRadius: '14px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.9rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: '0 4px 14px rgba(37,99,235,0.2)',
  transition: 'all 0.15s ease',
};

const secondaryBtnStyle = {
  padding: '12px 18px',
  borderRadius: '14px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#334155',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
  transition: 'all 0.15s ease',
};

const dangerBtnStyle = {
  padding: '12px 16px',
  borderRadius: '14px',
  border: '1px solid #fecaca',
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.15s ease',
};

const userBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  borderRadius: '20px',
  backgroundColor: '#eff6ff',
  color: '#1e40af',
  fontSize: '0.825rem',
  fontWeight: 700,
  border: '1px solid #bfdbfe',
};

const welcomeCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  padding: '48px 28px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.07)',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const cardContainerStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.07)',
};

const setCardStyle = {
  padding: '20px',
  borderRadius: '20px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
  transition: 'all 0.2s ease',
};