import { useEffect, useState, useCallback } from "react";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import type { User, UserRole } from "../types";
import styles from "./UsersPage.module.css";

const PAGE_LIMIT = 20;

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

const ROLES: UserRole[] = ["owner", "manager", "staff", "cleaner"];

const t = {
  en: {
    title: "Users",
    addUser: "+ Add User",
    searchPlaceholder: "Search users...",
    colName: "Name",
    colEmail: "Email",
    colPhone: "Phone",
    colRole: "Role",
    colStatus: "Status",
    colLastLogin: "Last Login",
    colActions: "Actions",
    btnView: "View",
    btnUpdate: "Update",
    filterName: "Filter name…",
    filterEmail: "Filter email…",
    filterPhone: "Filter phone…",
    filterRole: "Filter role…",
    filterStatus: "Filter status…",
    allRoles: "All roles",
    allStatuses: "All statuses",
    active: "Active",
    inactive: "Inactive",
    never: "Never",
    prev: "← Prev",
    next: "Next →",
    noResults: "No users found.",
    loading: "Loading…",
    page: "Page",
    of: "of",
  },
  es: {
    title: "Usuarios",
    addUser: "+ Agregar Usuario",
    searchPlaceholder: "Buscar usuarios...",
    colName: "Nombre",
    colEmail: "Correo",
    colPhone: "Teléfono",
    colRole: "Rol",
    colStatus: "Estado",
    colLastLogin: "Último Acceso",
    colActions: "Acciones",
    btnView: "Ver",
    btnUpdate: "Editar",
    filterName: "Filtrar nombre…",
    filterEmail: "Filtrar correo…",
    filterPhone: "Filtrar teléfono…",
    filterRole: "Filtrar rol…",
    filterStatus: "Filtrar estado…",
    allRoles: "Todos los roles",
    allStatuses: "Todos los estados",
    active: "Activo",
    inactive: "Inactivo",
    never: "Nunca",
    prev: "← Prev",
    next: "Siguiente →",
    noResults: "No se encontraron usuarios.",
    loading: "Cargando…",
    page: "Página",
    of: "de",
  },
};

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
  const l = t[lang];

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const canWrite = hasRole("owner", "manager");

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
    return true;
  });

  const pageRange = getPageRange(page, totalPages);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{l.title}</h2>
        {canWrite && <button className={styles.addBtn}>{l.addUser}</button>}
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
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  {l.loading}
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  {l.noResults}
                </td>
              </tr>
            ) : (
              displayed.map((u) => (
                <tr key={u.id} className={styles.bodyRow}>
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
                  <td className={styles.dateCell}>
                    {formatLastLogin(u.lastLoginAt, l.never)}
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
                      {hasRole("owner") && (
                        <button
                          className={styles.btnDelete}
                          onClick={() => handleDelete(u.id)}
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
