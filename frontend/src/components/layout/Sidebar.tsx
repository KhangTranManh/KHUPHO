import { Link, NavLink } from 'react-router-dom';
import { appConfig } from '@/config/app';
import { ROUTES, sidebarNav } from '@/config/navigation';
import { IconBox } from '@/components/ui/IconBox';
import { Icon } from '@/components/ui/Icon';
import styles from './Sidebar.module.css';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-label="Điều hướng chính">
        <div className={styles.brandRow}>
          <Link to={ROUTES.dashboard} className={styles.brand}>
            <img src="/favicon.svg" alt="" className={styles.logo} />
            <span>
              <span className={styles.brandName}>{appConfig.name}</span>
              <span className={styles.brandSub}>{appConfig.shortName}</span>
            </span>
          </Link>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Đóng menu">
            <Icon name="x" />
          </button>
        </div>

        <hr className={styles.divider} />

        <nav className={styles.nav}>
          {sidebarNav.map((section, i) => (
            <div key={section.title ?? i}>
              {section.title && <h6 className={styles.sectionTitle}>{section.title}</h6>}
              <ul className={styles.list}>
                {section.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === ROUTES.dashboard}
                      className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                    >
                      {({ isActive }) => (
                        <>
                          <IconBox
                            icon={item.icon}
                            size="sm"
                            variant={isActive ? 'gradient' : 'plain'}
                          />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.help}>
          <span className={styles.helpIcon}>
            <Icon name="helpCircle" />
          </span>
          <h6 className={styles.helpTitle}>Cần hỗ trợ?</h6>
          <p className={styles.helpText}>Xem hướng dẫn nghiệp vụ đăng ký, quản lý cư trú.</p>
          <a className={styles.helpButton} href="#huong-dan">
            Tài liệu hướng dẫn
          </a>
        </div>
      </aside>

      {open && <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />}
    </>
  );
}
