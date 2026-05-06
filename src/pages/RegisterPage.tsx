import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../contexts/AuthContext";
import AuthLayout from "../layouts/AuthLayout";
import styles from "./RegisterPage.module.css";

const schema = z
  .object({
    tenantName: z
      .string()
      .min(2, "Business name must be at least 2 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [lang, setLang] = useState<"en" | "es">("en");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setServerError("");
      const { confirmPassword: _, ...rest } = data;
      const slug = rest.tenantName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      await registerUser({ ...rest, slug });
      navigate("/register-success", { state: { email: data.email } });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Connection error. Please try again.";
      setServerError(msg);
    }
  };

  const t = (en: string, es: string) => (lang === "en" ? en : es);

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

      <h1 className={styles.title}>
        {t("Create your account", "Crea tu cuenta")}
      </h1>
      <p className={styles.subtitle}>
        {t(
          "Start managing your cleaning business",
          "Empieza a gestionar tu negocio",
        )}
      </p>

      <form
        className={styles.form}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {/* Business name */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="tenantName">
            {t("Business Name", "Nombre del negocio")}
          </label>
          <input
            id="tenantName"
            type="text"
            className={`${styles.input} ${errors.tenantName ? styles.inputError : ""}`}
            placeholder={t("Sparkle Clean LLC", "Brillo Limpieza S.A.")}
            {...register("tenantName")}
          />
          {errors.tenantName && (
            <span className={styles.errorMsg}>{errors.tenantName.message}</span>
          )}
        </div>

        {/* First Name */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="firstName">
            {t("First Name", "Nombre")}
          </label>
          <input
            id="firstName"
            type="text"
            className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
            placeholder="Jane"
            {...register("firstName")}
          />
          {errors.firstName && (
            <span className={styles.errorMsg}>{errors.firstName.message}</span>
          )}
        </div>

        {/* Last Name */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="lastName">
            {t("Last Name", "Apellido")}
          </label>
          <input
            id="lastName"
            type="text"
            className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
            placeholder="Doe"
            {...register("lastName")}
          />
          {errors.lastName && (
            <span className={styles.errorMsg}>{errors.lastName.message}</span>
          )}
        </div>

        {/* Email */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            {t("Email", "Correo electrónico")}
          </label>
          <input
            id="email"
            type="email"
            className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
            placeholder={t("you@example.com", "correo@ejemplo.com")}
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <span className={styles.errorMsg}>{errors.email.message}</span>
          )}
        </div>

        {/* Password */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            {t("Password", "Contraseña")}
          </label>
          <div className={styles.inputWrap}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("password")}
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
          {errors.password && (
            <span className={styles.errorMsg}>{errors.password.message}</span>
          )}
        </div>

        {/* Confirm Password */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirmPassword">
            {t("Confirm Password", "Confirmar contraseña")}
          </label>
          <div className={styles.inputWrap}>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowConfirmPassword((v) => !v)}
              tabIndex={-1}
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? (
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

        {serverError && <div className={styles.serverError}>{serverError}</div>}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? t("Creating account…", "Creando cuenta…")
            : t("Create Account", "Crear Cuenta")}
        </button>
      </form>

      <p className={styles.footer}>
        {t("Already have an account?", "¿Ya tienes una cuenta?")}{" "}
        <Link to="/login" className={styles.link}>
          {t("Sign in", "Iniciar sesión")}
        </Link>
      </p>
    </AuthLayout>
  );
}
