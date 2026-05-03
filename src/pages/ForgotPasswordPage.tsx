import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPassword } from "../services/authService";
import styles from "./ForgotPasswordPage.module.css";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [lang, setLang] = useState<"en" | "es">("en");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setServerError("");
      await forgotPassword(data.email);
      setSubmitted(true);
    } catch {
      setServerError(
        lang === "en"
          ? "Connection error. Please try again."
          : "Error de conexión. Inténtalo de nuevo.",
      );
    }
  };

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
                Recover your
                <br />
                <span className={styles.headlineAccent}>access</span> easily.
              </>
            ) : (
              <>
                Recupera tu
                <br />
                <span className={styles.headlineAccent}>acceso</span>{" "}
                fácilmente.
              </>
            )}
          </h2>
          <p className={styles.leftSub}>
            {lang === "en"
              ? "Enter your email and we'll send you a secure link to reset your password."
              : "Ingresa tu correo y te enviaremos un enlace seguro para restablecer tu contraseña."}
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
            {lang === "en" ? "Forgot password?" : "¿Olvidaste tu contraseña?"}
          </h1>
          <p className={styles.subtitle}>
            {lang === "en"
              ? "We'll email you a link to reset it."
              : "Te enviaremos un enlace para restablecerla."}
          </p>

          {submitted ? (
            <div className={styles.successCard}>
              <div className={styles.successIcon}>✉️</div>
              <p className={styles.successTitle}>
                {lang === "en" ? "Check your inbox" : "Revisa tu correo"}
              </p>
              <p className={styles.successText}>
                {lang === "en"
                  ? "If that email is registered, you'll receive a reset link shortly."
                  : "Si ese correo está registrado, recibirás un enlace en breve."}
              </p>
            </div>
          ) : (
            <form
              className={styles.form}
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  {lang === "en" ? "EMAIL ADDRESS" : "CORREO ELECTRÓNICO"}
                </label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                  placeholder={
                    lang === "en" ? "you@example.com" : "correo@ejemplo.com"
                  }
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <span className={styles.errorMsg}>
                    {errors.email.message}
                  </span>
                )}
              </div>

              {serverError && (
                <div className={styles.serverError}>{serverError}</div>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? lang === "en"
                    ? "Sending…"
                    : "Enviando…"
                  : lang === "en"
                    ? "Send Reset Link"
                    : "Enviar Enlace"}
              </button>
            </form>
          )}

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
