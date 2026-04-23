import type { ReactNode } from "react";
import styles from "./AuthLayout.module.css";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.wrapper}>
      {/* Left — brand panel */}
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <div className={styles.loginLogo}>
            <div className={styles.loginLogoIcon}>🧹</div>
            <span className={styles.loginLogoText}>Brillo</span>
          </div>
          <h1 className={styles.headline}>
            Clean spaces.<br />
            <span className={styles.headlineAccent}>Simple</span> management.
          </h1>
          <p className={styles.loginSub}>
            The all-in-one platform for cleaning businesses to manage jobs,
            customers, and invoices — beautifully.
          </p>
          <div className={styles.featureList}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📋</div>
              Smart job scheduling &amp; dispatch
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>💰</div>
              Auto-invoicing &amp; payment tracking
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📍</div>
              Real-time team location &amp; status
            </div>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>📊</div>
              Revenue analytics &amp; insights
            </div>
          </div>
        </div>
      </div>

      {/* Right — form panel */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>{children}</div>
      </div>
    </div>
  );
}
