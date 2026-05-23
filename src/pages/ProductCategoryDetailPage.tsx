import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { productCategoryService } from "../services/productCategoryService";
import type { ProductCategory } from "../types";
import styles from "./ProductCategoryDetailPage.module.css";

const T = {
  en: {
    back: "← Back to Categories",
    loading: "Loading…",
    notFound: "Category not found.",
    errorLoad: "Failed to load category.",
    edit: "Edit",
    save: "Save Changes",
    saving: "Saving…",
    cancel: "Cancel",
    sectionGeneral: "General",
    sectionActivity: "Activity",
    nameEn: "Name (EN)",
    nameEs: "Name (ES)",
    descriptionEn: "Description (EN)",
    descriptionEs: "Description (ES)",
    color: "Color",
    isActive: "Status",
    createdAt: "Created",
    active: "Active",
    inactive: "Inactive",
    none: "—",
    errorSave: "Error saving category.",
    savedOk: "Changes saved.",
    required: "Name (EN) is required.",
  },
  es: {
    back: "← Volver a Categorías",
    loading: "Cargando…",
    notFound: "Categoría no encontrada.",
    errorLoad: "Error al cargar la categoría.",
    edit: "Editar",
    save: "Guardar Cambios",
    saving: "Guardando…",
    cancel: "Cancelar",
    sectionGeneral: "General",
    sectionActivity: "Actividad",
    nameEn: "Nombre (EN)",
    nameEs: "Nombre (ES)",
    descriptionEn: "Descripción (EN)",
    descriptionEs: "Descripción (ES)",
    color: "Color",
    isActive: "Estado",
    createdAt: "Creado",
    active: "Activo",
    inactive: "Inactivo",
    none: "—",
    errorSave: "Error al guardar la categoría.",
    savedOk: "Cambios guardados.",
    required: "El nombre (EN) es obligatorio.",
  },
  it: {
    back: "← Torna alle Categorie",
    loading: "Caricamento…",
    notFound: "Categoria non trovata.",
    errorLoad: "Impossibile caricare la categoria.",
    edit: "Modifica",
    save: "Salva Modifiche",
    saving: "Salvataggio…",
    cancel: "Annulla",
    sectionGeneral: "Generale",
    sectionActivity: "Attività",
    nameEn: "Nome (EN)",
    nameEs: "Nome (ES)",
    descriptionEn: "Descrizione (EN)",
    descriptionEs: "Descrizione (ES)",
    color: "Colore",
    isActive: "Stato",
    createdAt: "Creato",
    active: "Attivo",
    inactive: "Inattivo",
    none: "—",
    errorSave: "Errore nel salvare la categoria.",
    savedOk: "Modifiche salvate.",
    required: "Il nome (EN) è obbligatorio.",
  },
  sq: {
    back: "← Kthehu te Kategorite",
    loading: "Duke ngarkuar…",
    notFound: "Kategoria nuk u gjet.",
    errorLoad: "Gabim gjate ngarkimit.",
    edit: "Ndrysho",
    save: "Ruaj Ndryshimet",
    saving: "Duke ruajtur…",
    cancel: "Anulo",
    sectionGeneral: "Gjenerale",
    sectionActivity: "Aktiviteti",
    nameEn: "Emri (EN)",
    nameEs: "Emri (ES)",
    descriptionEn: "Pershkrimi (EN)",
    descriptionEs: "Pershkrimi (ES)",
    color: "Ngjyra",
    isActive: "Statusi",
    createdAt: "Krijuar",
    active: "Aktiv",
    inactive: "Joaktiv",
    none: "—",
    errorSave: "Gabim ne ruajtjen e kategorise.",
    savedOk: "Ndryshimet u ruajten.",
    required: "Emri (EN) eshte i detyrueshëm.",
  },
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

interface FieldProps {
  label: string;
  value: React.ReactNode;
}
function Field({ label, value }: FieldProps) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value || "—"}</span>
    </div>
  );
}

export default function ProductCategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLang();
  const { hasPermission } = useAuth();
  const t = T[lang as keyof typeof T] ?? T.en;

  const canWrite = hasPermission("productCategories", "update");

  const [category, setCategory] = useState<ProductCategory | null>(
    (location.state as { category?: ProductCategory } | null)?.category ?? null,
  );
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(!category);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [nameEn, setNameEn] = useState("");
  const [nameEs, setNameEs] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionEs, setDescriptionEs] = useState("");
  const [color, setColor] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (!category && id) {
      productCategoryService
        .getById(id)
        .then((c) => setCategory(c))
        .catch(() => setLoadError(t.errorLoad))
        .finally(() => setLoading(false));
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = () => {
    if (!category) return;
    setNameEn(category.name?.en ?? "");
    setNameEs(category.name?.es ?? "");
    setDescriptionEn(category.description?.en ?? "");
    setDescriptionEs(category.description?.es ?? "");
    setColor(category.color ?? "");
    setIsActive(category.isActive);
    setSaveError("");
    setSavedOk(false);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!nameEn.trim()) { setSaveError(t.required); return; }
    if (!id) return;
    setSaving(true);
    setSaveError("");
    try {
      const updated = await productCategoryService.update(id, {
        name: { en: nameEn.trim(), es: nameEs.trim() || nameEn.trim() },
        description: {
          en: descriptionEn.trim() || undefined,
          es: descriptionEs.trim() || undefined,
        },
        color: color.trim() || undefined,
        isActive,
      });
      setCategory(updated);
      setEditing(false);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } catch {
      setSaveError(t.errorSave);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>{t.loading}</div>;
  if (loadError) return <div className={styles.error}>{loadError}</div>;
  if (!category) return <div className={styles.error}>{t.notFound}</div>;

  const displayName =
    (lang === "es" ? category.name?.es : category.name?.en) ||
    category.name?.en ||
    "—";

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <button className={styles.backLink} onClick={() => navigate("/product-categories")}>
          {t.back}
        </button>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{displayName}</h1>
          {category.color && (
            <span
              className={styles.colorDot}
              style={{ background: category.color }}
            />
          )}
          <span
            className={`${styles.badge} ${category.isActive ? styles.badge_active : styles.badge_inactive}`}
          >
            {category.isActive ? t.active : t.inactive}
          </span>
        </div>
        {canWrite && !editing && (
          <button className={styles.editBtn} onClick={startEdit}>
            {t.edit}
          </button>
        )}
      </div>

      {savedOk && <div className={styles.savedBanner}>{t.savedOk}</div>}

      {editing ? (
        /* Edit form */
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>{t.sectionGeneral}</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.nameEn}</label>
              <input className={styles.input} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.nameEs}</label>
              <input className={styles.input} value={nameEs} onChange={(e) => setNameEs(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.descriptionEn}</label>
              <textarea className={styles.textarea} rows={3} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.descriptionEs}</label>
              <textarea className={styles.textarea} rows={3} value={descriptionEs} onChange={(e) => setDescriptionEs(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.color}</label>
              <div className={styles.colorRow}>
                <input type="color" className={styles.colorPicker} value={color || "#00C9AA"} onChange={(e) => setColor(e.target.value)} />
                <input className={styles.input} value={color} onChange={(e) => setColor(e.target.value)} placeholder="#00C9AA" />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t.isActive}</label>
              <div className={styles.toggleRow}>
                <label className={styles.toggleSwitch}>
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  <span className={styles.toggleSlider} />
                </label>
                <span className={styles.toggleLabel}>{isActive ? t.active : t.inactive}</span>
              </div>
            </div>
          </div>
          {saveError && <p className={styles.formError}>{saveError}</p>}
          <div className={styles.formActions}>
            <button className={styles.btnCancel} onClick={() => setEditing(false)} disabled={saving}>{t.cancel}</button>
            <button className={styles.btnSave} onClick={handleSave} disabled={saving}>{saving ? t.saving : t.save}</button>
          </div>
        </div>
      ) : (
        /* View mode */
        <>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>{t.sectionGeneral}</h2>
            <div className={styles.fieldGrid}>
              <Field label={t.nameEn} value={category.name?.en} />
              <Field label={t.nameEs} value={category.name?.es} />
              <Field label={t.descriptionEn} value={category.description?.en} />
              <Field label={t.descriptionEs} value={category.description?.es} />
              <Field
                label={t.color}
                value={
                  category.color ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: "50%", background: category.color }} />
                      {category.color}
                    </span>
                  ) : "—"
                }
              />
              <Field label={t.isActive} value={category.isActive ? t.active : t.inactive} />
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>{t.sectionActivity}</h2>
            <div className={styles.fieldGrid}>
              <Field label={t.createdAt} value={formatDate(category.createdAt)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
