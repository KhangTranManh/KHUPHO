import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import styles from './DashboardLayout.module.css';

/** Khung cho các trang sau đăng nhập: sidebar trái + navbar + nội dung + footer. */
export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  // Đóng sidebar (mobile) mỗi khi chuyển trang.
  useEffect(() => setSidebarOpen(false), [pathname]);

  return (
    <div className={styles.layout}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={styles.main}>
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className={styles.content}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
