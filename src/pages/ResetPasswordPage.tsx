import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPassword } from "../services/authService";
import styles from "./ResetPasswordPage.module.css";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token") ?? "";

  const [lang, setLang] = useState<"en" | "es">("en");
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    try {
      setServerError("");
      await resetPassword(token, data.newPassword);
      navigate("/login", {
        state: {
          successMessage:
            lang === "en"
              ? "Password updated — please sign in."
              : "Contraseña actualizada — inicia sesión.",
        },
      });
    } catch (err: unknown) {
      const apiError =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "";
      if (
        apiError.toLowerCase().includes("invalid") ||
        apiError.toLowerCase().includes("expired")
      ) {
        setServerError(
          lang === "en"
            ? "Link expired or invalid — please request a new one."
            : "Enlace expirado o no válido — solicita uno nuevo.",
        );
      } else {
        setServerError(
          lang === "en"
            ? "Something went wrong. Please try again."
            : "Algo salió mal. Inténtalo de nuevo.",
        );
      }
    }
  };

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.leftPanel}>
          <div className={styles.leftTop}>
            <div className={styles.logoRow}>
              <div className={styles.logoIcon}>🧹</div>
              <span className={styles.logoName}>Brillo</span>
            </div>
          </div>
        </div>
        <div className={styles.rightPanel}>
          <div className={styles.formCard}>
            <div className={styles.errorCard}>
              <p className={styles.errorCardTitle}>
                {lang === "en" ? "Invalid link" : "Enlace no válido"}
              </p>
              <p className={styles.errorCardText}>
                {lang === "en"
                  ? "This reset link is missing or invalid."
                  : "Este enlace de restablecimiento es inválido o está incompleto."}
              </p>
            </div>
            <p className={styles.footer}>
              <Link to="/forgot-password" className={styles.link}>
                {lang === "en"
                  ? "Request a new link"
                  : "Solicitar un nuevo enlace"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

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
                Set a new
                <br />
                <span className={styles.headlineAccent}>secure</span> password.
              </>
            ) : (
              <>
                Establece una nueva
                <br />
                <span className={styles.headlineAccent}>contraseña</span>{" "}
                segura.
              </>
            )}
          </h2>
          <p className={styles.leftSub}>
            {lang === "en"
              ? "Choose a strong password with at least 8 characters."
              : "Elige una contraseña segura con al menos 8 caracteres."}
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

          <h1 className={styles.title}>
            {lang === "en" ? "Reset password" : "Restablecer contraseña"}
          </h1>
          <p className={styles.subtitle}>
            {lang === "en"
              ? "Enter your new password below."
              : "Ingresa tu nueva contraseña a continuación."}
          </p>

          <form
            className={styles.form}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {/* New password */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="newPassword">
                {lang === "en" ? "NEW PASSWORD" : "NUEVA CONTRASEÑA"}
              </label>
              <div className={styles.inputWrap}>
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  className={`${styles.input} ${errors.newPassword ? styles.inputError : ""}`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("newPassword")}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <span className={styles.errorMsg}>
                  {errors.newPassword.message}
                </span>
              )}
            </div>

            {/* Confirm password */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">
                {lang === "en" ? "CONFIRM PASSWORD" : "CONFIRMAR CONTRASEÑA"}
              </label>
              <div className={styles.inputWrap}>
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className={styles.errorMsg}>
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>

            {serverError && (
              <div className={styles.serverError}>
                <span>{serverError}</span>
                {serverError.toLowerCase().includes("expired") ||
                serverError.toLowerCase().includes("expirado") ? (
                  <Link
                    to="/forgot-password"
                    className={styles.serverErrorLink}
                  >
                    {lang === "en"
                      ? " Request new link"
                      : " Solicitar nuevo enlace"}
                  </Link>
                ) : null}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? lang === "en"
                  ? "Saving…"
                  : "Guardando…"
                : lang === "en"
                  ? "Set New Password"
                  : "Guardar Nueva Contraseña"}
            </button>
          </form>

          <p className={styles.footer}>
            <Link to="/login" className={styles.link}>
              ← {lang === "en" ? "Back to login" : "Volver al inicio de sesión"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
