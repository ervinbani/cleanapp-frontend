import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import styles from "./RegisterSuccessPage.module.css";

export default function RegisterSuccessPage() {
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? "";
  const [lang, setLang] = useState<"en" | "es">("en");

  return (
    <AuthLayout>
      <div className={styles.langToggle}>
        <button
          className={`${styles.langBtn} ${lang === "en" ? styles.langActive : ""}`}
          onClick={() => setLang("en")}
        >
          EN
        </button>
        <button
          className={`${styles.langBtn} ${lang === "es" ? styles.langActive : ""}`}
          onClick={() => setLang("es")}
        >
          ES
        </button>
      </div>

      <div className={styles.iconWrap}>
        <span className={styles.icon}>✉️</span>
      </div>

      <h1 className={styles.title}>
        {lang === "en" ? "Check your email" : "Revisa tu correo"}
      </h1>

      <p className={styles.body}>
        {lang === "en" ? (
          <>
            We sent a verification link to{" "}
            {email ? <strong>{email}</strong> : "your email address"}.
            <br />
            Click the link to activate your account.
          </>
        ) : (
          <>
            Enviamos un enlace de verificación a{" "}
            {email ? <strong>{email}</strong> : "tu correo electrónico"}.
            <br />
            Haz clic en el enlace para activar tu cuenta.
          </>
        )}
      </p>

      <p className={styles.hint}>
        {lang === "en"
          ? "Didn't receive it? Check your spam folder."
          : "¿No lo recibiste? Revisa tu carpeta de spam."}
      </p>

      <Link to="/login" className={styles.link}>
        {lang === "en" ? "Back to login" : "Volver al inicio de sesión"}
      </Link>
    </AuthLayout>
  );
}
