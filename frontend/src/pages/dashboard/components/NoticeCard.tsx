import { Icon } from '@/components/ui/Icon';
import styles from './NoticeCard.module.css';

/** Thông báo nổi bật trên nền gradient tối. */
export function NoticeCard() {
  return (
    <section className={styles.card}>
      <div className={styles.inner}>
        <span className={styles.tag}>
          <Icon name="bell" size={14} /> Thông báo
        </span>
        <h5 className={styles.title}>Tổng rà soát dân cư quý IV</h5>
        <p className={styles.desc}>
          Các tổ dân phố hoàn thành rà soát, đối chiếu thông tin nhân khẩu và cập nhật biến động trước
          ngày 15/12. Tiến độ từng tổ xem ở bảng bên dưới.
        </p>
        <a href="#ra-soat" className={styles.more}>
          Xem tiến độ <Icon name="arrowRight" size={14} />
        </a>
      </div>
    </section>
  );
}
