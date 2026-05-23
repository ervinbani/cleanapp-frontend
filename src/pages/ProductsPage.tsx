import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useTrans } from "../i18n";
import { useAuth } from "../contexts/AuthContext";
import { productService } from "../services/productService";
import {
  productCategoryService,
} from "../services/productCategoryService";
import type { Product, ProductCategory } from "../types";
import styles from "./ProductsPage.module.css";

const PAGE_LIMIT = 20;

function getPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// ── Product Modal ─────────────────────────────────────────────────────────────
interface ProductForm {
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  categoryId: string;
  sku: string;
  barcode: string;
  unit: string;
  unitPrice: string;
  cost: string;
  taxable: boolean;
  stockTracked: boolean;
  stockQuantity: string;
  stockLowAlert: string;
  isActive: boolean;
}

const EMPTY_FORM: ProductForm = {
  nameEn: "",
  nameEs: "",
  descriptionEn: "",
  descriptionEs: "",
  categoryId: "",
  sku: "",
  barcode: "",
  unit: "piece",
  unitPrice: "",
  cost: "",
  taxable: true,
  stockTracked: false,
  stockQuantity: "",
  stockLowAlert: "",
  isActive: true,
};

function productToForm(p: Product): ProductForm {
  const catId =
    p.categoryId && typeof p.categoryId === "object"
      ? (p.categoryId as ProductCategory)._id
      : (p.categoryId as string) ?? "";
  return {
    nameEn: p.name?.en ?? "",
    nameEs: p.name?.es ?? "",
    descriptionEn: p.description?.en ?? "",
    descriptionEs: p.description?.es ?? "",
    categoryId: catId,
    sku: p.sku ?? "",
    barcode: p.barcode ?? "",
    unit: p.unit ?? "piece",
    unitPrice: p.unitPrice != null ? String(p.unitPrice) : "",
    cost: p.cost != null ? String(p.cost) : "",
    taxable: p.taxable ?? true,
    stockTracked: p.stock?.tracked ?? false,
    stockQuantity: p.stock?.quantity != null ? String(p.stock.quantity) : "",
    stockLowAlert:
      p.stock?.lowStockAlert != null ? String(p.stock.lowStockAlert) : "",
    isActive: p.isActive,
  };
}

interface ProductModalProps {
  product?: Product;
  categories: ProductCategory[];
  onClose: () => void;
  onSaved: () => void;
}

function ProductModal({
  product,
  categories,
  onClose,
  onSaved,
}: ProductModalProps) {
  const isEdit = !!product;
  const l = useTrans("productsModal");
  const [form, setForm] = useState<ProductForm>(
    isEdit ? productToForm(product!) : EMPTY_FORM,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"en" | "es">("en");

  const set = (field: keyof ProductForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const UNITS = ["piece", "box", "liter", "kg", "gallon", "pack", "other"];
  const lUnits = useTrans("products");

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
      const payload: Partial<Product> = {
        name: {
          en: form.nameEn.trim(),
          es: form.nameEs.trim() || form.nameEn.trim(),
        },
        description: {
          en: form.descriptionEn.trim() || undefined,
          es: form.descriptionEs.trim() || undefined,
        },
        categoryId: form.categoryId || null,
        sku: form.sku.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        unit: form.unit as Product["unit"],
        unitPrice: form.unitPrice !== "" ? Number(form.unitPrice) : 0,
        cost: form.cost !== "" ? Number(form.cost) : undefined,
        taxable: form.taxable,
        stock: {
          tracked: form.stockTracked,
          quantity: form.stockQuantity !== "" ? Number(form.stockQuantity) : 0,
          lowStockAlert:
            form.stockLowAlert !== "" ? Number(form.stockLowAlert) : undefined,
        },
        isActive: form.isActive,
      };
      if (isEdit) {
        await productService.update(product!._id, payload);
      } else {
        await productService.create(payload);
      }
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Error saving product.";
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
          {/* Language tabs */}
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

          {/* Shared fields */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.sku}</label>
              <input
                className={styles.input}
                placeholder={l.skuPlaceholder}
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.barcode}</label>
              <input
                className={styles.input}
                placeholder={l.barcodePlaceholder}
                value={form.barcode}
                onChange={(e) => set("barcode", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{l.category}</label>
            <select
              className={styles.select}
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
            >
              <option value="">{l.noCategory}</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name?.en}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.unit}</label>
              <select
                className={styles.select}
                value={form.unit}
                onChange={(e) => set("unit", e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {lUnits.unitLabels[u] ?? u}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.unitPrice}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={styles.input}
                value={form.unitPrice}
                onChange={(e) => set("unitPrice", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.cost}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={styles.input}
                value={form.cost}
                onChange={(e) => set("cost", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.taxable}</label>
              <div className={styles.toggleRow}>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={form.taxable}
                    onChange={(e) => set("taxable", e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
                <span className={styles.toggleLabel}>
                  {form.taxable ? l.taxableOn : l.taxableOff}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{l.stockTracking}</label>
            <div className={styles.toggleRow}>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={form.stockTracked}
                  onChange={(e) => set("stockTracked", e.target.checked)}
                />
                <span className={styles.toggleSlider} />
              </label>
              <span className={styles.toggleLabel}>
                {form.stockTracked ? l.stockOn : l.stockOff}
              </span>
            </div>
          </div>

          {form.stockTracked && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.stockQuantity}</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={styles.input}
                  value={form.stockQuantity}
                  onChange={(e) => set("stockQuantity", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.stockLowAlert}</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={styles.input}
                  value={form.stockLowAlert}
                  onChange={(e) => set("stockLowAlert", e.target.value)}
                />
              </div>
            </div>
          )}

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

export default function ProductsPage() {
  const { lang } = useLang();
  const { hasPermission } = useAuth();
  const l = useTrans("products");

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Column filters
  const [colName, setColName] = useState("");
  const [colSku, setColSku] = useState("");
  const [colStatus, setColStatus] = useState("");
  const [colCategory, setColCategory] = useState("");

  // Categories for filter/dropdown
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const canWrite = hasPermission("products", "create");
  const canDelete = hasPermission("products", "delete");
  const navigate = useNavigate();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Load categories once
  useEffect(() => {
    productCategoryService
      .getAll({ limit: 200, isActive: true })
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.getAll({
        page,
        limit: PAGE_LIMIT,
        search: search.trim() || undefined,
        categoryId: colCategory || undefined,
      });
      setProducts(res.data);
      setTotal(res.pagination.total);
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, colCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Client-side column filter
  const filtered = products.filter((p) => {
    const name = lang === "es" ? p.name?.es : p.name?.en;
    if (colName && !name?.toLowerCase().includes(colName.toLowerCase()))
      return false;
    if (colSku && !p.sku?.toLowerCase().includes(colSku.toLowerCase()))
      return false;
    if (colStatus === "active" && !p.isActive) return false;
    if (colStatus === "inactive" && p.isActive) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await productService.remove(id);
      fetchProducts();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Error deleting product.";
      alert(msg);
    }
  };

  const getName = (p: Product) =>
    (lang === "es" ? p.name?.es : p.name?.en) || p.name?.en || "—";

  const getCategoryName = (p: Product): string => {
    if (!p.categoryId) return "—";
    if (typeof p.categoryId === "object") {
      const cat = p.categoryId as ProductCategory;
      return (lang === "es" ? cat.name?.es : cat.name?.en) || cat.name?.en || "—";
    }
    const found = categories.find((c) => c._id === p.categoryId);
    return found
      ? (lang === "es" ? found.name?.es : found.name?.en) || found.name?.en || "—"
      : "—";
  };

  const getCategoryColor = (p: Product): string | undefined => {
    if (!p.categoryId) return undefined;
    if (typeof p.categoryId === "object")
      return (p.categoryId as ProductCategory).color;
    return categories.find((c) => c._id === p.categoryId)?.color;
  };

  const getStockDisplay = (p: Product) => {
    if (!p.stock?.tracked) return l.stockNotTracked;
    const qty = p.stock.quantity ?? 0;
    const low = p.stock.lowStockAlert;
    if (low != null && qty <= low)
      return `⚠ ${qty} (${l.lowStock})`;
    return String(qty);
  };

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
            {l.addProduct}
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
        <select
          className={styles.filterSelect}
          value={colCategory}
          onChange={(e) => { setColCategory(e.target.value); setPage(1); }}
        >
          <option value="">{l.filterCategory}</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name?.en}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headRow}>
              <th>{l.colName}</th>
              <th>{l.colSku}</th>
              <th>{l.colCategory}</th>
              <th>{l.colUnit}</th>
              <th>{l.colPrice}</th>
              <th>{l.colStock}</th>
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
              <th>
                <input
                  className={styles.colFilter}
                  placeholder={l.filterSku}
                  value={colSku}
                  onChange={(e) => setColSku(e.target.value)}
                />
              </th>
              <th />
              <th />
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
                <td colSpan={8} className={styles.empty}>
                  {l.loading}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.empty}>
                  {l.noResults}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const catColor = getCategoryColor(p);
                return (
                  <tr key={p._id} className={styles.bodyRow}>
                    <td className={styles.nameCell}>{getName(p)}</td>
                    <td className={styles.skuCell}>{p.sku || "—"}</td>
                    <td>
                      {p.categoryId ? (
                        <span
                          className={styles.catBadge}
                          style={catColor ? { background: catColor } : undefined}
                        >
                          {getCategoryName(p)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{l.unitLabels[p.unit] ?? p.unit}</td>
                    <td className={styles.priceCell}>
                      {p.unitPrice != null
                        ? `${p.unitPrice.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className={styles.stockCell}>
                      {getStockDisplay(p)}
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${p.isActive ? styles.badge_active : styles.badge_inactive}`}
                      >
                        {p.isActive ? l.active : l.inactive}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.btnView}
                          onClick={() =>
                            navigate(`/products/${p._id}`, {
                              state: { product: p },
                            })
                          }
                        >
                          {l.btnView}
                        </button>
                        {canWrite && (
                          <button
                            className={styles.btnUpdate}
                            onClick={() => setEditingProduct(p)}
                          >
                            {l.btnUpdate}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className={styles.btnDelete}
                            onClick={() => handleDelete(p._id)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
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
            ←
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
        <ProductModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            fetchProducts();
          }}
        />
      )}
      {editingProduct && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
