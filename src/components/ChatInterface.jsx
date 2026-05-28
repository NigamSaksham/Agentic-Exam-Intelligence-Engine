import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Sparkles, User, AlertCircle, ArrowUpRight, Copy } from 'lucide-react';

export default function ChatInterface({ apiKey, analyticsData, activeSubject, chatHistory = {}, setChatHistory }) {
  const [showTrace, setShowTrace] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTrace, setActiveTrace] = useState(null);

  const messages = chatHistory[activeSubject] || [
    {
      sender: 'agent',
      text: `Hello! I am your Coral-backed AI Study Partner. Because I am SQL-grounded, I write precise database queries to inspect standard textbook Table of Contents and matching past-year questions for subject: ${activeSubject}. Ask me anything!`,
      trace: null
    }
  ];

  const setMessages = (updateFnOrVal) => {
    setChatHistory(prev => {
      const currentMessages = prev[activeSubject] || [
        {
          sender: 'agent',
          text: `Hello! I am your Coral-backed AI Study Partner. Because I am SQL-grounded, I write precise database queries to inspect standard textbook Table of Contents and matching past-year questions for subject: ${activeSubject}. Ask me anything!`,
          trace: null
        }
      ];
      const newMessages = typeof updateFnOrVal === 'function' ? updateFnOrVal(currentMessages) : updateFnOrVal;
      return {
        ...prev,
        [activeSubject]: newMessages
      };
    });
  };

  const messagesEndRef = useRef(null);

  const suggestions = [
    `Which chapters in ${activeSubject} matter most?`,
    `Which syllabus sections cover the highest-yield priority?`,
    `Which outline sections are never asked in the past papers?`
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Reset chat helper when activeSubject changes (only if no prior history exists!)
  useEffect(() => {
    if (!chatHistory[activeSubject] || chatHistory[activeSubject].length === 0) {
      setMessages([
        {
          sender: 'agent',
          text: `Switched active subject to: **${activeSubject}**. Ask me any question grounded in the vector-mapped Table of Contents sections!`,
          trace: null
        }
      ]);
    }
    setActiveTrace(null);
    setShowTrace(false);
  }, [activeSubject]);

  const handleSend = async (textToSend) => {
    const prompt = textToSend || input;
    if (!prompt.trim()) return;

    if (!apiKey) {
      alert('Please configure your Gemini API Key in the settings drawer in the sidebar before starting a chat.');
      return;
    }

    setMessages(prev => [...prev, { sender: 'user', text: prompt }]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, apiKey, subject: activeSubject }) // Subject filtering parsed by agent in backend
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Server error running agent.');
      }

      setMessages(prev => [...prev, {
        sender: 'agent',
        text: data.answer,
        trace: {
          sql: data.sqlQuery,
          results: data.sqlResults,
          error: data.sqlError
        }
      }]);

      setActiveTrace({
        sql: data.sqlQuery,
        results: data.sqlResults,
        error: data.sqlError
      });

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'agent',
        text: `I encountered an issue generating your response: ${err.message}. Please verify your API Key and database connections.`,
        trace: null
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: (activeTrace && showTrace) ? '7fr 5fr' : '1fr', gap: '24px', height: 'calc(100vh - 100px)' }}>
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(10, 8, 20, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', padding: '8px', borderRadius: '8px' }}>
              <Sparkles size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>Agentic Query Partner ({activeSubject})</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Grounded strictly in persistent educational SQL schemas</p>
            </div>
          </div>

          {activeTrace && (
            <button 
              onClick={() => setShowTrace(!showTrace)}
              className="glowing-btn glowing-btn-secondary"
              style={{ padding: '4px 10px', fontSize: '10px' }}
            >
              {showTrace ? 'Hide' : 'Show'} Developer Trace
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
              width: '100%'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}>
                {m.sender === 'user' ? (
                  <>
                    <span>You</span>
                    <User size={12} />
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--color-success)' }}>
                      <Sparkles size={12} />
                      <span>Coral Agent</span>
                    </div>
                  </>
                )}
              </div>

              <div className="glass-panel" style={{
                padding: '14px 18px',
                maxWidth: '85%',
                fontSize: '14px',
                lineHeight: '1.5',
                borderRadius: m.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                background: m.sender === 'user' ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-card)',
                borderColor: m.sender === 'user' ? 'rgba(139, 92, 246, 0.25)' : 'var(--border-light)'
              }}>
                <div 
                  style={{ whiteSpace: 'pre-wrap' }} 
                  className="agent-markdown"
                  dangerouslySetInnerHTML={{ 
                    __html: m.text
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.4);padding:2px 4px;border-radius:4px;color:var(--color-secondary);font-family:monospace">$1</code>')
                      .replace(/\|/g, ' ')
                  }}
                />

                {m.trace && (
                  <button
                    onClick={() => { setActiveTrace(m.trace); setShowTrace(!showTrace); }}
                    style={{
                      marginTop: '12px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: 'var(--color-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 'bold'
                    }}
                  >
                    <Terminal size={10} />
                    <span>{showTrace ? 'Hide' : 'View'} SQL Execution Trace</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(139, 92, 246, 0.1)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span>Enrichment query agent writing SQLite search path...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length === 1 && (
          <div style={{ padding: '0 20px 12px 20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                className="glowing-btn glowing-btn-secondary"
                style={{ padding: '6px 12px', fontSize: '11px', gap: '4px', borderRadius: '20px' }}
                disabled={isLoading}
              >
                <span>{s}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-light)', background: 'rgba(10, 8, 20, 0.4)' }}>
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{ display: 'flex', gap: '10px' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="glass-input"
              style={{ flex: 1, padding: '12px 16px', fontSize: '14px' }}
              placeholder={`Ask anything about ${activeSubject} chapter priorities...`}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="glowing-btn" 
              disabled={isLoading || !input.trim()}
              style={{ padding: '12px 18px' }}
            >
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {activeTrace && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(10, 8, 20, 0.4)' }}>
            <Terminal size={16} style={{ color: 'var(--color-secondary)' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>Agent SQLite Trace Panel</h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>1. Compiled SQL Select Statement</span>
              </div>
              <textarea 
                className="sql-terminal" 
                style={{ width: '100%', height: '110px', fontSize: '12px', background: '#030206', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px' }}
                value={activeTrace.sql}
                readOnly
              />
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>2. SQL Engine Status</span>
              {activeTrace.error ? (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid var(--color-danger)',
                  padding: '10px',
                  borderRadius: '6px',
                  color: '#fecaca',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}>
                  {activeTrace.error}
                </div>
              ) : (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid var(--color-success)',
                  padding: '10px',
                  borderRadius: '6px',
                  color: '#a7f3d0',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div className="glow-dot glow-dot-success"></div>
                  <span>Execution Complete! Coral SQL returned {activeTrace.results?.length || 0} matching rows.</span>
                </div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>3. Grounding JSON Payload</span>
              <pre style={{
                flex: 1,
                maxHeight: '260px',
                background: '#040307',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#818cf8',
                overflow: 'auto'
              }}>
                {JSON.stringify(activeTrace.results, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
