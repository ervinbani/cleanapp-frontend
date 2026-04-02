import axios from "axios";
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

const ACTIONS: PermissionAction[] = ["create", "read", "update", "delete"];

const RESOURCE_LABELS: Record<PermissionResource, string> = {
  users: "Users",
  jobs: "Jobs",
  services: "Services",
  invoices: "Invoices",
  roles: "Roles",
  permissions: "Permissions",
};

const ACTION_LABELS: Record<PermissionAction, string> = {
  create: "Create",
  read: "Read",
  update: "Update",
  delete: "Delete",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toSnakeCase(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

// ─── New Role Form ────────────────────────────────────────────────────────────
interface NewRoleFormProps {
  allPermissions: Permission[];
  onCancel: () => void;
  onSaved: (role: Role) => void;
}

function NewRoleForm({ allPermissions, onCancel, onSaved }: NewRoleFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isCodeManual, setIsCodeManual] = useState(false);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isCodeManual) setCode(toSnakeCase(val));
  };

  const findPerm = (resource: PermissionResource, action: PermissionAction) =>
    allPermissions.find((p) => p.entity === resource && p.action === action);

  const handleToggle = (permId: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const handleSelectAllInRow = (resource: PermissionResource) => {
    const rowPerms = ACTIONS.map((a) => findPerm(resource, a)).filter(
      Boolean,
    ) as Permission[];
    const allChecked = rowPerms.every((p) => selectedPermIds.has(p._id));
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (allChecked) rowPerms.forEach((p) => next.delete(p._id));
      else rowPerms.forEach((p) => next.add(p._id));
      return next;
    });
  };

  const handleSave = async (stayOnForm = false) => {
    if (!name.trim()) {
      setFormError("Role name is required.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const newRole = await roleService.create({
        name: name.trim(),
        code: code.trim() || toSnakeCase(name),
        description: description.trim(),
        isActive,
        permissionIds: Array.from(selectedPermIds),
      });
      if (!stayOnForm) onSaved(newRole);
      else {
        // Reset form after save & continue
        setName("");
        setCode("");
        setIsCodeManual(false);
        setDescription("");
        setIsActive(true);
        setSelectedPermIds(new Set());
        setSearch("");
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ??
          err.response?.data?.error ??
          `Error ${err.response?.status}`)
        : "Failed to create role.";
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredResources = RESOURCES.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={styles.newRoleView}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <button className={styles.breadcrumbLink} onClick={onCancel}>
          Settings
        </button>
        <span className={styles.breadcrumbSep}>/</span>
        <button className={styles.breadcrumbLink} onClick={onCancel}>
          Roles &amp; Permissions
        </button>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>New Role</span>
      </nav>

      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>New Role</h2>

        {formError && <p className={styles.errorMsg}>{formError}</p>}

        {/* Role Name */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Role Name</label>
          <input
            className={styles.input}
            type="text"
            placeholder="e.g. Operations Manager"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>

        {/* Role Code + Description */}
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Role Code</label>
            <input
              className={styles.input}
              type="text"
              placeholder="manager_operations"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setIsCodeManual(true);
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              placeholder="Describe this role..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Status */}
        <div className={styles.formGroupInline}>
          <span className={styles.label}>Status</span>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span className={styles.toggleSlider} />
          </label>
          <span className={styles.toggleLabel}>
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Permissions */}
        <h3 className={styles.permissionsHeading}>Permissions</h3>
        <div className={styles.searchRow}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>&#128269;</span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search permissions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thResource}>
                  Permissions control what users assigned to this role can
                  access.
                </th>
                {ACTIONS.map((action) => (
                  <th key={action} className={styles.thAction}>
                    {ACTION_LABELS[action]}
                  </th>
                ))}
                <th className={styles.thSelectAll} />
              </tr>
            </thead>
            <tbody>
              {filteredResources.map((resource) => {
                const rowPerms = ACTIONS.map((a) => findPerm(resource, a));
                const validPerms = rowPerms.filter(
                  Boolean,
                ) as Permission[];
                const allChecked =
                  validPerms.length > 0 &&
                  validPerms.every((p) => selectedPermIds.has(p._id));
                return (
                  <tr key={resource}>
                    <td className={styles.tdResource}>
                      {RESOURCE_LABELS[resource]}
                    </td>
                    {rowPerms.map((perm, i) => (
                      <td key={ACTIONS[i]} className={styles.tdCheck}>
                        {perm ? (
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={selectedPermIds.has(perm._id)}
                            onChange={() => handleToggle(perm._id)}
                          />
                        ) : null}
                      </td>
                    ))}
                    <td className={styles.tdSelectAll}>
                      <button
                        className={styles.selectRowBtn}
                        onClick={() => handleSelectAllInRow(resource)}
                        type="button"
                      >
                        {allChecked
                          ? "Deselect all in row"
                          : "Select all in row"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className={styles.formFooter}>
          <button
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <div className={styles.formFooterRight}>
            <button
              className={styles.saveContinueBtn}
              onClick={() => handleSave(true)}
              disabled={isSaving}
            >
              {isSaving ? "Saving\u2026" : "Save & continue"}
            </button>
            <button
              className={styles.saveBtn}
              onClick={() => handleSave(false)}
              disabled={isSaving}
            >
              {isSaving ? "Saving\u2026" : "Save Role"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RolesPermissionsPage() {
  const { hasRole } = useAuth();
  const { lang } = useLang();

  const canEdit = hasRole("owner");
  const canView = hasRole("owner", "director");

  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedRoleIdx, setSelectedRoleIdx] = useState(0);
  const [localPermIds, setLocalPermIds] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewRole, setShowNewRole] = useState(false);

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
      .catch((err: unknown) => {
        const msg = axios.isAxiosError(err)
          ? (err.response?.data?.message ?? "Failed to load roles and permissions.")
          : "Failed to load roles and permissions.";
        setError(msg);
      })
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
      // Normalize returned permissions (may be objects or IDs)
      const permMap = new Map(allPermissions.map((p) => [p._id, p]));
      const normalizedUpdated: Role = {
        ...updated,
        permissions: (updated.permissions as (Permission | string)[])
          .map((p) => (typeof p === "string" ? permMap.get(p) : p))
          .filter(Boolean) as Permission[],
      };
      setRoles((prev) =>
        prev.map((r, i) => (i === selectedRoleIdx ? normalizedUpdated : r)),
      );
      setIsDirty(false);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? err.response?.data?.error ?? `Error ${err.response?.status}`)
        : "Failed to save changes.";
      setError(msg);
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
      {showNewRole ? (
        <NewRoleForm
          allPermissions={allPermissions}
          onCancel={() => setShowNewRole(false)}
          onSaved={(newRole) => {
            const permMap = new Map(allPermissions.map((p) => [p._id, p]));
            const normalized: Role = {
              ...newRole,
              permissions: (newRole.permissions as (Permission | string)[])
                .map((p) => (typeof p === "string" ? permMap.get(p) : p))
                .filter(Boolean) as Permission[],
            };
            setRoles((prev) => [...prev, normalized]);
            setSelectedRoleIdx(roles.length);
            setLocalPermIds(
              new Set((normalized.permissions as Permission[]).map((p) => p._id)),
            );
            setShowNewRole(false);
          }}
        />
      ) : (
        <>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{labels.heading}</h2>
          <p className={styles.subtitle}>{labels.subtitle}</p>
        </div>
        {canEdit && (
          <button
            className={styles.newRoleBtn}
            onClick={() => setShowNewRole(true)}
          >
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
      </>
      )}
    </div>
  );
}
