import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { messageService } from "../services/messageService";
import { deleteTenant } from "../services/authService";
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
  const { user, logout, hasRole, hasPermission, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(() =>
    location.pathname.startsWith("/settings"),
  );
  const [unreadCount, setUnreadCount] = useState(0);

  // ── user dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── profile modal
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);

  // ── delete account modal
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmWord, setDeleteConfirmWord] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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

  // close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // sync profile form when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
      });
    }
  }, [user]);

  const openProfile = () => {
    setDropdownOpen(false);
    setProfileError("");
    setProfileSuccess(false);
    setShowProfile(true);
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess(false);
    try {
      await updateUser(profileForm);
      setProfileSuccess(true);
    } catch {
      setProfileError(
        lang === "en" ? "Failed to save changes." : "Error al guardar.",
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const openDeleteAccount = () => {
    setShowProfile(false);
    setDeletePassword("");
    setDeleteConfirmWord("");
    setDeleteError("");
    setShowDeleteAccount(true);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmWord !== "DELETE") {
      setDeleteError(
        lang === "en"
          ? "You must type DELETE to confirm."
          : "Debes escribir DELETE para confirmar.",
      );
      return;
    }
    if (!deletePassword.trim()) {
      setDeleteError(
        lang === "en"
          ? "Password is required."
          : "La contraseña es obligatoria.",
      );
      return;
    }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await deleteTenant(deletePassword);
      logout();
      navigate("/login");
    } catch {
      setDeleteError(
        lang === "en"
          ? "Incorrect password or server error."
          : "Contraseña incorrecta o error del servidor.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const isSettingsArea = location.pathname.startsWith("/settings");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}
      >
        <div className={styles.sidebarBrand}>
          <span className={styles.sidebarLogo}>🪣</span>
          {!sidebarCollapsed && (
            <span className={styles.sidebarBrandName}>Brillo</span>
          )}
          <button
            className={styles.collapseBtn}
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? "Espandi sidebar" : "Comprimi sidebar"}
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>
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
                    className={`${styles.settingsToggle} ${isSettingsArea ? styles.navItemActive : ""} ${sidebarCollapsed ? styles.navItemIconOnly : ""}`}
                    onClick={() =>
                      !sidebarCollapsed && setSettingsOpen((o) => !o)
                    }
                    title={
                      sidebarCollapsed
                        ? lang === "en"
                          ? "Settings"
                          : "Configuración"
                        : undefined
                    }
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span className={styles.navLabel}>
                          {lang === "en" ? item.label : item.labelEs}
                        </span>
                        <span
                          className={`${styles.chevron} ${settingsOpen ? styles.chevronOpen : ""}`}
                        >
                          ›
                        </span>
                      </>
                    )}
                  </button>
                  {/* expanded: normal accordion */}
                  {!sidebarCollapsed && settingsOpen && (
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
                  {/* collapsed: hover flyout */}
                  {sidebarCollapsed && (
                    <div className={styles.subMenuFlyout}>
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
                    `${styles.navItem} ${isActive ? styles.navItemActive : ""} ${sidebarCollapsed ? styles.navItemIconOnly : ""}`
                  }
                  onClick={() => setSidebarOpen(false)}
                  title={
                    sidebarCollapsed
                      ? lang === "en"
                        ? item.label
                        : item.labelEs
                      : undefined
                  }
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {!sidebarCollapsed && (
                    <>
                      <span className={styles.navLabel}>
                        {lang === "en" ? item.label : item.labelEs}
                        {lang === "es" && (
                          <span className={styles.navLabelSub}>
                            {item.label}
                          </span>
                        )}
                      </span>
                      {item.path === "/messages" && unreadCount > 0 && (
                        <span className={styles.navBadge}>{unreadCount}</span>
                      )}
                    </>
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
            <button
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              title={
                theme === "dark"
                  ? lang === "en"
                    ? "Light mode"
                    : "Modo claro"
                  : lang === "en"
                    ? "Dark mode"
                    : "Modo oscuro"
              }
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

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

            <div className={styles.userMenu} ref={dropdownRef}>
              <button
                className={styles.userMenuTrigger}
                onClick={() => setDropdownOpen((o) => !o)}
                aria-expanded={dropdownOpen}
              >
                <div className={styles.avatar}>
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </div>
                <span className={styles.userName}>
                  {user?.firstName} {user?.lastName}
                </span>
                <span className={styles.userChevron}>
                  {dropdownOpen ? "▴" : "▾"}
                </span>
              </button>

              {dropdownOpen && (
                <div className={styles.userDropdown}>
                  <div className={styles.userDropdownHeader}>
                    <div className={styles.avatarLarge}>
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </div>
                    <div>
                      <p className={styles.dropdownName}>
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className={styles.dropdownRole}>{user?.role}</p>
                    </div>
                  </div>
                  <hr className={styles.dropdownDivider} />
                  <button className={styles.dropdownItem} onClick={openProfile}>
                    👤 {lang === "en" ? "My Profile" : "Mi Perfil"}
                  </button>
                  <hr className={styles.dropdownDivider} />
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                  >
                    ⏻ {lang === "en" ? "Logout" : "Cerrar sesión"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      {/* ── Profile Modal ───────────────────────────────── */}
      {showProfile && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowProfile(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className={styles.modalTitle}>
              {lang === "en" ? "My Profile" : "Mi Perfil"}
            </h2>

            <div className={styles.profileGrid}>
              <div>
                <label className={styles.formLabel}>
                  {lang === "en" ? "First Name" : "Nombre"}
                </label>
                <input
                  className={styles.formInput}
                  value={profileForm.firstName}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={styles.formLabel}>
                  {lang === "en" ? "Last Name" : "Apellido"}
                </label>
                <input
                  className={styles.formInput}
                  value={profileForm.lastName}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
              </div>
              <div className={styles.profileFullWidth}>
                <label className={styles.formLabel}>Email</label>
                <input
                  className={styles.formInput}
                  type="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className={styles.profileFullWidth}>
                <label className={styles.formLabel}>
                  {lang === "en" ? "Phone" : "Teléfono"}
                </label>
                <input
                  className={styles.formInput}
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
            </div>

            {profileError && <p className={styles.formError}>{profileError}</p>}
            {profileSuccess && (
              <p className={styles.formSuccess}>
                {lang === "en" ? "Saved successfully." : "Guardado con éxito."}
              </p>
            )}

            <div className={styles.modalActions}>
              {hasRole("owner") && (
                <button
                  className={styles.deleteAccBtn}
                  onClick={openDeleteAccount}
                >
                  {lang === "en" ? "Delete Account" : "Eliminar cuenta"}
                </button>
              )}
              <button
                className={styles.cancelBtn}
                onClick={() => setShowProfile(false)}
              >
                {lang === "en" ? "Cancel" : "Cancelar"}
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleProfileSave}
                disabled={profileSaving}
              >
                {profileSaving
                  ? lang === "en"
                    ? "Saving…"
                    : "Guardando…"
                  : lang === "en"
                    ? "Save"
                    : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account Modal ────────────────────────── */}
      {showDeleteAccount && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowDeleteAccount(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className={`${styles.modalTitle} ${styles.dangerTitle}`}>
              ⚠️ {lang === "en" ? "Delete Account" : "Eliminar cuenta"}
            </h2>
            <p className={styles.dangerBody}>
              {lang === "en"
                ? "This will permanently delete your account, all users, jobs, invoices, and all data associated with your organisation. This action cannot be undone."
                : "Esto eliminará permanentemente tu cuenta, todos los usuarios, trabajos, facturas y todos los datos de tu organización. Esta acción no se puede deshacer."}
            </p>

            <label className={styles.formLabel}>
              {lang === "en" ? "Your password" : "Tu contraseña"}
            </label>
            <input
              className={styles.formInput}
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />

            <label
              className={styles.formLabel}
              style={{ marginTop: "0.75rem" }}
            >
              {lang === "en"
                ? "Type DELETE to confirm"
                : "Escribe DELETE para confirmar"}
            </label>
            <input
              className={styles.formInput}
              placeholder="DELETE"
              value={deleteConfirmWord}
              onChange={(e) => setDeleteConfirmWord(e.target.value)}
            />

            {deleteError && <p className={styles.formError}>{deleteError}</p>}

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowDeleteAccount(false)}
                disabled={deleteLoading}
              >
                {lang === "en" ? "Cancel" : "Cancelar"}
              </button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={handleDeleteAccount}
                disabled={
                  deleteLoading ||
                  deleteConfirmWord !== "DELETE" ||
                  !deletePassword.trim()
                }
              >
                {deleteLoading
                  ? lang === "en"
                    ? "Deleting…"
                    : "Eliminando…"
                  : lang === "en"
                    ? "Delete Everything"
                    : "Eliminar todo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
