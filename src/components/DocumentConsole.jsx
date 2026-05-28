import React, { useState, useEffect } from 'react';
import { Upload, Play, Trash2, CheckCircle2, ChevronRight, Info, HelpCircle, Code } from 'lucide-react';

export default function DocumentConsole({ apiKey, analyticsData, activeSubject, refreshAnalytics }) {
  const [file, setFile] = useState(null);
  const [sourceType, setSourceType] = useState('pyq');
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  
  const [enrichmentProgress, setEnenrichmentProgress] = useState(null);
  const [activeEnenrichingId, setActiveEnenrichingId] = useState(null);

  // Hidden developer playground state
  const [showDevTools, setShowDevTools] = useState(false);
  const [sqlQuery, setSqlQuery] = useState(`SELECT t.chapter, t.section, COUNT(q.question_id) AS matched_questions FROM "exam.textbook_chunks" t LEFT JOIN "exam.chapter_links" l ON t.chunk_id = l.chunk_id LEFT JOIN "exam.questions" q ON l.question_id = q.question_id GROUP BY t.chapter, t.section ORDER BY matched_questions DESC;`);
  const [sqlResults, setSqlResults] = useState(null);
  const [sqlError, setSqlError] = useState(null);
  const [isRunningSql, setIsRunningSql] = useState(false);

  const sqlTemplates = [
    {
      name: 'TOC Yield Frequencies',
      query: `SELECT t.chapter, t.section, COUNT(q.question_id) AS matched_questions FROM "exam.textbook_chunks" t LEFT JOIN "exam.chapter_links" l ON t.chunk_id = l.chunk_id LEFT JOIN "exam.questions" q ON l.question_id = q.question_id GROUP BY t.chapter, t.section ORDER BY matched_questions DESC;`
    },
    {
      name: 'Zero-Yield Skip List',
      query: `SELECT chapter, section, main_concept FROM "exam.textbook_chunks" WHERE chunk_id NOT IN (SELECT chunk_id FROM "exam.chapter_links");`
    },
    {
      name: 'Active Subject Ingestion Sources',
      query: `SELECT filename, source_type, upload_timestamp FROM "pdf.documents" ORDER BY upload_timestamp DESC;`
    }
  ];

  // Fetch real-time documents list for the active subject from SQLite
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: `SELECT source_id, filename, source_type, subject, upload_timestamp FROM "pdf.documents" WHERE subject = '${activeSubject.replace(/'/g, "''")}' ORDER BY upload_timestamp DESC;` })
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(data.results);
      }
    } catch (err) {
      console.error('Failed to fetch documents list:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeSubject, analyticsData]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (typeToUpload) => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(`Reading and structuring your study guide...`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceType', typeToUpload);
    formData.append('subject', activeSubject);
    formData.append('apiKey', apiKey); // Decoupled adapter key passed to backend

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error uploading file.');

      setUploadStatus(`Material saved! Successfully parsed & extracted outlines.`);
      setFile(null);
      fetchDocuments();
      refreshAnalytics();
    } catch (err) {
      setUploadStatus(`Upload Failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Are you sure you want to delete this study material and all its parsed questions/chapters?')) return;
    
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Purging failed.');
      
      fetchDocuments();
      refreshAnalytics();
    } catch (err) {
      alert(`Failed to delete document: ${err.message}`);
    }
  };

  const handleEnenrich = async (sourceId) => {
    if (!apiKey) {
      alert('Please enter your Gemini API Key in the settings block in the sidebar before starting analysis.');
      return;
    }

    setActiveEnenrichingId(sourceId);
    setEnenrichmentProgress({ current: 0, total: 100, text: 'Mapping study topics semantically...' });

    try {
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, apiKey })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to trigger enrichment.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.error) throw new Error(data.error);
              
              setEnenrichmentProgress(data);
              if (data.step === 'completed') {
                setTimeout(() => {
                  setEnenrichmentProgress(null);
                  setActiveEnenrichingId(null);
                  fetchDocuments();
                  refreshAnalytics();
                }, 2000);
              }
            } catch (e) {
              // Ignore partial JSONs
            }
          }
        }
      }

    } catch (err) {
      console.error('Semantic mapping failure:', err);
      setEnenrichmentProgress({ step: 'error', text: `Mapping failed: ${err.message}` });
      setTimeout(() => {
        setEnenrichmentProgress(null);
        setActiveEnenrichingId(null);
      }, 4000);
    }
  };

  const runSQL = async () => {
    setIsRunningSql(true);
    setSqlError(null);
    setSqlResults(null);

    try {
      const res = await fetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlQuery })
      });
      const data = await res.json();
      
      if (!data.success) {
        setSqlError(data.error);
      } else {
        setSqlResults(data.results);
      }
    } catch (err) {
      setSqlError(`Connection error: ${err.message}`);
    } finally {
      setIsRunningSql(false);
    }
  };

  const pyqDocs = documents.filter(d => d.source_type === 'pyq');
  const textbookDocs = documents.filter(d => d.source_type === 'textbook');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--text-glow)' }}>
          Guided Subject Planner ({activeSubject})
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          Follow the simple guided sequence below to unlock high-yield exam insights.
        </p>
      </header>

      {/* Dynamic Guided Wizard Flow */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* STEP 1: UPLOAD PAST EXAM QUESTIONS (PYQ) */}
          <div className="glass-panel" style={{ padding: '24px', position: 'relative', borderLeft: pyqDocs.length > 0 ? '4px solid var(--color-success)' : '4px solid var(--color-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: pyqDocs.length > 0 ? 'var(--color-success)' : 'var(--color-primary)', color: 'black', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>1</span>
                <span>Step 1: Upload Past Exam Papers (PYQ PDF)</span>
              </h3>
              {pyqDocs.length > 0 && <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />}
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              Upload past years' examination questions. Our parser automatically splits them into distinct questions to count topic yields.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                border: '2px dashed var(--border-light)',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.1)'
              }}>
                <input 
                  type="file" 
                  accept=".pdf" 
                  id="pyq-file"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="pyq-file" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Upload size={24} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-glow)' }}>
                    {file && sourceType === 'pyq' ? file.name : 'Select Past papers PDF...'}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Upload cumulative papers. Split boundaries are calculated automatically.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => { setSourceType('pyq'); handleUpload('pyq'); }}
                  className="glowing-btn" 
                  disabled={isUploading || !file}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Confirm & Ingest PYQ
                </button>
              </div>
            </div>
          </div>

          {/* STEP 2: UPLOAD TEXTBOOK OUTLINE (TOC) */}
          <div className="glass-panel" style={{ 
            padding: '24px', 
            position: 'relative', 
            borderLeft: textbookDocs.length > 0 ? '4px solid var(--color-success)' : '4px solid var(--color-secondary)',
            opacity: pyqDocs.length > 0 ? 1 : 0.5,
            pointerEvents: pyqDocs.length > 0 ? 'auto' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: textbookDocs.length > 0 ? 'var(--color-success)' : 'var(--color-secondary)', color: 'black', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>2</span>
                <span>Step 2: Upload Textbook Outline / Contents PDF</span>
              </h3>
              {textbookDocs.length > 0 && <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />}
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              {pyqDocs.length > 0 
                ? "Next, upload the standard textbook's Table of Contents PDF. This allows us to map the chapters to past papers."
                : "Please complete Step 1 and upload PYQ PDF files above to unlock textbook priority mapping!"}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                border: '2px dashed var(--border-light)',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.1)'
              }}>
                <input 
                  type="file" 
                  accept=".pdf" 
                  id="toc-file"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={pyqDocs.length === 0}
                />
                <label htmlFor="toc-file" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Upload size={24} style={{ color: 'var(--color-secondary)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-glow)' }}>
                    {file && sourceType === 'textbook' ? file.name : 'Select Table of Contents PDF...'}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    TOC outlines are structured dynamically via our curriculum planner.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => { setSourceType('textbook'); handleUpload('textbook'); }}
                  className="glowing-btn glowing-btn-secondary" 
                  disabled={isUploading || !file || pyqDocs.length === 0}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Confirm & Ingest Textbook Outline
                </button>
              </div>
            </div>
          </div>

          {uploadStatus && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              color: uploadStatus.includes('Failed') ? 'var(--color-danger)' : 'var(--color-secondary)'
            }}>
              {uploadStatus}
            </div>
          )}

        </div>

        {/* SIDEBAR: MATERIAL MANAGER & PURGE TOOL */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Study Materials ({activeSubject})</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>Manage uploaded files and trigger AI semantic alignment.</p>
          
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {documents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {documents.map((doc, idx) => {
                  const enriched = analyticsData?.counts?.enriched?.questions > 0 || doc.source_type === 'textbook' ? 'Mapped' : 'Uploaded';
                  return (
                    <div key={idx} className="glass-panel animate-fade-in" style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '80%' }}>
                          <span className={`glow-dot ${doc.source_type === 'textbook' ? 'glow-dot-secondary' : 'glow-dot-primary'}`}></span>
                          <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-glow)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.filename}>{doc.filename}</h4>
                        </div>
                        <button 
                          onClick={() => handleDeleteDoc(doc.source_id)}
                          style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.7)', cursor: 'pointer', padding: '2px' }}
                          title="Delete study guide"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                        <span style={{ textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                          {doc.source_type === 'textbook' ? 'Textbook Contents' : 'PYQ Papers'}
                        </span>
                        
                        {doc.source_type === 'textbook' ? (
                          <span style={{ color: 'var(--color-success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            Structured ✓
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleEnenrich(doc.source_id)}
                            className="glowing-btn"
                            style={{ padding: '4px 8px', fontSize: '10px' }}
                            disabled={activeEnenrichingId !== null}
                          >
                            <Play size={8} style={{ marginRight: '3px' }} />
                            <span>{activeEnenrichingId === doc.source_id ? 'Mapping...' : 'Align AI'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', margin: 'auto', padding: '20px 0' }}>
                <Info size={24} style={{ margin: '0 auto 8px auto', color: 'var(--color-primary)', display: 'block' }} />
                No PDFs uploaded yet. Upload a past paper PDF above to get started!
              </div>
            )}
          </div>

          {enrichmentProgress && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-secondary)' }}>{enrichmentProgress.text}</span>
                <span>{enrichmentProgress.current}/{enrichmentProgress.total}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--color-primary), var(--color-success))',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NOVICE-FRIENDLY COLLAPSIBLE DEVELOPER SQL CONSOLE */}
      <div style={{ marginTop: '12px' }}>
        <button 
          onClick={() => setShowDevTools(!showDevTools)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Code size={12} />
          <span>{showDevTools ? 'Hide' : 'Show'} Advanced Developer SQL Terminal Console</span>
        </button>

        {showDevTools && (
          <div className="glass-panel" style={{ padding: '24px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Coral SQL Console Playground</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                  Execute SELECT queries directly against your raw "pdf." and enriched "exam." tables.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {sqlTemplates.map((t, idx) => (
                <button 
                  key={idx}
                  onClick={() => setSqlQuery(t.query)}
                  className="glowing-btn glowing-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '10px' }}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="sql-terminal"
                style={{ width: '100%', height: '100px', resize: 'vertical', border: '1px solid rgba(139, 92, 246, 0.2)' }}
                placeholder="Type your SQLite statement here..."
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={runSQL}
                  className="glowing-btn" 
                  disabled={isRunningSql}
                  style={{ padding: '8px 20px', fontSize: '13px' }}
                >
                  Run Query
                </button>
              </div>

              {sqlError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid var(--color-danger)',
                  padding: '12px',
                  borderRadius: '6px',
                  color: '#fecaca',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}>
                  {sqlError}
                </div>
              )}

              {sqlResults && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <span>SQL Output Data Console ({sqlResults.length} rows returned)</span>
                  </div>

                  {sqlResults.length > 0 ? (
                    <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', maxHeight: '250px' }}>
                      <table className="coral-table">
                        <thead>
                          <tr>
                            {Object.keys(sqlResults[0]).map((key, i) => (
                              <th key={i}>{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sqlResults.map((row, idx) => (
                            <tr key={idx}>
                              {Object.values(row).map((val, i) => (
                                <td key={i}>
                                  {val === null ? 'NULL' : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Query ran successfully, but returned 0 rows.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
