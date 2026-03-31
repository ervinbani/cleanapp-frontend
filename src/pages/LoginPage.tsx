import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../contexts/AuthContext";
import AuthLayout from "../layouts/AuthLayout";
import styles from "./LoginPage.module.css";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [lang, setLang] = useState<"en" | "es">("en");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setServerError("");
      await login(data);
      navigate("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Connection error. Please try again.";
      setServerError(msg);
    }
  };

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
        {lang === "en" ? "Welcome back" : "Bienvenido de nuevo"}
      </h1>
      <p className={styles.subtitle}>
        {lang === "en"
          ? "Sign in to your Brillo account"
          : "Inicia sesión en tu cuenta Brillo"}
      </p>

      <form
        className={styles.form}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            {lang === "en" ? "Email" : "Correo electrónico"}
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
            <span className={styles.errorMsg}>{errors.email.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            {lang === "en" ? "Password" : "Contraseña"}
          </label>
          <div className={styles.inputWrap}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
              placeholder="••••••••"
              autoComplete="current-password"
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
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              )}
            </button>
          </div>
          {errors.password && (
            <span className={styles.errorMsg}>{errors.password.message}</span>
          )}
        </div>

        {serverError && <div className={styles.serverError}>{serverError}</div>}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? lang === "en"
              ? "Signing in…"
              : "Iniciando sesión…"
            : lang === "en"
              ? "Sign In"
              : "Iniciar Sesión"}
        </button>
      </form>

      <p className={styles.footer}>
        {lang === "en" ? "Don't have an account?" : "¿No tienes cuenta?"}{" "}
        <Link to="/register" className={styles.link}>
          {lang === "en" ? "Sign up" : "Regístrate"}
        </Link>
      </p>
    </AuthLayout>
  );
}
