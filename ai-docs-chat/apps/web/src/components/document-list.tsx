'use client';

import { useEffect, useState } from 'react';
import type { DocumentListItemDto } from '@ai-docs-chat/shared';
import { fetchDocuments } from '@/lib/api';
import styles from './document-list.module.css';

export function DocumentList() {
  const [docs, setDocs] = useState<DocumentListItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments()
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    setLoading(true);
    fetchDocuments()
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Documents</h2>
        <button className={styles.refresh} onClick={refresh} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && <p className={styles.muted}>Loading...</p>}

      {!loading && docs.length === 0 && (
        <p className={styles.muted}>No documents uploaded yet.</p>
      )}

      {!loading && docs.length > 0 && (
        <ul className={styles.list}>
          {docs.map((doc) => (
            <li key={doc.id} className={styles.item}>
              <div>
                <p className={styles.filename}>{doc.filename}</p>
                <p className={styles.meta}>
                  {formatSize(doc.sizeBytes)} &middot; {doc.status}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
