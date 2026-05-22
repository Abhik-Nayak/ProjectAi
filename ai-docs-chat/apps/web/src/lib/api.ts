const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Upload failed');
  }

  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/api/documents`);

  if (!res.ok) {
    throw new Error('Failed to fetch documents');
  }

  return res.json();
}
