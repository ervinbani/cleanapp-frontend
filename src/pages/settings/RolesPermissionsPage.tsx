import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLang } from "../../contexts/LangContext";
import { roleService, permissionService } from "../../services/roleService";
import type {
  Role,
  Permission,
  PermissionAction,
  PermissionResource,
} from "../../types";
import styles from "./RolesPermissionsPage.module.css";

const RESOURCES: PermissionResource[] = [
  "users",
  "jobs",
  "services",
  "invoices",
  "roles",
  "permissions",
];

const ACTIONS: PermissionAction[] = ["read", "create", "update", "delete"];

const RESOURCE_LABELS: Record<PermissionResource, string> = {
  users: "Users",
  jobs: "Jobs",
  services: "Services",
  invoices: "Invoices",
  roles: "Roles",
  permissions: "Permissions",
};

const ACTION_LABELS: Record<PermissionAction, string> = {
  read: "View",
  create: "Create",
  update: "Edit",
  delete: "Delete",
};

export default function RolesPermissionsPage() {
  const { hasRole } = useAuth();
  const { lang } = useLang();

  const canEdit = hasRole("owner");
  const canView = hasRole("owner", "director");

  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedRoleIdx, setSelectedRoleIdx] = useState(0);
  // localPermIds: set of permission _ids currently toggled for the selected role
  const [localPermIds, setLocalPermIds] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([roleService.getAll(), permissionService.getAll()])
      .then(([fetchedRoles, fetchedPerms]) => {
        // Normalize: backend may return permissions as IDs or populated objects
        const permMap = new Map(fetchedPerms.map((p) => [p._id, p]));
        const normalizedRoles = fetchedRoles.map((role) => ({
          ...role,
          permissions: role.permissions
            .map((p) => (typeof p === "string" ? permMap.get(p) : p))
            .filter(Boolean) as Permission[],
        }));
        setRoles(normalizedRoles);
        setAllPermissions(fetchedPerms);
        if (normalizedRoles.length > 0) {
          setLocalPermIds(
            new Set(normalizedRoles[0].permissions.map((p) => p._id)),
          );
        }
      })
      .catch(() => setError("Failed to load roles and permissions."))
      .finally(() => setIsLoading(false));
  }, []);

  if (!canView) return <Navigate to="/" replace />;

  const handleTabChange = (idx: number) => {
    setSelectedRoleIdx(idx);
    setLocalPermIds(
      new Set((roles[idx].permissions as Permission[]).map((p) => p._id)),
    );
    setIsDirty(false);
  };

  const handleToggle = (permId: string) => {
    if (!canEdit) return;
    setLocalPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
    setIsDirty(true);
  };

  const handleCancel = () => {
    const original = (roles[selectedRoleIdx].permissions as Permission[]).map(
      (p) => p._id,
    );
    setLocalPermIds(new Set(original));
    setIsDirty(false);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      const updated = await roleService.update(
        roles[selectedRoleIdx]._id,
        Array.from(localPermIds),
      );
      // Patch local roles state with updated permissions
      setRoles((prev) =>
        prev.map((r, i) => (i === selectedRoleIdx ? updated : r)),
      );
      setIsDirty(false);
    } catch {
      setError("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // Find a permission object from allPermissions by entity+action
  const findPerm = (
    resource: PermissionResource,
    action: PermissionAction,
  ): Permission | undefined =>
    allPermissions.find((p) => p.entity === resource && p.action === action);

  const selectedRole = roles[selectedRoleIdx];

  const labels = {
    heading: lang === "en" ? "Roles & Permissions" : "Roles y Permisos",
    subtitle:
      lang === "en"
        ? "Manage access levels and permissions for your workspace."
        : "Gestiona los niveles de acceso y permisos de tu espacio de trabajo.",
    accessFor:
      lang === "en"
        ? "Access and permissions for the"
        : "Acceso y permisos para el rol",
    role: lang === "en" ? "role." : ".",
    hint:
      lang === "en"
        ? "Hidden tabs and restricted routes are controlled by these permissions."
        : "Las pestañas ocultas y rutas restringidas se controlan con estos permisos.",
    newRole: lang === "en" ? "+ New Role" : "+ Nuevo Rol",
    cancel: lang === "en" ? "Cancel" : "Cancelar",
    save: lang === "en" ? "Save Changes" : "Guardar Cambios",
    saving: lang === "en" ? "Saving…" : "Guardando…",
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{labels.heading}</h2>
          <p className={styles.subtitle}>{labels.subtitle}</p>
        </div>
        {canEdit && (
          <button className={styles.newRoleBtn} disabled>
            {labels.newRole}
          </button>
        )}
      </div>

      {isLoading && <p className={styles.stateMsg}>Loading…</p>}
      {error && <p className={styles.errorMsg}>{error}</p>}

      {!isLoading && !error && roles.length > 0 && (
        <>
          {/* Role tabs */}
          <div className={styles.tabs}>
            {roles.map((role, idx) => (
              <button
                key={role._id}
                className={`${styles.tab} ${idx === selectedRoleIdx ? styles.tabActive : ""}`}
                onClick={() => handleTabChange(idx)}
              >
                {role.name}
              </button>
            ))}
          </div>

          {/* Role section */}
          <div className={styles.section}>
            <h3 className={styles.roleTitle}>{selectedRole.name}</h3>
            <p className={styles.roleSubtitle}>
              {labels.accessFor} <strong>{selectedRole.name}</strong>{" "}
              {labels.role}
            </p>

            <ul className={styles.hints}>
              <li>{labels.hint}</li>
            </ul>

            {/* Permission table */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thResource}></th>
                    {ACTIONS.map((action) => (
                      <th key={action} className={styles.thAction}>
                        {ACTION_LABELS[action]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.map((resource) => (
                    <tr key={resource}>
                      <td className={styles.tdResource}>
                        {RESOURCE_LABELS[resource]}
                      </td>
                      {ACTIONS.map((action) => {
                        const perm = findPerm(resource, action);
                        if (!perm) {
                          return <td key={action} className={styles.tdCheck} />;
                        }
                        const checked = localPermIds.has(perm._id);
                        return (
                          <td key={action} className={styles.tdCheck}>
                            <input
                              type="checkbox"
                              className={styles.checkbox}
                              checked={checked}
                              disabled={!canEdit}
                              onChange={() => handleToggle(perm._id)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer actions */}
          {canEdit && (
            <div className={styles.footer}>
              <button
                className={styles.cancelBtn}
                onClick={handleCancel}
                disabled={!isDirty || isSaving}
              >
                {labels.cancel}
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                {isSaving ? labels.saving : labels.save}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
