import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { messageService } from "../services/messageService";
import styles from "./AppLayout.module.css";

const navItems = [
  {
    path: "/",
    label: "Dashboard",
    labelEs: "Inicio",
    icon: "⊞",
    permission: null,
  },
  {
    path: "/users",
    label: "Users",
    labelEs: "Usuarios",
    icon: "👥",
    permission: "users.read",
  },
  {
    path: "/customers",
    label: "Clients",
    labelEs: "Clientes",
    icon: "👤",
    permission: "users.read",
  },
  {
    path: "/jobs",
    label: "Jobs",
    labelEs: "Trabajos",
    icon: "🧹",
    permission: "jobs.read",
  },
  {
    path: "/services",
    label: "Services",
    labelEs: "Servicios",
    icon: "✨",
    permission: "services.read",
  },
  {
    path: "/calendar",
    label: "Calendar",
    labelEs: "Calendario",
    icon: "📅",
    permission: "jobs.read",
  },
  {
    path: "/invoices",
    label: "Invoices",
    labelEs: "Facturas",
    icon: "✉️",
    permission: "invoices.read",
  },
  {
    path: "/messages",
    label: "Messages",
    labelEs: "Mensajes",
    icon: "💬",
    permission: null,
  },
  {
    path: "/settings",
    label: "Settings",
    labelEs: "Configuración",
    icon: "⚙️",
    permission: "roles.read",
  },
];

const settingsSubItems = [
  {
    path: "/settings/general",
    label: "General",
    labelEs: "General",
    restricted: false,
  },
  {
    path: "/settings/team",
    label: "Team",
    labelEs: "Equipo",
    restricted: false,
  },
  {
    path: "/settings/roles",
    label: "Roles & Permissions",
    labelEs: "Roles y Permisos",
    restricted: true,
  },
  {
    path: "/settings/billing",
    label: "Billing",
    labelEs: "Facturación",
    restricted: false,
  },
  {
    path: "/settings/languages",
    label: "Languages",
    labelEs: "Idiomas",
    restricted: false,
  },
];

export default function AppLayout() {
  const { user, logout, hasRole, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(() =>
    location.pathname.startsWith("/settings"),
  );
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetch = () =>
      messageService
        .getUnreadCount()
        .then(setUnreadCount)
        .catch(() => {});
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  const isSettingsArea = location.pathname.startsWith("/settings");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarBrand}>
          <span className={styles.sidebarLogo}>🪣</span>
          <span className={styles.sidebarBrandName}>Brillo</span>
        </div>

        <nav className={styles.nav}>
          {navItems
            .filter((item) => {
              if (!item.permission) return true;
              const [entity, action] = item.permission.split(".");
              return hasPermission(entity, action);
            })
            .map((item) =>
              item.path === "/settings" ? (
                <div key="settings" className={styles.settingsGroup}>
                  <button
                    className={`${styles.settingsToggle} ${isSettingsArea ? styles.navItemActive : ""}`}
                    onClick={() => setSettingsOpen((o) => !o)}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navLabel}>
                      {lang === "en" ? item.label : item.labelEs}
                    </span>
                    <span
                      className={`${styles.chevron} ${settingsOpen ? styles.chevronOpen : ""}`}
                    >
                      ›
                    </span>
                  </button>
                  {settingsOpen && (
                    <div className={styles.subMenu}>
                      {settingsSubItems
                        .filter(
                          (s) => !s.restricted || hasRole("owner", "director"),
                        )
                        .map((sub) => (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            className={({ isActive }) =>
                              `${styles.subMenuItem} ${isActive ? styles.subMenuItemActive : ""}`
                            }
                            onClick={() => setSidebarOpen(false)}
                          >
                            {lang === "en" ? sub.label : sub.labelEs}
                          </NavLink>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>
                    {lang === "en" ? item.label : item.labelEs}
                    {lang === "es" && (
                      <span className={styles.navLabelSub}>{item.label}</span>
                    )}
                  </span>
                  {item.path === "/messages" && unreadCount > 0 && (
                    <span className={styles.navBadge}>{unreadCount}</span>
                  )}
                </NavLink>
              ),
            )}
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
                className={`${styles.langBtn} ${lang === "en" ? styles.langActive : ""}`}
                onClick={() => setLang("en")}
              >
                EN
              </button>
              <button
                className={`${styles.langBtn} ${lang === "es" ? styles.langActive : ""}`}
                onClick={() => setLang("es")}
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
              <button
                className={styles.logoutBtn}
                onClick={handleLogout}
                title="Logout"
              >
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
