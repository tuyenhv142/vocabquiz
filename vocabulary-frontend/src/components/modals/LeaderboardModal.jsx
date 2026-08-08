import React, { useEffect, useState } from 'react';
import { Trophy, Flame, Star, Award, Calendar, Users, X } from 'lucide-react';
import { getUserStreakData, getUserRank } from '../../utils/streakEngine';
import { API_BASE } from '../../config';

export default function LeaderboardModal({ isOpen, onClose, userId }) {
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'ranks'
  const [communityLeaderboard, setCommunityLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);

  const streakData = getUserStreakData(userId);
  const userRank = getUserRank(streakData.currentStreak, streakData.totalXP);

  useEffect(() => {
    if (!isOpen) return;
    fetchLeaderboard();
  }, [isOpen, userId, streakData.totalXP]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}/api/leaderboard?userId=${userId || ''}&userXP=${streakData.totalXP || 0}&userStreak=${streakData.currentStreak || 0}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCommunityLeaderboard(data);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const ranksList = [
    { title: '👑 Grandmaster Scholar', minDays: 30, minXP: 1500, desc: '30+ days streak or 1500+ XP' },
    { title: '🔥 Master Wordsmith', minDays: 14, minXP: 800, desc: '14+ days streak or 800+ XP' },
    { title: '⭐ Dedicated Learner', minDays: 7, minXP: 350, desc: '7+ days streak or 350+ XP' },
    { title: '🌱 Rising Explorer', minDays: 3, minXP: 100, desc: '3+ days streak or 100+ XP' },
    { title: '🐣 English Beginner', minDays: 0, minXP: 0, desc: 'Start learning to level up!' },
  ];

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '14px',
              backgroundColor: '#fef3c7', color: '#d97706',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Trophy size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Community Leaderboard
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Track learning streaks & XP rankings across all active learners
              </p>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Current User Stats Card */}
        <div style={{
          backgroundColor: '#eff6ff',
          borderRadius: '18px',
          padding: '16px 18px',
          border: '1px solid #bfdbfe',
          marginBottom: '18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                YOUR CURRENT RANK
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#1e40af' }}>
                {userRank.badge} {userRank.title}
              </h3>
            </div>
            <span style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '0.825rem', fontWeight: 800,
              backgroundColor: userRank.bg, color: userRank.color, border: `1px solid ${userRank.color}40`,
            }}>
              ⭐ {streakData.totalXP} Total XP
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
            <div style={statBoxStyle}>
              <Flame size={18} color="#ea580c" />
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {streakData.currentStreak} Days
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  Current Streak 🔥
                </div>
              </div>
            </div>

            <div style={statBoxStyle}>
              <Award size={18} color="#d97706" />
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {streakData.longestStreak} Days
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  Longest Streak ⚡
                </div>
              </div>
            </div>

            <div style={statBoxStyle}>
              <Calendar size={18} color="#2563eb" />
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {streakData.totalStudyDays} Days
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  Active Days 📅
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <button
            onClick={() => setActiveTab('leaderboard')}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'leaderboard' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'leaderboard' ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Users size={15} /> Top Learners
          </button>

          <button
            onClick={() => setActiveTab('ranks')}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'ranks' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'ranks' ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Trophy size={15} /> Rank Badges & Guide
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
          {activeTab === 'leaderboard' ? (
            loading ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: '0.875rem' }}>
                Loading community rankings...
              </div>
            ) : communityLeaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: '0.875rem' }}>
                No ranking data yet. Be the first to complete a daily challenge!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {communityLeaderboard.map((item) => {
                  const rankInfo = getUserRank(item.streakDays, item.totalXP);
                  const isTop3 = item.rank <= 3;
                  const trophyEmoji = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`;

                  return (
                    <div
                      key={item.id || item.email}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '14px',
                        backgroundColor: isTop3 ? '#fefce8' : '#ffffff',
                        border: isTop3 ? '1px solid #fef08a' : '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          fontSize: isTop3 ? '1.2rem' : '0.85rem',
                          fontWeight: 800,
                          minWidth: '28px',
                          textAlign: 'center',
                          color: isTop3 ? '#b45309' : '#64748b',
                        }}>
                          {trophyEmoji}
                        </span>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                            {item.email}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {item.masteredSets} mastered set{item.masteredSets === 1 ? '' : 's'} • {item.setCount} saved set{item.setCount === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '0.725rem', fontWeight: 800, padding: '3px 8px', borderRadius: '10px',
                          backgroundColor: rankInfo.bg, color: rankInfo.color, border: `1px solid ${rankInfo.color}30`
                        }}>
                          {rankInfo.shortTitle}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2563eb' }}>
                          ⭐ {item.totalXP} XP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ranksList.map((tier) => {
                const isCurrent = userRank.title.includes(tier.title.split(' ')[1]);
                return (
                  <div
                    key={tier.title}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      backgroundColor: isCurrent ? '#f0fdf4' : '#f8fafc',
                      border: isCurrent ? '2px solid #22c55e' : '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        {tier.title}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#16a34a' }}>
                          (Your Rank ✅)
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.775rem', color: '#64748b', fontWeight: 600 }}>
                      {tier.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Styles
const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.55)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justify: 'center',
  padding: '20px',
  zIndex: 1000,
};

const modalStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  width: '100%',
  maxWidth: '540px',
  padding: '24px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
  boxSizing: 'border-box',
  margin: 'auto',
};

const closeBtnStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#64748b',
  display: 'flex',
  alignItems: 'center',
  justify: 'center',
  cursor: 'pointer',
};

const statBoxStyle = {
  backgroundColor: '#ffffff',
  padding: '10px 12px',
  borderRadius: '12px',
  border: '1px solid #dbeafe',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};
