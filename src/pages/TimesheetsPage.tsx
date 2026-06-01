import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { useTrans } from "../i18n";
import { jobService } from "../services/jobService";
import apiClient from "../services/apiClient";
import type { Job, TimeEntry, User } from "../types";
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

function calcMinutes(entry: TimeEntry): number {
  if (entry.duration != null) return entry.duration;
  if (!entry.clockOut) return 0;
  return Math.round(
    (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) /
      60000,
  );
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function getUserId(u: User): string {
  return u.id ?? (u as unknown as { _id?: string })._id ?? "";
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TimesheetRow {
  jobId: string;
  jobTitle: string;
  clockIn: string;
  clockOut: string | null;
  minutes: number;
  isOpen: boolean;
}

interface UsersResponse {
  success: boolean;
  data: User[];
}

type DateMode = "week" | "month" | "custom";

// ─── Component ────────────────────────────────────────────────────────────────
export default function TimesheetsPage() {
  const { user: me, hasRole } = useAuth();
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

  // ── User selection ────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    if (!isManager) {
      if (me) setSelectedUserId(getUserId(me));
      return;
    }
    apiClient
      .get<UsersResponse>("/users", { params: { limit: 200 } })
      .then((res) => setUsers(res.data?.data ?? []))
      .catch(() => {});
  }, [isManager, me]);

  // ── Jobs fetch ────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    jobService
      .getAll({
        assignedUserId: selectedUserId || undefined,
        dateFrom,
        dateTo,
        limit: 500,
      })
      .then((res) => setJobs(res.data ?? []))
      .catch(() => setError(t.errorLoad))
      .finally(() => setLoading(false));
  }, [selectedUserId, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Flatten timeEntries ───────────────────────────────────────────────────
  const rows = useMemo<TimesheetRow[]>(() => {
    const result: TimesheetRow[] = [];
    for (const job of jobs) {
      for (const entry of job.timeEntries ?? []) {
        // When manager has selected a specific user, also filter at entry level
        if (selectedUserId) {
          const entryUserId =
            typeof entry.userId === "object"
              ? getUserId(entry.userId as User)
              : entry.userId;
          if (entryUserId !== selectedUserId) continue;
        }
        const title =
          job.title ||
          (typeof job.serviceId === "object" && job.serviceId
            ? (
                job.serviceId as {
                  name?: { en?: string; it?: string; es?: string };
                }
              ).name?.[lang] ??
              (
                job.serviceId as {
                  name?: { en?: string };
                }
              ).name?.en ??
              "—"
            : "—");

        result.push({
          jobId: job._id,
          jobTitle: title,
          clockIn: entry.clockIn,
          clockOut: entry.clockOut ?? null,
          minutes: calcMinutes(entry),
          isOpen: !entry.clockOut,
        });
      }
    }
    result.sort(
      (a, b) =>
        new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime(),
    );
    return result;
  }, [jobs, selectedUserId, lang]);

  const totalMinutes = useMemo(
    () => rows.filter((r) => !r.isOpen).reduce((acc, r) => acc + r.minutes, 0),
    [rows],
  );

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

        {/* User picker — managers only */}
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
                  <td colSpan={7} className={styles.empty}>
                    {t.noResults}
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={`${row.jobId}-${row.clockIn}-${i}`}
                    className={styles.bodyRow}
                  >
                    <td className={styles.jobCell}>{row.jobTitle}</td>
                    <td className={styles.dateCell}>
                      {formatDate(row.clockIn, locale)}
                    </td>
                    <td className={styles.timeCell}>
                      {formatTime(row.clockIn, locale)}
                    </td>
                    <td className={styles.timeCell}>
                      {row.clockOut
                        ? formatTime(row.clockOut, locale)
                        : "—"}
                    </td>
                    <td className={styles.hoursCell}>
                      {row.isOpen ? "—" : minutesToHHMM(row.minutes)}
                    </td>
                    <td>
                      <span
                        className={
                          row.isOpen ? styles.badgeOpen : styles.badgeClosed
                        }
                      >
                        {row.isOpen ? t.statusOpen : t.statusClosed}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.btnView}
                        onClick={() => navigate(`/jobs/${row.jobId}`)}
                      >
                        {t.viewJob}
                      </button>
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
    </div>
  );
}
