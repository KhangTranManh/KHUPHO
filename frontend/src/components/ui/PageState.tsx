import styles from './PageState.module.css';

/** Trạng thái tải / lỗi dùng chung cho mọi khối dữ liệu. */
export function PageState({ error }: { error?: string | null }) {
  if (error) {
    return <div className={`${styles.state} ${styles.error}`}>Không tải được dữ liệu: {error}</div>;
  }
  return (
    <div className={styles.state} aria-busy="true">
      <span className={styles.spinner} />
      Đang tải…
    </div>
  );
}
