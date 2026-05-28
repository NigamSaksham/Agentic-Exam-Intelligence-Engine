import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Database, MessageSquare, Key, RefreshCw } from 'lucide-react';
import Dashboard from './components/Dashboard.jsx';
import DocumentConsole from './components/DocumentConsole.jsx';
import ChatInterface from './components/ChatInterface.jsx';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('coral_gemini_key') || '');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  // Dynamic custom subject lists persisted in localStorage
  const [subjects, setSubjects] = useState(() => {
    const cached = localStorage.getItem('coral_subject_list');
    return cached ? JSON.parse(cached) : ['Computer Networks', 'Database Management Systems', 'Operating Systems'];
  });
  const [activeSubject, setActiveSubject] = useState(() => subjects[0] || 'Computer Networks'); // Multi-subject global state
  const [newSubVal, setNewSubVal] = useState('');
  const [chatHistory, setChatHistory] = useState(() => {
    const cached = localStorage.getItem('coral_chat_history');
    return cached ? JSON.parse(cached) : {};
  });

  useEffect(() => {
    localStorage.setItem('coral_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('coral_subject_list', JSON.stringify(subjects));
  }, [subjects]);

  const handleAddSubject = (e) => {
    e.preventDefault();
    const val = newSubVal.trim();
    if (val && !subjects.includes(val)) {
      setSubjects(prev => [...prev, val]);
      setActiveSubject(val);
      setNewSubVal('');
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?subject=${encodeURIComponent(activeSubject)}`);
      if (!res.ok) throw new Error('API server unreachable');
      const data = await res.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activeSubject]); // Triggers automatically whenever active subject changes!

  const handleSaveKey = (e) => {
    e.preventDefault();
    localStorage.setItem('coral_gemini_key', apiKey);
    setSaveStatus('Saved!');
    setTimeout(() => {
      setSaveStatus('');
      setShowSettings(false);
    }, 1200);
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
            }}>
              🪸
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', lineHeight: '1.1', fontFamily: 'var(--font-display)' }}>
                CORAL
              </h2>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-secondary)', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                Exam Intelligence
              </span>
            </div>
          </div>

          {/* Active Subject Selector Dropdown */}
          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--color-secondary)', letterSpacing: '0.05em' }}>
                Active Subject
              </label>
              <select
                value={activeSubject}
                onChange={(e) => setActiveSubject(e.target.value)}
                className="glass-input"
                style={{
                  width: '100%',
                  fontSize: '12px',
                  padding: '8px 10px',
                  background: '#0c0a1a',
                  borderRadius: '8px',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                {subjects.map((sub, i) => (
                  <option key={i} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            
            <form onSubmit={handleAddSubject} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={newSubVal}
                onChange={(e) => setNewSubVal(e.target.value)}
                placeholder="Add subject..."
                className="glass-input"
                style={{
                  flex: 1,
                  fontSize: '11px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  color: 'white',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              />
              <button
                type="submit"
                className="glowing-btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  background: 'var(--color-primary)'
                }}
              >
                Add
              </button>
            </form>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => setActiveView('console')}
              className="glowing-btn glowing-btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '12px 16px',
                background: activeView === 'console' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                borderColor: activeView === 'console' ? 'var(--color-secondary)' : 'transparent',
                color: activeView === 'console' ? 'white' : 'var(--text-muted)'
              }}
            >
              <Database size={18} style={{ color: activeView === 'console' ? 'var(--color-secondary)' : 'inherit' }} />
              <span>1. Upload Material</span>
            </button>

            <button
              onClick={() => setActiveView('dashboard')}
              className="glowing-btn glowing-btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '12px 16px',
                background: activeView === 'dashboard' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                borderColor: activeView === 'dashboard' ? 'var(--color-primary)' : 'transparent',
                color: activeView === 'dashboard' ? 'white' : 'var(--text-muted)'
              }}
            >
              <LayoutDashboard size={18} style={{ color: activeView === 'dashboard' ? 'var(--color-primary)' : 'inherit' }} />
              <span>2. High-Yield Insights</span>
            </button>

            <button
              onClick={() => setActiveView('chat')}
              className="glowing-btn glowing-btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '12px 16px',
                background: activeView === 'chat' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                borderColor: activeView === 'chat' ? 'var(--color-success)' : 'transparent',
                color: activeView === 'chat' ? 'white' : 'var(--text-muted)'
              }}
            >
              <MessageSquare size={18} style={{ color: activeView === 'chat' ? 'var(--color-success)' : 'inherit' }} />
              <span>3. AI Study Partner</span>
            </button>
          </nav>
        </div>

        <div>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`glow-dot ${apiKey ? 'glow-dot-success' : 'glow-dot-warning'}`}></span>
                <span style={{ fontSize: '11px', color: 'var(--text-glow)', fontWeight: 'bold' }}>Gemini Core</span>
              </div>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <Key size={14} style={{ color: apiKey ? 'var(--color-success)' : 'var(--color-warning)' }} />
              </button>
            </div>
            
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
              {apiKey ? 'Security Key Activated (Adapters decoupled & operational)' : 'API Key required to trigger Enrichment and AI queries.'}
            </p>

            {showSettings && (
              <form onSubmit={handleSaveKey} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="password"
                  className="glass-input"
                  placeholder="Enter API Key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{ width: '100%', fontSize: '11px', padding: '6px 8px' }}
                />
                <button type="submit" className="glowing-btn" style={{ padding: '6px', fontSize: '11px', width: '100%' }}>
                  {saveStatus || 'Save Settings'}
                </button>
              </form>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', justifyContent: 'center' }}>
            <button 
              onClick={fetchAnalytics}
              className="glowing-btn glowing-btn-secondary"
              style={{ padding: '6px 12px', fontSize: '11px', gap: '4px' }}
              disabled={loading}
            >
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh DB'}</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {activeView === 'dashboard' && (
          <Dashboard 
            analyticsData={analyticsData} 
            loading={loading} 
            activeSubject={activeSubject}
            refreshAnalytics={fetchAnalytics} 
            setActiveView={setActiveView}
          />
        )}
        {activeView === 'console' && (
          <DocumentConsole 
            apiKey={apiKey} 
            analyticsData={analyticsData} 
            activeSubject={activeSubject}
            refreshAnalytics={fetchAnalytics} 
          />
        )}
        {activeView === 'chat' && (
          <ChatInterface 
            apiKey={apiKey} 
            analyticsData={analyticsData} 
            activeSubject={activeSubject}
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
          />
        )}
      </main>
    </div>
  );
}
