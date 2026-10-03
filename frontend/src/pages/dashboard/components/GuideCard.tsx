import { Link } from 'react-router-dom';
import { ROUTES } from '@/config/navigation';
import { Icon } from '@/components/ui/Icon';
import styles from './GuideCard.module.css';

const STEPS = ['Tiếp nhận hồ sơ', 'Xác minh thông tin', 'Cập nhật vào hệ thống'];

/** Khối giới thiệu nghiệp vụ: chữ bên trái, minh hoạ gradient bên phải. */
export function GuideCard() {
  return (
    <section className={styles.card}>
      <div className={styles.text}>
        <p className={styles.eyebrow}>Hướng dẫn nghiệp vụ</p>
        <h5 className={styles.title}>Quy trình đăng ký tạm trú</h5>
        <p className={styles.desc}>
          Công dân đến ở trên 30 ngày phải đăng ký tạm trú. Cán bộ tiếp nhận, xác minh nơi ở hợp pháp
          và cập nhật trong vòng 3 ngày làm việc.
        </p>
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={s}>
              <span className={styles.stepNo}>{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <Link to={ROUTES.temporary} className={styles.more}>
          Mở danh sách tạm trú <Icon name="arrowRight" size={14} />
        </Link>
      </div>
      <div className={styles.art} aria-hidden="true">
        <Icon name="home" size={88} strokeWidth={1.2} />
      </div>
    </section>
  );
}
