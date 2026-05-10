import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import type { User, UserRole } from "../types";
import styles from "./UserDetailPage.module.css";

// ─── Editable roles (owner excluded) ─────────────────────────────
const CREATABLE_ROLES: UserRole[] = [
  "director",
  "manager_operations",
  "manager_hr",
  "staff",
  "worker",
];

// ─── Translations ─────────────────────────────────────────────────
const T = {
  en: {
    back: "← Back to Users",
    loading: "Loading…",
    notFound: "User not found.",
    errorLoad: "Failed to load user.",
    edit: "Edit",
    save: "Save Changes",
    saving: "Saving…",
    cancel: "Cancel",
    editTitle: "Edit User",
    viewTitle: "User Details",
    sectionIdentity: "Identity",
    sectionAccount: "Account",
    sectionActivity: "Activity",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    role: "Role",
    prefLang: "Preferred Language",
    status: "Status",
    emailVerified: "Email Verified",
    lastLogin: "Last Login",
    createdAt: "Created",
    updatedAt: "Updated",
    newPassword: "New Password",
    passwordHint: "Leave blank to keep current password",
    emailChangeWarning:
      "Changing the email will require the user to re-verify it.",
    roleReadonly: "Role cannot be changed for owners",
    active: "Active",
    inactive: "Inactive",
    verified: "Verified",
    notVerified: "Not Verified",
    never: "Never",
    errorSave: "Error saving user.",
    savedOk: "Changes saved.",
    verifyEmail: "Mark as Verified",
    verifyingEmail: "Verifying…",
    emailNotVerifiedNote: "This user's email has not been verified yet.",
    errorVerify: "Error verifying email.",
  },
  es: {
    back: "← Volver a Usuarios",
    loading: "Cargando…",
    notFound: "Usuario no encontrado.",
    errorLoad: "Error al cargar el usuario.",
    edit: "Editar",
    save: "Guardar Cambios",
    saving: "Guardando…",
    cancel: "Cancelar",
    editTitle: "Editar Usuario",
    viewTitle: "Detalles del Usuario",
    sectionIdentity: "Identidad",
    sectionAccount: "Cuenta",
    sectionActivity: "Actividad",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo",
    phone: "Teléfono",
    role: "Rol",
    prefLang: "Idioma preferido",
    status: "Estado",
    emailVerified: "Email Verificado",
    lastLogin: "Último Acceso",
    createdAt: "Creado",
    updatedAt: "Actualizado",
    newPassword: "Nueva Contraseña",
    passwordHint: "Dejar en blanco para mantener la contraseña actual",
    emailChangeWarning:
      "Cambiar el correo requerirá que el usuario lo verifique de nuevo.",
    roleReadonly: "El rol no se puede cambiar para propietarios",
    active: "Activo",
    inactive: "Inactivo",
    verified: "Verificado",
    notVerified: "Sin verificar",
    never: "Nunca",
    errorSave: "Error al guardar el usuario.",
    savedOk: "Cambios guardados.",
    verifyEmail: "Marcar como verificado",
    verifyingEmail: "Verificando…",
    emailNotVerifiedNote:
      "El correo de este usuario aún no ha sido verificado.",
    errorVerify: "Error al verificar el email.",
  },
  it: {
    back: "← Torna agli Utenti",
    loading: "Caricamento…",
    notFound: "Utente non trovato.",
    errorLoad: "Errore nel caricamento dell'utente.",
    edit: "Modifica",
    save: "Salva modifiche",
    saving: "Salvataggio…",
    cancel: "Annulla",
    editTitle: "Modifica Utente",
    viewTitle: "Dettagli Utente",
    sectionIdentity: "Identità",
    sectionAccount: "Account",
    sectionActivity: "Attività",
    firstName: "Nome",
    lastName: "Cognome",
    email: "Email",
    phone: "Telefono",
    role: "Ruolo",
    prefLang: "Lingua preferita",
    status: "Stato",
    emailVerified: "Email verificata",
    lastLogin: "Ultimo accesso",
    createdAt: "Creato il",
    updatedAt: "Modificato il",
    newPassword: "Nuova password",
    passwordHint: "Lascia vuoto per mantenere la password attuale",
    emailChangeWarning:
      "Cambiare l'email richiederà all'utente di riverificarla.",
    roleReadonly: "Il ruolo non può essere cambiato per i proprietari",
    active: "Attivo",
    inactive: "Inattivo",
    verified: "Verificata",
    notVerified: "Non verificata",
    never: "Mai",
    errorSave: "Errore nel salvataggio dell'utente.",
    savedOk: "Modifiche salvate.",
    verifyEmail: "Segna come verificata",
    verifyingEmail: "Verifica in corso…",
    emailNotVerifiedNote:
      "L'email di questo utente non è ancora stata verificata.",
    errorVerify: "Errore nella verifica dell'email.",
  },
};

function formatDate(date?: string, fallback?: string): string {
  if (!date) return fallback ?? "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

interface EditForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  preferredLanguage: "en" | "es" | "it";
  phone: string;
  isActive: boolean;
}

// ─── Read-only field ──────────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{children}</span>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLang();
  const { hasRole } = useAuth();
  const l = T[lang] ?? T.en;

  const [user, setUser] = useState<User | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const canWrite = hasRole(
    "owner",
    "director",
    "manager_operations",
    "manager_hr",
  );

  // ── Load user ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadError("");
    apiClient
      .get<{ success: boolean; data: User } | User>(`/users/${id}`)
      .then((res) => {
        const data =
          "data" in res.data && "success" in res.data
            ? (res.data as { success: boolean; data: User }).data
            : (res.data as User);
        setUser(data);
      })
      .catch(() => setLoadError(l.errorLoad))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Enter edit mode ───────────────────────────────────────────
  const startEditing = () => {
    if (!user) return;
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "",
      role: user.role,
      preferredLanguage: user.preferredLanguage as "en" | "es" | "it",
      phone: user.phone ?? "",
      isActive: user.isActive,
    });
    setSaveError("");
    setSaveSuccess(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setForm(null);
    setSaveError("");
  };

  const set = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  // ── Save ───────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !user) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
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
      const res = await apiClient.put<{ success: boolean; data: User } | User>(
        `/users/${user._id ?? user.id}`,
        payload,
      );
      const updated =
        "data" in res.data && "success" in res.data
          ? (res.data as { success: boolean; data: User }).data
          : (res.data as User);
      setUser(updated);
      setEditing(false);
      setForm(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? l.errorSave;
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Mark email as verified ────────────────────────────────────
  const handleVerifyEmail = async () => {
    if (!user) return;
    setVerifying(true);
    setVerifyError("");
    try {
      await apiClient.put(`/users/${user._id ?? user.id}`, {
        emailVerified: true,
      });
      setUser((u) => (u ? { ...u, emailVerified: true } : u));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? l.errorVerify;
      setVerifyError(msg);
    } finally {
      setVerifying(false);
    }
  };

  // ── Render: loading / error ───────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.stateMsg}>{l.loading}</p>
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className={styles.page}>
        <p className={styles.errorMsg}>{loadError || l.notFound}</p>
      </div>
    );
  }

  const isOwner = user.role === "owner";

  // ── Render: edit mode ─────────────────────────────────────────
  if (editing && form) {
    return (
      <div className={styles.page}>
        {/* Back + title */}
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={cancelEditing}>
            {l.back}
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.avatarLg}>
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div>
              <h2 className={styles.cardTitle}>{l.editTitle}</h2>
              <p className={styles.cardSubtitle}>
                {user.firstName} {user.lastName}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className={styles.editForm}>
            {/* Identity */}
            <h3 className={styles.sectionTitle}>{l.sectionIdentity}</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {l.firstName} <span className={styles.required}>*</span>
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
                  {l.lastName} <span className={styles.required}>*</span>
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
                {l.email} <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
              {form.email !== user.email && (
                <p className={styles.warningBanner}>
                  ⚠️ {l.emailChangeWarning}
                </p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>{l.phone}</label>
              <input
                className={styles.input}
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>

            {/* Account */}
            <h3 className={styles.sectionTitle}>{l.sectionAccount}</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {l.role} <span className={styles.required}>*</span>
                </label>
                {isOwner ? (
                  <>
                    <input
                      className={styles.input}
                      value="Owner"
                      disabled
                      readOnly
                    />
                    <span className={styles.hint}>{l.roleReadonly}</span>
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
                <label className={styles.label}>{l.prefLang}</label>
                <select
                  className={styles.input}
                  value={form.preferredLanguage}
                  onChange={(e) =>
                    set(
                      "preferredLanguage",
                      e.target.value as "en" | "es" | "it",
                    )
                  }
                >
                  <option value="en">EN</option>
                  <option value="es">ES</option>
                  <option value="it">IT</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>{l.newPassword}</label>
              <input
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                minLength={6}
                autoComplete="new-password"
              />
              <span className={styles.hint}>{l.passwordHint}</span>
            </div>

            {/* Active toggle */}
            <div className={styles.toggleRow}>
              <span className={styles.label}>{l.status}</span>
              <button
                type="button"
                className={`${styles.toggle} ${form.isActive ? styles.toggleOn : ""}`}
                onClick={() => set("isActive", !form.isActive)}
                aria-pressed={form.isActive}
              >
                <span className={styles.toggleThumb} />
              </button>
              <span className={styles.toggleLabel}>
                {form.isActive ? l.active : l.inactive}
              </span>
            </div>

            {/* Email verification */}
            {!user.emailVerified && (
              <div className={styles.verifySection}>
                <p className={styles.verifyNote}>{l.emailNotVerifiedNote}</p>
                <button
                  type="button"
                  className={styles.btnVerify}
                  onClick={handleVerifyEmail}
                  disabled={verifying}
                >
                  {verifying ? l.verifyingEmail : l.verifyEmail}
                </button>
                {verifyError && (
                  <p className={styles.errorMsg}>{verifyError}</p>
                )}
              </div>
            )}

            {saveError && <p className={styles.errorMsg}>{saveError}</p>}

            <div className={styles.formFooter}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={cancelEditing}
                disabled={saving}
              >
                {l.cancel}
              </button>
              <button
                type="submit"
                className={styles.btnSave}
                disabled={saving}
              >
                {saving ? l.saving : l.save}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Render: view mode ─────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate("/users")}>
          {l.back}
        </button>
        {canWrite && (
          <button className={styles.btnEdit} onClick={startEditing}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.5 9.5A2 2 0 015.5 16.5H4a1 1 0 01-1-1v-1.5a2 2 0 01.586-1.414l9.5-9.5z" />
            </svg>
            {l.edit}
          </button>
        )}
      </div>

      {saveSuccess && <div className={styles.successBanner}>{l.savedOk}</div>}

      <div className={styles.card}>
        {/* Card header */}
        <div className={styles.cardHeader}>
          <div className={styles.avatarLg}>
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div>
            <h2 className={styles.cardTitle}>
              {user.firstName} {user.lastName}
            </h2>
            <p className={styles.cardSubtitle}>{user.email}</p>
          </div>
          <div className={styles.headerBadges}>
            <span
              className={`${styles.roleBadge} ${styles[`role_${user.role}`]}`}
            >
              {user.role}
            </span>
            <span
              className={`${styles.badge} ${user.isActive ? styles.badge_active : styles.badge_inactive}`}
            >
              {user.isActive ? l.active : l.inactive}
            </span>
          </div>
        </div>

        {/* Sections */}
        <div className={styles.sections}>
          {/* Identity */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionIdentity}</h3>
            <div className={styles.fields}>
              <Field label={l.firstName}>{user.firstName}</Field>
              <Field label={l.lastName}>{user.lastName}</Field>
              <Field label={l.email}>{user.email}</Field>
              <Field label={l.phone}>{user.phone ?? "—"}</Field>
            </div>
          </section>

          {/* Account */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionAccount}</h3>
            <div className={styles.fields}>
              <Field label={l.role}>
                <span
                  className={`${styles.roleBadge} ${styles[`role_${user.role}`]}`}
                >
                  {user.role}
                </span>
              </Field>
              <Field label={l.prefLang}>
                {user.preferredLanguage?.toUpperCase() ?? "—"}
              </Field>
              <Field label={l.status}>
                <span
                  className={`${styles.badge} ${user.isActive ? styles.badge_active : styles.badge_inactive}`}
                >
                  {user.isActive ? l.active : l.inactive}
                </span>
              </Field>
              <Field label={l.emailVerified}>
                <span
                  className={`${styles.badge} ${user.emailVerified ? styles.badge_verified : styles.badge_unverified}`}
                >
                  {user.emailVerified ? l.verified : l.notVerified}
                </span>
              </Field>
            </div>
          </section>

          {/* Activity */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionActivity}</h3>
            <div className={styles.fields}>
              <Field label={l.lastLogin}>
                {formatDate(user.lastLoginAt, l.never)}
              </Field>
              <Field label={l.createdAt}>{formatDate(user.createdAt)}</Field>
              <Field label={l.updatedAt}>{formatDate(user.updatedAt)}</Field>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
