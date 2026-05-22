'use client';

import { useState } from 'react';
import type { SearchResultDto } from '@ai-docs-chat/shared';
import { searchDocuments } from '@/lib/api';
import styles from './search-panel.module.css';

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');

    try {
      const data = await searchDocuments(trimmed);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.heading}>Search Documents</h2>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Ask a question about your documents..."
        />
        <button
          className={styles.button}
          onClick={handleSearch}
          disabled={loading || !query.trim()}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {results.length > 0 && (
        <ul className={styles.results}>
          {results.map((r) => (
            <li key={r.chunkId} className={styles.result}>
              <div className={styles.resultHeader}>
                <span className={styles.filename}>{r.filename}</span>
                <span className={styles.similarity}>
                  {(r.similarity * 100).toFixed(1)}% match
                </span>
              </div>
              <p className={styles.content}>{r.content}</p>
              <p className={styles.meta}>Chunk {r.chunkIndex + 1}</p>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && results.length === 0 && query.trim() && (
        <p className={styles.muted}>No results yet. Hit search to query your documents.</p>
      )}
    </section>
  );
}
