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
    ownerOnly: true,
  },
  {
    path: "/settings/team",
    label: "Team",
    labelEs: "Equipo",
    restricted: false,
    ownerOnly: false,
  },
  {
    path: "/settings/roles",
    label: "Roles & Permissions",
    labelEs: "Roles y Permisos",
    restricted: true,
    ownerOnly: false,
  },
  {
    path: "/settings/billing",
    label: "Billing",
    labelEs: "Facturación",
    restricted: false,
    ownerOnly: false,
  },
  {
    path: "/settings/languages",
    label: "Languages",
    labelEs: "Idiomas",
    restricted: false,
    ownerOnly: false,
  },
];

export default function SettingsLayout() {
  const { hasRole } = useAuth();
  const { lang } = useLang();

  const isOwner = hasRole("owner");
  const canAccessRoles = hasRole("owner", "director");

  const visibleItems = subNavItems.filter((item) => {
    if (item.ownerOnly) return isOwner;
    if (item.restricted) return canAccessRoles;
    return true;
  });

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
