import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import AuthModal from './components/modals/AuthModal';
import CreateSetModal from './components/modals/CreateSetModal';
import CefrModal from './components/modals/CefrModal';
import ShareSetModal from './components/modals/ShareSetModal';
import ImportSharedSetModal from './components/modals/ImportSharedSetModal';
import LeaderboardModal from './components/modals/LeaderboardModal';
import LoadingOverlay from './components/common/LoadingOverlay';
import { calculateMemoryRetention } from './utils/memoryDecay';
import { getWordOfTheDay, buildDailyDiscoverySet } from './utils/dailyDiscovery';
import { getUserStreakData, isDailyChallengeCompletedToday, getUserRank } from './utils/streakEngine';

import FlashcardPage from './pages/FlashcardPage';
import SetEditPage from './pages/SetEditPage';
import PracticePage from './pages/PracticePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import logoImg from './assets/logo.jpg';
import { Plus, BookOpen, LogOut, Trash2, Sparkles, UserCheck, Layers, Clock, Trophy, Play, Calendar, Search, ArrowUpDown, Share2, ShieldAlert, Volume2, Flame, Award, CheckCircle2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

import { API_BASE } from './config';

/**
 * SetDetailLoader — defined OUTSIDE App so it's a stable component reference.
 * If defined inside App, every re-render of App creates a new function reference,
 * causing React to unmount/remount the entire child tree (including PracticePage,
 * wiping its state the moment the practice API response comes back).
 */
function SetDetailLoader({
  mode,
  selectedSet,
  selectedCards,
  loadSetDetails,
  navigate,
  onPracticeComplete,
  onSaved,
  onDeleted,
}) {
  const { setId } = useParams();

  useEffect(() => {
    if (setId && setId !== 'daily-discovery-set' && (!selectedSet || String(selectedSet.id) !== String(setId))) {
      loadSetDetails(setId);
    }
  }, [setId]);

  if (!selectedSet || String(selectedSet.id) !== String(setId)) {
    const titles = {
      flashcard: 'Loading Vocabulary Set...',
      practice: 'Loading Quiz Set...',
      edit: 'Loading Set Details...',
    };
    const subtitles = {
      flashcard: 'Fetching set cards & details',
      practice: 'Preparing quiz cards & options',
      edit: 'Preparing edit mode',
    };
    return <LoadingOverlay inline title={titles[mode]} subtitle={subtitles[mode]} />;
  }

  if (mode === 'flashcard') {
    return (
      <FlashcardPage
        setInfo={selectedSet}
        cards={selectedCards}
        onBack={() => navigate('/')}
        onEdit={() => navigate(`/set/${setId}/edit`)}
        onPractice={() => navigate(`/set/${setId}/practice`)}
      />
    );
  }

  if (mode === 'practice') {
    return (
      <PracticePage
        setInfo={selectedSet}
        cards={selectedCards}
        onBack={() => navigate(`/set/${setId}`)}
        onPracticeComplete={onPracticeComplete}
      />
    );
  }

  if (mode === 'edit') {
    return (
      <SetEditPage
        setInfo={selectedSet}
        cards={selectedCards}
        onClose={() => navigate(`/set/${setId}`)}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    );
  }

  return null;
}



export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [isEditingSet, setIsEditingSet] = useState(false);
  const [isPracticing, setIsPracticing] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCefrOpen, setIsCefrOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareTargetSet, setShareTargetSet] = useState(null);
  const [importSetId, setImportSetId] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isDailyBannerCollapsed, setIsDailyBannerCollapsed] = useState(false);
  const [isNewUserSignup, setIsNewUserSignup] = useState(false);
  const [loadingSets, setLoadingSets] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

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
      return data;
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
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    if (user.email?.toLowerCase() === 'tuyenhv.142@gmail.com') {
      alert('🛡️ System Administrator account (tuyenhv.142@gmail.com) is protected and cannot be deleted.');
      return;
    }
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

    const pendingShareId = localStorage.getItem('pendingShareSetId');
    if (pendingShareId) {
      setImportSetId(pendingShareId);
      setIsImportModalOpen(true);
      return;
    }

    if (isSignup) {
      setIsCefrOpen(true);
      setIsNewUserSignup(true);
    }
  };

  const handleSetCreated = async (newSetId) => {
    if (!user?.id) return;
    await loadUserSets(user.id);
    await loadSetDetails(newSetId);
    navigate(`/set/${newSetId}`);
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
    navigate('/');
  };

  const handleStartDailyFlashcards = (mode = 'easy') => {
    const dailySet = buildDailyDiscoverySet(sets, mode);
    setSelectedSet(dailySet);
    setSelectedCards(dailySet.cards);
    navigate('/set/daily-discovery-set');
  };

  const handleStartDailyChallenge = (mode = 'easy') => {
    const dailySet = buildDailyDiscoverySet(sets, mode);
    setSelectedSet(dailySet);
    setSelectedCards(dailySet.cards);
    navigate('/set/daily-discovery-set/practice');
  };

  const playPronunciation = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
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
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to import default sets.');
      } else {
        if (data.skipped && data.skipped.length > 0 && data.sets?.length > 0) {
          alert(`🎉 Imported ${data.sets.length} new CEFR set(s). (Skipped ${data.skipped.join(', ')} as they are already in your account).`);
        }
        await loadUserSets(user.id);
      }
    } catch (err) {
      console.error('Failed to load default sets:', err);
      alert(err.message || 'Failed to import CEFR sets.');
    } finally {
      setLoadingSets(false);
    }
  };

  const openCefrModal = () => {
    setIsNewUserSignup(false);
    setIsCefrOpen(true);
  };

  const handleOpenShare = (set, e) => {
    if (e) e.stopPropagation();
    setShareTargetSet(set);
    setIsShareOpen(true);
  };

  const handleImportSuccess = async (importedSet) => {
    setIsImportModalOpen(false);
    localStorage.removeItem('pendingShareSetId');
    window.history.replaceState({}, document.title, window.location.pathname);

    if (user?.id) {
      await loadUserSets(user.id);
      if (importedSet?.id) {
        await loadSetDetails(importedSet.id);
        navigate(`/set/${importedSet.id}`);
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let sharedId = params.get('shareSetId');
    if (!sharedId) {
      sharedId = localStorage.getItem('pendingShareSetId');
    }

    if (sharedId) {
      localStorage.setItem('pendingShareSetId', sharedId);
      setImportSetId(sharedId);
      setIsImportModalOpen(true);
    }
  }, []);

  const handlePracticeComplete = (updatedSet) => {
    if (updatedSet) {
      const targetId = updatedSet.id;
      setSelectedSet((prev) => (prev ? { ...prev, practice_percentage: updatedSet.practice_percentage, last_practiced: updatedSet.last_practiced } : prev));
      setSets((prevSets) =>
        prevSets.map((s) =>
          String(s.id) === String(targetId)
            ? { ...s, practice_percentage: updatedSet.practice_percentage, last_practiced: updatedSet.last_practiced }
            : s
        )
      );
    }
  };

  return (
    <div style={pageStyle}>

      {/* Top Navigation Bar */}
      <header style={headerStyle}>
        <div
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          title="Go to Dashboard"
        >
          <img
            src={logoImg}
            alt="VocabQuiz Logo"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              objectFit: 'cover',
              border: '1px solid #dbeafe',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.12)',
            }}
          />
          <div>
            <span style={eyebrowStyle}>Vocabulary Master</span>
            <h1 style={titleStyle}>VocabQuizWithNil</h1>
          </div>
        </div>

        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {(() => {
                const sData = getUserStreakData(user?.id || 'guest');
                const rank = getUserRank(sData.currentStreak, sData.totalXP);
                return (
                  <button
                    onClick={() => setIsLeaderboardOpen(true)}
                    style={{
                      ...secondaryBtnStyle,
                      borderColor: sData.currentStreak > 0 ? '#fed7aa' : '#cbd5e1',
                      backgroundColor: sData.currentStreak > 0 ? '#fff7ed' : '#ffffff',
                      color: sData.currentStreak > 0 ? '#ea580c' : '#334155',
                      fontWeight: 800,
                    }}
                    title="View Learning Streak & Leaderboard Rankings"
                  >
                    <span>{rank.shortTitle}</span>
                    <span style={{ opacity: 0.35 }}>|</span>
                    <Flame size={15} color={sData.currentStreak > 0 ? '#ea580c' : '#94a3b8'} />
                    <span>{sData.currentStreak}d ({sData.totalXP} XP)</span>
                  </button>
                );
              })()}

              <span style={userBadgeStyle}>
                <UserCheck size={14} color="#2563eb" /> {user.email}
              </span>

              {user.email?.toLowerCase() === 'tuyenhv.142@gmail.com' && (
                <button
                  onClick={() => navigate('/admin')}
                  style={{ ...secondaryBtnStyle, color: '#dc2626', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}
                  title="Open Admin Analytics & Data Management Dashboard"
                >
                  <ShieldAlert size={15} color="#dc2626" /> Admin Portal
                </button>
              )}

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
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <span style={eyebrowStyle}>Your Dashboard</span>
                      <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Your Vocabulary Sets</h2>
                      <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>{sets.length} set{sets.length === 1 ? '' : 's'} saved in your account.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={loadingSets ? undefined : openCefrModal}
                        disabled={loadingSets}
                        style={{ ...secondaryBtnStyle, opacity: loadingSets ? 0.6 : 1, cursor: loadingSets ? 'not-allowed' : 'pointer' }}
                        title="Browse official CEFR English Vocabulary Sets (A1 to C2)"
                      >
                        <BookOpen size={16} /> Browse CEFR Sets (A1-C2)
                      </button>
                      <button
                        onClick={loadingSets ? undefined : () => setIsCreateOpen(true)}
                        disabled={loadingSets}
                        style={{ ...primaryBtnStyle, opacity: loadingSets ? 0.6 : 1, cursor: loadingSets ? 'not-allowed' : 'pointer' }}
                      >
                        <Plus size={16} /> New Set
                      </button>
                    </div>
                  </div>

                  {/* Daily Word of the Day & Quick Challenge Banner */}
                  {(() => {
                    const wod = getWordOfTheDay();
                    const isDoneToday = isDailyChallengeCompletedToday(user?.id || 'guest');

                    if (isDailyBannerCollapsed) {
                      return (
                        <div style={{
                          marginBottom: '20px',
                          padding: '12px 18px',
                          borderRadius: '16px',
                          backgroundColor: isDoneToday ? '#f0fdf4' : '#eff6ff',
                          border: isDoneToday ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          gap: '12px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CheckCircle2 size={18} color={isDoneToday ? '#16a34a' : '#2563eb'} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                              {isDoneToday ? '🎉 Thử thách hôm nay đã hoàn thành (+50 XP)' : `Word of the Day: ${wod.term}`}
                            </span>
                          </div>
                          <button
                            onClick={() => setIsDailyBannerCollapsed(false)}
                            style={{
                              ...secondaryBtnStyle,
                              height: '32px',
                              padding: '0 12px',
                              fontSize: '0.775rem',
                              borderRadius: '10px',
                            }}
                          >
                            <Eye size={14} /> Hiện thử thách
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div style={{
                        marginBottom: '20px',
                        padding: '16px 20px',
                        borderRadius: '20px',
                        backgroundColor: '#ffffff',
                        border: isDoneToday ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                        background: isDoneToday ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' : 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
                        boxShadow: '0 8px 24px -5px rgba(37, 99, 235, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '10px',
                              backgroundColor: isDoneToday ? '#16a34a' : '#2563eb', color: '#ffffff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isDoneToday ? <CheckCircle2 size={20} /> : <Sparkles size={20} />}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isDoneToday ? '#16a34a' : '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                  Daily Discovery • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                {isDoneToday && (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 7px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#15803d' }}>
                                    ✅ Done Today (+50 XP)
                                  </span>
                                )}
                              </div>
                              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                                Word of the Day (Từ Vựng Mỗi Ngày)
                              </h3>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleStartDailyFlashcards('easy')}
                              style={{
                                ...secondaryBtnStyle,
                                height: '38px',
                                padding: '0 14px',
                                fontSize: '0.8rem',
                                borderRadius: '12px',
                                border: '1px solid #bfdbfe',
                                color: '#2563eb',
                                backgroundColor: '#eff6ff',
                              }}
                              title="Học thuộc 5 từ vựng bằng Flashcard trước khi kiểm tra"
                            >
                              <BookOpen size={15} /> 📖 Học Flashcards (5 từ)
                            </button>
                            <button
                              onClick={() => handleStartDailyChallenge('easy')}
                              style={{
                                ...primaryBtnStyle,
                                height: '38px',
                                padding: '0 16px',
                                fontSize: '0.8rem',
                                borderRadius: '12px',
                                backgroundColor: '#16a34a',
                                boxShadow: '0 4px 12px rgba(22,163,74,0.25)',
                              }}
                              title="Vào làm bài kiểm tra trắc nghiệm ngay"
                            >
                              <Play size={14} fill="currentColor" /> 🌱 Kiểm Tra Ngay (5 từ)
                            </button>
                            <button
                              onClick={() => handleStartDailyChallenge('challenge')}
                              style={{
                                ...secondaryBtnStyle,
                                height: '38px',
                                padding: '0 14px',
                                fontSize: '0.8rem',
                                borderRadius: '12px',
                                border: '1px solid #fed7aa',
                                color: '#ea580c',
                                backgroundColor: '#fff7ed',
                              }}
                              title="Thử thách 5 từ nâng cao"
                            >
                              ⚡ Thử thách
                            </button>
                            {isDoneToday && (
                              <button
                                onClick={() => setIsDailyBannerCollapsed(true)}
                                style={{
                                  ...secondaryBtnStyle,
                                  height: '38px',
                                  padding: '0 10px',
                                  borderRadius: '12px',
                                  color: '#64748b',
                                }}
                                title="Ẩn khung thử thách"
                              >
                                <EyeOff size={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '14px',
                          padding: '14px 18px',
                          border: '1px solid #dbeafe',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}>
                          <div style={{ flex: 1, minWidth: '220px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                                {wod.term}
                              </h2>
                              {wod.phonetic && (
                                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                                  {wod.phonetic}
                                </span>
                              )}
                              <span style={{
                                fontSize: '0.7rem', fontWeight: 800, padding: '2px 7px', borderRadius: '8px',
                                backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe'
                              }}>
                                {wod.part_of_speech}
                              </span>
                              <span style={{
                                fontSize: '0.7rem', fontWeight: 800, padding: '2px 7px', borderRadius: '8px',
                                backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1'
                              }}>
                                {wod.level}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#16a34a', marginBottom: '4px' }}>
                              💡 {wod.definition}
                            </div>

                            {wod.example_sentence && (
                              <div style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic' }}>
                                "{wod.example_sentence}"
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => playPronunciation(wod.term)}
                            style={{
                              ...secondaryBtnStyle,
                              height: '36px',
                              padding: '0 12px',
                              fontSize: '0.8rem',
                              borderRadius: '10px',
                            }}
                            title="Listen to English pronunciation"
                          >
                            <Volume2 size={15} color="#2563eb" /> Listen
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sets Area */}
                  {loadingSets ? (
                    <LoadingOverlay inline title="Loading Your Vocabulary Sets..." subtitle="Fetching saved sets from database" />
                  ) : sets.length === 0 ? (
                    <div style={{ ...welcomeCardStyle, padding: '40px 20px' }}>
                      <BookOpen size={32} color="#94a3b8" style={{ marginBottom: '10px' }} />
                      <p style={{ color: '#475569', fontWeight: 600, margin: 0 }}>
                        You don't have any sets yet. Click <strong>"+ New Set"</strong> or <strong>"Browse CEFR Sets"</strong> to get started!
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Daily Spaced Repetition Review Recommendation Banner */}
                      {(() => {
                        const setsWithMemory = sets.map((s) => ({
                          ...s,
                          memory: calculateMemoryRetention(s.practice_percentage, s.last_practiced),
                        }));
                        const urgentSets = setsWithMemory
                          .filter((s) => s.memory.needsReviewToday)
                          .sort((a, b) => a.memory.decayedPercentage - b.memory.decayedPercentage);

                        if (urgentSets.length === 0) return null;

                        return (
                          <div style={{
                            marginBottom: '24px',
                            padding: '20px',
                            borderRadius: '20px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #fed7aa',
                            boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.08)',
                            background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '12px',
                                  backgroundColor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#ea580c'
                                }}>
                                  <Sparkles size={20} />
                                </div>
                                <div>
                                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                                    🧠 Recommended Daily Practice (Forgetting Curve)
                                  </h3>
                                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                    Scientific memory retention decays over time. Practice these <strong>{urgentSets.length} set{urgentSets.length > 1 ? 's' : ''}</strong> today to lock in 100% recall!
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '12px' }}>
                              {urgentSets.slice(0, 3).map((set) => (
                                <div
                                  key={`rec-${set.id}`}
                                  onClick={() => navigate(`/set/${set.id}/practice`)}
                                  style={{
                                    backgroundColor: '#ffffff',
                                    padding: '14px 16px',
                                    borderRadius: '14px',
                                    border: `1px solid ${set.memory.statusColor}40`,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justify: 'space-between',
                                    gap: '10px',
                                    transition: 'transform 0.15s ease',
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '6px' }}>
                                      <span style={{
                                        fontSize: '0.725rem', fontWeight: 800, padding: '3px 8px', borderRadius: '12px',
                                        backgroundColor: set.memory.statusBg, color: set.memory.statusColor, border: `1px solid ${set.memory.statusColor}30`
                                      }}>
                                        {set.memory.statusLabel}
                                      </span>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                                        {set.card_count} words
                                      </span>
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {set.title}
                                    </h4>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.775rem', color: '#64748b' }}>
                                      {set.memory.recommendationText}
                                    </p>
                                  </div>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/set/${set.id}/practice`);
                                    }}
                                    style={{
                                      ...primaryBtnStyle,
                                      height: '34px',
                                      fontSize: '0.8rem',
                                      width: '100%',
                                      backgroundColor: set.memory.statusColor,
                                      boxShadow: `0 4px 12px ${set.memory.statusColor}30`,
                                    }}
                                  >
                                    <Play size={13} fill="currentColor" /> Practice Today ⚡
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Search & Filter Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
                        {/* Search Box */}
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 12px', backgroundColor: '#ffffff', flex: 1, minWidth: '200px', maxWidth: '360px' }}>
                          <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
                          <input
                            type="text"
                            placeholder="Search sets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', color: '#0f172a', backgroundColor: 'transparent' }}
                          />
                        </div>

                        {/* Sort Dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ArrowUpDown size={15} color="#64748b" />
                          <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '12px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="recommended">Sort by: Recommended for Today (Forgetting Curve)</option>
                            <option value="decayed">Sort by: Memory Retention (Lowest First)</option>
                            <option value="newest">Sort by: Newest First</option>
                            <option value="oldest">Sort by: Oldest First</option>
                            <option value="last_practiced">Sort by: Recently Practiced</option>
                            <option value="mastery">Sort by: Highest Initial Mastery</option>
                          </select>
                        </div>
                      </div>

                      {/* Sets Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
                        {sets
                          .map((s) => ({
                            ...s,
                            memory: calculateMemoryRetention(s.practice_percentage, s.last_practiced),
                          }))
                          .filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                          .sort((a, b) => {
                            if (sortOrder === 'recommended' || sortOrder === 'decayed') {
                              return a.memory.decayedPercentage - b.memory.decayedPercentage;
                            }
                            if (sortOrder === 'newest') {
                              return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                            }
                            if (sortOrder === 'oldest') {
                              return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                            }
                            if (sortOrder === 'last_practiced') {
                              return new Date(b.last_practiced || 0) - new Date(a.last_practiced || 0);
                            }
                            if (sortOrder === 'mastery') {
                              return (b.practice_percentage || 0) - (a.practice_percentage || 0);
                            }
                            return a.memory.decayedPercentage - b.memory.decayedPercentage;
                          })
                          .map((set) => {
                            const { memory } = set;
                            const hasPracticed = set.practice_percentage != null;

                            return (
                              <div
                                key={set.id}
                                onClick={() => navigate(`/set/${set.id}`)}
                                style={{ ...setCardStyle, cursor: 'pointer' }}
                              >
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
                                      backgroundColor: memory.statusBg, color: memory.statusColor, border: `1px solid ${memory.statusColor}30`,
                                    }}>
                                      <Trophy size={12} /> {memory.decayedPercentage}% Retained
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
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }} title="Created date">
                                          <Calendar size={13} color="#94a3b8" />
                                          Created {new Date(set.created_at).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>

                                    {hasPracticed && set.last_practiced && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.775rem', color: '#64748b' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} title="Last practiced date">
                                          <Clock size={13} color="#64748b" />
                                          <span>Last practiced: {new Date(set.last_practiced).toLocaleDateString()}</span>
                                        </div>
                                        {memory.decayedPercentage < set.practice_percentage && (
                                          <span style={{ color: memory.statusColor, fontWeight: 600, fontSize: '0.75rem' }}>
                                            (Decayed from initial {set.practice_percentage}% score)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Visual Retention Bar */}
                                  <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', marginTop: 'auto' }}>
                                    <div style={{
                                      width: `${hasPracticed ? Math.min(100, Math.max(5, memory.decayedPercentage)) : 0}%`,
                                      height: '100%',
                                      backgroundColor: hasPracticed ? memory.statusColor : 'transparent',
                                      borderRadius: '10px',
                                      transition: 'width 0.4s ease'
                                    }} />
                                  </div>
                                </div>

                                {/* Bottom Actions Row */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/set/${set.id}/practice`);
                                    }}
                                    style={{
                                      ...primaryBtnStyle,
                                      flex: 1,
                                      justifyContent: 'center',
                                      padding: '10px 12px',
                                      fontSize: '0.85rem',
                                    }}
                                  >
                                    <Play size={15} fill="currentColor" /> Practice Set
                                  </button>
                                  <button
                                    onClick={(e) => handleOpenShare(set, e)}
                                    style={{
                                      ...secondaryBtnStyle,
                                      padding: '10px 12px',
                                      borderRadius: '12px',
                                    }}
                                    title="Share this set with another account"
                                  >
                                    <Share2 size={16} color="#2563eb" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteSet(set.id, set.title, e)}
                                    style={{
                                      ...dangerBtnStyle,
                                      padding: '10px 12px',
                                      borderRadius: '12px',
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
                    </div>
                  )}
                </div>
              }
            />

            <Route
              path="/set/:setId"
              element={
                <SetDetailLoader
                  selectedSet={selectedSet}
                  selectedCards={selectedCards}
                  loadSetDetails={loadSetDetails}
                  navigate={navigate}
                  mode="flashcard"
                />
              }
            />
            <Route
              path="/set/:setId/practice"
              element={
                <SetDetailLoader
                  selectedSet={selectedSet}
                  selectedCards={selectedCards}
                  loadSetDetails={loadSetDetails}
                  navigate={navigate}
                  mode="practice"
                  onPracticeComplete={handlePracticeComplete}
                />
              }
            />
            <Route
              path="/set/:setId/edit"
              element={
                <SetDetailLoader
                  selectedSet={selectedSet}
                  selectedCards={selectedCards}
                  loadSetDetails={loadSetDetails}
                  navigate={navigate}
                  mode="edit"
                  onSaved={handleReviewSaved}
                  onDeleted={handleReviewDeleted}
                />
              }
            />
            <Route path="/admin" element={<AdminDashboardPage currentUser={user} />} />
          </Routes>
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

      {/* Share Set Modal */}
      <ShareSetModal
        isOpen={isShareOpen}
        setInfo={shareTargetSet}
        user={user}
        onClose={() => setIsShareOpen(false)}
      />

      {/* Leaderboard & Streak Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        userId={user?.id}
      />

      {/* Import Shared Set Modal */}
      <ImportSharedSetModal
        isOpen={isImportModalOpen}
        setId={importSetId}
        user={user}
        onClose={() => {
          setIsImportModalOpen(false);
          localStorage.removeItem('pendingShareSetId');
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
        onImportSuccess={handleImportSuccess}
        onOpenAuth={() => {
          setIsImportModalOpen(false);
          setIsAuthOpen(true);
        }}
      />

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
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
  padding: '12px 18px',
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
  flexWrap: 'wrap',
  gap: '12px',
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
  fontSize: '1.3rem',
  fontWeight: 800,
  color: '#0f172a',
};

const primaryBtnStyle = {
  height: '40px',
  padding: '0 18px',
  borderRadius: '12px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  boxShadow: '0 4px 12px rgba(37,99,235,0.18)',
  transition: 'all 0.15s ease',
  boxSizing: 'border-box',
};

const secondaryBtnStyle = {
  height: '40px',
  padding: '0 16px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#334155',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  transition: 'all 0.15s ease',
  boxSizing: 'border-box',
};

const dangerBtnStyle = {
  height: '40px',
  padding: '0 14px',
  borderRadius: '12px',
  border: '1px solid #fecaca',
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  transition: 'all 0.15s ease',
  boxSizing: 'border-box',
};

const userBadgeStyle = {
  height: '40px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '0 14px',
  borderRadius: '12px',
  backgroundColor: '#eff6ff',
  color: '#1e40af',
  fontSize: '0.825rem',
  fontWeight: 700,
  border: '1px solid #bfdbfe',
  boxSizing: 'border-box',
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