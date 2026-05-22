import { FileUpload } from '@/components/file-upload';
import { DocumentList } from '@/components/document-list';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>AI Docs Chat</h1>
      <p className={styles.subtitle}>Upload documents to start chatting with your knowledge base</p>
      <div className={styles.grid}>
        <FileUpload />
        <DocumentList />
      </div>
    </main>
  );
}
