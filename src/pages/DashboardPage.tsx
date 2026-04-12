import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./DashboardPage.module.css";
import { customerService } from "../services/customerService";
import { jobService } from "../services/jobService";
import { invoiceService } from "../services/invoiceService";
import apiClient from "../services/apiClient";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { useTrans } from "../i18n";
import type { Customer, Invoice, Job } from "../types";

const WEEKDAYS_EN = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS_ES = ["D", "L", "M", "X", "J", "V", "S"];

const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_NAMES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6",
  confirmed: "#8b5cf6",
  in_progress: "#f59e0b",
  completed: "#10b981",
  canceled: "#ef4444",
  no_show: "#6b7280",
};



interface ActivityItem {
  id: string;
  icon: string;
  color: string;
  text: string;
  time: Date;
  onClick?: () => void;
}

function timeAgo(date: Date, lang: "en" | "es"): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return lang === "en" ? "just now" : "ahora mismo";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return lang === "en" ? `${m}m ago` : `hace ${m}m`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return lang === "en" ? `${h}h ago` : `hace ${h}h`;
  }
  const d = Math.floor(diff / 86400);
  return lang === "en" ? `${d}d ago` : `hace ${d}d`;
}

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function DashboardPage() {
  const { lang } = useLang();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [totalClients, setTotalClients] = useState<number | null>(null);
  const [totalJobs, setTotalJobs] = useState<number | null>(null);
  const [totalServices, setTotalServices] = useState<number | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [myJobsMode, setMyJobsMode] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  useEffect(() => {
    customerService
      .getAll({ page: 1, limit: 1 })
      .then((res) => setTotalClients(res.pagination.total))
      .catch(() => setTotalClients(0));

    jobService
      .getAll({ page: 1, limit: 1 })
      .then((res) => setTotalJobs(res.pagination.total))
      .catch(() => setTotalJobs(0));

    apiClient
      .get<{ pagination: { total: number } }>("/services", {
        params: { page: 1, limit: 1 },
      })
      .then((res) => setTotalServices(res.data.pagination.total))
      .catch(() => setTotalServices(0));

    jobService
      .getAll({ page: 1, limit: 200 })
      .then((res) => setAllJobs(res.data))
      .catch(() => setAllJobs([]));

    invoiceService
      .getAll({ page: 1, limit: 8 })
      .then((res) => setRecentInvoices(res.data))
      .catch(() => setRecentInvoices([]));

    customerService
      .getAll({ page: 1, limit: 5 })
      .then((res) => setRecentCustomers(res.data))
      .catch(() => setRecentCustomers([]));
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
    // Sort each day by scheduledStart descending (most recent first)
    Object.values(map).forEach((arr) =>
      arr.sort(
        (a, b) =>
          new Date(b.scheduledStart).getTime() -
          new Date(a.scheduledStart).getTime(),
      ),
    );
    return map;
  }, [displayedJobs, calendarDate]);

  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    // Jobs → show last 5 by updatedAt
    const sortedJobs = [...allJobs]
      .sort((a, b) => new Date(b.updatedAt ?? b.scheduledStart).getTime() - new Date(a.updatedAt ?? a.scheduledStart).getTime())
      .slice(0, 5);

    sortedJobs.forEach((job) => {
      const icon = job.status === "completed" ? "✅" : job.status === "in_progress" ? "🔄" : job.status === "canceled" ? "❌" : "📅";
      const color = STATUS_COLORS[job.status] ?? "#3b82f6";
      items.push({
        id: `job-${job._id}`,
        icon,
        color,
        text: `Job "${job.title ?? job.status}" — ${job.status.replace("_", " ")}`,
        time: new Date(job.updatedAt ?? job.scheduledStart),
        onClick: () => navigate("/jobs"),
      });
    });

    // Invoices
    recentInvoices.forEach((inv) => {
      const isPaid = inv.status === "paid";
      items.push({
        id: `inv-${inv._id}`,
        icon: isPaid ? "💰" : "📄",
        color: isPaid ? "#10b981" : "#6b7280",
        text: `Invoice #${inv.invoiceNumber} — ${inv.status}`,
        time: new Date(inv.paidAt ?? inv.issuedDate ?? inv._id),
        onClick: () => navigate("/invoices"),
      });
    });

    // Customers
    recentCustomers.forEach((c) => {
      items.push({
        id: `cus-${c._id}`,
        icon: "👤",
        color: "#8b5cf6",
        text: `New client: ${c.firstName} ${c.lastName}`,
        time: new Date(c.createdAt),
        onClick: () => navigate("/customers"),
      });
    });

    return items
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 8);
  }, [allJobs, recentInvoices, recentCustomers, navigate]);

  const calendarCells = useMemo(
    () =>
      buildCalendarGrid(calendarDate.getFullYear(), calendarDate.getMonth()),
    [calendarDate],
  );

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === calendarDate.getFullYear() &&
    today.getMonth() === calendarDate.getMonth();

  const prevMonth = () =>
    setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const labels = useTrans("dashboard");
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

  const canCreateJob = hasPermission("jobs", "create");
  const canCreateClient = hasPermission("users", "create");
  const canCreateInvoice = hasPermission("invoices", "create");

  return (
    <div className={styles.page}>
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>{labels.heading}</h2>
        <div className={styles.quickActions}>
          {canCreateJob && (
            <button
              className={styles.qaBtn}
              onClick={() => navigate("/jobs?new=1")}
            >
              {labels.newJob}
            </button>
          )}
          {canCreateClient && (
            <button
              className={styles.qaBtn}
              onClick={() => navigate("/customers?new=1")}
            >
              {labels.newClient}
            </button>
          )}
          {canCreateInvoice && (
            <button
              className={`${styles.qaBtn} ${styles.qaBtnPrimary}`}
              onClick={() => navigate("/invoices?new=1")}
            >
              {labels.newInvoice}
            </button>
          )}
        </div>
      </div>

      <div className={styles.statsRow}>
        <div
          className={styles.statCard}
          onClick={() => navigate("/customers")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/customers")}
        >
          <span className={styles.statLabel}>{labels.totalClients}</span>
          <span className={styles.statValue}>
            {totalClients === null ? "—" : totalClients}
          </span>
        </div>
        <div
          className={styles.statCard}
          onClick={() => navigate("/jobs")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/jobs")}
        >
          <span className={styles.statLabel}>{labels.totalJobs}</span>
          <span className={styles.statValue}>
            {totalJobs === null ? "—" : totalJobs}
          </span>
        </div>
        <div
          className={styles.statCard}
          onClick={() => navigate("/services")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/services")}
        >
          <span className={styles.statLabel}>{labels.totalServices}</span>
          <span className={styles.statValue}>
            {totalServices === null ? "—" : totalServices}
          </span>
        </div>
      </div>

      {/* Calendar + Activity row */}
      <div className={styles.bottomRow}>
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
          <button
            className={styles.navBtn}
            onClick={prevMonth}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className={styles.calendarMonthLabel}>
            {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
          </span>
          <button
            className={styles.navBtn}
            onClick={nextMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {/* Grid */}
        <div className={styles.calendarGrid}>
          {weekdays.map((d, i) => (
            <div key={i} className={styles.weekdayLabel}>
              {d}
            </div>
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
                {dayJobs.slice(0, 2).map((job) => (
                  <div
                    key={job._id}
                    className={styles.jobPill}
                    style={{
                      backgroundColor: STATUS_COLORS[job.status] ?? "#3b82f6",
                    }}
                    onClick={() => navigate("/jobs")}
                    title={`${formatJobTime(job.scheduledStart)} ${job.title ?? ""}`}
                  >
                    <span className={styles.jobPillDot} />
                    <span className={styles.jobPillText}>
                      {formatJobTime(job.scheduledStart)}{" "}
                      {job.title ?? job.status}
                    </span>
                  </div>
                ))}
                {dayJobs.length > 2 && (
                  <span className={styles.moreJobs}>+{dayJobs.length - 2}</span>
                )}
                {/* Tooltip on hover */}
                {isHovered && dayJobs.length > 0 && (
                  <div className={styles.dayTooltip}>
                    {dayJobs.map((job) => (
                      <div
                        key={job._id}
                        className={styles.tooltipRow}
                        onClick={() => navigate("/jobs")}
                      >
                        <span
                          className={styles.tooltipDot}
                          style={{
                            backgroundColor:
                              STATUS_COLORS[job.status] ?? "#3b82f6",
                          }}
                        />
                        <span>
                          {formatJobTime(job.scheduledStart)}{" "}
                          {job.title ?? job.status}
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

      {/* Recent Activity */}
      <div className={styles.activityCard}>
        <h3 className={styles.activityTitle}>{labels.recentActivity}</h3>
        {activityItems.length === 0 ? (
          <p className={styles.noActivity}>{labels.noActivity}</p>
        ) : (
          <ul className={styles.activityList}>
            {activityItems.map((item) => (
              <li
                key={item.id}
                className={styles.activityItem}
                onClick={item.onClick}
                role={item.onClick ? "button" : undefined}
                tabIndex={item.onClick ? 0 : undefined}
                onKeyDown={(e) => e.key === "Enter" && item.onClick?.()}
              >
                <span
                  className={styles.activityIcon}
                  style={{ background: `${item.color}18`, color: item.color }}
                >
                  {item.icon}
                </span>
                <span className={styles.activityText}>{item.text}</span>
                <span className={styles.activityTime}>
                  {timeAgo(item.time, lang)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      </div>{/* end bottomRow */}
    </div>
  );
}
