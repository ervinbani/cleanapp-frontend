import { useEffect, useState } from "react";
import { useLang } from "../../contexts/LangContext";
import {
  getAvailableLanguages,
  getTenant,
  updateTenantLanguages,
} from "../../services/authService";
import type { AvailableLanguage, TenantLanguage } from "../../types";
import styles from "./LanguagesPage.module.css";

export default function LanguagesPage() {
  const { lang } = useLang();

  const [tenantLangs, setTenantLangs] = useState<TenantLanguage[]>([]);
  const [available, setAvailable] = useState<AvailableLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const t = {
    en: {
      title: "Languages",
      subtitle: "Manage the languages available in your workspace",
      sectionCurrent: "Configured Languages",
      sectionAdd: "Add Language",
      labelActive: "Active",
      labelDefault: "Default",
      btnAdd: "Add",
      btnRemove: "Remove",
      btnSave: "Save Changes",
      btnSaving: "Saving…",
      savedOk: "Saved successfully.",
      loading: "Loading…",
      noAvailable: "No additional languages available to add.",
      errorLoad: "Failed to load language settings.",
      errorSave: "Failed to save changes.",
      errorOneRequired: "At least one language is required.",
      errorOneDefault: "Exactly one language must be set as default.",
      errorDefaultActive: "The default language must be active.",
    },
    es: {
      title: "Idiomas",
      subtitle: "Gestiona los idiomas disponibles en tu espacio de trabajo",
      sectionCurrent: "Idiomas configurados",
      sectionAdd: "Agregar idioma",
      labelActive: "Activo",
      labelDefault: "Predeterminado",
      btnAdd: "Agregar",
      btnRemove: "Eliminar",
      btnSave: "Guardar cambios",
      btnSaving: "Guardando…",
      savedOk: "Guardado con exito.",
      loading: "Cargando…",
      noAvailable: "No hay mas idiomas disponibles para agregar.",
      errorLoad: "Error al cargar la configuracion de idiomas.",
      errorSave: "Error al guardar los cambios.",
      errorOneRequired: "Se requiere al menos un idioma.",
      errorOneDefault: "Exactamente un idioma debe ser el predeterminado.",
      errorDefaultActive: "El idioma predeterminado debe estar activo.",
    },
    it: {
      title: "Lingue",
      subtitle: "Gestisci le lingue disponibili nel tuo spazio di lavoro",
      sectionCurrent: "Lingue configurate",
      sectionAdd: "Aggiungi lingua",
      labelActive: "Attivo",
      labelDefault: "Predefinito",
      btnAdd: "Aggiungi",
      btnRemove: "Rimuovi",
      btnSave: "Salva modifiche",
      btnSaving: "Salvataggio…",
      savedOk: "Salvato con successo.",
      loading: "Caricamento…",
      noAvailable: "Nessuna lingua aggiuntiva disponibile.",
      errorLoad: "Impossibile caricare le impostazioni lingua.",
      errorSave: "Impossibile salvare le modifiche.",
      errorOneRequired: "E richiesta almeno una lingua.",
      errorOneDefault: "Esattamente una lingua deve essere impostata come predefinita.",
      errorDefaultActive: "La lingua predefinita deve essere attiva.",
    },
    sq: {
      title: "Gjuhet",
      subtitle: "Menaxho gjuhet e disponueshme ne hapesiren tuaj te punes",
      sectionCurrent: "Gjuhet e konfiguruara",
      sectionAdd: "Shto gjuhe",
      labelActive: "Aktive",
      labelDefault: "Parazgjedhje",
      btnAdd: "Shto",
      btnRemove: "Hiq",
      btnSave: "Ruaj ndryshimet",
      btnSaving: "Po ruhet…",
      savedOk: "U ruajt me sukses.",
      loading: "Duke ngarkuar…",
      noAvailable: "Nuk ka gjuhe te tjera te disponueshme.",
      errorLoad: "Ngarkimi i cilesimeve te gjuhes deshtoi.",
      errorSave: "Ruajtja e ndryshimeve deshtoi.",
      errorOneRequired: "Kerkohet te pakten nje gjuhe.",
      errorOneDefault: "Saktesisht nje gjuhe duhet te jete e paracaktuar.",
      errorDefaultActive: "Gjuha e paracaktuar duhet te jete aktive.",
    },
  }[lang] ?? {
    title: "Languages",
    subtitle: "Manage the languages available in your workspace",
    sectionCurrent: "Configured Languages",
    sectionAdd: "Add Language",
    labelActive: "Active",
    labelDefault: "Default",
    btnAdd: "Add",
    btnRemove: "Remove",
    btnSave: "Save Changes",
    btnSaving: "Saving…",
    savedOk: "Saved successfully.",
    loading: "Loading…",
    noAvailable: "No additional languages available to add.",
    errorLoad: "Failed to load language settings.",
    errorSave: "Failed to save changes.",
    errorOneRequired: "At least one language is required.",
    errorOneDefault: "Exactly one language must be set as default.",
    errorDefaultActive: "The default language must be active.",
  };

  useEffect(() => {
    Promise.all([getTenant(), getAvailableLanguages()])
      .then(([tenant, avail]) => {
        setTenantLangs(tenant.languages ?? []);
        setAvailable(avail);
      })
      .catch(() => setError(t.errorLoad))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleActive = (langCode: string) => {
    setTenantLangs((prev) =>
      prev.map((l) => (l.lang === langCode ? { ...l, active: !l.active } : l)),
    );
    setSuccess(false);
  };

  const setDefault = (langCode: string) => {
    setTenantLangs((prev) =>
      prev.map((l) => ({
        ...l,
        isDefault: l.lang === langCode,
        active: l.lang === langCode ? true : l.active,
      })),
    );
    setSuccess(false);
  };

  const removeLang = (langCode: string) => {
    setTenantLangs((prev) => prev.filter((l) => l.lang !== langCode));
    setSuccess(false);
  };

  const addLang = (avlLang: AvailableLanguage) => {
    setTenantLangs((prev) => [
      ...prev,
      { lang: avlLang.lang, label: avlLang.label, active: false, isDefault: false },
    ]);
    setSuccess(false);
  };

  const validate = (): string => {
    if (tenantLangs.length === 0) return t.errorOneRequired;
    const defaults = tenantLangs.filter((l) => l.isDefault);
    if (defaults.length !== 1) return t.errorOneDefault;
    if (!defaults[0].active) return t.errorDefaultActive;
    return "";
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const updated = await updateTenantLanguages(
        tenantLangs.map(({ lang: lc, active, isDefault }) => ({
          lang: lc,
          active,
          isDefault,
        })),
      );
      setTenantLangs(updated.languages ?? tenantLangs);
      setSuccess(true);
    } catch {
      setError(t.errorSave);
    } finally {
      setSaving(false);
    }
  };

  const addable = available.filter(
    (a) => !tenantLangs.some((tl) => tl.lang === a.lang),
  );

  if (loading) return <p className={styles.loading}>{t.loading}</p>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.sectionCurrent}</h2>
        <div className={styles.langList}>
          {tenantLangs.map((item) => {
            const label = item.label ?? item.lang.toUpperCase();
            return (
              <div key={item.lang} className={styles.langRow}>
                <span className={styles.langName}>{label}</span>

                <label
                  className={`${styles.toggle} ${item.isDefault ? styles.toggleDisabled : ""}`}
                  title={t.labelActive}
                >
                  <input
                    type="checkbox"
                    checked={item.active}
                    disabled={item.isDefault}
                    onChange={() => toggleActive(item.lang)}
                  />
                  <span className={styles.toggleSlider} />
                  <span className={styles.toggleText}>{t.labelActive}</span>
                </label>

                <label className={styles.defaultLabel}>
                  <input
                    type="radio"
                    name="defaultLang"
                    checked={item.isDefault}
                    onChange={() => setDefault(item.lang)}
                  />
                  {t.labelDefault}
                </label>

                <button
                  type="button"
                  className={styles.removeBtn}
                  disabled={item.isDefault || tenantLangs.length === 1}
                  onClick={() => removeLang(item.lang)}
                  title={t.btnRemove}
                  aria-label={`${t.btnRemove} ${label}`}
                >
                  x
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.sectionAdd}</h2>
        {addable.length === 0 ? (
          <p className={styles.emptyNote}>{t.noAvailable}</p>
        ) : (
          <div className={styles.addList}>
            {addable.map((a) => (
              <div key={a.lang} className={styles.addRow}>
                <span className={styles.langName}>{a.label}</span>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => addLang(a)}
                >
                  + {t.btnAdd}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && <p className={styles.errorMsg}>{error}</p>}
      {success && <p className={styles.successMsg}>{t.savedOk}</p>}

      <button
        type="button"
        className={styles.saveBtn}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? t.btnSaving : t.btnSave}
      </button>
    </div>
  );
}
