import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLang } from "../../contexts/LangContext";
import { getTenant, updateTenant } from "../../services/authService";
import type { Tenant } from "../../types";
import styles from "./GeneralPage.module.css";

type TenantForm = {
  name: string;
  contactEmail: string;
  contactPhone: string;
  timezone: string;
  defaultLanguage: "en" | "es";
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  logoUrl: string;
  primaryColor: string;
};

const EMPTY_FORM: TenantForm = {
  name: "",
  contactEmail: "",
  contactPhone: "",
  timezone: "",
  defaultLanguage: "en",
  street: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  logoUrl: "",
  primaryColor: "",
};

function tenantToForm(t: Tenant): TenantForm {
  return {
    name: t.name ?? "",
    contactEmail: t.contactEmail ?? "",
    contactPhone: t.contactPhone ?? "",
    timezone: t.timezone ?? "",
    defaultLanguage: t.defaultLanguage ?? "en",
    street: t.address?.street ?? "",
    city: t.address?.city ?? "",
    state: t.address?.state ?? "",
    zipCode: t.address?.zipCode ?? "",
    country: t.address?.country ?? "",
    logoUrl: t.branding?.logoUrl ?? "",
    primaryColor: t.branding?.primaryColor ?? "",
  };
}

export default function GeneralPage() {
  const { hasRole } = useAuth();
  const { lang } = useLang();

  const [form, setForm] = useState<TenantForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!hasRole("owner")) {
    return <Navigate to="/" replace />;
  }

  const t = {
    en: {
      title: "Company Settings",
      subtitle: "Manage your business information",
      sectionCompany: "Company Info",
      sectionAddress: "Address",
      sectionBranding: "Branding",
      labelName: "Business Name",
      labelEmail: "Contact Email",
      labelPhone: "Contact Phone",
      labelTimezone: "Timezone",
      labelLang: "Default Language",
      labelStreet: "Street",
      labelCity: "City",
      labelState: "State / Province",
      labelZip: "ZIP / Postal Code",
      labelCountry: "Country",
      labelLogo: "Logo URL",
      labelColor: "Primary Color",
      save: "Save Changes",
      saving: "Saving…",
      savedOk: "Saved successfully.",
      loading: "Loading…",
    },
    es: {
      title: "Configuración de la empresa",
      subtitle: "Administra la información de tu negocio",
      sectionCompany: "Datos de la empresa",
      sectionAddress: "Dirección",
      sectionBranding: "Marca",
      labelName: "Nombre del negocio",
      labelEmail: "Correo de contacto",
      labelPhone: "Teléfono de contacto",
      labelTimezone: "Zona horaria",
      labelLang: "Idioma predeterminado",
      labelStreet: "Calle",
      labelCity: "Ciudad",
      labelState: "Estado / Provincia",
      labelZip: "Código postal",
      labelCountry: "País",
      labelLogo: "URL del logo",
      labelColor: "Color principal",
      save: "Guardar cambios",
      saving: "Guardando…",
      savedOk: "Guardado con éxito.",
      loading: "Cargando…",
    },
  }[lang];

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    getTenant()
      .then((tenant) => setForm(tenantToForm(tenant)))
      .catch(() =>
        setError(
          lang === "en"
            ? "Failed to load company data."
            : "Error al cargar los datos.",
        ),
      )
      .finally(() => setLoading(false));
  }, [lang]);

  const set = (k: keyof TenantForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await updateTenant({
        name: form.name.trim(),
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        timezone: form.timezone.trim() || undefined,
        defaultLanguage: form.defaultLanguage,
        address: {
          street: form.street.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          zipCode: form.zipCode.trim() || undefined,
          country: form.country.trim() || undefined,
        },
        branding: {
          logoUrl: form.logoUrl.trim() || undefined,
          primaryColor: form.primaryColor.trim() || undefined,
        },
      });
      setSuccess(true);
    } catch {
      setError(lang === "en" ? "Failed to save changes." : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className={styles.loading}>{t.loading}</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSave} noValidate>
        {/* ── Company Info ──────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.sectionCompany}</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>
                {t.labelName} <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t.labelEmail}</label>
              <input
                className={styles.input}
                type="email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t.labelPhone}</label>
              <input
                className={styles.input}
                type="tel"
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t.labelTimezone}</label>
              <input
                className={styles.input}
                placeholder="America/New_York"
                value={form.timezone}
                onChange={(e) => set("timezone", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t.labelLang}</label>
              <select
                className={styles.input}
                value={form.defaultLanguage}
                onChange={(e) =>
                  set("defaultLanguage", e.target.value as "en" | "es")
                }
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── Address ───────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.sectionAddress}</h2>
          <div className={styles.grid}>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>{t.labelStreet}</label>
              <input
                className={styles.input}
                value={form.street}
                onChange={(e) => set("street", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t.labelCity}</label>
              <input
                className={styles.input}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t.labelState}</label>
              <input
                className={styles.input}
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t.labelZip}</label>
              <input
                className={styles.input}
                value={form.zipCode}
                onChange={(e) => set("zipCode", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t.labelCountry}</label>
              <input
                className={styles.input}
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ── Branding ──────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.sectionBranding}</h2>
          <div className={styles.grid}>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>{t.labelLogo}</label>
              <input
                className={styles.input}
                type="url"
                placeholder="https://example.com/logo.png"
                value={form.logoUrl}
                onChange={(e) => set("logoUrl", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t.labelColor}</label>
              <div className={styles.colorRow}>
                <input
                  className={`${styles.input} ${styles.colorText}`}
                  placeholder="#3b82f6"
                  value={form.primaryColor}
                  onChange={(e) => set("primaryColor", e.target.value)}
                />
                <input
                  type="color"
                  className={styles.colorPicker}
                  value={form.primaryColor || "#3b82f6"}
                  onChange={(e) => set("primaryColor", e.target.value)}
                  title="Pick a color"
                />
              </div>
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
