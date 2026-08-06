import React, { useState, useEffect } from 'react';
import AuthModal from './components/AuthModal';
import CreateSetModal from './components/CreateSetModal';
import FlashcardPage from './components/FlashcardPage';
import SetReviewPage from './components/SetReviewPage';
import PracticePage from './components/PracticePage';
import CefrModal from './components/CefrModal';
import logoImg from './assets/logo.jpg';

const API_BASE = typeof window !== 'undefined' && window.location.origin.includes('5173')
  ? 'http://localhost:5000'
  : '';

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

  // Check LocalStorage on initial load
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
    const loadedSets = await loadUserSets(loggedUser.id);
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
    <div style={{ width: '100%', maxWidth: '1000px', boxSizing: 'border-box', padding: '30px', fontFamily: 'sans-serif', margin: '0 auto' }}>

      {/* Top Navigation Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={logoImg}
            alt="VocabQuiz Logo"
            style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>VocabQuizWithNil</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Create, review, and edit your word sets</p>
          </div>
        </div>

        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '14px', color: '#475569' }}>{user.email}</span>

              <button
                onClick={handleLogout}
                style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Log Out
              </button>
              <button
                onClick={handleDeleteAccount}
                style={{ padding: '8px 14px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                title="Permanently delete your account and all your vocabulary sets"
              >
                Delete Account
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Log In / Sign Up
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        {!user ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f8fafc', borderRadius: '16px' }}>
            <h2>Welcome to VocabQuizWithNil</h2>
            <p style={{ color: '#64748b' }}>Log in to create vocabulary sets, import CSV word lists, and track your study progress.</p>
            <button
              onClick={() => setIsAuthOpen(true)}
              style={{ marginTop: '16px', padding: '12px 24px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ margin: 0 }}>Your Vocabulary Sets</h4>
                <p style={{ margin: '6px 0 0', color: '#64748b' }}>{sets.length} set{sets.length === 1 ? '' : 's'} saved to your account.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={openCefrModal}
                  style={{ padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                  title="Browse official CEFR English Vocabulary Sets (A1 to C2)"
                >
                  🎁 Browse CEFR Sets (A1 - C2)
                </button>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  + New Set
                </button>
              </div>
            </div>

              {loadingSets ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading your sets...</div>
              ) : sets.length === 0 ? (
                <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#f8fafc', color: '#475569' }}>
                  You don't have any sets yet. Click "New Set" to save your first vocabulary list.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {sets.map((set) => {
                    const pct = set.practice_percentage;
                    const hasPracticed = pct != null;
                    let pctColor = '#64748b';
                    if (hasPracticed) {
                      if (pct >= 90) pctColor = '#15803d';
                      else if (pct >= 70) pctColor = '#ca8a04';
                      else if (pct >= 50) pctColor = '#ea580c';
                      else pctColor = '#dc2626';
                    }
                    return (
                      <div key={set.id} style={{ padding: '10px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                            <h4 style={{ margin: '0' }}>{set.title}</h4>
                            {hasPracticed && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                backgroundColor: `${pctColor}14`, color: pctColor, border: `1px solid ${pctColor}30`,
                              }}>
                                {pct}%
                              </span>
                            )}
                          </div>
                          {/* <p style={{ margin: '6px 0 0', color: '#64748b' }}>{set.description || 'No description yet'}</p> */}
                          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                            <small style={{ color: '#94a3b8' }}>{set.card_count} word{set.card_count === 1 ? '' : 's'}</small>
                            {hasPracticed && set.last_practiced && (
                              <small style={{ color: '#94a3b8' }}>Last practiced: {new Date(set.last_practiced).toLocaleDateString()}</small>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => loadSetDetails(set.id)}
                            style={{ padding: '10px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                          >
                            Review
                          </button>
                          <button
                            onClick={(e) => handleDeleteSet(set.id, set.title, e)}
                            style={{ padding: '10px 14px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                            title="Delete this vocabulary set"
                          >
                            Delete
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