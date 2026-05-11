import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import type { Service } from "../types";
import styles from "./ServiceDetailPage.module.css";

// ─── Constants ────────────────────────────────────────────────────
const PRICE_UNIT_LABELS: Record<
  string,
  { en: string; es: string; it: string }
> = {
  per_hour: { en: "Hourly", es: "Por hora", it: "Orario" },
  per_job: { en: "Fixed", es: "Por trabajo", it: "Fisso" },
  per_day: { en: "Daily", es: "Por día", it: "Giornaliero" },
};

// ─── Translations ─────────────────────────────────────────────────
const T = {
  en: {
    back: "← Back to Services",
    loading: "Loading…",
    notFound: "Service not found.",
    errorLoad: "Failed to load service.",
    edit: "Edit",
    save: "Save Changes",
    saving: "Saving…",
    cancel: "Cancel",
    editTitle: "Edit Service",
    sectionGeneral: "General",
    sectionPricing: "Pricing",
    sectionOvertime: "Overtime",
    sectionActivity: "Activity",
    nameEn: "Name (EN)",
    nameEs: "Name (ES)",
    descriptionEn: "Description (EN)",
    descriptionEs: "Description (ES)",
    basePrice: "Base Price",
    priceUnit: "Price Unit",
    isActive: "Status",
    overtimeEnabled: "Overtime Enabled",
    overtimeUnit: "Overtime Unit",
    overtimePercentage: "Extra Percentage (%)",
    createdAt: "Created",
    updatedAt: "Updated",
    active: "Active",
    inactive: "Inactive",
    yes: "Yes",
    no: "No",
    none: "—",
    errorSave: "Error saving service.",
    savedOk: "Changes saved.",
    required: "Name (EN) is required.",
    overtimePctRequired:
      "Extra percentage is required when overtime is enabled.",
    placeholderNameEn: "Service Name",
    placeholderNameEs: "Nombre del servicio",
    placeholderDescEn: "Enter a description…",
    placeholderDescEs: "Ingresa una descripción…",
    placeholderPrice: "0.00",
    placeholderPct: "e.g. 25",
  },
  es: {
    back: "← Volver a Servicios",
    loading: "Cargando…",
    notFound: "Servicio no encontrado.",
    errorLoad: "Error al cargar el servicio.",
    edit: "Editar",
    save: "Guardar Cambios",
    saving: "Guardando…",
    cancel: "Cancelar",
    editTitle: "Editar Servicio",
    sectionGeneral: "General",
    sectionPricing: "Precio",
    sectionOvertime: "Horas extra",
    sectionActivity: "Actividad",
    nameEn: "Nombre (EN)",
    nameEs: "Nombre (ES)",
    descriptionEn: "Descripción (EN)",
    descriptionEs: "Descripción (ES)",
    basePrice: "Precio base",
    priceUnit: "Unidad de precio",
    isActive: "Estado",
    overtimeEnabled: "Horas extra habilitadas",
    overtimeUnit: "Unidad de horas extra",
    overtimePercentage: "Porcentaje extra (%)",
    createdAt: "Creado",
    updatedAt: "Actualizado",
    active: "Activo",
    inactive: "Inactivo",
    yes: "Sí",
    no: "No",
    none: "—",
    errorSave: "Error al guardar el servicio.",
    savedOk: "Cambios guardados.",
    required: "El nombre (EN) es obligatorio.",
    overtimePctRequired:
      "La % extra es obligatoria cuando las horas extra están habilitadas.",
    placeholderNameEn: "Service Name",
    placeholderNameEs: "Nombre del servicio",
    placeholderDescEn: "Enter a description…",
    placeholderDescEs: "Ingresa una descripción…",
    placeholderPrice: "0.00",
    placeholderPct: "ej. 25",
  },
  it: {
    back: "← Torna ai Servizi",
    loading: "Caricamento…",
    notFound: "Servizio non trovato.",
    errorLoad: "Errore nel caricamento del servizio.",
    edit: "Modifica",
    save: "Salva modifiche",
    saving: "Salvataggio…",
    cancel: "Annulla",
    editTitle: "Modifica Servizio",
    sectionGeneral: "Generale",
    sectionPricing: "Prezzo",
    sectionOvertime: "Straordinari",
    sectionActivity: "Attività",
    nameEn: "Nome (EN)",
    nameEs: "Nome (ES)",
    descriptionEn: "Descrizione (EN)",
    descriptionEs: "Descrizione (ES)",
    basePrice: "Prezzo base",
    priceUnit: "Unità di prezzo",
    isActive: "Stato",
    overtimeEnabled: "Straordinari abilitati",
    overtimeUnit: "Unità straordinario",
    overtimePercentage: "Percentuale extra (%)",
    createdAt: "Creato il",
    updatedAt: "Modificato il",
    active: "Attivo",
    inactive: "Inattivo",
    yes: "Sì",
    no: "No",
    none: "—",
    errorSave: "Errore nel salvataggio del servizio.",
    savedOk: "Modifiche salvate.",
    required: "Il nome (EN) è obbligatorio.",
    overtimePctRequired:
      "La % extra è obbligatoria quando gli straordinari sono abilitati.",
    placeholderNameEn: "Service Name",
    placeholderNameEs: "Nombre del servicio",
    placeholderDescEn: "Inserisci una descrizione…",
    placeholderDescEs: "Ingresa una descripción…",
    placeholderPrice: "0.00",
    placeholderPct: "es. 25",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────
function formatDate(iso?: string, fallback = "—"): string {
  if (!iso) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

// ─── Field component ──────────────────────────────────────────────
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

// ─── Edit form state ──────────────────────────────────────────────
type PriceUnit = "per_hour" | "per_job" | "per_day";

interface EditForm {
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  basePrice: string;
  priceUnit: PriceUnit;
  isActive: boolean;
  overtimeEnabled: boolean;
  overtimeUnit: PriceUnit;
  overtimePercentage: string;
}

function serviceToForm(s: Service): EditForm {
  return {
    nameEn: s.name?.en ?? "",
    nameEs: s.name?.es ?? "",
    descriptionEn: s.description?.en ?? "",
    descriptionEs: s.description?.es ?? "",
    basePrice: s.basePrice != null ? String(s.basePrice) : "",
    priceUnit: (s.priceUnit as PriceUnit) ?? "per_job",
    isActive: s.isActive,
    overtimeEnabled: s.overtime?.isEnabled ?? false,
    overtimeUnit: (s.overtime?.unit as PriceUnit) ?? "per_hour",
    overtimePercentage:
      s.overtime?.extraPercentage != null
        ? String(s.overtime.extraPercentage)
        : "",
  };
}

// ─── Main component ───────────────────────────────────────────────
export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLang();
  const { hasRole } = useAuth();
  const l = T[lang] ?? T.en;

  // If navigated from the list, the service is already in state — use it immediately
  const stateService =
    (location.state as { service?: Service } | null)?.service ?? null;

  const [service, setService] = useState<Service | null>(stateService);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(!stateService); // skip loading if we already have data

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const canWrite = hasRole("owner", "director", "manager_operations");

  // ── Load service ──────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    // If we already have the service from navigation state, skip the initial load
    // but still attempt a background refresh from GET /services/:id
    const isInitialData = !!stateService;
    if (!isInitialData) setLoading(true);
    setLoadError("");

    apiClient
      .get(`/services/${id}`)
      .then((res) => {
        const data =
          res.data && "data" in res.data && "success" in res.data
            ? (res.data as { success: boolean; data: Service }).data
            : (res.data as Service);
        setService(data);
      })
      .catch(() => {
        if (!isInitialData) {
          // No single-service endpoint — try fetching the list and find by id
          apiClient
            .get("/services", { params: { limit: 500 } })
            .then((res) => {
              const list: Service[] =
                res.data && "data" in res.data
                  ? (res.data as { data: Service[] }).data
                  : (res.data as Service[]);
              const found = list.find((s) => s._id === id);
              if (found) {
                setService(found);
              } else {
                setLoadError(l.notFound);
              }
            })
            .catch(() => setLoadError(l.errorLoad));
        }
        // If we had initial data from state, silently ignore the refresh failure
      })
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start editing ─────────────────────────────────────────────
  const startEditing = () => {
    if (!service) return;
    setForm(serviceToForm(service));
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

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !service) return;
    if (!form.nameEn.trim()) {
      setSaveError(l.required);
      return;
    }
    if (form.overtimeEnabled && form.overtimePercentage === "") {
      setSaveError(l.overtimePctRequired);
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const payload = {
        name: {
          en: form.nameEn.trim(),
          es: form.nameEs.trim() || form.nameEn.trim(),
        },
        description: {
          en: form.descriptionEn.trim() || undefined,
          es: form.descriptionEs.trim() || undefined,
        },
        basePrice: form.basePrice !== "" ? Number(form.basePrice) : undefined,
        priceUnit: form.priceUnit,
        isActive: form.isActive,
        overtime: form.overtimeEnabled
          ? {
              isEnabled: true,
              unit: form.overtimeUnit,
              extraPercentage: Number(form.overtimePercentage),
            }
          : { isEnabled: false },
      };
      const res = await apiClient.put(`/services/${service._id}`, payload);
      const updated =
        res.data && "data" in res.data && "success" in res.data
          ? (res.data as { success: boolean; data: Service }).data
          : (res.data as Service);
      setService(updated);
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

  // ── Loading / error ───────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.stateMsg}>{l.loading}</p>
      </div>
    );
  }

  if (loadError || !service) {
    return (
      <div className={styles.page}>
        <p className={styles.errorMsg}>{loadError || l.notFound}</p>
      </div>
    );
  }

  const displayName =
    lang === "es"
      ? service.name.es || service.name.en
      : lang === "it"
        ? service.name.en
        : service.name.en;

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  // ── Edit mode ─────────────────────────────────────────────────
  if (editing && form) {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={cancelEditing}>
            {l.back}
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.avatarLg}>{initials}</div>
            <div>
              <h2 className={styles.cardTitle}>{l.editTitle}</h2>
              <p className={styles.cardSubtitle}>{displayName}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className={styles.editForm}>
            {/* General */}
            <h3 className={styles.sectionTitle}>{l.sectionGeneral}</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {l.nameEn} <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.input}
                  placeholder={l.placeholderNameEn}
                  value={form.nameEn}
                  onChange={(e) => set("nameEn", e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.nameEs}</label>
                <input
                  className={styles.input}
                  placeholder={l.placeholderNameEs}
                  value={form.nameEs}
                  onChange={(e) => set("nameEs", e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.descriptionEn}</label>
                <textarea
                  className={styles.textarea}
                  placeholder={l.placeholderDescEn}
                  value={form.descriptionEn}
                  onChange={(e) => set("descriptionEn", e.target.value)}
                  rows={3}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.descriptionEs}</label>
                <textarea
                  className={styles.textarea}
                  placeholder={l.placeholderDescEs}
                  value={form.descriptionEs}
                  onChange={(e) => set("descriptionEs", e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Status */}
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.isActive}</label>
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

            {/* Pricing */}
            <h3 className={styles.sectionTitle}>{l.sectionPricing}</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.basePrice}</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={l.placeholderPrice}
                  value={form.basePrice}
                  onChange={(e) => set("basePrice", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.priceUnit}</label>
                <select
                  className={styles.input}
                  value={form.priceUnit}
                  onChange={(e) =>
                    set("priceUnit", e.target.value as PriceUnit)
                  }
                >
                  <option value="per_job">
                    {PRICE_UNIT_LABELS.per_job[lang] ?? "Fixed"}
                  </option>
                  <option value="per_hour">
                    {PRICE_UNIT_LABELS.per_hour[lang] ?? "Hourly"}
                  </option>
                  <option value="per_day">
                    {PRICE_UNIT_LABELS.per_day[lang] ?? "Daily"}
                  </option>
                </select>
              </div>
            </div>

            {/* Overtime */}
            <h3 className={styles.sectionTitle}>{l.sectionOvertime}</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.overtimeEnabled}</label>
              <button
                type="button"
                className={`${styles.toggle} ${form.overtimeEnabled ? styles.toggleOn : ""}`}
                onClick={() => set("overtimeEnabled", !form.overtimeEnabled)}
                aria-pressed={form.overtimeEnabled}
              >
                <span className={styles.toggleThumb} />
              </button>
              <span className={styles.toggleLabel}>
                {form.overtimeEnabled ? l.yes : l.no}
              </span>
            </div>

            {form.overtimeEnabled && (
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{l.overtimeUnit}</label>
                  <select
                    className={styles.input}
                    value={form.overtimeUnit}
                    onChange={(e) =>
                      set("overtimeUnit", e.target.value as PriceUnit)
                    }
                  >
                    <option value="per_hour">
                      {PRICE_UNIT_LABELS.per_hour[lang] ?? "Hourly"}
                    </option>
                    <option value="per_job">
                      {PRICE_UNIT_LABELS.per_job[lang] ?? "Fixed"}
                    </option>
                    <option value="per_day">
                      {PRICE_UNIT_LABELS.per_day[lang] ?? "Daily"}
                    </option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{l.overtimePercentage}</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="1"
                    placeholder={l.placeholderPct}
                    value={form.overtimePercentage}
                    onChange={(e) => set("overtimePercentage", e.target.value)}
                  />
                </div>
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

  // ── View mode ─────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate("/services")}
        >
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
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.avatarLg}>{initials}</div>
          <div className={styles.cardHeaderText}>
            <h2 className={styles.cardTitle}>{displayName}</h2>
            {service.name.es && service.name.es !== service.name.en && (
              <p className={styles.cardSubtitle}>{service.name.es}</p>
            )}
          </div>
          <div className={styles.headerBadges}>
            <span
              className={`${styles.badge} ${service.isActive ? styles.badge_active : styles.badge_inactive}`}
            >
              {service.isActive ? l.active : l.inactive}
            </span>
          </div>
        </div>

        <div className={styles.sections}>
          {/* General */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionGeneral}</h3>
            <div className={styles.fields}>
              <Field label={l.nameEn}>{service.name.en || l.none}</Field>
              <Field label={l.nameEs}>{service.name.es || l.none}</Field>
              <Field label={l.descriptionEn}>
                {service.description?.en || l.none}
              </Field>
              <Field label={l.descriptionEs}>
                {service.description?.es || l.none}
              </Field>
            </div>
          </section>

          {/* Pricing */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionPricing}</h3>
            <div className={styles.fields}>
              <Field label={l.basePrice}>
                {service.basePrice != null
                  ? `$${service.basePrice.toFixed(2)}`
                  : l.none}
              </Field>
              <Field label={l.priceUnit}>
                {service.priceUnit
                  ? (PRICE_UNIT_LABELS[service.priceUnit]?.[lang] ??
                    service.priceUnit)
                  : l.none}
              </Field>
            </div>
          </section>

          {/* Overtime */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionOvertime}</h3>
            <div className={styles.fields}>
              <Field label={l.overtimeEnabled}>
                {service.overtime?.isEnabled ? (
                  <span className={styles.badge_ot_on}>{l.yes}</span>
                ) : (
                  <span className={styles.badge_ot_off}>{l.no}</span>
                )}
              </Field>
              {service.overtime?.isEnabled && (
                <>
                  <Field label={l.overtimeUnit}>
                    {service.overtime.unit
                      ? (PRICE_UNIT_LABELS[service.overtime.unit]?.[lang] ??
                        service.overtime.unit)
                      : l.none}
                  </Field>
                  <Field label={l.overtimePercentage}>
                    {service.overtime.extraPercentage != null
                      ? `${service.overtime.extraPercentage}%`
                      : l.none}
                  </Field>
                </>
              )}
            </div>
          </section>

          {/* Activity */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionActivity}</h3>
            <div className={styles.fields}>
              <Field label={l.createdAt}>{formatDate(service.createdAt)}</Field>
              <Field label={l.updatedAt}>{formatDate(service.updatedAt)}</Field>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
