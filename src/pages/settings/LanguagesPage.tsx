import { useState } from "react";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸", active: true },
  { code: "es", label: "Español", flag: "🇪🇸", active: true },
  { code: "it", label: "Italiano", flag: "🇮🇹", active: true },
  { code: "fr", label: "Français", flag: "🇫🇷", active: false },
  { code: "de", label: "Deutsch", flag: "🇩🇪", active: false },
];

export default function LanguagesPage() {
  const [defaultLang, setDefaultLang] = useState("en");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720 }}>
      <div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.25rem" }}>
          Languages
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
          Choose the languages available in your workspace.
        </p>
      </div>

      {/* Default Language */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "1.25rem" }}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 0.875rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
          Default Language
        </p>
        <select
          value={defaultLang}
          onChange={(e) => setDefaultLang(e.target.value)}
          style={{ padding: "0.5rem 0.75rem", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input, var(--bg-card))", color: "var(--text-primary)", fontSize: "0.9rem", cursor: "pointer" }}
        >
          <option value="en">🇺🇸 English</option>
          <option value="es">🇪🇸 Español</option>
          <option value="it">🇮🇹 Italiano</option>
        </select>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          This is the fallback language for all users.
        </p>
      </div>

      {/* Available Languages */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0, padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          Available Languages
        </p>
        {LANGUAGES.map((lang) => (
          <div
            key={lang.code}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.4rem" }}>{lang.flag}</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{lang.label}</span>
              {lang.code === defaultLang && (
                <span style={{ fontSize: "0.75rem", padding: "0.1rem 0.5rem", borderRadius: 20, background: "var(--accent)", color: "#fff", fontWeight: 600 }}>default</span>
              )}
            </div>
            <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.65rem", borderRadius: 20, background: lang.active ? "#d1fae5" : "var(--bg-muted, #f0f0f0)", color: lang.active ? "#065f46" : "var(--text-muted)" }}>
              {lang.active ? "Active" : "Inactive"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
