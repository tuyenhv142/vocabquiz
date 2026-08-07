import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, BookOpen, Layers, Trophy, Trash2, Search, ArrowLeft, 
  ShieldAlert, RefreshCw, Eye, Sparkles, AlertTriangle, Key, Calendar
} from 'lucide-react';
import { API_BASE } from '../config';

export default function AdminDashboardPage({ currentUser }) {
  const navigate = useNavigate();
  const ADMIN_EMAIL = 'tuyenhv.142@gmail.com';
  const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL;

  const [activeTab, setActiveTab] = useState('users'); // 'users', 'sets', 'cards'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [sets, setSets] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const loadAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setActionError(null);

    const headers = { 'x-user-email': currentUser?.email || '' };

    try {
      const [statsRes, usersRes, setsRes, cardsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { headers }),
        fetch(`${API_BASE}/api/admin/users`, { headers }),
        fetch(`${API_BASE}/api/admin/sets`, { headers }),
        fetch(`${API_BASE}/api/admin/cards`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (setsRes.ok) setSets(await setsRes.json());
      if (cardsRes.ok) setCards(await cardsRes.json());
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setActionError('Could not load administrative analytics. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [currentUser?.email]);

  if (!isAdmin) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '500px', margin: '40px auto', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #fecaca', boxShadow: '0 20px 40px rgba(220,38,38,0.08)' }}>
        <ShieldAlert size={56} color="#dc2626" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#991b1b', margin: '0 0 8px' }}>Access Denied (403 Forbidden)</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 24px', lineHeight: 1.5 }}>
          Only authorized platform administrators (<strong>tuyenhv.142@gmail.com</strong>) are permitted to access this management dashboard.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(
      `⚠️ ADMIN ACTION:\n\nAre you sure you want to permanently delete user "${user.email}" and ALL their vocabulary sets and cards?\n\nThis CANNOT be undone!`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'x-user-email': currentUser?.email || '' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user.');

      setActionSuccess(`User "${user.email}" deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 3500);
      loadAdminData();
    } catch (err) {
      setActionError(err.message || 'Unable to delete user.');
      setTimeout(() => setActionError(null), 3500);
    }
  };

  const handleDeleteSet = async (set) => {
    const confirmed = window.confirm(
      `⚠️ ADMIN ACTION:\n\nAre you sure you want to delete set "${set.title}" owned by ${set.owner_email}?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/sets/${set.id}`, {
        method: 'DELETE',
        headers: { 'x-user-email': currentUser?.email || '' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete set.');

      setActionSuccess(`Set "${set.title}" deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 3500);
      loadAdminData();
    } catch (err) {
      setActionError(err.message || 'Unable to delete set.');
      setTimeout(() => setActionError(null), 3500);
    }
  };

  // Filtered lists for search
  const filteredUsers = users.filter((u) => u.email.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSets = sets.filter((s) => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.owner_email && s.owner_email.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const filteredCards = cards.filter((c) =>
    c.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.set_title && c.set_title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={containerStyle}>
      
      {/* Header Bar */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/')} style={backBtnStyle} title="Back to Dashboard">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={adminBadgeStyle}>
                <ShieldAlert size={13} /> Administrator Portal
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Full Access Control</span>
            </div>
            <h1 style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
              Platform Analytics & Data Management
            </h1>
          </div>
        </div>

        <button onClick={loadAdminData} style={refreshBtnStyle} title="Refresh System Data">
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Data
        </button>
      </div>

      {/* Toast Banners */}
      {actionSuccess && (
        <div style={successBannerStyle}>
          <Sparkles size={18} /> {actionSuccess}
        </div>
      )}
      {actionError && (
        <div style={errorBannerStyle}>
          <AlertTriangle size={18} /> {actionError}
        </div>
      )}

      {/* Analytics Stats Grid */}
      <div style={statsGridStyle}>
        
        <div style={{ ...statCardStyle, borderTop: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>Total Users</span>
            <div style={{ ...iconBoxStyle, backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={statValueStyle}>{stats ? stats.totalUsers : '-'}</div>
          <div style={statSubtextStyle}>Registered platform accounts</div>
        </div>

        <div style={{ ...statCardStyle, borderTop: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>Study Sets</span>
            <div style={{ ...iconBoxStyle, backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
              <Layers size={20} />
            </div>
          </div>
          <div style={statValueStyle}>{stats ? stats.totalSets : '-'}</div>
          <div style={statSubtextStyle}>Created vocabulary sets</div>
        </div>

        <div style={{ ...statCardStyle, borderTop: '4px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>Flashcards</span>
            <div style={{ ...iconBoxStyle, backgroundColor: '#ecfdf5', color: '#059669' }}>
              <BookOpen size={20} />
            </div>
          </div>
          <div style={statValueStyle}>{stats ? stats.totalCards : '-'}</div>
          <div style={statSubtextStyle}>Total vocabulary words saved</div>
        </div>

        <div style={{ ...statCardStyle, borderTop: '4px solid #ea580c' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>Avg Platform Mastery</span>
            <div style={{ ...iconBoxStyle, backgroundColor: '#fff7ed', color: '#ea580c' }}>
              <Trophy size={20} />
            </div>
          </div>
          <div style={statValueStyle}>{stats ? `${stats.avgMastery}%` : '-'}</div>
          <div style={statSubtextStyle}>Across {stats ? stats.totalPracticedSets : 0} practiced sets</div>
        </div>

      </div>

      {/* Data Management Section */}
      <div style={panelStyle}>
        
        {/* Navigation Tabs & Search */}
        <div style={tabContainerStyle}>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
              style={{ ...tabBtnStyle, backgroundColor: activeTab === 'users' ? '#2563eb' : '#f1f5f9', color: activeTab === 'users' ? '#ffffff' : '#475569' }}
            >
              <Users size={16} /> All Users ({users.length})
            </button>
            <button
              onClick={() => { setActiveTab('sets'); setSearchQuery(''); }}
              style={{ ...tabBtnStyle, backgroundColor: activeTab === 'sets' ? '#2563eb' : '#f1f5f9', color: activeTab === 'sets' ? '#ffffff' : '#475569' }}
            >
              <Layers size={16} /> All Study Sets ({sets.length})
            </button>
            <button
              onClick={() => { setActiveTab('cards'); setSearchQuery(''); }}
              style={{ ...tabBtnStyle, backgroundColor: activeTab === 'cards' ? '#2563eb' : '#f1f5f9', color: activeTab === 'cards' ? '#ffffff' : '#475569' }}
            >
              <BookOpen size={16} /> Flashcards ({cards.length})
            </button>
          </div>

          <div style={searchWrapperStyle}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
          </div>

        </div>

        {/* Content Table Views */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
            Loading administrative data records...
          </div>
        ) : activeTab === 'users' ? (

          /* USERS TABLE */
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>User Email</th>
                  <th style={thStyle}>User ID</th>
                  <th style={thStyle}>Created Date</th>
                  <th style={thStyle}>Total Sets</th>
                  <th style={thStyle}>Total Words</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={emptyTdStyle}>No user records found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} style={trStyle}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{user.email}</div>
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}>
                        {user.id}
                      </td>
                      <td style={tdStyle}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td style={tdStyle}>
                        <span style={badgeStyle}>📚 {user.set_count} sets</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ ...badgeStyle, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                          📇 {user.card_count} words
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          style={deleteBtnStyle}
                          title="Force delete user account"
                        >
                          <Trash2 size={15} /> Delete Account
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        ) : activeTab === 'sets' ? (

          /* SETS TABLE */
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Study Set Title</th>
                  <th style={thStyle}>Owner Email</th>
                  <th style={thStyle}>Word Count</th>
                  <th style={thStyle}>Mastery %</th>
                  <th style={thStyle}>Created Date</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSets.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={emptyTdStyle}>No study set records found.</td>
                  </tr>
                ) : (
                  filteredSets.map((set) => (
                    <tr key={set.id} style={trStyle}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{set.title}</div>
                        {set.description && (
                          <div style={{ fontSize: '0.775rem', color: '#64748b' }}>{set.description}</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: '#2563eb', fontWeight: 600 }}>{set.owner_email || 'System'}</span>
                      </td>
                      <td style={tdStyle}>
                        <strong>{set.card_count}</strong> words
                      </td>
                      <td style={tdStyle}>
                        {set.practice_percentage != null ? (
                          <span style={{ fontWeight: 800, color: set.practice_percentage >= 80 ? '#16a34a' : '#ca8a04' }}>
                            🏆 {set.practice_percentage}%
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Unpracticed</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {new Date(set.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => navigate(`/set/${set.id}`)}
                            style={viewBtnStyle}
                            title="View Flashcards"
                          >
                            <Eye size={14} /> View
                          </button>
                          <button
                            onClick={() => handleDeleteSet(set)}
                            style={deleteBtnStyle}
                            title="Force delete set"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        ) : (

          /* CARDS TABLE */
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Term (Word)</th>
                  <th style={thStyle}>Definition (Vietnamese)</th>
                  <th style={thStyle}>Part of Speech</th>
                  <th style={thStyle}>Example Sentence</th>
                  <th style={thStyle}>Parent Set</th>
                  <th style={thStyle}>Owner Email</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={emptyTdStyle}>No flashcard records found.</td>
                  </tr>
                ) : (
                  filteredCards.map((card) => (
                    <tr key={card.id} style={trStyle}>
                      <td style={tdStyle}>
                        <strong style={{ color: '#2563eb', fontSize: '0.95rem' }}>{card.term}</strong>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{card.definition}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={posBadgeStyle}>{card.part_of_speech || 'noun'}</span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                        {card.example_sentence || '-'}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600, color: '#475569' }}>{card.set_title}</span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#64748b' }}>
                        {card.owner_email || 'System'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        )}

      </div>

    </div>
  );
}

// --- Styles matching system design system ---
const containerStyle = { width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '24px 18px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' };
const backBtnStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', cursor: 'pointer' };
const adminBadgeStyle = { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', border: '1px solid #fecaca' };
const refreshBtnStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' };
const statsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' };
const statCardStyle = { backgroundColor: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' };
const statLabelStyle = { fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
const statValueStyle = { fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: '12px 0 4px' };
const statSubtextStyle = { fontSize: '0.775rem', color: '#94a3b8' };
const iconBoxStyle = { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const panelStyle = { backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' };
const tabContainerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' };
const tabBtnStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s ease' };
const searchWrapperStyle = { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '8px 14px', backgroundColor: '#ffffff', minWidth: '240px' };
const searchInputStyle = { border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', color: '#0f172a' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' };
const thStyle = { padding: '12px 14px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 800, borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' };
const tdStyle = { padding: '14px', borderBottom: '1px solid #f1f5f9', color: '#334155', verticalAlign: 'middle' };
const trStyle = { transition: 'background-color 0.15s ease' };
const emptyTdStyle = { padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 };
const badgeStyle = { display: 'inline-block', padding: '3px 8px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: '0.775rem' };
const posBadgeStyle = { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'lowercase' };
const deleteBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 800, fontSize: '0.775rem', cursor: 'pointer' };
const viewBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 800, fontSize: '0.775rem', cursor: 'pointer' };
const successBannerStyle = { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '12px 18px', borderRadius: '14px', marginBottom: '18px', fontWeight: 700, fontSize: '0.875rem' };
const errorBannerStyle = { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '12px 18px', borderRadius: '14px', marginBottom: '18px', fontWeight: 700, fontSize: '0.875rem' };
