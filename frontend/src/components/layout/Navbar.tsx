import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES, findNavItem } from '@/config/navigation';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthContext';
import { ROLE_LABEL, STAFF_ROLES, homeFor } from '@/features/auth/constants';
import styles from './Navbar.module.css';

interface NavbarProps {
  onMenuClick: () => void;
}

/** Thanh trên cùng: breadcrumb + tiêu đề trang, ô tìm nhanh, thao tác tài khoản. Mờ nền khi cuộn. */
export function Navbar({ onMenuClick }: NavbarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState('');
  const title = findNavItem(pathname)?.label ?? 'Không tìm thấy trang';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /** Tìm nhanh → chuyển sang danh sách nhân khẩu với từ khoá. */
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`${ROUTES.residents}?q=${encodeURIComponent(q)}`);
    setQuery('');
  };

  return (
    <header className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div>
        <ol className={styles.breadcrumb}>
          <li>
            <Link to={user ? homeFor(user.role) : ROUTES.dashboard} aria-label="Trang chủ">
              <Icon name="home" size={14} />
            </Link>
          </li>
          <li className={styles.current}>{title}</li>
        </ol>
        <h6 className={styles.title}>{title}</h6>
      </div>

      <div className={styles.actions}>
        {isStaff && (
          <form onSubmit={onSearch} className={styles.search} role="search">
            <TextField
              icon="search"
              placeholder="Tìm tên, CCCD, số hộ…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm nhanh nhân khẩu"
            />
          </form>
        )}
        <Link to={ROUTES.profile} className={styles.action}>
          <Icon name="user" size={16} />
          <span className={styles.actionLabel}>
            {user?.fullName}
            {user && <small className={styles.role}> · {ROLE_LABEL[user.role]}</small>}
          </span>
        </Link>
        <button type="button" className={styles.action} aria-label="Thông báo">
          <Icon name="bell" size={16} />
          <span className={styles.dot} />
        </button>
        <button type="button" className={`${styles.action} ${styles.menu}`} onClick={onMenuClick} aria-label="Mở menu">
          <Icon name="menu" size={18} />
        </button>
      </div>
    </header>
  );
}
