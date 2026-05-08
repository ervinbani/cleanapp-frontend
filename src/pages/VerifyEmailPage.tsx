import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { verifyEmail } from "../services/authService";
import styles from "./VerifyEmailPage.module.css";

type Status = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get("token") ?? "";
  const [lang, setLang] = useState<"en" | "es">("en");
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg(
        lang === "en"
          ? "Verification link is missing or invalid."
          : "El enlace de verificación es inválido o está incompleto.",
      );
      return;
    }
    if (hasRun.current) return;
    hasRun.current = true;

    verifyEmail(token)
      .then(() => {
        setStatus("success");
        setTimeout(() => navigate("/login"), 3000);
      })
      .catch((err: unknown) => {
        const apiError =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "";
        setErrorMsg(
          apiError ||
            (lang === "en"
              ? "Invalid or expired verification token."
              : "Token de verificación inválido o expirado."),
        );
        setStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className={styles.page}>
      {/* ── Left panel ── */}
      <div className={styles.leftPanel}>
        <div className={styles.leftTop}>
          <div className={styles.logoRow}>
            <div className={styles.logoIcon}>🧹</div>
            <span className={styles.logoName}>Brillo</span>
          </div>
          <h2 className={styles.headline}>
            {lang === "en" ? (
              <>
                One step
                <br />
                <span className={styles.headlineAccent}>closer</span> to your
                account.
              </>
            ) : (
              <>
                Un paso más
                <br />
                <span className={styles.headlineAccent}>cerca</span> de tu
                cuenta.
              </>
            )}
          </h2>
          <p className={styles.leftSub}>
            {lang === "en"
              ? "Verifying your email keeps your account secure."
              : "Verificar tu correo mantiene tu cuenta segura."}
          </p>
        </div>
        <div className={styles.leftBottom}>
          <p className={styles.leftFooter}>
            {lang === "en" ? "Already verified? " : "¿Ya verificaste? "}
            <Link to="/login" className={styles.leftLink}>
              {lang === "en" ? "Sign in" : "Inicia sesión"}
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          {/* Lang toggle */}
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

          {status === "loading" && (
            <div className={styles.statusBlock}>
              <div className={styles.spinner} />
              <p className={styles.statusTitle}>
                {lang === "en"
                  ? "Verifying your email…"
                  : "Verificando tu correo…"}
              </p>
            </div>
          )}

          {status === "success" && (
            <div className={styles.statusBlock}>
              <div className={styles.successIcon}>✓</div>
              <p className={styles.statusTitle}>
                {lang === "en" ? "Email verified!" : "¡Correo verificado!"}
              </p>
              <p className={styles.statusSub}>
                {lang === "en"
                  ? "Your account is now active. Redirecting you to the login page…"
                  : "Tu cuenta ya está activa. Redirigiendo al inicio de sesión…"}
              </p>
              <Link to="/login" className={styles.btn}>
                {lang === "en" ? "Go to login" : "Ir al inicio de sesión"}
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className={styles.statusBlock}>
              <div className={styles.errorIcon}>✕</div>
              <p className={styles.statusTitle}>
                {lang === "en"
                  ? "Verification failed"
                  : "Error de verificación"}
              </p>
              <p className={styles.statusSub}>{errorMsg}</p>
              <Link to="/login" className={styles.btnSecondary}>
                {lang === "en" ? "Back to login" : "Volver al inicio"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
