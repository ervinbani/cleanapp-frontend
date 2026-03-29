import { useEffect, useState } from "react";
import styles from "./DashboardPage.module.css";
import { customerService } from "../services/customerService";
import { jobService } from "../services/jobService";
import { useLang } from "../contexts/LangContext";

const t = {
  en: {
    heading: "Dashboard",
    totalClients: "Total Clients",
    totalJobs: "Total Jobs",
  },
  es: {
    heading: "Inicio",
    totalClients: "Clientes",
    totalJobs: "Trabajos",
  },
};

export default function DashboardPage() {
  const { lang } = useLang();
  const [totalClients, setTotalClients] = useState<number | null>(null);
  const [totalJobs, setTotalJobs] = useState<number | null>(null);

  useEffect(() => {
    customerService
      .getAll({ page: 1, limit: 1 })
      .then((res) => setTotalClients(res.pagination.total))
      .catch(() => setTotalClients(0));

    jobService
      .getAll({ page: 1, limit: 1 })
      .then((res) => setTotalJobs(res.pagination.total))
      .catch(() => setTotalJobs(0));
  }, []);

  const labels = t[lang];

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>{labels.heading}</h2>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{labels.totalClients}</span>
          <span className={styles.statValue}>
            {totalClients === null ? "—" : totalClients}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{labels.totalJobs}</span>
          <span className={styles.statValue}>
            {totalJobs === null ? "—" : totalJobs}
          </span>
        </div>
      </div>
    </div>
  );
}
