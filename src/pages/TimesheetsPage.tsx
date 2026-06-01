import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { useTrans } from "../i18n";
import { timesheetService } from "../services/timesheetService";
import type { TimesheetPatchPayload } from "../services/timesheetService";
import apiClient from "../services/apiClient";
import type { TimesheetEntry, User } from "../types";
import styles from "./TimesheetsPage.module.css";

// ─── Date helpers (same pattern as JobsPage) ──────────────────────────────────
function getWeekRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMon,
  );
  const sun = new Date(
    mon.getFullYear(),
    mon.getMonth(),
    mon.getDate() + 6,
    23,
    59,
    59,
    999,
  );
  return { dateFrom: mon.toISOString(), dateTo: sun.toISOString() };
}

function getMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** Convert ISO string to datetime-local input value (YYYY-MM-DDTHH:MM) */
function isoToLocal(iso: string): string {
  return iso.slice(0, 16);
}

/** Convert datetime-local value to ISO string */
function localToIso(val: string): string {
  return new Date(val).toISOString();
}

function getUserId(u: User): string {
  return u.id ?? (u as unknown as { _id?: string })._id ?? "";
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface UsersResponse {
  success: boolean;
  data: User[];
}

type DateMode = "week" | "month" | "custom";

// ─── Component ────────────────────────────────────────────────────────────────
export default function TimesheetsPage() {
  const { hasRole } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const t = useTrans("timesheets");

  const locale =
    lang === "es"
      ? "es-ES"
      : lang === "it"
        ? "it-IT"
        : lang === "sq"
          ? "sq-AL"
          : "en-US";

  const isManager = hasRole(
    "owner",
    "director",
    "manager_operations",
    "manager_hr",
  );
  const canEdit = hasRole(
    "owner",
    "director",
    "manager_operations",
    "manager_hr",
  );
  const canDelete = hasRole("owner", "director", "manager_operations");

  // ── Date range ────────────────────────────────────────────────────────────
  const [dateMode, setDateMode] = useState<DateMode>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { dateFrom, dateTo } = useMemo<{
    dateFrom: string;
    dateTo: string;
  }>(() => {
    if (dateMode === "week") return getWeekRange();
    if (dateMode === "month") return getMonthRange();
    if (customFrom && customTo) {
      return {
        dateFrom: new Date(customFrom).toISOString(),
        dateTo: new Date(`${customTo}T23:59:59`).toISOString(),
      };
    }
    return getWeekRange();
  }, [dateMode, customFrom, customTo]);

  // ── User selection (managers only) ────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    if (!isManager) return;
    apiClient
      .get<UsersResponse>("/users", { params: { limit: 200 } })
      .then((res) => setUsers(res.data?.data ?? []))
      .catch(() => {});
  }, [isManager]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timesheets fetch ──────────────────────────────────────────────────────
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    timesheetService
      .getAll({
        userId: selectedUserId || undefined,
        dateFrom,
        dateTo,
      })
      .then(setEntries)
      .catch(() => setError(t.errorLoad))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [selectedUserId, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sorted rows ───────────────────────────────────────────────────────────
  const rows = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime(),
      ),
    [entries],
  );

  const totalMinutes = useMemo(
    () =>
      rows
        .filter((r) => r.clockOut != null && r.duration != null)
        .reduce((acc, r) => acc + (r.duration ?? 0), 0),
    [rows],
  );

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const openEdit = (entry: TimesheetEntry) => {
    setEditingEntry(entry);
    setEditClockIn(isoToLocal(entry.clockIn));
    setEditClockOut(entry.clockOut ? isoToLocal(entry.clockOut) : "");
    setEditSaving(false);
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editingEntry) return;
    setEditSaving(true);
    setEditError("");
    try {
      const payload: TimesheetPatchPayload = {
        clockIn: localToIso(editClockIn),
      };
      if (editClockOut) payload.clockOut = localToIso(editClockOut);
      await timesheetService.update(
        editingEntry.jobId,
        editingEntry.entryId,
        payload,
      );
      setEditingEntry(null);
      load();
    } catch {
      setEditError(t.errorEdit);
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async (entry: TimesheetEntry) => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await timesheetService.remove(entry.jobId, entry.entryId);
      setDeletingId(null);
      load();
    } catch {
      setDeleteError(t.errorDelete);
      setDeleteLoading(false);
    }
  };

  const colCount = isManager ? 8 : 7;

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <h1 className={styles.title}>{t.title}</h1>
      </div>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.dateFilterWrap}>
          {(["week", "month", "custom"] as DateMode[]).map((mode) => (
            <button
              key={mode}
              className={`${styles.dateModeBtn} ${dateMode === mode ? styles.dateModeActive : ""}`}
              onClick={() => setDateMode(mode)}
            >
              {mode === "week"
                ? t.thisWeek
                : mode === "month"
                  ? t.thisMonth
                  : t.customRange}
            </button>
          ))}
          {dateMode === "custom" && (
            <>
              <input
                type="date"
                className={styles.dateInput}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className={styles.dateSeparator}>→</span>
              <input
                type="date"
                className={styles.dateInput}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </>
          )}
        </div>

        {isManager && (
          <select
            className={styles.filterSelect}
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">{t.allUsers}</option>
            {users.map((u) => (
              <option key={getUserId(u)} value={getUserId(u)}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        {loading ? (
          <p className={styles.empty}>{t.loading}</p>
        ) : error ? (
          <p className={styles.empty}>{error}</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr className={styles.headRow}>
                <th>{t.colJob}</th>
                {isManager && <th>{t.colUser}</th>}
                <th>{t.colDate}</th>
                <th>{t.colClockedIn}</th>
                <th>{t.colClockedOut}</th>
                <th>{t.colHours}</th>
                <th>{t.colStatus}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className={styles.empty}>
                    {t.noResults}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.entryId} className={styles.bodyRow}>
                    <td className={styles.jobCell}>{row.jobTitle}</td>
                    {isManager && (
                      <td className={styles.userCell}>{row.userName}</td>
                    )}
                    <td className={styles.dateCell}>
                      {formatDate(row.clockIn, locale)}
                    </td>
                    <td className={styles.timeCell}>
                      {formatTime(row.clockIn, locale)}
                    </td>
                    <td className={styles.timeCell}>
                      {row.clockOut ? formatTime(row.clockOut, locale) : "—"}
                    </td>
                    <td className={styles.hoursCell}>
                      {row.clockOut && row.duration != null
                        ? minutesToHHMM(row.duration)
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={
                          row.clockOut ? styles.badgeClosed : styles.badgeOpen
                        }
                      >
                        {row.clockOut ? t.statusClosed : t.statusOpen}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          className={styles.btnView}
                          onClick={() => navigate(`/jobs/${row.jobId}`)}
                        >
                          {t.viewJob}
                        </button>
                        {canEdit && (
                          <button
                            className={styles.btnEdit}
                            onClick={() => openEdit(row)}
                          >
                            {t.edit}
                          </button>
                        )}
                        {canDelete &&
                          (deletingId === row.entryId ? (
                            <span className={styles.deleteConfirmWrap}>
                              <span className={styles.deleteConfirmText}>
                                {t.deleteConfirm}
                              </span>
                              <button
                                className={styles.btnConfirmYes}
                                disabled={deleteLoading}
                                onClick={() => handleDelete(row)}
                              >
                                {t.confirmYes}
                              </button>
                              <button
                                className={styles.btnConfirmNo}
                                onClick={() => {
                                  setDeletingId(null);
                                  setDeleteError("");
                                }}
                              >
                                {t.confirmNo}
                              </button>
                            </span>
                          ) : (
                            <button
                              className={styles.btnDelete}
                              onClick={() => {
                                setDeletingId(row.entryId);
                                setDeleteError("");
                              }}
                            >
                              {t.delete}
                            </button>
                          ))}
                        {deleteError && deletingId === null && (
                          <span className={styles.inlineError}>
                            {deleteError}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Summary footer ── */}
      {!loading && rows.length > 0 && (
        <div className={styles.summaryBar}>
          <span className={styles.summaryLabel}>{t.totalHours}</span>
          <span className={styles.summaryValue}>
            {minutesToHHMM(totalMinutes)}
          </span>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editingEntry && (
        <div
          className={styles.modalOverlay}
          onClick={() => setEditingEntry(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{t.editTitle}</h3>
              <button
                className={styles.modalClose}
                onClick={() => setEditingEntry(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t.editClockIn}</label>
                <input
                  type="datetime-local"
                  className={styles.formInput}
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>{t.editClockOut}</label>
                <input
                  type="datetime-local"
                  className={styles.formInput}
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                />
              </div>
              {editError && <p className={styles.modalError}>{editError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnModalCancel}
                onClick={() => setEditingEntry(null)}
              >
                {t.confirmNo}
              </button>
              <button
                className={styles.btnModalSave}
                disabled={editSaving || !editClockIn}
                onClick={handleEditSave}
              >
                {editSaving ? t.saving : t.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
