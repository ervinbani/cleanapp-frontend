import { useEffect, useState, useCallback } from "react";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { customerService } from "../services/customerService";
import type { CustomerSource } from "../services/customerService";
import type { Customer, CustomerStatus } from "../types";
import styles from "./CustomersPage.module.css";

const PAGE_LIMIT = 20;

function countryFlag(code?: string): string {
  if (!code || code.length !== 2) return "";
  const offset = 0x1f1e6 - 65;
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + offset))
    .join("");
}

function getPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

const t = {
  en: {
    title: "Clients",
    addClient: "+ Add Client",
    searchPlaceholder: "Search clients...",
    colName: "Name",
    colEmail: "Email",
    colCountry: "Country",
    colStatus: "Status",
    colSource: "Source",
    colActions: "Actions",
    btnView: "View",
    btnUpdate: "Update",
    allStatuses: "All statuses",
    allSources: "All sources",
    filterName: "Filter name…",
    filterEmail: "Filter email…",
    filterCountry: "Filter country…",
    filterStatus: "Filter status…",
    filterSource: "Filter source…",
    prev: "← Prev",
    next: "Next →",
    noResults: "No clients found.",
    loading: "Loading…",
    page: "Page",
    of: "of",
  },
  es: {
    title: "Clientes",
    addClient: "+ Agregar Cliente",
    searchPlaceholder: "Buscar clientes...",
    colName: "Nombre",
    colEmail: "Correo",
    colCountry: "País",
    colStatus: "Estado",
    colSource: "Fuente",
    colActions: "Acciones",
    btnView: "Ver",
    btnUpdate: "Editar",
    allStatuses: "Todos los estados",
    allSources: "Todas las fuentes",
    filterName: "Filtrar nombre…",
    filterEmail: "Filtrar correo…",
    filterCountry: "Filtrar país…",
    filterStatus: "Filtrar estado…",
    filterSource: "Filtrar fuente…",
    prev: "← Prev",
    next: "Siguiente →",
    noResults: "No se encontraron clientes.",
    loading: "Cargando…",
    page: "Página",
    of: "de",
  },
};

export default function CustomersPage() {
  const { lang } = useLang();
  const { hasRole } = useAuth();
  const l = t[lang];

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // API-level filters
  const [search, setSearch] = useState("");
  const [apiStatus, setApiStatus] = useState<CustomerStatus | "">("");
  const [apiSource, setApiSource] = useState<CustomerSource | "">("");

  // Column-level client filters
  const [colName, setColName] = useState("");
  const [colEmail, setColEmail] = useState("");
  const [colCountry, setColCountry] = useState("");
  const [colStatus, setColStatus] = useState("");
  const [colSource, setColSource] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const canWrite = hasRole("owner", "manager", "staff");
  const canDelete = hasRole("owner", "manager");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerService.getAll({
        page,
        limit: PAGE_LIMIT,
        search: search.trim() || undefined,
        status: apiStatus || undefined,
        source: apiSource || undefined,
      });
      setCustomers(res.data);
      setTotal(res.pagination.total);
    } catch {
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, apiStatus, apiSource]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset to page 1 when API-level filters change
  useEffect(() => {
    setPage(1);
  }, [search, apiStatus, apiSource]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this client?")) return;
    try {
      await customerService.remove(id);
      fetchCustomers();
    } catch {
      alert("Error deleting client.");
    }
  };

  const displayed = customers.filter((c) => {
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    if (colName && !name.includes(colName.toLowerCase())) return false;
    if (
      colEmail &&
      !(c.email ?? "").toLowerCase().includes(colEmail.toLowerCase())
    )
      return false;
    if (
      colCountry &&
      !(c.address?.country ?? "")
        .toLowerCase()
        .includes(colCountry.toLowerCase())
    )
      return false;
    if (colStatus && c.status !== colStatus) return false;
    if (colSource && c.source !== colSource) return false;
    return true;
  });

  const pageRange = getPageRange(page, totalPages);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{l.title}</h2>
        {canWrite && <button className={styles.addBtn}>{l.addClient}</button>}
      </div>

      {/* Toolbar: global search + API filters */}
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
          onChange={(e) => setApiStatus(e.target.value as CustomerStatus | "")}
        >
          <option value="">{l.allStatuses}</option>
          <option value="lead">Lead</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          className={styles.filterSelect}
          value={apiSource}
          onChange={(e) => setApiSource(e.target.value as CustomerSource | "")}
        >
          <option value="">{l.allSources}</option>
          <option value="manual">Manual</option>
          <option value="website">Website</option>
          <option value="phone">Phone</option>
          <option value="referral">Referral</option>
          <option value="facebook">Facebook</option>
          <option value="google">Google</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            {/* Column labels */}
            <tr className={styles.headRow}>
              <th>
                {l.colName}
                <span className={styles.sortIcon}>⇅</span>
              </th>
              <th>{l.colEmail}</th>
              <th>{l.colCountry}</th>
              <th>{l.colStatus}</th>
              <th>{l.colSource}</th>
              <th>{l.colActions}</th>
            </tr>
            {/* Column filters */}
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
                  placeholder={l.filterCountry}
                  value={colCountry}
                  onChange={(e) => setColCountry(e.target.value)}
                />
              </th>
              <th>
                <select
                  className={styles.colFilter}
                  value={colStatus}
                  onChange={(e) => setColStatus(e.target.value)}
                >
                  <option value="">{l.filterStatus}</option>
                  <option value="lead">Lead</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </th>
              <th>
                <select
                  className={styles.colFilter}
                  value={colSource}
                  onChange={(e) => setColSource(e.target.value)}
                >
                  <option value="">{l.filterSource}</option>
                  <option value="manual">Manual</option>
                  <option value="website">Website</option>
                  <option value="phone">Phone</option>
                  <option value="referral">Referral</option>
                  <option value="facebook">Facebook</option>
                  <option value="google">Google</option>
                </select>
              </th>
              <th />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  {l.loading}
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  {l.noResults}
                </td>
              </tr>
            ) : (
              displayed.map((c) => (
                <tr key={c._id} className={styles.bodyRow}>
                  <td className={styles.nameCell}>
                    {c.firstName} {c.lastName}
                  </td>
                  <td className={styles.emailCell}>{c.email ?? "—"}</td>
                  <td>
                    {c.address?.country ? (
                      <span className={styles.countryCell}>
                        <span>{countryFlag(c.address.country)}</span>
                        <span>{c.address.country.toUpperCase()}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${styles[`badge_${c.status}`]}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <span className={styles.sourceCell}>{c.source}</span>
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
                          onClick={() => handleDelete(c._id)}
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
