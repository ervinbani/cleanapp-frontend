import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLang } from "../../contexts/LangContext";
import styles from "./SettingsLayout.module.css";

const subNavItems = [
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

export default function SettingsLayout() {
  const { hasRole } = useAuth();
  const { lang } = useLang();

  const canAccessRoles = hasRole("owner", "director");

  const visibleItems = subNavItems.filter(
    (item) => !item.restricted || canAccessRoles,
  );

  return (
    <div className={styles.layout}>
      <aside className={styles.subNav}>
        <p className={styles.subNavTitle}>
          {lang === "en" ? "Settings" : "Configuración"}
        </p>
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ""}`
            }
          >
            {lang === "en" ? item.label : item.labelEs}
          </NavLink>
        ))}
      </aside>

      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
