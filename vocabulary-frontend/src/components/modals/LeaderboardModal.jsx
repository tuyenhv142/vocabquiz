import React from 'react';
import { Trophy, Flame, Star, Award, Calendar, CheckCircle2, X } from 'lucide-react';
import { getUserStreakData, getUserRank } from '../../utils/streakEngine';

export default function LeaderboardModal({ isOpen, onClose, userId }) {
  if (!isOpen) return null;

  const streakData = getUserStreakData(userId);
  const rank = getUserRank(streakData.currentStreak, streakData.totalXP);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
                Learning Ranks & Streaks
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Track your consecutive learning days and rank progress
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
          padding: '20px',
          border: '1px solid #bfdbfe',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Your Current Rank
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: '1.3rem', fontWeight: 800, color: '#1e40af' }}>
                {rank.badge} {rank.title}
              </h3>
            </div>
            <span style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 800,
              backgroundColor: rank.bg, color: rank.color, border: `1px solid ${rank.color}40`,
            }}>
              ⭐ {streakData.totalXP} Total XP
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div style={statBoxStyle}>
              <Flame size={20} color="#ea580c" />
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {streakData.currentStreak} Days
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  Current Streak 🔥
                </div>
              </div>
            </div>

            <div style={statBoxStyle}>
              <Award size={20} color="#d97706" />
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {streakData.longestStreak} Days
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  Longest Streak ⚡
                </div>
              </div>
            </div>

            <div style={statBoxStyle}>
              <Calendar size={20} color="#2563eb" />
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {streakData.totalStudyDays} Days
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  Total Active Days 📅
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rank Tiers List */}
        <div>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800, color: '#334155' }}>
            🏆 Leaderboard Rank Tiers
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ranksList.map((tier) => {
              const isCurrent = rank.title.includes(tier.title.split(' ')[1]);
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
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {tier.title}
                    </span>
                    {isCurrent && (
                      <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#16a34a', backgroundColor: '#dc262600' }}>
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
  justifyContent: 'center',
  padding: '20px',
  zIndex: 1000,
};

const modalStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  width: '100%',
  maxWidth: '520px',
  padding: '24px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
  boxSizing: 'border-box',
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
  padding: '12px 14px',
  borderRadius: '14px',
  border: '1px solid #dbeafe',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};
