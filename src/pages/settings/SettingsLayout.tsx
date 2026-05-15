import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLang } from "../../contexts/LangContext";
import styles from "./SettingsLayout.module.css";

const subNavItems = [
  {
    path: "/settings/general",
    label: "General",
    labelEs: "General",
    labelIt: "Generale",
    labelSq: "Gjenerale",
    restricted: false,
    ownerOnly: true,
  },
  {
    path: "/settings/team",
    label: "Team",
    labelEs: "Equipo",
    labelIt: "Team",
    labelSq: "Ekipi",
    restricted: false,
    ownerOnly: false,
  },
  {
    path: "/settings/roles",
    label: "Roles & Permissions",
    labelEs: "Roles y Permisos",
    labelIt: "Ruoli e Permessi",
    labelSq: "Rolet dhe Lejet",
    restricted: true,
    ownerOnly: false,
  },
  {
    path: "/settings/billing",
    label: "Billing",
    labelEs: "Facturación",
    labelIt: "Fatturazione",
    labelSq: "Faturimi",
    restricted: false,
    ownerOnly: false,
  },
  {
    path: "/settings/languages",
    label: "Languages",
    labelEs: "Idiomas",
    labelIt: "Lingue",
    labelSq: "Gjuhet",
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
          {lang === "en"
            ? "Settings"
            : lang === "es"
              ? "Configuración"
              : lang === "sq"
                ? "Cilesimet"
                : "Impostazioni"}
        </p>
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${styles.subNavItem} ${isActive ? styles.subNavItemActive : ""}`
            }
          >
            {lang === "en"
              ? item.label
              : lang === "es"
                ? item.labelEs
                : lang === "sq"
                  ? item.labelSq
                  : item.labelIt}
          </NavLink>
        ))}
      </aside>

      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
