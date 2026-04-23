import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLang } from "../../contexts/LangContext";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { lang } = useLang();

  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    preferredLanguage: user?.preferredLanguage ?? "en",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const t =
    lang === "es"
      ? {
          title: "Mi Perfil",
          subtitle: "Actualiza tu información personal",
          sectionPersonal: "Información personal",
          sectionPrefs: "Preferencias",
          labelFirst: "Nombre",
          labelLast: "Apellido",
          labelEmail: "Correo",
          labelPhone: "Teléfono",
          labelLang: "Idioma preferido",
          labelRole: "Rol",
          save: "Guardar cambios",
          saving: "Guardando…",
          savedOk: "Perfil actualizado.",
          errSave: "Error al guardar.",
          req: "*",
        }
      : {
          title: "My Profile",
          subtitle: "Update your personal information",
          sectionPersonal: "Personal information",
          sectionPrefs: "Preferences",
          labelFirst: "First Name",
          labelLast: "Last Name",
          labelEmail: "Email",
          labelPhone: "Phone",
          labelLang: "Preferred Language",
          labelRole: "Role",
          save: "Save Changes",
          saving: "Saving…",
          savedOk: "Profile updated successfully.",
          errSave: "Failed to save changes.",
          req: "*",
        };

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await updateUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        preferredLanguage: form.preferredLanguage as "en" | "es",
      });
      setSuccess(true);
    } catch {
      setError(t.errSave);
    } finally {
      setSaving(false);
    }
  };

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  const roleLabel: Record<string, string> = {
    owner: "Owner",
    director: "Director",
    manager_operations: "Operations Manager",
    manager_hr: "HR Manager",
    staff: "Staff",
    worker: "Worker",
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.subtitle}>{t.subtitle}</p>
      </div>

      <div className={styles.avatarRow}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.avatarInfo}>
          <p className={styles.avatarName}>
            {user?.firstName} {user?.lastName}
          </p>
          <p className={styles.avatarRole}>
            {roleLabel[user?.role ?? ""] ?? user?.role}
          </p>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSave} noValidate>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.sectionPersonal}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>
                {t.labelFirst} <span className={styles.req}>{t.req}</span>
              </label>
              <input
                className={styles.input}
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                {t.labelLast} <span className={styles.req}>{t.req}</span>
              </label>
              <input
                className={styles.input}
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                {t.labelEmail} <span className={styles.req}>{t.req}</span>
              </label>
              <input
                className={styles.input}
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t.labelPhone}</label>
              <input
                className={styles.input}
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t.labelRole}</label>
              <input
                className={`${styles.input} ${styles.readOnly}`}
                value={roleLabel[user?.role ?? ""] ?? user?.role ?? ""}
                readOnly
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.sectionPrefs}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>{t.labelLang}</label>
              <select
                className={styles.input}
                value={form.preferredLanguage}
                onChange={(e) => set("preferredLanguage", e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </section>

        {error && <p className={styles.errorMsg}>{error}</p>}
        {success && <p className={styles.successMsg}>{t.savedOk}</p>}

        <div className={styles.actions}>
          <button className={styles.saveBtn} type="submit" disabled={saving}>
            {saving ? t.saving : t.save}
          </button>
        </div>
      </form>
    </div>
  );
}
