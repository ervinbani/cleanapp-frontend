import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { jobService } from "../services/jobService";
import apiClient from "../services/apiClient";
import type { Job, JobStatus, Customer, Service, User } from "../types";
import styles from "./JobDetailPage.module.css";

// ─── Constants ────────────────────────────────────────────────────
const JOB_STATUSES: JobStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "canceled",
  "no_show",
];

const STATUS_LABELS: Record<JobStatus, { en: string; es: string; it: string }> =
  {
    scheduled: { en: "Scheduled", es: "Programado", it: "Programmato" },
    confirmed: { en: "Confirmed", es: "Confirmado", it: "Confermato" },
    in_progress: { en: "In Progress", es: "En Progreso", it: "In corso" },
    completed: { en: "Completed", es: "Completado", it: "Completato" },
    canceled: { en: "Canceled", es: "Cancelado", it: "Annullato" },
    no_show: { en: "No Show", es: "No Presentado", it: "Non presentato" },
  };

const PRICE_UNIT_LABELS: Record<
  string,
  { en: string; es: string; it: string }
> = {
  per_hour: { en: "Hourly", es: "Por hora", it: "Orario" },
  per_job: { en: "Fixed", es: "Por trabajo", it: "A intervento" },
  per_day: { en: "Daily", es: "Por día", it: "Giornaliero" },
};

// ─── Translations ─────────────────────────────────────────────────
const T = {
  en: {
    back: "← Back to Jobs",
    loading: "Loading…",
    notFound: "Job not found.",
    errorLoad: "Failed to load job.",
    edit: "Edit",
    save: "Save Changes",
    saving: "Saving…",
    cancel: "Cancel",
    editTitle: "Edit Job",
    sectionSchedule: "Schedule",
    sectionService: "Service & Pricing",
    sectionAddress: "Property Address",
    sectionAssigned: "Assigned To",
    sectionChecklist: "Checklist",
    sectionNotes: "Notes",
    sectionActivity: "Activity",
    title: "Title",
    customer: "Customer",
    service: "Service",
    scheduledStart: "Scheduled Start",
    scheduledEnd: "Scheduled End",
    status: "Status",
    price: "Price",
    priceUnit: "Price Unit",
    timeDuration: "Duration (hrs)",
    overtimeHours: "Overtime Hours",
    assignedTo: "Assigned Users",
    notesInternal: "Internal Notes",
    notesCustomer: "Customer Notes",
    street: "Street",
    city: "City",
    stateField: "State",
    zipCode: "Zip Code",
    country: "Country",
    createdAt: "Created",
    updatedAt: "Updated",
    recurringRule: "Recurring Rule",
    invoice: "Invoice",
    noAssigned: "Nobody assigned",
    noChecklist: "No checklist",
    none: "—",
    errorSave: "Error saving job.",
    savedOk: "Changes saved.",
    selectCustomer: "— Select customer —",
    selectService: "— None —",
    requiredFields: "Customer and Scheduled Start are required.",
    loadingOptions: "Loading options…",
    placeholderTitle: "Optional job title",
    placeholderNotes: "Internal notes…",
    placeholderCustomerNotes: "Notes for the customer…",
    placeholderPrice: "0.00",
    placeholderDuration: "e.g. 2",
    placeholderOT: "e.g. 0.5",
    placeholderStreet: "123 Main St",
    placeholderCity: "Miami",
    placeholderState: "FL",
    placeholderZip: "33101",
    placeholderCountry: "US",
  },
  es: {
    back: "← Volver a Trabajos",
    loading: "Cargando…",
    notFound: "Trabajo no encontrado.",
    errorLoad: "Error al cargar el trabajo.",
    edit: "Editar",
    save: "Guardar Cambios",
    saving: "Guardando…",
    cancel: "Cancelar",
    editTitle: "Editar Trabajo",
    sectionSchedule: "Programación",
    sectionService: "Servicio y Precio",
    sectionAddress: "Dirección de la propiedad",
    sectionAssigned: "Asignado a",
    sectionChecklist: "Lista de verificación",
    sectionNotes: "Notas",
    sectionActivity: "Actividad",
    title: "Título",
    customer: "Cliente",
    service: "Servicio",
    scheduledStart: "Inicio programado",
    scheduledEnd: "Fin programado",
    status: "Estado",
    price: "Precio",
    priceUnit: "Unidad de precio",
    timeDuration: "Duración (hrs)",
    overtimeHours: "Horas extra",
    assignedTo: "Usuarios asignados",
    notesInternal: "Notas internas",
    notesCustomer: "Notas para el cliente",
    street: "Calle",
    city: "Ciudad",
    stateField: "Estado / Provincia",
    zipCode: "Código postal",
    country: "País",
    createdAt: "Creado",
    updatedAt: "Actualizado",
    recurringRule: "Regla recurrente",
    invoice: "Factura",
    noAssigned: "Nadie asignado",
    noChecklist: "Sin lista",
    none: "—",
    errorSave: "Error al guardar el trabajo.",
    savedOk: "Cambios guardados.",
    selectCustomer: "— Seleccionar cliente —",
    selectService: "— Ninguno —",
    requiredFields: "Cliente e inicio programado son obligatorios.",
    loadingOptions: "Cargando opciones…",
    placeholderTitle: "Título opcional del trabajo",
    placeholderNotes: "Notas internas…",
    placeholderCustomerNotes: "Notas para el cliente…",
    placeholderPrice: "0.00",
    placeholderDuration: "ej. 2",
    placeholderOT: "ej. 0.5",
    placeholderStreet: "Calle Mayor 123",
    placeholderCity: "Miami",
    placeholderState: "FL",
    placeholderZip: "33101",
    placeholderCountry: "US",
  },
  it: {
    back: "← Torna ai Lavori",
    loading: "Caricamento…",
    notFound: "Lavoro non trovato.",
    errorLoad: "Errore nel caricamento del lavoro.",
    edit: "Modifica",
    save: "Salva modifiche",
    saving: "Salvataggio…",
    cancel: "Annulla",
    editTitle: "Modifica Lavoro",
    sectionSchedule: "Pianificazione",
    sectionService: "Servizio e Prezzo",
    sectionAddress: "Indirizzo immobile",
    sectionAssigned: "Assegnato a",
    sectionChecklist: "Checklist",
    sectionNotes: "Note",
    sectionActivity: "Attività",
    title: "Titolo",
    customer: "Cliente",
    service: "Servizio",
    scheduledStart: "Inizio programmato",
    scheduledEnd: "Fine programmata",
    status: "Stato",
    price: "Prezzo",
    priceUnit: "Unità di prezzo",
    timeDuration: "Durata (ore)",
    overtimeHours: "Ore straordinario",
    assignedTo: "Utenti assegnati",
    notesInternal: "Note interne",
    notesCustomer: "Note per il cliente",
    street: "Via",
    city: "Città",
    stateField: "Stato / Provincia",
    zipCode: "CAP",
    country: "Paese",
    createdAt: "Creato il",
    updatedAt: "Modificato il",
    recurringRule: "Regola ricorrente",
    invoice: "Fattura",
    noAssigned: "Nessun assegnato",
    noChecklist: "Nessuna checklist",
    none: "—",
    errorSave: "Errore nel salvataggio del lavoro.",
    savedOk: "Modifiche salvate.",
    selectCustomer: "— Seleziona cliente —",
    selectService: "— Nessuno —",
    requiredFields: "Cliente e inizio programmato sono obbligatori.",
    loadingOptions: "Caricamento opzioni…",
    placeholderTitle: "Titolo opzionale del lavoro",
    placeholderNotes: "Note interne…",
    placeholderCustomerNotes: "Note per il cliente…",
    placeholderPrice: "0.00",
    placeholderDuration: "es. 2",
    placeholderOT: "es. 0.5",
    placeholderStreet: "Via Roma 1",
    placeholderCity: "Milano",
    placeholderState: "MI",
    placeholderZip: "20100",
    placeholderCountry: "IT",
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

function isoToLocal(iso: string): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function getCustomerObj(job: Job): Customer | null {
  if (typeof job.customerId === "object" && job.customerId !== null)
    return job.customerId as Customer;
  return null;
}

function getServiceObj(job: Job): Service | null {
  if (job.serviceId && typeof job.serviceId === "object")
    return job.serviceId as Service;
  return null;
}

function getAssignedUsers(job: Job): { id: string; name: string }[] {
  return job.assignedUsers.map((u) => {
    if (typeof u === "object") {
      const usr = u as User & { _id?: string };
      return {
        id: usr._id ?? usr.id,
        name: `${usr.firstName} ${usr.lastName}`,
      };
    }
    return { id: u, name: u };
  });
}

// ─── Dropdown types ───────────────────────────────────────────────
interface DDCustomer {
  _id: string;
  firstName: string;
  lastName: string;
}
interface DDService {
  _id: string;
  name: { en: string; es: string };
}
interface DDUser {
  _id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

// ─── Edit form state ──────────────────────────────────────────────
interface EditForm {
  customerId: string;
  serviceId: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: JobStatus;
  price: string;
  priceUnit: string;
  timeDuration: string;
  overtimeHours: string;
  assignedUsers: string[];
  notesInternal: string;
  notesCustomer: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

function jobToForm(j: Job): EditForm {
  const customerId =
    typeof j.customerId === "object"
      ? (j.customerId as Customer)._id
      : j.customerId;
  const serviceId = j.serviceId
    ? typeof j.serviceId === "object"
      ? (j.serviceId as Service)._id
      : j.serviceId
    : "";
  const assignedUserIds = j.assignedUsers.map((u) =>
    typeof u === "object"
      ? ((u as User & { _id?: string })._id ?? (u as User).id)
      : u,
  );
  return {
    customerId,
    serviceId,
    title: j.title ?? "",
    scheduledStart: isoToLocal(j.scheduledStart),
    scheduledEnd: j.scheduledEnd ? isoToLocal(j.scheduledEnd) : "",
    status: j.status,
    price: j.price != null ? String(j.price) : "",
    priceUnit: j.priceUnit ?? "per_job",
    timeDuration: j.timeDuration != null ? String(j.timeDuration) : "",
    overtimeHours: j.overtimeHours != null ? String(j.overtimeHours) : "",
    assignedUsers: assignedUserIds,
    notesInternal: j.notesInternal ?? "",
    notesCustomer: j.notesCustomer ?? "",
    street: j.propertyAddress?.street ?? "",
    city: j.propertyAddress?.city ?? "",
    state: j.propertyAddress?.state ?? "",
    zipCode: j.propertyAddress?.zipCode ?? "",
    country: j.propertyAddress?.country ?? "",
  };
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

// ─── Main component ───────────────────────────────────────────────
export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLang();
  const { hasRole } = useAuth();
  const l = T[lang] ?? T.en;

  const [job, setJob] = useState<Job | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Dropdown options for edit mode
  const [ddCustomers, setDdCustomers] = useState<DDCustomer[]>([]);
  const [ddServices, setDdServices] = useState<DDService[]>([]);
  const [ddUsers, setDdUsers] = useState<DDUser[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(false);

  // Checklist toggle (view mode)
  const [checklistState, setChecklistState] = useState<boolean[]>([]);

  const canWrite = hasRole(
    "owner",
    "director",
    "manager_operations",
    "manager_hr",
  );

  // ── Load job ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadError("");
    jobService
      .getById(id)
      .then((data) => {
        const job =
          data && "data" in data && "success" in data
            ? (data as unknown as { success: boolean; data: Job }).data
            : data;
        setJob(job);
        setChecklistState(job.checklist.map((i) => i.completed));
      })
      .catch(() => setLoadError(l.errorLoad))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load dropdown options ─────────────────────────────────────
  const loadOptions = async () => {
    setLoadingOpts(true);
    try {
      const [c, s, u] = await Promise.all([
        apiClient.get("/customers?limit=200"),
        apiClient.get("/services?limit=200"),
        apiClient.get("/users?limit=200"),
      ]);
      setDdCustomers((c.data as { data: DDCustomer[] }).data ?? []);
      setDdServices((s.data as { data: DDService[] }).data ?? []);
      setDdUsers(
        ((u.data as { data: DDUser[] }).data ?? []).filter((u) => u.isActive),
      );
    } catch {
      /* silent */
    } finally {
      setLoadingOpts(false);
    }
  };

  // ── Start editing ─────────────────────────────────────────────
  const startEditing = async () => {
    if (!job) return;
    setForm(jobToForm(job));
    setSaveError("");
    setSaveSuccess(false);
    setEditing(true);
    await loadOptions();
  };

  const cancelEditing = () => {
    setEditing(false);
    setForm(null);
    setSaveError("");
  };

  const set = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const toggleUser = (uid: string) =>
    setForm((f) => {
      if (!f) return f;
      const next = f.assignedUsers.includes(uid)
        ? f.assignedUsers.filter((u) => u !== uid)
        : [...f.assignedUsers, uid];
      return { ...f, assignedUsers: next };
    });

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !job) return;
    if (!form.customerId || !form.scheduledStart) {
      setSaveError(l.requiredFields);
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const updated = await jobService.update(job._id, {
        customerId: form.customerId,
        serviceId: form.serviceId || undefined,
        title: form.title.trim() || undefined,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: form.scheduledEnd
          ? new Date(form.scheduledEnd).toISOString()
          : undefined,
        status: form.status,
        price: form.price !== "" ? Number(form.price) : undefined,
        priceUnit: form.priceUnit || undefined,
        timeDuration:
          form.timeDuration !== "" ? Number(form.timeDuration) : undefined,
        overtimeHours:
          form.overtimeHours !== "" ? Number(form.overtimeHours) : undefined,
        assignedUsers: form.assignedUsers,
        notesInternal: form.notesInternal.trim() || undefined,
        notesCustomer: form.notesCustomer.trim() || undefined,
        propertyAddress: {
          street: form.street.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          zipCode: form.zipCode.trim() || undefined,
          country: form.country.trim() || undefined,
        },
      });
      setJob(updated);
      setChecklistState(updated.checklist.map((i) => i.completed));
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

  // ── Checklist toggle (view mode) ──────────────────────────────
  const toggleChecklist = async (idx: number) => {
    if (!job) return;
    const next = checklistState.map((v, i) => (i === idx ? !v : v));
    setChecklistState(next);
    const updatedChecklist = job.checklist.map((item, i) => ({
      label: item.label,
      completed: next[i],
    }));
    try {
      await jobService.update(job._id, { checklist: updatedChecklist });
      setJob((j) => (j ? { ...j, checklist: updatedChecklist } : j));
    } catch {
      // revert on error
      setChecklistState(checklistState);
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

  if (loadError || !job) {
    return (
      <div className={styles.page}>
        <p className={styles.errorMsg}>{loadError || l.notFound}</p>
      </div>
    );
  }

  const customer = getCustomerObj(job);
  const service = getServiceObj(job);
  const assignedUsers = getAssignedUsers(job);
  const addr = job.propertyAddress;
  const hasAddr =
    addr &&
    (addr.street || addr.city || addr.state || addr.zipCode || addr.country);
  const fullAddr = [addr?.street, addr?.city, addr?.state, addr?.zipCode]
    .filter(Boolean)
    .join(", ");
  const jobTitle =
    job.title ||
    (customer ? `${customer.firstName} ${customer.lastName}` : job._id);

  // ── Edit mode ─────────────────────────────────────────────────
  if (editing && form) {
    const svcName = (svc: DDService) =>
      lang === "es" ? svc.name.es : svc.name.en;

    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={cancelEditing}>
            {l.back}
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.statusDot} data-status={job.status} />
            <div>
              <h2 className={styles.cardTitle}>{l.editTitle}</h2>
              <p className={styles.cardSubtitle}>{jobTitle}</p>
            </div>
          </div>

          {loadingOpts ? (
            <p className={styles.stateMsg}>{l.loadingOptions}</p>
          ) : (
            <form onSubmit={handleSave} className={styles.editForm}>
              {/* Customer + Service */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    {l.customer} <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.input}
                    value={form.customerId}
                    onChange={(e) => set("customerId", e.target.value)}
                    required
                  >
                    <option value="">{l.selectCustomer}</option>
                    {ddCustomers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{l.service}</label>
                  <select
                    className={styles.input}
                    value={form.serviceId}
                    onChange={(e) => set("serviceId", e.target.value)}
                  >
                    <option value="">{l.selectService}</option>
                    {ddServices.map((s) => (
                      <option key={s._id} value={s._id}>
                        {svcName(s)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.title}</label>
                <input
                  className={styles.input}
                  placeholder={l.placeholderTitle}
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </div>

              {/* Schedule */}
              <h3 className={styles.sectionTitle}>{l.sectionSchedule}</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    {l.scheduledStart}{" "}
                    <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    type="datetime-local"
                    value={form.scheduledStart}
                    onChange={(e) => set("scheduledStart", e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{l.scheduledEnd}</label>
                  <input
                    className={styles.input}
                    type="datetime-local"
                    value={form.scheduledEnd}
                    onChange={(e) => set("scheduledEnd", e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{l.status}</label>
                  <select
                    className={styles.input}
                    value={form.status}
                    onChange={(e) => set("status", e.target.value as JobStatus)}
                  >
                    {JOB_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s][lang] ?? STATUS_LABELS[s].en}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{l.timeDuration}</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="0.25"
                    placeholder={l.placeholderDuration}
                    value={form.timeDuration}
                    onChange={(e) => set("timeDuration", e.target.value)}
                  />
                </div>
              </div>

              {/* Service & pricing */}
              <h3 className={styles.sectionTitle}>{l.sectionService}</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{l.price}</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={l.placeholderPrice}
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{l.priceUnit}</label>
                  <select
                    className={styles.input}
                    value={form.priceUnit}
                    onChange={(e) => set("priceUnit", e.target.value)}
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

              <div className={styles.formGroup}>
                <label className={styles.label}>{l.overtimeHours}</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.25"
                  placeholder={l.placeholderOT}
                  value={form.overtimeHours}
                  onChange={(e) => set("overtimeHours", e.target.value)}
                />
              </div>

              {/* Property address */}
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

              {/* Assigned users */}
              <h3 className={styles.sectionTitle}>{l.sectionAssigned}</h3>
              <div className={styles.userGrid}>
                {ddUsers.map((u) => {
                  const checked = form.assignedUsers.includes(u._id);
                  return (
                    <label
                      key={u._id}
                      className={`${styles.userChip} ${checked ? styles.userChipActive : ""}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.userChipCheck}
                        checked={checked}
                        onChange={() => toggleUser(u._id)}
                      />
                      {u.firstName} {u.lastName}
                    </label>
                  );
                })}
              </div>

              {/* Notes */}
              <h3 className={styles.sectionTitle}>{l.sectionNotes}</h3>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.notesInternal}</label>
                <textarea
                  className={styles.textarea}
                  placeholder={l.placeholderNotes}
                  value={form.notesInternal}
                  onChange={(e) => set("notesInternal", e.target.value)}
                  rows={3}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.notesCustomer}</label>
                <textarea
                  className={styles.textarea}
                  placeholder={l.placeholderCustomerNotes}
                  value={form.notesCustomer}
                  onChange={(e) => set("notesCustomer", e.target.value)}
                  rows={3}
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
          )}
        </div>
      </div>
    );
  }

  // ── View mode ─────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate("/jobs")}>
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
          <div
            className={`${styles.statusDot} ${styles[`dot_${job.status}`]}`}
          />
          <div className={styles.cardHeaderText}>
            <h2 className={styles.cardTitle}>{jobTitle}</h2>
            <p className={styles.cardSubtitle}>
              {customer ? `${customer.firstName} ${customer.lastName}` : l.none}
              {service &&
                ` · ${lang === "es" ? service.name.es : service.name.en}`}
            </p>
          </div>
          <div className={styles.headerBadges}>
            <span
              className={`${styles.badge} ${styles[`badge_${job.status}`]}`}
            >
              {STATUS_LABELS[job.status]?.[lang] ?? job.status}
            </span>
          </div>
        </div>

        <div className={styles.sections}>
          {/* Schedule */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionSchedule}</h3>
            <div className={styles.fields}>
              <Field label={l.customer}>
                {customer ? (
                  <button
                    className={styles.linkBtn}
                    onClick={() => navigate(`/customers/${customer._id}`)}
                  >
                    {customer.firstName} {customer.lastName}
                  </button>
                ) : (
                  l.none
                )}
              </Field>
              <Field label={l.service}>
                {service
                  ? lang === "es"
                    ? service.name.es
                    : service.name.en
                  : l.none}
              </Field>
              <Field label={l.scheduledStart}>
                {formatDate(job.scheduledStart)}
              </Field>
              <Field label={l.scheduledEnd}>
                {formatDate(job.scheduledEnd)}
              </Field>
              <Field label={l.timeDuration}>
                {job.timeDuration != null ? `${job.timeDuration} h` : l.none}
              </Field>
              <Field label={l.status}>
                <span
                  className={`${styles.badge} ${styles[`badge_${job.status}`]}`}
                >
                  {STATUS_LABELS[job.status]?.[lang] ?? job.status}
                </span>
              </Field>
            </div>
          </section>

          {/* Service & Pricing */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionService}</h3>
            <div className={styles.fields}>
              <Field label={l.price}>
                {job.price != null ? `$${job.price.toFixed(2)}` : l.none}
              </Field>
              <Field label={l.priceUnit}>
                {job.priceUnit
                  ? (PRICE_UNIT_LABELS[job.priceUnit]?.[lang] ?? job.priceUnit)
                  : l.none}
              </Field>
              <Field label={l.overtimeHours}>
                {job.overtimeHours != null ? `${job.overtimeHours} h` : l.none}
              </Field>
            </div>
          </section>

          {/* Property Address */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionAddress}</h3>
            {hasAddr ? (
              <div className={styles.fields}>
                <Field label={l.street}>{addr?.street ?? l.none}</Field>
                <Field label={l.city}>{addr?.city ?? l.none}</Field>
                <Field label={l.stateField}>{addr?.state ?? l.none}</Field>
                <Field label={l.zipCode}>{addr?.zipCode ?? l.none}</Field>
                <Field label={l.country}>
                  {addr?.country?.toUpperCase() ?? l.none}
                </Field>
                {fullAddr && (
                  <div className={styles.mapLinkWrap}>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(fullAddr)}`}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.mapLink}
                    >
                      📍 Open in Maps
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className={styles.emptySection}>{l.none}</p>
            )}
          </section>

          {/* Assigned To */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionAssigned}</h3>
            {assignedUsers.length > 0 ? (
              <div className={styles.assignedList}>
                {assignedUsers.map((u) => (
                  <span key={u.id} className={styles.assignedChip}>
                    {u.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.emptySection}>{l.noAssigned}</p>
            )}
          </section>

          {/* Checklist */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionChecklist}</h3>
            {job.checklist.length > 0 ? (
              <ul className={styles.checklist}>
                {job.checklist.map((item, idx) => (
                  <li key={idx} className={styles.checklistItem}>
                    <button
                      className={`${styles.checkboxBtn} ${checklistState[idx] ? styles.checkboxBtnDone : ""}`}
                      onClick={() => toggleChecklist(idx)}
                      aria-label={
                        checklistState[idx]
                          ? "Mark incomplete"
                          : "Mark complete"
                      }
                    >
                      {checklistState[idx] ? (
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          width="16"
                          height="16"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <span />
                      )}
                    </button>
                    <span
                      className={
                        checklistState[idx]
                          ? styles.checklistLabelDone
                          : styles.checklistLabel
                      }
                    >
                      {lang === "es"
                        ? item.label.es || item.label.en
                        : item.label.en || item.label.es}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptySection}>{l.noChecklist}</p>
            )}
          </section>

          {/* Notes */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionNotes}</h3>
            <div className={styles.notesGrid}>
              <div>
                <p className={styles.notesSubLabel}>{l.notesInternal}</p>
                <p className={styles.notesText}>
                  {job.notesInternal || l.none}
                </p>
              </div>
              <div>
                <p className={styles.notesSubLabel}>{l.notesCustomer}</p>
                <p className={styles.notesText}>
                  {job.notesCustomer || l.none}
                </p>
              </div>
            </div>
          </section>

          {/* Activity */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionActivity}</h3>
            <div className={styles.fields}>
              <Field label={l.createdAt}>{formatDate(job.createdAt)}</Field>
              <Field label={l.updatedAt}>{formatDate(job.updatedAt)}</Field>
              {job.recurringRuleId && (
                <Field label={l.recurringRule}>{job.recurringRuleId}</Field>
              )}
              {job.invoiceId && (
                <Field label={l.invoice}>{String(job.invoiceId)}</Field>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
