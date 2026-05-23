import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { productService } from "../services/productService";
import { productCategoryService } from "../services/productCategoryService";
import type { Product, ProductCategory, ProductUnit } from "../types";
import styles from "./ProductDetailPage.module.css";

const T = {
  en: {
    back: "← Products",
    editBtn: "Edit",
    cancelBtn: "Cancel",
    saveBtn: "Save Changes",
    saving: "Saving…",
    loading: "Loading…",
    error: "Failed to load product.",
    saved: "Changes saved.",
    noCategory: "No category",
    nameEn: "Name (EN)",
    nameEs: "Name (ES)",
    descEn: "Description (EN)",
    descEs: "Description (ES)",
    sku: "SKU",
    barcode: "Barcode",
    category: "Category",
    unit: "Unit",
    unitPrice: "Unit Price",
    cost: "Cost",
    taxable: "Taxable",
    stockTracking: "Stock Tracking",
    stockQuantity: "Stock Quantity",
    stockLowAlert: "Low Stock Alert",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    yes: "Yes",
    no: "No",
    notSet: "—",
    details: "Product Details",
    pricing: "Pricing & Stock",
    unitLabels: {
      piece: "Piece",
      box: "Box",
      liter: "Liter",
      kg: "Kg",
      gallon: "Gallon",
      pack: "Pack",
      other: "Other",
    } as Record<string, string>,
  },
  es: {
    back: "← Productos",
    editBtn: "Editar",
    cancelBtn: "Cancelar",
    saveBtn: "Guardar cambios",
    saving: "Guardando…",
    loading: "Cargando…",
    error: "Error al cargar el producto.",
    saved: "Cambios guardados.",
    noCategory: "Sin categoría",
    nameEn: "Nombre (EN)",
    nameEs: "Nombre (ES)",
    descEn: "Descripción (EN)",
    descEs: "Descripción (ES)",
    sku: "SKU",
    barcode: "Código de barras",
    category: "Categoría",
    unit: "Unidad",
    unitPrice: "Precio unitario",
    cost: "Costo",
    taxable: "Impuesto",
    stockTracking: "Control de stock",
    stockQuantity: "Cantidad en stock",
    stockLowAlert: "Alerta bajo stock",
    status: "Estado",
    active: "Activo",
    inactive: "Inactivo",
    yes: "Sí",
    no: "No",
    notSet: "—",
    details: "Detalles del producto",
    pricing: "Precios y stock",
    unitLabels: {
      piece: "Pieza",
      box: "Caja",
      liter: "Litro",
      kg: "Kg",
      gallon: "Galón",
      pack: "Pack",
      other: "Otro",
    } as Record<string, string>,
  },
  it: {
    back: "← Prodotti",
    editBtn: "Modifica",
    cancelBtn: "Annulla",
    saveBtn: "Salva modifiche",
    saving: "Salvataggio…",
    loading: "Caricamento…",
    error: "Errore nel caricamento del prodotto.",
    saved: "Modifiche salvate.",
    noCategory: "Nessuna categoria",
    nameEn: "Nome (EN)",
    nameEs: "Nome (ES)",
    descEn: "Descrizione (EN)",
    descEs: "Descrizione (ES)",
    sku: "SKU",
    barcode: "Codice a barre",
    category: "Categoria",
    unit: "Unità",
    unitPrice: "Prezzo unitario",
    cost: "Costo",
    taxable: "IVA",
    stockTracking: "Gestione magazzino",
    stockQuantity: "Quantità in stock",
    stockLowAlert: "Scorta minima",
    status: "Stato",
    active: "Attivo",
    inactive: "Inattivo",
    yes: "Sì",
    no: "No",
    notSet: "—",
    details: "Dettagli prodotto",
    pricing: "Prezzi e magazzino",
    unitLabels: {
      piece: "Pezzo",
      box: "Scatola",
      liter: "Litro",
      kg: "Kg",
      gallon: "Gallone",
      pack: "Confezione",
      other: "Altro",
    } as Record<string, string>,
  },
  sq: {
    back: "← Produktet",
    editBtn: "Ndrysho",
    cancelBtn: "Anulo",
    saveBtn: "Ruaj ndryshimet",
    saving: "Duke ruajtur…",
    loading: "Duke ngarkuar…",
    error: "Gabim në ngarkimin e produktit.",
    saved: "Ndryshimet u ruajtën.",
    noCategory: "Pa kategori",
    nameEn: "Emri (EN)",
    nameEs: "Emri (ES)",
    descEn: "Përshkrim (EN)",
    descEs: "Përshkrim (ES)",
    sku: "SKU",
    barcode: "Barkod",
    category: "Kategoria",
    unit: "Njësia",
    unitPrice: "Çmimi për njësi",
    cost: "Kosto",
    taxable: "Tatim",
    stockTracking: "Monitorim stoku",
    stockQuantity: "Sasia në magazinë",
    stockLowAlert: "Alarm stok të ulët",
    status: "Statusi",
    active: "Aktiv",
    inactive: "Joaktiv",
    yes: "Po",
    no: "Jo",
    notSet: "—",
    details: "Detaje produkti",
    pricing: "Çmime & magazinë",
    unitLabels: {
      piece: "Copë",
      box: "Kuti",
      liter: "Litër",
      kg: "Kg",
      gallon: "Galon",
      pack: "Paketë",
      other: "Tjetër",
    } as Record<string, string>,
  },
};

const UNITS: ProductUnit[] = [
  "piece",
  "box",
  "liter",
  "kg",
  "gallon",
  "pack",
  "other",
];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation() as { state?: { product?: Product } };
  const navigate = useNavigate();
  const { lang } = useLang();
  const { hasPermission } = useAuth();

  const l = T[lang as keyof typeof T] ?? T.en;
  const canEdit = hasPermission("products", "update");

  const [product, setProduct] = useState<Product | null>(
    state?.product ?? null,
  );
  const [loading, setLoading] = useState(!state?.product);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // Categories for select
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // Form state
  const [nameEn, setNameEn] = useState("");
  const [nameEs, setNameEs] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descEs, setDescEs] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState<ProductUnit>("piece");
  const [unitPrice, setUnitPrice] = useState("");
  const [cost, setCost] = useState("");
  const [taxable, setTaxable] = useState(true);
  const [stockTracked, setStockTracked] = useState(false);
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockLowAlert, setStockLowAlert] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    productCategoryService
      .getAll({ limit: 200 })
      .then((r) => setCategories(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!product && id) {
      setLoading(true);
      productService
        .getById(id)
        .then((p) => setProduct(p))
        .catch(() => setError(l.error))
        .finally(() => setLoading(false));
    }
  }, [id, product, l.error]);

  const populateForm = (p: Product) => {
    const catId =
      p.categoryId && typeof p.categoryId === "object"
        ? (p.categoryId as ProductCategory)._id
        : (p.categoryId as string) ?? "";
    setNameEn(p.name?.en ?? "");
    setNameEs(p.name?.es ?? "");
    setDescEn(p.description?.en ?? "");
    setDescEs(p.description?.es ?? "");
    setSku(p.sku ?? "");
    setBarcode(p.barcode ?? "");
    setCategoryId(catId);
    setUnit(p.unit ?? "piece");
    setUnitPrice(p.unitPrice != null ? String(p.unitPrice) : "");
    setCost(p.cost != null ? String(p.cost) : "");
    setTaxable(p.taxable ?? true);
    setStockTracked(p.stock?.tracked ?? false);
    setStockQuantity(
      p.stock?.quantity != null ? String(p.stock.quantity) : "",
    );
    setStockLowAlert(
      p.stock?.lowStockAlert != null ? String(p.stock.lowStockAlert) : "",
    );
    setIsActive(p.isActive);
  };

  const handleEdit = () => {
    if (product) populateForm(product);
    setFormError("");
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setFormError("");
  };

  const handleSave = async () => {
    if (!nameEn.trim()) {
      setFormError("Name (EN) is required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload: Partial<Product> = {
        name: {
          en: nameEn.trim(),
          es: nameEs.trim() || nameEn.trim(),
        },
        description: {
          en: descEn.trim() || undefined,
          es: descEs.trim() || undefined,
        },
        categoryId: categoryId || null,
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        unit,
        unitPrice: unitPrice !== "" ? Number(unitPrice) : 0,
        cost: cost !== "" ? Number(cost) : undefined,
        taxable,
        stock: {
          tracked: stockTracked,
          quantity: stockQuantity !== "" ? Number(stockQuantity) : 0,
          lowStockAlert:
            stockLowAlert !== "" ? Number(stockLowAlert) : undefined,
        },
        isActive,
      };
      const updated = await productService.update(id!, payload);
      setProduct(updated);
      setEditing(false);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Error saving product.";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryDisplay = (p: Product): string => {
    if (!p.categoryId) return l.noCategory;
    if (typeof p.categoryId === "object") {
      const cat = p.categoryId as ProductCategory;
      return (lang === "es" ? cat.name?.es : cat.name?.en) || cat.name?.en || "—";
    }
    const found = categories.find((c) => c._id === p.categoryId);
    return found
      ? (lang === "es" ? found.name?.es : found.name?.en) || found.name?.en || "—"
      : "—";
  };

  if (loading) return <div className={styles.loading}>{l.loading}</div>;
  if (error || !product)
    return <div className={styles.error}>{error || l.error}</div>;

  const displayName =
    (lang === "es" ? product.name?.es : product.name?.en) ||
    product.name?.en ||
    "—";

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <button className={styles.backLink} onClick={() => navigate("/products")}>
          {l.back}
        </button>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{displayName}</h1>
          <span
            className={`${styles.badge} ${product.isActive ? styles.badge_active : styles.badge_inactive}`}
          >
            {product.isActive ? l.active : l.inactive}
          </span>
        </div>
        {canEdit && !editing && (
          <button className={styles.editBtn} onClick={handleEdit}>
            {l.editBtn}
          </button>
        )}
      </div>

      {savedOk && <div className={styles.savedBanner}>{l.saved}</div>}

      {!editing ? (
        /* ── View mode ── */
        <>
          <div className={styles.card}>
            <p className={styles.sectionTitle}>{l.details}</p>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{l.nameEn}</span>
                <span className={styles.fieldValue}>
                  {product.name?.en || l.notSet}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{l.nameEs}</span>
                <span className={styles.fieldValue}>
                  {product.name?.es || l.notSet}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{l.descEn}</span>
                <span className={styles.fieldValue}>
                  {product.description?.en || l.notSet}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{l.descEs}</span>
                <span className={styles.fieldValue}>
                  {product.description?.es || l.notSet}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{l.sku}</span>
                <span className={styles.fieldValue}>
                  {product.sku || l.notSet}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{l.barcode}</span>
                <span className={styles.fieldValue}>
                  {product.barcode || l.notSet}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{l.category}</span>
                <span className={styles.fieldValue}>
                  {getCategoryDisplay(product)}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{l.unit}</span>
                <span className={styles.fieldValue}>
                  {l.unitLabels[product.unit] ?? product.unit}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <p className={styles.sectionTitle}>{l.pricing}</p>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{l.unitPrice}</span>
                <span className={styles.fieldValue}>
                  {product.unitPrice != null
                    ? product.unitPrice.toFixed(2)
                    : l.notSet}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{l.cost}</span>
                <span className={styles.fieldValue}>
                  {product.cost != null ? product.cost.toFixed(2) : l.notSet}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{l.taxable}</span>
                <span className={styles.fieldValue}>
                  {product.taxable ? l.yes : l.no}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{l.stockTracking}</span>
                <span className={styles.fieldValue}>
                  {product.stock?.tracked ? l.yes : l.no}
                </span>
              </div>
              {product.stock?.tracked && (
                <>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>{l.stockQuantity}</span>
                    <span className={styles.fieldValue}>
                      {product.stock?.quantity ?? l.notSet}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>{l.stockLowAlert}</span>
                    <span className={styles.fieldValue}>
                      {product.stock?.lowStockAlert ?? l.notSet}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        /* ── Edit mode ── */
        <div className={styles.card}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.nameEn}</label>
              <input
                className={styles.input}
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.nameEs}</label>
              <input
                className={styles.input}
                value={nameEs}
                onChange={(e) => setNameEs(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.descEn}</label>
              <textarea
                className={styles.textarea}
                rows={3}
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.descEs}</label>
              <textarea
                className={styles.textarea}
                rows={3}
                value={descEs}
                onChange={(e) => setDescEs(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.sku}</label>
              <input
                className={styles.input}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.barcode}</label>
              <input
                className={styles.input}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.category}</label>
              <select
                className={styles.select}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">{l.noCategory}</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name?.en}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.unit}</label>
              <select
                className={styles.select}
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {l.unitLabels[u] ?? u}
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
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.cost}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={styles.input}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.taxable}</label>
              <div className={styles.toggleRow}>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={taxable}
                    onChange={(e) => setTaxable(e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
                <span className={styles.toggleLabel}>
                  {taxable ? l.yes : l.no}
                </span>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.stockTracking}</label>
              <div className={styles.toggleRow}>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={stockTracked}
                    onChange={(e) => setStockTracked(e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
                <span className={styles.toggleLabel}>
                  {stockTracked ? l.yes : l.no}
                </span>
              </div>
            </div>
            {stockTracked && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{l.stockQuantity}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={styles.input}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{l.stockLowAlert}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={styles.input}
                    value={stockLowAlert}
                    onChange={(e) => setStockLowAlert(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.status}</label>
              <div className={styles.toggleRow}>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
                <span className={styles.toggleLabel}>
                  {isActive ? l.active : l.inactive}
                </span>
              </div>
            </div>
          </div>

          {formError && <p className={styles.formError}>{formError}</p>}
          <div className={styles.formActions}>
            <button
              className={styles.btnCancel}
              onClick={handleCancel}
              disabled={saving}
            >
              {l.cancelBtn}
            </button>
            <button
              className={styles.btnSave}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? l.saving : l.saveBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
