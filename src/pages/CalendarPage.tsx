import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jobService } from "../services/jobService";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { useTrans } from "../i18n";
import type { Job } from "../types";
// Reuse the dashboard calendar styles
import styles from "./DashboardPage.module.css";

const WEEKDAYS_EN = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS_ES = ["D", "L", "M", "X", "J", "V", "S"];

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6",
  confirmed: "#8b5cf6",
  in_progress: "#f59e0b",
  completed: "#10b981",
  canceled: "#ef4444",
  no_show: "#6b7280",
};

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function CalendarPage() {
  const { lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const labels = useTrans("dashboard");

  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [myJobsMode, setMyJobsMode] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  useEffect(() => {
    jobService
      .getAll({ page: 1, limit: 200 })
      .then((res) => setAllJobs(res.data))
      .catch(() => setAllJobs([]));
  }, []);

  const displayedJobs = useMemo(() => {
    if (!myJobsMode) return allJobs;
    const uid = user?.id ?? user?._id ?? "";
    return allJobs.filter((job) =>
      job.assignedUsers.some((u) =>
        typeof u === "string" ? u === uid : (u._id ?? u.id) === uid,
      ),
    );
  }, [allJobs, myJobsMode, user]);

  const jobsByDay = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const map: Record<number, Job[]> = {};
    displayedJobs.forEach((job) => {
      const d = new Date(job.scheduledStart);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(job);
      }
    });
    Object.values(map).forEach((arr) =>
      arr.sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime(),
      ),
    );
    return map;
  }, [displayedJobs, calendarDate]);

  const calendarCells = useMemo(
    () => buildCalendarGrid(calendarDate.getFullYear(), calendarDate.getMonth()),
    [calendarDate],
  );

  // Upcoming events: jobs in the selected month, sorted by date, future-first
  const upcomingJobs = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const now = new Date();
    return displayedJobs
      .filter((job) => {
        const d = new Date(job.scheduledStart);
        return (
          d.getFullYear() === year &&
          d.getMonth() === month &&
          job.status !== "canceled" &&
          job.status !== "no_show"
        );
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime(),
      )
      .sort((a, b) => {
        // Push past jobs to the bottom
        const aFuture = new Date(a.scheduledStart) >= now ? 0 : 1;
        const bFuture = new Date(b.scheduledStart) >= now ? 0 : 1;
        return aFuture - bFuture;
      });
  }, [displayedJobs, calendarDate]);

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === calendarDate.getFullYear() &&
    today.getMonth() === calendarDate.getMonth();

  const prevMonth = () =>
    setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const monthNames = lang === "es" ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  const weekdays = lang === "es" ? WEEKDAYS_ES : WEEKDAYS_EN;

  const formatJobTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(lang === "es" ? "es-ES" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: lang === "en",
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.bottomRow}>
        {/* Calendar */}
        <div className={styles.calendarCard}>
          {/* Header */}
          <div className={styles.calendarHeader}>
            <div className={styles.calendarTitle}>
              <span className={styles.calendarIcon}>📅</span>
              <span>{labels.calendar}</span>
            </div>
            <div className={styles.calendarFilters}>
              <button
                className={`${styles.filterBtn} ${!myJobsMode ? styles.filterBtnActive : ""}`}
                onClick={() => setMyJobsMode(false)}
              >
                {labels.allJobs}
              </button>
              <button
                className={`${styles.filterBtn} ${myJobsMode ? styles.filterBtnActive : ""}`}
                onClick={() => setMyJobsMode(true)}
              >
                {labels.myJobs}
              </button>
            </div>
          </div>

          {/* Month navigation */}
          <div className={styles.calendarNav}>
            <button className={styles.navBtn} onClick={prevMonth} aria-label="Previous month">
              ‹
            </button>
            <span className={styles.calendarMonthLabel}>
              {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
            </span>
            <button className={styles.navBtn} onClick={nextMonth} aria-label="Next month">
              ›
            </button>
          </div>

          {/* Grid */}
          <div className={styles.calendarGrid}>
            {weekdays.map((d, i) => (
              <div key={i} className={styles.weekdayLabel}>{d}</div>
            ))}
            {calendarCells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const isToday = isCurrentMonth && day === today.getDate();
              const dayJobs = jobsByDay[day] ?? [];
              const isHovered = hoveredDay === day;
              return (
                <div
                  key={day}
                  className={`${styles.calendarDay} ${isToday ? styles.today : ""} ${dayJobs.length > 0 ? styles.hasJobs : ""}`}
                  onMouseEnter={() => dayJobs.length > 0 && setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <span className={styles.dayNumber}>{day}</span>
                  {dayJobs.slice(0, 3).map((job) => (
                    <div
                      key={job._id}
                      className={styles.jobPill}
                      style={{ backgroundColor: STATUS_COLORS[job.status] ?? "#3b82f6" }}
                      onClick={() => navigate(`/jobs/${job._id}`)}
                      title={`${formatJobTime(job.scheduledStart)} ${job.title ?? ""}`}
                    >
                      <span className={styles.jobPillDot} />
                      <span className={styles.jobPillText}>
                        {formatJobTime(job.scheduledStart)} {job.title ?? job.status}
                      </span>
                    </div>
                  ))}
                  {dayJobs.length > 3 && (
                    <span className={styles.moreJobs}>+{dayJobs.length - 3}</span>
                  )}
                  {isHovered && dayJobs.length > 0 && (
                    <div className={styles.dayTooltip}>
                      {dayJobs.map((job) => (
                        <div
                          key={job._id}
                          className={styles.tooltipRow}
                          onClick={() => navigate(`/jobs/${job._id}`)}
                        >
                          <span
                            className={styles.tooltipDot}
                            style={{ backgroundColor: STATUS_COLORS[job.status] ?? "#3b82f6" }}
                          />
                          <span>
                            {formatJobTime(job.scheduledStart)} {job.title ?? job.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {Object.keys(jobsByDay).length === 0 && (
            <p className={styles.noJobs}>{labels.noJobs}</p>
          )}
        </div>

        {/* Upcoming Events panel */}
        <div className={styles.activityCard}>
          <h3 className={styles.activityTitle}>
            {lang === "it" ? "Prossimi eventi" : lang === "es" ? "Próximos eventos" : "Upcoming Events"}
            {upcomingJobs.length > 0 && (
              <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)" }}>
                ({upcomingJobs.length})
              </span>
            )}
          </h3>

          {upcomingJobs.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {lang === "it" ? "Nessun evento questo mese." : lang === "es" ? "Sin eventos este mes." : "No events this month."}
            </p>
          ) : (
            <ul className={styles.activityList}>
              {upcomingJobs.map((job) => {
                const start = new Date(job.scheduledStart);
                const isPast = start < today;
                const color = STATUS_COLORS[job.status] ?? "#3b82f6";
                const dateLabel = start.toLocaleDateString(
                  lang === "es" ? "es-ES" : lang === "it" ? "it-IT" : "en-US",
                  { weekday: "short", month: "short", day: "numeric" },
                );
                const timeLabel = formatJobTime(job.scheduledStart);
                const customerName = (() => {
                  const c = job.customerId;
                  if (typeof c === "object" && c !== null) {
                    return `${(c as { firstName?: string }).firstName ?? ""} ${(c as { lastName?: string }).lastName ?? ""}`.trim();
                  }
                  return null;
                })();

                return (
                  <li
                    key={job._id}
                    className={styles.activityItem}
                    style={{ opacity: isPast ? 0.55 : 1, cursor: "pointer" }}
                    onClick={() => navigate(`/jobs/${job._id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && navigate(`/jobs/${job._id}`)}
                  >
                    <span
                      className={styles.activityIcon}
                      style={{ background: `${color}18`, color }}
                    >
                      {job.status === "completed" ? "✅" : job.status === "in_progress" ? "🔄" : "📅"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {job.title ?? job.status.replace("_", " ")}
                      </div>
                      <div style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                        {dateLabel} · {timeLabel}
                        {customerName && ` · ${customerName}`}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: 20,
                        background: `${color}18`,
                        color,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {job.status.replace("_", " ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
