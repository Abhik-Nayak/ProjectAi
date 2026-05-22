'use client';

import { useCallback, useState, useRef } from 'react';
import { ALLOWED_MIME_TYPES } from '@ai-docs-chat/shared';
import { uploadDocument } from '@/lib/api';
import styles from './file-upload.module.css';

export function FileUpload() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setStatus('uploading');
    setMessage('');

    try {
      const result = await uploadDocument(file);
      setStatus('success');
      setMessage(`Uploaded: ${result.filename}`);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed');
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleUpload],
  );

  return (
    <section className={styles.card}>
      <h2 className={styles.heading}>Upload Document</h2>
      <div
        className={styles.dropzone}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p>Drop a file here or click to browse</p>
        <p className={styles.hint}>PDF, TXT, Markdown, DOCX (max 50 MB)</p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(',')}
          onChange={onFileSelect}
          hidden
        />
      </div>

      {status === 'uploading' && <p className={styles.info}>Uploading...</p>}
      {status === 'success' && <p className={styles.success}>{message}</p>}
      {status === 'error' && <p className={styles.error}>{message}</p>}
    </section>
  );
}
