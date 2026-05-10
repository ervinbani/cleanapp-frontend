import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { customerService } from "../services/customerService";
import type { CustomerSource } from "../services/customerService";
import type { Customer, CustomerStatus } from "../types";
import styles from "./CustomerDetailPage.module.css";

// ─── Translations ─────────────────────────────────────────────────
const T = {
  en: {
    back: "← Back to Clients",
    loading: "Loading…",
    notFound: "Client not found.",
    errorLoad: "Failed to load client.",
    edit: "Edit",
    save: "Save Changes",
    saving: "Saving…",
    cancel: "Cancel",
    editTitle: "Edit Client",
    viewTitle: "Client Details",
    sectionIdentity: "Identity",
    sectionAddress: "Address",
    sectionNotes: "Notes",
    sectionActivity: "Activity",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    prefLang: "Preferred Language",
    status: "Status",
    source: "Source",
    street: "Street",
    city: "City",
    stateField: "State / Province",
    zipCode: "Zip Code",
    country: "Country",
    notes: "Internal Notes",
    createdAt: "Created",
    updatedAt: "Updated",
    active: "Active",
    inactive: "Inactive",
    lead: "Lead",
    errorSave: "Error saving client.",
    savedOk: "Changes saved.",
    placeholderEmail: "client@example.com",
    placeholderPhone: "+1 234 567 8900",
    placeholderStreet: "123 Main St",
    placeholderCity: "Miami",
    placeholderState: "FL",
    placeholderZip: "33101",
    placeholderCountry: "US",
    placeholderNotes: "Internal notes…",
  },
  es: {
    back: "← Volver a Clientes",
    loading: "Cargando…",
    notFound: "Cliente no encontrado.",
    errorLoad: "Error al cargar el cliente.",
    edit: "Editar",
    save: "Guardar Cambios",
    saving: "Guardando…",
    cancel: "Cancelar",
    editTitle: "Editar Cliente",
    viewTitle: "Detalles del Cliente",
    sectionIdentity: "Identidad",
    sectionAddress: "Dirección",
    sectionNotes: "Notas",
    sectionActivity: "Actividad",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo",
    phone: "Teléfono",
    prefLang: "Idioma preferido",
    status: "Estado",
    source: "Fuente",
    street: "Calle",
    city: "Ciudad",
    stateField: "Estado / Provincia",
    zipCode: "Código postal",
    country: "País",
    notes: "Notas internas",
    createdAt: "Creado",
    updatedAt: "Actualizado",
    active: "Activo",
    inactive: "Inactivo",
    lead: "Lead",
    errorSave: "Error al guardar el cliente.",
    savedOk: "Cambios guardados.",
    placeholderEmail: "cliente@ejemplo.com",
    placeholderPhone: "+1 234 567 8900",
    placeholderStreet: "Calle Mayor 123",
    placeholderCity: "Miami",
    placeholderState: "FL",
    placeholderZip: "33101",
    placeholderCountry: "US",
    placeholderNotes: "Notas internas…",
  },
  it: {
    back: "← Torna ai Clienti",
    loading: "Caricamento…",
    notFound: "Cliente non trovato.",
    errorLoad: "Errore nel caricamento del cliente.",
    edit: "Modifica",
    save: "Salva modifiche",
    saving: "Salvataggio…",
    cancel: "Annulla",
    editTitle: "Modifica Cliente",
    viewTitle: "Dettagli Cliente",
    sectionIdentity: "Identità",
    sectionAddress: "Indirizzo",
    sectionNotes: "Note",
    sectionActivity: "Attività",
    firstName: "Nome",
    lastName: "Cognome",
    email: "Email",
    phone: "Telefono",
    prefLang: "Lingua preferita",
    status: "Stato",
    source: "Fonte",
    street: "Via",
    city: "Città",
    stateField: "Stato / Provincia",
    zipCode: "CAP",
    country: "Paese",
    notes: "Note interne",
    createdAt: "Creato il",
    updatedAt: "Modificato il",
    active: "Attivo",
    inactive: "Inattivo",
    lead: "Lead",
    errorSave: "Errore nel salvataggio del cliente.",
    savedOk: "Modifiche salvate.",
    placeholderEmail: "cliente@esempio.it",
    placeholderPhone: "+39 02 1234 5678",
    placeholderStreet: "Via Roma 1",
    placeholderCity: "Milano",
    placeholderState: "MI",
    placeholderZip: "20100",
    placeholderCountry: "IT",
    placeholderNotes: "Note interne…",
  },
};

function countryFlag(code?: string): string {
  if (!code || code.length !== 2) return "";
  const offset = 0x1f1e6 - 65;
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + offset))
    .join("");
}

function formatDate(date?: string, fallback = "—"): string {
  if (!date) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

interface EditForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredLanguage: "en" | "es" | "it";
  status: CustomerStatus;
  source: CustomerSource;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  notes: string;
}

function customerToForm(c: Customer): EditForm {
  return {
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email ?? "",
    phone: c.phone ?? "",
    preferredLanguage: c.preferredLanguage as "en" | "es" | "it",
    status: c.status,
    source: c.source as CustomerSource,
    street: c.address?.street ?? "",
    city: c.address?.city ?? "",
    state: c.address?.state ?? "",
    zipCode: c.address?.zipCode ?? "",
    country: c.address?.country ?? "",
    notes: c.notes ?? "",
  };
}

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

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLang();
  const { hasRole } = useAuth();
  const l = T[lang] ?? T.en;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const canWrite = hasRole(
    "owner",
    "director",
    "manager_operations",
    "manager_hr",
    "staff",
  );

  // ── Load ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadError("");
    customerService
      .getById(id)
      .then((data) => {
        // handle both { success, data } and direct Customer responses
        const customer =
          data && "data" in data && "success" in data
            ? (data as unknown as { success: boolean; data: Customer }).data
            : data;
        setCustomer(customer);
      })
      .catch(() => setLoadError(l.errorLoad))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Edit mode ────────────────────────────────────────────────
  const startEditing = () => {
    if (!customer) return;
    setForm(customerToForm(customer));
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

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !customer) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const updated = await customerService.update(customer._id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        preferredLanguage: form.preferredLanguage,
        status: form.status,
        source: form.source,
        notes: form.notes.trim() || undefined,
        address: {
          street: form.street.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          zipCode: form.zipCode.trim() || undefined,
          country: form.country.trim() || undefined,
        },
      });
      setCustomer(updated);
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

  // ── Loading / error ──────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.stateMsg}>{l.loading}</p>
      </div>
    );
  }

  if (loadError || !customer) {
    return (
      <div className={styles.page}>
        <p className={styles.errorMsg}>{loadError || l.notFound}</p>
      </div>
    );
  }

  const statusClass = styles[`badge_${customer.status}`] ?? "";

  // ── Edit mode ────────────────────────────────────────────────
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
            <div className={styles.avatarLg}>
              {customer.firstName[0]}
              {customer.lastName[0]}
            </div>
            <div>
              <h2 className={styles.cardTitle}>{l.editTitle}</h2>
              <p className={styles.cardSubtitle}>
                {customer.firstName} {customer.lastName}
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

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.email}</label>
                <input
                  className={styles.input}
                  type="email"
                  placeholder={l.placeholderEmail}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.phone}</label>
                <input
                  className={styles.input}
                  type="tel"
                  placeholder={l.placeholderPhone}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {l.status} <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.input}
                  value={form.status}
                  onChange={(e) =>
                    set("status", e.target.value as CustomerStatus)
                  }
                  required
                >
                  <option value="lead">Lead</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {l.source} <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.input}
                  value={form.source}
                  onChange={(e) =>
                    set("source", e.target.value as CustomerSource)
                  }
                  required
                >
                  <option value="manual">Manual</option>
                  <option value="website">Website</option>
                  <option value="phone">Phone</option>
                  <option value="referral">Referral</option>
                  <option value="facebook">Facebook</option>
                  <option value="google">Google</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>{l.prefLang}</label>
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
            </div>

            {/* Address */}
            <h3 className={styles.sectionTitle}>{l.sectionAddress}</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.street}</label>
              <input
                className={styles.input}
                placeholder={l.placeholderStreet}
                value={form.street}
                onChange={(e) => set("street", e.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.city}</label>
                <input
                  className={styles.input}
                  placeholder={l.placeholderCity}
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.stateField}</label>
                <input
                  className={styles.input}
                  placeholder={l.placeholderState}
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.zipCode}</label>
                <input
                  className={styles.input}
                  placeholder={l.placeholderZip}
                  value={form.zipCode}
                  onChange={(e) => set("zipCode", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.country}</label>
                <input
                  className={styles.input}
                  placeholder={l.placeholderCountry}
                  value={form.country}
                  onChange={(e) =>
                    set("country", e.target.value.toUpperCase().slice(0, 2))
                  }
                  maxLength={2}
                />
              </div>
            </div>

            {/* Notes */}
            <h3 className={styles.sectionTitle}>{l.sectionNotes}</h3>
            <div className={styles.formGroup}>
              <textarea
                className={styles.textarea}
                placeholder={l.placeholderNotes}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={4}
              />
            </div>

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

  // ── View mode ────────────────────────────────────────────────
  const addr = customer.address;
  const hasAddress =
    addr &&
    (addr.street || addr.city || addr.state || addr.zipCode || addr.country);
  const fullAddress = [addr?.street, addr?.city, addr?.state, addr?.zipCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate("/customers")}
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
        {/* Card header */}
        <div className={styles.cardHeader}>
          <div className={styles.avatarLg}>
            {customer.firstName[0]}
            {customer.lastName[0]}
          </div>
          <div>
            <h2 className={styles.cardTitle}>
              {customer.firstName} {customer.lastName}
            </h2>
            <p className={styles.cardSubtitle}>{customer.email ?? "—"}</p>
          </div>
          <div className={styles.headerBadges}>
            <span className={`${styles.badge} ${statusClass}`}>
              {customer.status}
            </span>
            <span className={styles.sourceChip}>{customer.source}</span>
            {customer.address?.country && (
              <span className={styles.flagChip}>
                {countryFlag(customer.address.country)}{" "}
                {customer.address.country.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className={styles.sections}>
          {/* Identity */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionIdentity}</h3>
            <div className={styles.fields}>
              <Field label={l.firstName}>{customer.firstName}</Field>
              <Field label={l.lastName}>{customer.lastName}</Field>
              <Field label={l.email}>{customer.email ?? "—"}</Field>
              <Field label={l.phone}>{customer.phone ?? "—"}</Field>
              <Field label={l.prefLang}>
                {customer.preferredLanguage?.toUpperCase() ?? "—"}
              </Field>
              <Field label={l.status}>
                <span className={`${styles.badge} ${statusClass}`}>
                  {customer.status}
                </span>
              </Field>
              <Field label={l.source}>
                <span className={styles.sourceChip}>{customer.source}</span>
              </Field>
            </div>
          </section>

          {/* Address */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionAddress}</h3>
            {hasAddress ? (
              <div className={styles.fields}>
                <Field label={l.street}>{addr?.street ?? "—"}</Field>
                <Field label={l.city}>{addr?.city ?? "—"}</Field>
                <Field label={l.stateField}>{addr?.state ?? "—"}</Field>
                <Field label={l.zipCode}>{addr?.zipCode ?? "—"}</Field>
                <Field label={l.country}>
                  {addr?.country
                    ? `${countryFlag(addr.country)} ${addr.country.toUpperCase()}`
                    : "—"}
                </Field>
                {fullAddress && (
                  <div className={styles.mapLink}>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📍 Open in Maps
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className={styles.emptySection}>—</p>
            )}
          </section>

          {/* Notes */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionNotes}</h3>
            {customer.notes ? (
              <p className={styles.notesText}>{customer.notes}</p>
            ) : (
              <p className={styles.emptySection}>—</p>
            )}
          </section>

          {/* Activity */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionActivity}</h3>
            <div className={styles.fields}>
              <Field label={l.createdAt}>
                {formatDate(customer.createdAt)}
              </Field>
              <Field label={l.updatedAt}>
                {formatDate(customer.updatedAt)}
              </Field>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
