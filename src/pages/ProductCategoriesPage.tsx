import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useTrans } from "../i18n";
import { useAuth } from "../contexts/AuthContext";
import {
  productCategoryService,
  type ProductCategoriesQuery,
} from "../services/productCategoryService";
import type { ProductCategory } from "../types";
import styles from "./ProductCategoriesPage.module.css";

const PAGE_LIMIT = 20;

function getPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// ── Category Modal ────────────────────────────────────────────────────────────
interface CategoryForm {
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  color: string;
  isActive: boolean;
}

const EMPTY_FORM: CategoryForm = {
  nameEn: "",
  nameEs: "",
  descriptionEn: "",
  descriptionEs: "",
  color: "",
  isActive: true,
};

function categoryToForm(c: ProductCategory): CategoryForm {
  return {
    nameEn: c.name?.en ?? "",
    nameEs: c.name?.es ?? "",
    descriptionEn: c.description?.en ?? "",
    descriptionEs: c.description?.es ?? "",
    color: c.color ?? "",
    isActive: c.isActive,
  };
}

interface CategoryModalProps {
  category?: ProductCategory;
  onClose: () => void;
  onSaved: () => void;
}

function CategoryModal({ category, onClose, onSaved }: CategoryModalProps) {
  const isEdit = !!category;
  const l = useTrans("productCategoriesModal");
  const [form, setForm] = useState<CategoryForm>(
    isEdit ? categoryToForm(category!) : EMPTY_FORM,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"en" | "es">("en");

  const set = (field: keyof CategoryForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameEn.trim()) {
      setError(l.required);
      setActiveTab("en");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: {
          en: form.nameEn.trim(),
          es: form.nameEs.trim() || form.nameEn.trim(),
        },
        description: {
          en: form.descriptionEn.trim() || undefined,
          es: form.descriptionEs.trim() || undefined,
        },
        color: form.color.trim() || undefined,
        isActive: form.isActive,
      };
      if (isEdit) {
        await productCategoryService.update(category!._id, payload);
      } else {
        await productCategoryService.create(payload);
      }
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Error saving category.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {isEdit ? l.editTitle : l.addTitle}
          </h3>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.langTabs}>
            <button
              type="button"
              className={`${styles.langTab} ${activeTab === "en" ? styles.langTabActive : ""}`}
              onClick={() => setActiveTab("en")}
            >
              EN
            </button>
            <button
              type="button"
              className={`${styles.langTab} ${activeTab === "es" ? styles.langTabActive : ""}`}
              onClick={() => setActiveTab("es")}
            >
              ES
            </button>
          </div>

          {activeTab === "en" && (
            <div className={styles.langTabContent}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.name}</label>
                <input
                  className={styles.input}
                  placeholder={l.namePlaceholder}
                  value={form.nameEn}
                  onChange={(e) => set("nameEn", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.description}</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder={l.descPlaceholder}
                  value={form.descriptionEn}
                  onChange={(e) => set("descriptionEn", e.target.value)}
                />
              </div>
            </div>
          )}
          {activeTab === "es" && (
            <div className={styles.langTabContent}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.name}</label>
                <input
                  className={styles.input}
                  placeholder={l.namePlaceholder}
                  value={form.nameEs}
                  onChange={(e) => set("nameEs", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.description}</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder={l.descPlaceholder}
                  value={form.descriptionEs}
                  onChange={(e) => set("descriptionEs", e.target.value)}
                />
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>{l.color}</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                className={styles.colorPicker}
                value={form.color || "#00C9AA"}
                onChange={(e) => set("color", e.target.value)}
              />
              <input
                className={styles.input}
                placeholder={l.colorPlaceholder}
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{l.status}</label>
            <div className={styles.toggleRow}>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                />
                <span className={styles.toggleSlider} />
              </label>
              <span className={styles.toggleLabel}>
                {form.isActive ? l.active : l.inactive}
              </span>
            </div>
          </div>

          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={saving}
            >
              {l.cancel}
            </button>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {isEdit ? l.update : l.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductCategoriesPage() {
  const { lang } = useLang();
  const { hasPermission } = useAuth();
  const l = useTrans("productCategories");

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [colName, setColName] = useState("");
  const [colStatus, setColStatus] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const canWrite = hasPermission("productCategories", "create");
  const canDelete = hasPermission("productCategories", "delete");
  const navigate = useNavigate();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ProductCategory | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params: ProductCategoriesQuery = {
        page,
        limit: PAGE_LIMIT,
      };
      const res = await productCategoryService.getAll(params);
      setCategories(res.data);
      setTotal(res.pagination.total);
    } catch {
      setCategories([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Client-side column filter
  const filtered = categories.filter((c) => {
    const name = lang === "es" ? c.name?.es : c.name?.en;
    if (colName && !name?.toLowerCase().includes(colName.toLowerCase()))
      return false;
    if (colStatus === "active" && !c.isActive) return false;
    if (colStatus === "inactive" && c.isActive) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await productCategoryService.remove(id);
      fetchCategories();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Error deleting category.";
      alert(msg);
    }
  };

  const getName = (c: ProductCategory) =>
    (lang === "es" ? c.name?.es : c.name?.en) || c.name?.en || "—";

  const getDescription = (c: ProductCategory) =>
    (lang === "es" ? c.description?.es : c.description?.en) ||
    c.description?.en ||
    "";

  const pageRange = getPageRange(page, totalPages);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{l.title}</h1>
        {canWrite && (
          <button
            className={styles.addBtn}
            onClick={() => setShowAddModal(true)}
          >
            {l.addCategory}
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg
            className={styles.searchIcon}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3a6 6 0 1 0 0 12A6 6 0 0 0 9 3zM1 9a8 8 0 1 1 14.32 4.906l4.387 4.387a1 1 0 0 1-1.414 1.414l-4.387-4.387A8 8 0 0 1 1 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            className={styles.searchInput}
            placeholder={l.searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headRow}>
              <th>{l.colName}</th>
              <th>{l.colDescription}</th>
              <th>{l.colColor}</th>
              <th>{l.colStatus}</th>
              <th>{l.colActions}</th>
            </tr>
            <tr className={styles.filterRow}>
              <th>
                <input
                  className={styles.colFilter}
                  placeholder={l.filterName}
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                />
              </th>
              <th />
              <th />
              <th>
                <select
                  className={styles.colFilter}
                  value={colStatus}
                  onChange={(e) => setColStatus(e.target.value)}
                >
                  <option value="">{l.allStatuses}</option>
                  <option value="active">{l.active}</option>
                  <option value="inactive">{l.inactive}</option>
                </select>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  {l.loading}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  {l.noResults}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c._id} className={styles.bodyRow}>
                  <td className={styles.nameCell}>{getName(c)}</td>
                  <td className={styles.descCell}>{getDescription(c)}</td>
                  <td>
                    {c.color ? (
                      <span
                        className={styles.colorBadge}
                        style={{ background: c.color }}
                      >
                        {c.color}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${c.isActive ? styles.badge_active : styles.badge_inactive}`}
                    >
                      {c.isActive ? l.active : l.inactive}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.btnView}
                        onClick={() =>
                          navigate(`/product-categories/${c._id}`, {
                            state: { category: c },
                          })
                        }
                      >
                        {l.btnView}
                      </button>
                      {canWrite && (
                        <button
                          className={styles.btnUpdate}
                          onClick={() => setEditingCategory(c)}
                        >
                          {l.btnUpdate}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className={styles.btnDelete}
                          onClick={() => handleDelete(c._id)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {l.page === "Page" ? "←" : "←"}
          </button>
          <div className={styles.pageNumbers}>
            {pageRange.map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className={styles.ellipsis}>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  className={`${styles.pageNum} ${page === p ? styles.pageNumActive : ""}`}
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </button>
              ),
            )}
          </div>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            →
          </button>
          <span className={styles.pageInfo}>
            {l.page} {page} {l.of} {totalPages}
          </span>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <CategoryModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            fetchCategories();
          }}
        />
      )}
      {editingCategory && (
        <CategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSaved={() => {
            setEditingCategory(null);
            fetchCategories();
          }}
        />
      )}
    </div>
  );
}
