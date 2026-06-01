import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  // Upload PDF
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1];

        const res = await axios.post(`${API_URL}/upload`, {
          filename: file.name,
          base64Data: base64,
        });

        console.log(res.data);
        setFile(null);
        await fetchStatus();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Query the RAG
  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_URL}/query`, { query });
      setAnswer(res.data);
      setQuery('');
    } catch (err) {
      setError(err.response?.data?.error || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  // Get status
  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/status`);
      setStatus(res.data);
    } catch (err) {
      console.error('Status fetch failed:', err);
    }
  };

  React.useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="App">
      <header className="header">
        <h1>📄 Legal Document RAG</h1>
        <p>Upload legal documents and ask questions</p>
      </header>

      <main className="container">
        {/* Left Panel: Upload */}
        <div className="panel upload-panel">
          <h2>📤 Upload Document</h2>
          <form onSubmit={handleUpload}>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files[0])}
              disabled={loading}
            />
            <button type="submit" disabled={!file || loading}>
              {loading ? '⏳ Uploading...' : '📤 Upload PDF'}
            </button>
          </form>

          {status && (
            <div className="status">
              <h3>📊 Status</h3>
              <p>Documents: {status.documentsCount}</p>
              <p>Total Chunks: {status.chunksCount}</p>
              {status.documents.length > 0 && (
                <ul>
                  {status.documents.map((doc) => (
                    <li key={doc.filename}>
                      {doc.filename} ({doc.chunkCount} chunks)
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Query */}
        <div className="panel query-panel">
          <h2>❓ Ask Questions</h2>
          <form onSubmit={handleQuery}>
            <textarea
              placeholder="e.g., What are the payment terms? What happens if I breach the agreement?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading || !status?.chunksCount}
            />
            <button 
              type="submit" 
              disabled={!query.trim() || loading || !status?.chunksCount}
            >
              {loading ? '⏳ Searching...' : '🔍 Ask'}
            </button>
          </form>

          {answer && (
            <div className="answer">
              <h3>💡 Answer</h3>
              <div className="answer-text">{answer.answer}</div>

              <h4>📎 Sources</h4>
              <div className="sources">
                {answer.sources.map((src, i) => (
                  <div key={i} className="source">
                    <span className="score">
                      Score: {(src.score * 100).toFixed(0)}%
                    </span>
                    <p>{src.text.slice(0, 200)}...</p>
                    <small>{src.filename}</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="error">❌ {error}</div>}
        </div>
      </main>
    </div>
  );
}

export default App;