import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { jobService } from "../services/jobService";
import apiClient from "../services/apiClient";
import type { Job, JobStatus, Customer, Service, User } from "../types";
import styles from "./JobsPage.module.css";

const PAGE_LIMIT = 20;

function getPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function formatDateTime(iso: string, lang: "en" | "es"): string {
  return new Date(iso).toLocaleString(lang === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCustomer(job: Job): Customer | null {
  if (typeof job.customerId === "object" && job.customerId !== null)
    return job.customerId as Customer;
  return null;
}

function getService(job: Job): Service | null {
  if (job.serviceId && typeof job.serviceId === "object")
    return job.serviceId as Service;
  return null;
}

function getAssignedNames(job: Job): string {
  if (!job.assignedUsers.length) return "—";
  return job.assignedUsers
    .map((u) => {
      if (typeof u === "object") {
        const usr = u as User;
        return `${usr.firstName} ${usr.lastName}`;
      }
      return u;
    })
    .join(", ");
}

const STATUS_ORDER: JobStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "canceled",
  "no_show",
];

const t = {
  en: {
    title: "Jobs",
    addJob: "+ Add Job",
    searchPlaceholder: "Search jobs...",
    colTitle: "Title",
    colCustomer: "Customer",
    colService: "Service",
    colScheduled: "Scheduled",
    colStatus: "Status",
    colAssigned: "Assigned To",
    colPrice: "Price",
    colActions: "Actions",
    btnView: "View",
    btnUpdate: "Update",
    allStatuses: "All statuses",
    filterTitle: "Filter title…",
    filterCustomer: "Filter customer…",
    filterStatus: "Filter status…",
    prev: "← Prev",
    next: "Next →",
    noResults: "No jobs found.",
    loading: "Loading…",
    page: "Page",
    of: "of",
    status_scheduled: "Scheduled",
    status_confirmed: "Confirmed",
    status_in_progress: "In Progress",
    status_completed: "Completed",
    status_canceled: "Canceled",
    status_no_show: "No Show",
    exportExcel: "Export Excel",
    exportPdf: "Export PDF",
  },
  es: {
    title: "Trabajos",
    addJob: "+ Agregar Trabajo",
    searchPlaceholder: "Buscar trabajos...",
    colTitle: "Título",
    colCustomer: "Cliente",
    colService: "Servicio",
    colScheduled: "Programado",
    colStatus: "Estado",
    colAssigned: "Asignado a",
    colPrice: "Precio",
    colActions: "Acciones",
    btnView: "Ver",
    btnUpdate: "Editar",
    allStatuses: "Todos los estados",
    filterTitle: "Filtrar título…",
    filterCustomer: "Filtrar cliente…",
    filterStatus: "Filtrar estado…",
    prev: "← Prev",
    next: "Siguiente →",
    noResults: "No se encontraron trabajos.",
    loading: "Cargando…",
    page: "Página",
    of: "de",
    status_scheduled: "Programado",
    status_confirmed: "Confirmado",
    status_in_progress: "En Progreso",
    status_completed: "Completado",
    status_canceled: "Cancelado",
    status_no_show: "No Presentado",
    exportExcel: "Exportar Excel",
    exportPdf: "Exportar PDF",
  },
};

// ── Job Modal ────────────────────────────────────────────────────────────
interface ChecklistItem {
  labelEn: string;
  labelEs: string;
}

interface JobForm {
  customerId: string;
  serviceId: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: JobStatus;
  price: string;
  priceUnit: string;
  timeDuration: string;
  assignedUsers: string[];
  notesInternal: string;
  notesCustomer: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  checklist: ChecklistItem[];
}

const EMPTY_JOB_FORM: JobForm = {
  customerId: "",
  serviceId: "",
  title: "",
  scheduledStart: "",
  scheduledEnd: "",
  status: "scheduled",
  price: "",
  priceUnit: "per_job",
  timeDuration: "",
  assignedUsers: [],
  notesInternal: "",
  notesCustomer: "",
  street: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  checklist: [],
};

function isoToLocal(iso: string): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function jobToForm(j: Job): JobForm {
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
      ? ((u as User & { _id?: string }).id ?? (u as User & { _id: string })._id)
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
    assignedUsers: assignedUserIds,
    notesInternal: j.notesInternal ?? "",
    notesCustomer: j.notesCustomer ?? "",
    street: j.propertyAddress?.street ?? "",
    city: j.propertyAddress?.city ?? "",
    state: j.propertyAddress?.state ?? "",
    zipCode: j.propertyAddress?.zipCode ?? "",
    country: j.propertyAddress?.country ?? "",
    checklist: j.checklist.map((item) => ({
      labelEn: item.label.en,
      labelEs: item.label.es,
    })),
  };
}

const JOB_STATUSES: JobStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "canceled",
  "no_show",
];

const STATUS_LABELS: Record<JobStatus, { en: string; es: string }> = {
  scheduled: { en: "Scheduled", es: "Programado" },
  confirmed: { en: "Confirmed", es: "Confirmado" },
  in_progress: { en: "In Progress", es: "En Progreso" },
  completed: { en: "Completed", es: "Completado" },
  canceled: { en: "Canceled", es: "Cancelado" },
  no_show: { en: "No Show", es: "No Presentado" },
};

const jmT = {
  en: {
    addTitle: "Add Job",
    editTitle: "Edit Job",
    titleField: "Title",
    customer: "Customer *",
    service: "Service",
    selectCustomer: "— Select customer —",
    selectService: "— None —",
    scheduledStart: "Scheduled Start *",
    scheduledEnd: "Scheduled End",
    status: "Status",
    price: "Price ($)",
    priceUnit: "Price Unit",
    priceUnitLabels: {
      per_hour: "Hourly",
      per_job: "Fixed",
      per_day: "Daily",
    } as Record<string, string>,
    timeDuration: "Duration",
    assignedUsers: "Assigned To",
    notesInternal: "Internal Notes",
    notesCustomer: "Customer Notes",
    addressSection: "Property Address",
    street: "Street",
    city: "City",
    stateLabel: "State",
    zipCode: "Zip Code",
    country: "Country",
    checklistSection: "Checklist",
    checkItemEn: "Label (EN)",
    checkItemEs: "Label (ES)",
    addItem: "+ Add Item",
    cancel: "Cancel",
    save: "Save",
    update: "Update",
    required: "Customer and Scheduled Start are required.",
    loadingOpts: "Loading options…",
  },
  es: {
    addTitle: "Agregar Trabajo",
    editTitle: "Editar Trabajo",
    titleField: "Título",
    customer: "Cliente *",
    service: "Servicio",
    selectCustomer: "— Seleccionar cliente —",
    selectService: "— Ninguno —",
    scheduledStart: "Inicio Programado *",
    scheduledEnd: "Fin Programado",
    status: "Estado",
    price: "Precio ($)",
    priceUnit: "Unidad de precio",
    priceUnitLabels: {
      per_hour: "Por hora",
      per_job: "Fijo",
      per_day: "Por día",
    } as Record<string, string>,
    timeDuration: "Duración",
    assignedUsers: "Asignado a",
    notesInternal: "Notas Internas",
    notesCustomer: "Notas para el Cliente",
    addressSection: "Dirección de la Propiedad",
    street: "Calle",
    city: "Ciudad",
    stateLabel: "Estado/Provincia",
    zipCode: "Código Postal",
    country: "País",
    checklistSection: "Lista de Verificación",
    checkItemEn: "Etiqueta (EN)",
    checkItemEs: "Etiqueta (ES)",
    addItem: "+ Agregar Elemento",
    cancel: "Cancelar",
    save: "Guardar",
    update: "Actualizar",
    required: "El cliente y la fecha de inicio son obligatorios.",
    loadingOpts: "Cargando opciones…",
  },
};

interface DropdownCustomer {
  _id: string;
  firstName: string;
  lastName: string;
}
interface DropdownService {
  _id: string;
  name: { en: string; es: string };
  basePrice?: number;
  priceUnit?: string;
}
interface DropdownUser {
  _id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

interface JobModalProps {
  job?: Job;
  lang: "en" | "es";
  onClose: () => void;
  onSaved: () => void;
}

function JobModal({ job, lang, onClose, onSaved }: JobModalProps) {
  const isEdit = !!job;
  const l = jmT[lang];
  const [form, setForm] = useState<JobForm>(
    isEdit ? jobToForm(job!) : EMPTY_JOB_FORM,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<DropdownCustomer[]>([]);
  const [services, setServices] = useState<DropdownService[]>([]);
  const [users, setUsers] = useState<DropdownUser[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [checklistTab, setChecklistTab] = useState<"en" | "es">("en");

  useEffect(() => {
    Promise.all([
      apiClient.get("/customers", { params: { limit: 200 } }),
      apiClient.get("/services", { params: { limit: 200 } }),
      apiClient.get("/users", { params: { limit: 200 } }),
    ])
      .then(([c, s, u]) => {
        setCustomers((c.data as { data: DropdownCustomer[] }).data ?? []);
        setServices((s.data as { data: DropdownService[] }).data ?? []);
        setUsers(
          ((u.data as { data: DropdownUser[] }).data ?? []).filter(
            (usr) => usr.isActive,
          ),
        );
      })
      .catch(() => {})
      .finally(() => setLoadingOptions(false));
  }, []);

  const set = <K extends keyof JobForm>(field: K, value: JobForm[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  // Auto-calculate scheduledEnd from start + duration + priceUnit
  const calcEnd = (start: string, duration: string, unit: string): string => {
    if (!start || !duration || unit === "per_job") return "";
    const ms =
      Number(duration) *
      (unit === "per_day" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);
    if (!ms) return "";
    const end = new Date(new Date(start).getTime() + ms);
    // format to datetime-local in local time (YYYY-MM-DDTHH:mm)
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
  };

  const handleStartChange = (value: string) =>
    setForm((prev) => ({
      ...prev,
      scheduledStart: value,
      scheduledEnd:
        calcEnd(value, prev.timeDuration, prev.priceUnit) || prev.scheduledEnd,
    }));

  const handleDurationChange = (value: string) =>
    setForm((prev) => ({
      ...prev,
      timeDuration: value,
      scheduledEnd:
        calcEnd(prev.scheduledStart, value, prev.priceUnit) ||
        prev.scheduledEnd,
    }));

  const handlePriceUnitChange = (value: string) =>
    setForm((prev) => ({
      ...prev,
      priceUnit: value,
      scheduledEnd:
        calcEnd(prev.scheduledStart, prev.timeDuration, value) ||
        prev.scheduledEnd,
    }));

  const toggleUser = (id: string) =>
    setForm((prev) => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(id)
        ? prev.assignedUsers.filter((u) => u !== id)
        : [...prev.assignedUsers, id],
    }));

  const addChecklistItem = () =>
    setForm((prev) => ({
      ...prev,
      checklist: [...prev.checklist, { labelEn: "", labelEs: "" }],
    }));

  const updateChecklistItem = (
    idx: number,
    field: "labelEn" | "labelEs",
    value: string,
  ) =>
    setForm((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item,
      ),
    }));

  const removeChecklistItem = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== idx),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.scheduledStart) {
      setError(l.required);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
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
        checklist: form.checklist
          .filter((item) => item.labelEn.trim() || item.labelEs.trim())
          .map((item) => ({
            label: { en: item.labelEn.trim(), es: item.labelEs.trim() },
            completed: false,
          })),
      };
      if (isEdit) {
        await jobService.update(job!._id, payload);
      } else {
        await jobService.create(payload);
      }
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Error saving job.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.modalLarge}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {isEdit ? l.editTitle : l.addTitle}
          </h3>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {loadingOptions ? (
          <p className={styles.modalLoading}>{l.loadingOpts}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Customer + Service */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.customer}</label>
                <select
                  className={styles.input}
                  value={form.customerId}
                  onChange={(e) => set("customerId", e.target.value)}
                  required
                >
                  <option value="">{l.selectCustomer}</option>
                  {customers.map((c) => (
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
                  onChange={(e) => {
                    const id = e.target.value;
                    const svc = services.find((s) => s._id === id);
                    setForm((prev) => ({
                      ...prev,
                      serviceId: id,
                      price:
                        svc?.basePrice != null
                          ? String(svc.basePrice)
                          : prev.price,
                      priceUnit: svc?.priceUnit ?? prev.priceUnit,
                    }));
                  }}
                >
                  <option value="">{l.selectService}</option>
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name?.[lang] ?? s.name?.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Title */}
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.titleField}</label>
              <input
                className={styles.input}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            {/* Scheduled Start + End */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.scheduledStart}</label>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={form.scheduledStart}
                  onChange={(e) => handleStartChange(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {l.scheduledEnd}
                  {form.scheduledEnd &&
                    calcEnd(
                      form.scheduledStart,
                      form.timeDuration,
                      form.priceUnit,
                    ) === form.scheduledEnd && (
                      <span className={styles.autoCalcBadge}>auto</span>
                    )}
                </label>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={form.scheduledEnd}
                  onChange={(e) => set("scheduledEnd", e.target.value)}
                />
              </div>
            </div>

            {/* Status + Price + Duration */}
            <div className={styles.formRow3}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.status}</label>
                <select
                  className={styles.input}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as JobStatus)}
                >
                  {JOB_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s][lang]}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.price}</label>
                <div className={styles.priceRow}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                  />
                  <select
                    value={form.priceUnit}
                    onChange={(e) => handlePriceUnitChange(e.target.value)}
                  >
                    <option value="per_hour">
                      {l.priceUnitLabels.per_hour}
                    </option>
                    <option value="per_job">{l.priceUnitLabels.per_job}</option>
                    <option value="per_day">{l.priceUnitLabels.per_day}</option>
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.timeDuration}</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="1"
                  value={form.timeDuration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                />
              </div>
            </div>

            {/* Assigned Users */}
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.assignedUsers}</label>
              <div className={styles.userCheckboxList}>
                {users.length === 0 ? (
                  <span className={styles.emptyHint}>—</span>
                ) : (
                  users.map((u) => (
                    <label key={u._id} className={styles.userCheckboxItem}>
                      <input
                        type="checkbox"
                        checked={form.assignedUsers.includes(u._id)}
                        onChange={() => toggleUser(u._id)}
                      />
                      {u.firstName} {u.lastName}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Notes */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.notesInternal}</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={form.notesInternal}
                  onChange={(e) => set("notesInternal", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.notesCustomer}</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={form.notesCustomer}
                  onChange={(e) => set("notesCustomer", e.target.value)}
                />
              </div>
            </div>

            {/* Property Address */}
            <p className={styles.sectionDivider}>{l.addressSection}</p>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.street}</label>
                <input
                  className={styles.input}
                  value={form.street}
                  onChange={(e) => set("street", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.city}</label>
                <input
                  className={styles.input}
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.stateLabel}</label>
                <input
                  className={styles.input}
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.zipCode}</label>
                <input
                  className={styles.input}
                  value={form.zipCode}
                  onChange={(e) => set("zipCode", e.target.value)}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.country}</label>
              <input
                className={styles.input}
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </div>

            {/* Checklist */}
            <p className={styles.sectionDivider}>{l.checklistSection}</p>
            <div className={styles.langTabs}>
              <button
                type="button"
                className={`${styles.langTab} ${checklistTab === "en" ? styles.langTabActive : ""}`}
                onClick={() => setChecklistTab("en")}
              >
                EN
              </button>
              <button
                type="button"
                className={`${styles.langTab} ${checklistTab === "es" ? styles.langTabActive : ""}`}
                onClick={() => setChecklistTab("es")}
              >
                ES
              </button>
            </div>
            {form.checklist.map((item, idx) => (
              <div key={idx} className={styles.checklistRow}>
                <input
                  className={styles.input}
                  placeholder={
                    checklistTab === "en" ? l.checkItemEn : l.checkItemEs
                  }
                  value={checklistTab === "en" ? item.labelEn : item.labelEs}
                  onChange={(e) =>
                    updateChecklistItem(
                      idx,
                      checklistTab === "en" ? "labelEn" : "labelEs",
                      e.target.value,
                    )
                  }
                />
                <button
                  type="button"
                  className={styles.btnRemoveItem}
                  onClick={() => removeChecklistItem(idx)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.btnAddItem}
              onClick={addChecklistItem}
            >
              {l.addItem}
            </button>

            {error && <p className={styles.formError}>{error}</p>}

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={onClose}
                disabled={saving}
              >
                {l.cancel}
              </button>
              <button
                type="submit"
                className={styles.btnSave}
                disabled={saving}
              >
                {isEdit ? l.update : l.save}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const { lang } = useLang();
  const { hasPermission, hasRole } = useAuth();
  const isWorker = hasRole("worker", "cleaner");
  const l = t[lang];

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // API-level filters
  const [search, setSearch] = useState("");
  const [apiStatus, setApiStatus] = useState<JobStatus | "">("");

  // Column-level client filters
  const [colTitle, setColTitle] = useState("");
  const [colCustomer, setColCustomer] = useState("");
  const [colStatus, setColStatus] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const canCreate = hasPermission("jobs", "create");
  const canWrite = hasPermission("jobs", "update");
  const canDelete = hasPermission("jobs", "delete");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1" && canCreate) {
      setShowAddModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, canCreate]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobService.getAll({
        page,
        limit: PAGE_LIMIT,
        search: search.trim() || undefined,
        status: apiStatus || undefined,
      });
      setJobs(res.data);
      setTotal(res.pagination.total);
    } catch {
      setJobs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, apiStatus]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    setPage(1);
  }, [search, apiStatus]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this job?")) return;
    try {
      await jobService.remove(id);
      fetchJobs();
    } catch {
      alert("Error deleting job.");
    }
  };

  const displayed = jobs.filter((j) => {
    if (
      colTitle &&
      !(j.title ?? "").toLowerCase().includes(colTitle.toLowerCase())
    )
      return false;
    const customer = getCustomer(j);
    const customerName = customer
      ? `${customer.firstName} ${customer.lastName}`.toLowerCase()
      : "";
    if (colCustomer && !customerName.includes(colCustomer.toLowerCase()))
      return false;
    if (colStatus && j.status !== colStatus) return false;
    return true;
  });

  const pageRange = getPageRange(page, totalPages);

  const handleExportExcel = useCallback(async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Jobs");
    sheet.columns = [
      { header: l.colTitle, key: "title", width: 28 },
      { header: l.colCustomer, key: "customer", width: 25 },
      { header: l.colService, key: "service", width: 22 },
      { header: l.colScheduled, key: "scheduled", width: 22 },
      { header: l.colStatus, key: "status", width: 14 },
      { header: l.colAssigned, key: "assigned", width: 28 },
      { header: l.colPrice, key: "price", width: 10 },
    ];
    displayed.forEach((j) => {
      const customer = getCustomer(j);
      const service = getService(j);
      sheet.addRow({
        title: j.title ?? "—",
        customer: customer ? `${customer.firstName} ${customer.lastName}` : "—",
        service: service
          ? lang === "es"
            ? service.name.es
            : service.name.en
          : "—",
        scheduled: formatDateTime(j.scheduledStart, lang),
        status: l[`status_${j.status}` as keyof typeof l] as string,
        assigned: getAssignedNames(j),
        price: j.price != null ? `$${j.price}` : "—",
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
    a.download = "jobs.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }, [displayed, l, lang]);

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
          l.colTitle,
          l.colCustomer,
          l.colService,
          l.colScheduled,
          l.colStatus,
          l.colAssigned,
          l.colPrice,
        ],
      ],
      body: displayed.map((j) => {
        const customer = getCustomer(j);
        const service = getService(j);
        return [
          j.title ?? "—",
          customer ? `${customer.firstName} ${customer.lastName}` : "—",
          service ? (lang === "es" ? service.name.es : service.name.en) : "—",
          formatDateTime(j.scheduledStart, lang),
          l[`status_${j.status}` as keyof typeof l] as string,
          getAssignedNames(j),
          j.price != null ? `$${j.price}` : "—",
        ];
      }),
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 255] },
    });
    doc.save("jobs.pdf");
  }, [displayed, l, lang]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{l.title}</h2>
        {canCreate && (
          <button
            className={styles.addBtn}
            onClick={() => setShowAddModal(true)}
          >
            {l.addJob}
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
          value={apiStatus}
          onChange={(e) => setApiStatus(e.target.value as JobStatus | "")}
        >
          <option value="">{l.allStatuses}</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {l[`status_${s}` as keyof typeof l]}
            </option>
          ))}
        </select>
        <div className={styles.exportBtns}>
          <button className={styles.btnExcelExport} onClick={handleExportExcel}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L17 13.586V12a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            {l.exportExcel}
          </button>
          <button className={styles.btnPdfExport} onClick={handleExportPdf}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293-2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L17 13.586V12a1 1 0 011-1z"
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
              <th>{l.colTitle}</th>
              <th>{l.colCustomer}</th>
              <th>{l.colService}</th>
              <th>{l.colScheduled}</th>
              <th>{l.colStatus}</th>
              <th>{l.colAssigned}</th>
              {!isWorker && <th>{l.colPrice}</th>}
              <th>{l.colActions}</th>
            </tr>
            <tr className={styles.filterRow}>
              <th>
                <input
                  className={styles.colFilter}
                  placeholder={l.filterTitle}
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                />
              </th>
              <th>
                <input
                  className={styles.colFilter}
                  placeholder={l.filterCustomer}
                  value={colCustomer}
                  onChange={(e) => setColCustomer(e.target.value)}
                />
              </th>
              <th />
              <th />
              <th>
                <select
                  className={styles.colFilter}
                  value={colStatus}
                  onChange={(e) => setColStatus(e.target.value)}
                >
                  <option value="">{l.filterStatus}</option>
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {l[`status_${s}` as keyof typeof l]}
                    </option>
                  ))}
                </select>
              </th>
              <th />
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isWorker ? 7 : 8} className={styles.empty}>
                  {l.loading}
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={isWorker ? 7 : 8} className={styles.empty}>
                  {l.noResults}
                </td>
              </tr>
            ) : (
              displayed.map((j) => {
                const customer = getCustomer(j);
                const service = getService(j);
                return (
                  <tr key={j._id} className={styles.bodyRow}>
                    <td className={styles.titleCell}>{j.title ?? "—"}</td>
                    <td className={styles.customerCell}>
                      {customer
                        ? `${customer.firstName} ${customer.lastName}`
                        : "—"}
                    </td>
                    <td className={styles.serviceCell}>
                      {service
                        ? (service.name?.[lang] ?? service.name?.en ?? "—")
                        : "—"}
                    </td>
                    <td className={styles.dateCell}>
                      {formatDateTime(j.scheduledStart, lang)}
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${styles[`badge_${j.status}`]}`}
                      >
                        {l[`status_${j.status}` as keyof typeof l]}
                      </span>
                    </td>
                    <td className={styles.assignedCell}>
                      {getAssignedNames(j)}
                    </td>
                    {!isWorker && (
                      <td className={styles.priceCell}>
                        {j.price != null ? `$${j.price.toFixed(2)}` : "—"}
                      </td>
                    )}
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
                            title={l.btnUpdate}
                            onClick={() => setEditingJob(j)}
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.5 9.5A2 2 0 015.5 16.5H4a1 1 0 01-1-1v-1.5a2 2 0 01.586-1.414l9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className={styles.btnDelete}
                            onClick={() => handleDelete(j._id)}
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
                );
              })
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
              <span key={`ellipsis-${i}`} className={styles.ellipsis}>
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

      {showAddModal && canCreate && (
        <JobModal
          lang={lang}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            fetchJobs();
          }}
        />
      )}
      {editingJob && canWrite && (
        <JobModal
          job={editingJob}
          lang={lang}
          onClose={() => setEditingJob(null)}
          onSaved={() => {
            setEditingJob(null);
            fetchJobs();
          }}
        />
      )}
    </div>
  );
}
