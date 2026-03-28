import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.brand}>
        <span className={styles.logo}>🪣</span>
        <span className={styles.brandName}>Brillo</span>
      </div>
      <div className={styles.card}>{children}</div>
    </div>
  );
}
