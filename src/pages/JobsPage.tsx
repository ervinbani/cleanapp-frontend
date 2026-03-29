import { useEffect, useState, useCallback } from "react";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { jobService } from "../services/jobService";
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
  },
};

export default function JobsPage() {
  const { lang } = useLang();
  const { hasRole } = useAuth();
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

  const canWrite = hasRole("owner", "manager", "staff");
  const canDelete = hasRole("owner", "manager");

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

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{l.title}</h2>
        {canWrite && <button className={styles.addBtn}>{l.addJob}</button>}
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
              <th>{l.colPrice}</th>
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
                    <td className={styles.priceCell}>
                      {j.price != null ? `$${j.price.toFixed(2)}` : "—"}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.btnView}>
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 3C5 3 1.73 7.11 1.07 9.69a1 1 0 000 .62C1.73 12.89 5 17 10 17s8.27-4.11 8.93-6.69a1 1 0 000-.62C18.27 7.11 15 3 10 3zm0 11a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" />
                          </svg>
                          {l.btnView}
                        </button>
                        {canWrite && (
                          <button className={styles.btnUpdate}>
                            <svg viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.5 9.5A2 2 0 015.5 16.5H4a1 1 0 01-1-1v-1.5a2 2 0 01.586-1.414l9.5-9.5z" />
                            </svg>
                            {l.btnUpdate}
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
    </div>
  );
}
