import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './AppLayout.module.css';

const navItems = [
  { path: '/', label: 'Dashboard', labelEs: 'Inicio', icon: '⊞' },
  { path: '/customers', label: 'Clients', labelEs: 'Clientes', icon: '👤' },
  { path: '/jobs', label: 'Jobs', labelEs: 'Trabajos', icon: '🧹' },
  { path: '/calendar', label: 'Calendar', labelEs: 'Calendario', icon: '📅' },
  { path: '/invoices', label: 'Invoices', labelEs: 'Facturas', icon: '✉️' },
  { path: '/messages', label: 'Messages', labelEs: 'Mensajes', icon: '💬' },
  { path: '/settings', label: 'Settings', labelEs: 'Configuración', icon: '⚙️' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarBrand}>
          <span className={styles.sidebarLogo}>🪣</span>
          <span className={styles.sidebarBrandName}>Brillo</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>
                {lang === 'en' ? item.label : item.labelEs}
                {lang === 'es' && (
                  <span className={styles.navLabelSub}>{item.label}</span>
                )}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main area */}
      <div className={styles.main}>
        {/* Top bar */}
        <header className={styles.topbar}>
          <button
            className={styles.hamburger}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            ☰
          </button>

          <div className={styles.topbarRight}>
            <div className={styles.langToggle}>
              <button
                className={`${styles.langBtn} ${lang === 'en' ? styles.langActive : ''}`}
                onClick={() => setLang('en')}
              >
                EN
              </button>
              <button
                className={`${styles.langBtn} ${lang === 'es' ? styles.langActive : ''}`}
                onClick={() => setLang('es')}
              >
                ES
              </button>
            </div>

            <div className={styles.userMenu}>
              <div className={styles.avatar}>
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <span className={styles.userName}>
                {user?.firstName} {user?.lastName}
              </span>
              <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
                ⏻
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
