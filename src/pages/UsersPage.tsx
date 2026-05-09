import { useEffect, useState, useCallback } from "react";
import { useLang } from "../contexts/LangContext";
import { useTrans } from "../i18n";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import type { User, UserRole } from "../types";
import styles from "./UsersPage.module.css";

const PAGE_LIMIT = 20;

// ─── Roles available when creating a user (owner excluded) ────────
const CREATABLE_ROLES: UserRole[] = [
  "director",
  "manager_operations",
  "manager_hr",
  "staff",
  "worker",
];

interface AddUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  preferredLanguage: "en" | "es" | "it";
  phone: string;
  isActive: boolean;
}

const EMPTY_FORM: AddUserForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "staff",
  preferredLanguage: "en",
  phone: "",
  isActive: true,
};

interface AddUserModalProps {
  lang: "en" | "es" | "it";
  onClose: () => void;
  onSaved: () => void;
}

function AddUserModal({ lang, onClose, onSaved }: AddUserModalProps) {
  const [form, setForm] = useState<AddUserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const ml = {
    en: {
      title: "Add User",
      subtitle: "Create a new team member",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      emailHint: "Unique per tenant",
      password: "Password",
      passwordHint: "Will be stored securely",
      role: "Role",
      prefLang: "Preferred Language",
      langHint: "Default EN",
      phone: "Phone",
      tenantName: "Business Name",
      tenantNameHint: "Human-readable company name",
      slug: "Slug",
      slugHint: "URL-safe identifier (auto-generated)",
      placeholderTenant: "My Cleaning Co",
      placeholderSlug: "my-cleaning-co",
      activeUser: "Active user",
      cancel: "Cancel",
      save: "Save User",
      saving: "Saving…",
      placeholderFirst: "First Name",
      placeholderLast: "Last Name",
      placeholderEmail: "user@example.com",
      placeholderPhone: "+1 234 567 8900",
    },
    es: {
      title: "Agregar Usuario",
      subtitle: "Crear un nuevo miembro del equipo",
      firstName: "Nombre",
      lastName: "Apellido",
      email: "Correo",
      emailHint: "Único por empresa",
      password: "Contraseña",
      passwordHint: "Se guardará de forma segura",
      role: "Rol",
      prefLang: "Idioma preferido",
      langHint: "Por defecto EN",
      phone: "Teléfono",
      tenantName: "Nombre del Negocio",
      tenantNameHint: "Nombre visible de la empresa",
      slug: "Slug",
      slugHint: "Identificador URL (se genera automáticamente)",
      placeholderTenant: "Mi Empresa de Limpieza",
      placeholderSlug: "mi-empresa-limpieza",
      activeUser: "Usuario activo",
      cancel: "Cancelar",
      save: "Guardar Usuario",
      saving: "Guardando…",
      placeholderFirst: "Nombre",
      placeholderLast: "Apellido",
      placeholderEmail: "usuario@ejemplo.com",
      placeholderPhone: "+1 234 567 8900",
    },
  };
  const ml2 = ml[lang];

  const set = <K extends keyof AddUserForm>(k: K, v: AddUserForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiClient.post("/users", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        preferredLanguage: form.preferredLanguage,
        phone: form.phone.trim() || undefined,
        isActive: form.isActive,
      });
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Error saving user.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>{ml2.title}</h3>
            <p className={styles.modalSubtitle}>{ml2.subtitle}</p>
          </div>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {/* First + Last name */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {ml2.firstName} <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                placeholder={ml2.placeholderFirst}
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {ml2.lastName} <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                placeholder={ml2.placeholderLast}
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              {ml2.email} <span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              type="email"
              placeholder={ml2.placeholderEmail}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
            <span className={styles.hint}>{ml2.emailHint}</span>
          </div>

          {/* Password */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              {ml2.password} <span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
              minLength={6}
            />
            <span className={styles.hint}>{ml2.passwordHint}</span>
          </div>

          {/* Role + Preferred Language */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {ml2.role} <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.input}
                value={form.role}
                onChange={(e) => set("role", e.target.value as UserRole)}
                required
              >
                {CREATABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{ml2.prefLang}</label>
              <select
                className={styles.input}
                value={form.preferredLanguage}
                onChange={(e) =>
                  set("preferredLanguage", e.target.value as "en" | "es" | "it")
                }
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
                <option value="it">IT</option>
              </select>
              <span className={styles.hint}>{ml2.langHint}</span>
            </div>
          </div>

          {/* Phone */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{ml2.phone}</label>
            <input
              className={styles.input}
              type="tel"
              placeholder={ml2.placeholderPhone}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>

          {/* Active toggle */}
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.label}>{ml2.activeUser}</span>
              <span
                className={styles.toggleInfoIcon}
                title="User can log in when active"
              >
                ⓘ
              </span>
            </div>
            <button
              type="button"
              className={`${styles.toggle} ${form.isActive ? styles.toggleOn : ""}`}
              onClick={() => set("isActive", !form.isActive)}
              aria-pressed={form.isActive}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          {/* Footer buttons */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
            >
              {ml2.cancel}
            </button>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {saving ? ml2.saving : ml2.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User Modal ─────────────────────────────────────────────
interface EditUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  preferredLanguage: "en" | "es" | "it";
  phone: string;
  isActive: boolean;
}

interface EditUserModalProps {
  user: User;
  lang: "en" | "es" | "it";
  onClose: () => void;
  onSaved: () => void;
}

function EditUserModal({ user, lang, onClose, onSaved }: EditUserModalProps) {
  const [form, setForm] = useState<EditUserForm>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: "",
    role: user.role === "owner" ? "owner" : user.role,
    preferredLanguage: user.preferredLanguage,
    phone: user.phone ?? "",
    isActive: user.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const originalEmail = user.email;

  const ml = {
    en: {
      title: "Edit User",
      subtitle: "Update team member details",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      emailHint: "Unique per tenant",
      password: "New Password",
      passwordHint: "Leave blank to keep current password",
      role: "Role",
      roleReadonly: "Role cannot be changed for owners",
      prefLang: "Preferred Language",
      langHint: "Default EN",
      phone: "Phone",
      activeUser: "Active user",
      emailChangeWarning:
        "Changing the email will require the user to re-verify it.",
      verifyEmail: "Verify Email",
      verifyingEmail: "Verifying…",
      emailNotVerifiedNote: "This user's email has not been verified yet.",
      cancel: "Cancel",
      save: "Save Changes",
      saving: "Saving…",
      placeholderPhone: "+1 234 567 8900",
    },
    es: {
      title: "Editar Usuario",
      subtitle: "Actualizar datos del miembro del equipo",
      firstName: "Nombre",
      lastName: "Apellido",
      email: "Correo",
      emailHint: "Único por empresa",
      password: "Nueva Contraseña",
      passwordHint: "Dejar en blanco para mantener la contraseña actual",
      role: "Rol",
      roleReadonly: "El rol no se puede cambiar para propietarios",
      prefLang: "Idioma preferido",
      langHint: "Por defecto EN",
      phone: "Teléfono",
      activeUser: "Usuario activo",
      emailChangeWarning:
        "Cambiar el correo requerirá que el usuario lo verifique de nuevo.",
      verifyEmail: "Verificar email",
      verifyingEmail: "Verificando…",
      emailNotVerifiedNote:
        "El correo de este usuario aún no ha sido verificado.",
      cancel: "Cancelar",
      save: "Guardar Cambios",
      saving: "Guardando…",
      placeholderPhone: "+1 234 567 8900",
    },
  };
  const ml2 = ml[lang];

  const set = <K extends keyof EditUserForm>(k: K, v: EditUserForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
        preferredLanguage: form.preferredLanguage,
        phone: form.phone.trim() || undefined,
        isActive: form.isActive,
      };
      if (form.password.trim()) payload.password = form.password;
      await apiClient.put(`/users/${user._id ?? user.id}`, payload);
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Error saving user.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyEmail = async () => {
    setVerifying(true);
    setVerifyError("");
    try {
      await apiClient.put(`/users/${user._id ?? user.id}`, {
        emailVerified: true,
      });
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Error verifying email.";
      setVerifyError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const isOwner = user.role === "owner";

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>{ml2.title}</h3>
            <p className={styles.modalSubtitle}>{ml2.subtitle}</p>
          </div>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {ml2.firstName} <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {ml2.lastName} <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              {ml2.email} <span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
            <span className={styles.hint}>{ml2.emailHint}</span>
          </div>

          {form.email !== originalEmail && (
            <div className={styles.warningBanner}>
              ⚠️ {ml2.emailChangeWarning}
            </div>
          )}

          <div className={styles.formGroup}>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              minLength={6}
            />
            <span className={styles.hint}>{ml2.passwordHint}</span>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {ml2.role} <span className={styles.required}>*</span>
              </label>
              {isOwner ? (
                <>
                  <input
                    className={styles.input}
                    value="Owner"
                    disabled
                    readOnly
                  />
                  <span className={styles.hint}>{ml2.roleReadonly}</span>
                </>
              ) : (
                <select
                  className={styles.input}
                  value={form.role}
                  onChange={(e) => set("role", e.target.value as UserRole)}
                  required
                >
                  {CREATABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{ml2.prefLang}</label>
              <select
                className={styles.input}
                value={form.preferredLanguage}
                onChange={(e) =>
                  set("preferredLanguage", e.target.value as "en" | "es" | "it")
                }
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
                <option value="it">IT</option>
              </select>
              <span className={styles.hint}>{ml2.langHint}</span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{ml2.phone}</label>
            <input
              className={styles.input}
              type="tel"
              placeholder={ml2.placeholderPhone}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>

          {!user.emailVerified && (
            <div className={styles.verifyEmailSection}>
              <p className={styles.emailNotVerifiedNote}>
                {ml2.emailNotVerifiedNote}
              </p>
              <button
                type="button"
                className={styles.btnVerifyEmail}
                onClick={handleVerifyEmail}
                disabled={verifying}
              >
                {verifying ? ml2.verifyingEmail : ml2.verifyEmail}
              </button>
              {verifyError && (
                <p className={styles.errorMsg}>{verifyError}</p>
              )}
            </div>
          )}

          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.label}>{ml2.activeUser}</span>
              <span
                className={styles.toggleInfoIcon}
                title="User can log in when active"
              >
                ⓘ
              </span>
            </div>
            <button
              type="button"
              className={`${styles.toggle} ${form.isActive ? styles.toggleOn : ""}`}
              onClick={() => set("isActive", !form.isActive)}
              aria-pressed={form.isActive}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
            >
              {ml2.cancel}
            </button>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {saving ? ml2.saving : ml2.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface UsersResponse {
  success: boolean;
  data: User[];
  pagination: { total: number; page: number; limit: number };
}

function getPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

const ROLES: UserRole[] = [
  "owner",
  "director",
  "manager_operations",
  "manager_hr",
  "staff",
  "worker",
];

function formatLastLogin(date?: string, never?: string): string {
  if (!date) return never ?? "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default function UsersPage() {
  const { lang } = useLang();
  const { hasRole } = useAuth();
  const l = useTrans("users");

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [apiRole, setApiRole] = useState<UserRole | "">("");

  // Column filters
  const [colName, setColName] = useState("");
  const [colEmail, setColEmail] = useState("");
  const [colPhone, setColPhone] = useState("");
  const [colRole, setColRole] = useState("");
  const [colStatus, setColStatus] = useState("");
  const [colEmailVerified, setColEmailVerified] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const canWrite = hasRole(
    "owner",
    "director",
    "manager_operations",
    "manager_hr",
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<UsersResponse>("/users", {
        params: {
          page,
          limit: PAGE_LIMIT,
          search: search.trim() || undefined,
          role: apiRole || undefined,
        },
      });
      setUsers(res.data.data);
      setTotal(res.data.pagination.total);
    } catch {
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, apiRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, apiRole]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await apiClient.delete(`/users/${id}`);
      fetchUsers();
    } catch {
      alert("Error deleting user.");
    }
  };

  const displayed = users.filter((u) => {
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    if (colName && !name.includes(colName.toLowerCase())) return false;
    if (
      colEmail &&
      !(u.email ?? "").toLowerCase().includes(colEmail.toLowerCase())
    )
      return false;
    if (
      colPhone &&
      !(u.phone ?? "").toLowerCase().includes(colPhone.toLowerCase())
    )
      return false;
    if (colRole && u.role !== colRole) return false;
    if (colStatus === "active" && !u.isActive) return false;
    if (colStatus === "inactive" && u.isActive) return false;
    if (colEmailVerified === "verified" && !u.emailVerified) return false;
    if (colEmailVerified === "unverified" && u.emailVerified) return false;
    return true;
  });

  const pageRange = getPageRange(page, totalPages);

  const handleExportExcel = useCallback(async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Users");
    sheet.columns = [
      { header: l.colName, key: "name", width: 25 },
      { header: l.colEmail, key: "email", width: 30 },
      { header: l.colPhone, key: "phone", width: 18 },
      { header: l.colRole, key: "role", width: 12 },
      { header: l.colStatus, key: "status", width: 12 },
      { header: l.colLastLogin, key: "lastLogin", width: 22 },
    ];
    displayed.forEach((u) => {
      sheet.addRow({
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        phone: u.phone ?? "",
        role: u.role,
        status: u.isActive ? l.active : l.inactive,
        lastLogin: formatLastLogin(u.lastLoginAt, l.never),
      });
    });
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }, [displayed, l]);

  const handleExportPdf = useCallback(async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(l.title, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [
        [
          l.colName,
          l.colEmail,
          l.colPhone,
          l.colRole,
          l.colStatus,
          l.colLastLogin,
        ],
      ],
      body: displayed.map((u) => [
        `${u.firstName} ${u.lastName}`,
        u.email,
        u.phone ?? "—",
        u.role,
        u.isActive ? l.active : l.inactive,
        formatLastLogin(u.lastLoginAt, l.never),
      ]),
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 255] },
    });
    doc.save("users.pdf");
  }, [displayed, l]);

  return (
    <div className={styles.page}>
      {showAddModal && canWrite && (
        <AddUserModal
          lang={lang}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            fetchUsers();
          }}
        />
      )}
      {editingUser && canWrite && (
        <EditUserModal
          user={editingUser}
          lang={lang}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}

      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{l.title}</h2>
        {canWrite && (
          <button
            className={styles.addBtn}
            onClick={() => setShowAddModal(true)}
          >
            {l.addUser}
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg
            className={styles.searchIcon}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            className={styles.searchInput}
            placeholder={l.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={apiRole}
          onChange={(e) => setApiRole(e.target.value as UserRole | "")}
        >
          <option value="">{l.allRoles}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>

        <div className={styles.exportBtns}>
          <button className={styles.btnExcelExport} onClick={handleExportExcel}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 01-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L17 13.586V12a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            {l.exportExcel}
          </button>
          <button className={styles.btnPdfExport} onClick={handleExportPdf}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                clipRule="evenodd"
              />
            </svg>
            {l.exportPdf}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headRow}>
              <th>{l.colName}</th>
              <th>{l.colEmail}</th>
              <th>{l.colPhone}</th>
              <th>{l.colRole}</th>
              <th>{l.colStatus}</th>
              <th>{l.colEmailVerified}</th>
              <th>{l.colLastLogin}</th>
              <th>{l.colActions}</th>
            </tr>
            <tr className={styles.filterRow}>
              <th>
                <input
                  className={styles.colFilter}
                  placeholder={l.filterName}
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                />
              </th>
              <th>
                <input
                  className={styles.colFilter}
                  placeholder={l.filterEmail}
                  value={colEmail}
                  onChange={(e) => setColEmail(e.target.value)}
                />
              </th>
              <th>
                <input
                  className={styles.colFilter}
                  placeholder={l.filterPhone}
                  value={colPhone}
                  onChange={(e) => setColPhone(e.target.value)}
                />
              </th>
              <th>
                <select
                  className={styles.colFilter}
                  value={colRole}
                  onChange={(e) => setColRole(e.target.value)}
                >
                  <option value="">{l.allRoles}</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <select
                  className={styles.colFilter}
                  value={colStatus}
                  onChange={(e) => setColStatus(e.target.value)}
                >
                  <option value="">{l.allStatuses}</option>
                  <option value="active">{l.active}</option>
                  <option value="inactive">{l.inactive}</option>
                </select>
              </th>
              <th>
                <select
                  className={styles.colFilter}
                  value={colEmailVerified}
                  onChange={(e) => setColEmailVerified(e.target.value)}
                >
                  <option value="">{l.allEmailVerified}</option>
                  <option value="verified">{l.emailVerified}</option>
                  <option value="unverified">{l.emailNotVerified}</option>
                </select>
              </th>
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={styles.empty}>
                  {l.loading}
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.empty}>
                  {l.noResults}
                </td>
              </tr>
            ) : (
              displayed.map((u) => (
                <tr key={u._id ?? u.id} className={styles.bodyRow}>
                  <td className={styles.nameCell}>
                    <div className={styles.avatarRow}>
                      <span className={styles.avatar}>
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </span>
                      {u.firstName} {u.lastName}
                    </div>
                  </td>
                  <td className={styles.emailCell}>{u.email}</td>
                  <td className={styles.phoneCell}>{u.phone ?? "—"}</td>
                  <td>
                    <span
                      className={`${styles.roleBadge} ${styles[`role_${u.role}`]}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${u.isActive ? styles.badge_active : styles.badge_inactive}`}
                    >
                      {u.isActive ? l.active : l.inactive}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${u.emailVerified ? styles.badge_verified : styles.badge_unverified}`}
                    >
                      {u.emailVerified ? l.emailVerified : l.emailNotVerified}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {formatLastLogin(u.lastLoginAt, l.never)}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.btnView} title={l.btnView}>
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 3C5 3 1.73 7.11 1.07 9.69a1 1 0 000 .62C1.73 12.89 5 17 10 17s8.27-4.11 8.93-6.69a1 1 0 000-.62C18.27 7.11 15 3 10 3zm0 11a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" />
                        </svg>
                      </button>
                      {canWrite && (
                        <button
                          className={styles.btnUpdate}
                          onClick={() => setEditingUser(u)}
                          title={l.btnUpdate}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.5 9.5A2 2 0 015.5 16.5H4a1 1 0 01-1-1v-1.5a2 2 0 01.586-1.414l9.5-9.5z" />
                          </svg>
                        </button>
                      )}
                      {hasRole("owner") && (
                        <button
                          className={styles.btnDelete}
                          onClick={() => handleDelete(u._id ?? u.id)}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <button
          className={styles.pageBtn}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          {l.prev}
        </button>
        <div className={styles.pageNumbers}>
          {pageRange.map((p, i) =>
            p === "…" ? (
              <span key={`e-${i}`} className={styles.ellipsis}>
                …
              </span>
            ) : (
              <button
                key={p}
                className={`${styles.pageNum} ${p === page ? styles.pageNumActive : ""}`}
                onClick={() => setPage(p as number)}
              >
                {p}
              </button>
            ),
          )}
        </div>
        <button
          className={styles.pageBtn}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          {l.next}
        </button>
        <span className={styles.pageInfo}>
          {l.page} {page} {l.of} {totalPages} &bull; {total} total
        </span>
      </div>
    </div>
  );
}
