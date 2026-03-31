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
      navigate("/");
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

        {/* Name row */}
        <div className={styles.row}>
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
              <span className={styles.errorMsg}>
                {errors.firstName.message}
              </span>
            )}
          </div>

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
          <input
            id="password"
            type="password"
            className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <span className={styles.errorMsg}>{errors.password.message}</span>
          )}
        </div>

        {/* Confirm Password */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirmPassword">
            {t("Confirm Password", "Confirmar contraseña")}
          </label>
          <input
            id="confirmPassword"
            type="password"
            className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
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
