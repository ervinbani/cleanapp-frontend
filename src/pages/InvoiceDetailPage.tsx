import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import invoiceService from "../services/invoiceService";
import type { Invoice, Customer, Job } from "../types";
import styles from "./InvoiceDetailPage.module.css";

// ─── Constants ────────────────────────────────────────────────────
const STATUS_ORDER = [
  "draft",
  "sent",
  "paid",
  "partially_paid",
  "overdue",
  "void",
] as const;
type InvoiceStatus = (typeof STATUS_ORDER)[number];

const PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "stripe",
  "paypal",
  "other",
] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const CURRENCIES = ["USD", "EUR"] as const;

// ─── Translations ─────────────────────────────────────────────────
const T = {
  en: {
    back: "← Back to Invoices",
    loading: "Loading…",
    notFound: "Invoice not found.",
    errorLoad: "Failed to load invoice.",
    edit: "Edit",
    save: "Save Changes",
    saving: "Saving…",
    cancel: "Cancel",
    editTitle: "Edit Invoice",
    sectionDetails: "Invoice Details",
    sectionCustomer: "Customer",
    sectionItems: "Line Items",
    sectionPayment: "Payment",
    sectionNotes: "Notes",
    sectionActivity: "Activity",
    invoiceNumber: "Invoice #",
    issuedDate: "Issued Date",
    dueDate: "Due Date",
    servicePeriod: "Service Period",
    currency: "Currency",
    status: "Status",
    customerName: "Name",
    customerEmail: "Email",
    customerAddress: "Address",
    customerVat: "VAT Number",
    colDescription: "Description",
    colType: "Type",
    colQty: "Qty",
    colUnit: "Unit",
    colUnitPrice: "Unit Price",
    colTotal: "Total",
    subtotal: "Subtotal",
    discount: "Discount",
    taxRate: "Tax",
    total: "Total",
    paymentMethod: "Payment Method",
    sentAt: "Sent On",
    paidAt: "Paid On",
    createdAt: "Created",
    updatedAt: "Updated",
    noNotes: "No notes.",
    none: "—",
    discountType: "Discount Type",
    discountTypePct: "Percentage (%)",
    discountTypeFixed: "Fixed amount",
    discountValue: "Discount Value",
    selectPayment: "— None —",
    selectStatus: "— Select —",
    errorSave: "Error saving invoice.",
    savedOk: "Changes saved.",
    required: "Invoice number is required.",
    pm_cash: "Cash",
    pm_card: "Card",
    pm_bank_transfer: "Bank Transfer",
    pm_stripe: "Stripe",
    pm_paypal: "PayPal",
    pm_other: "Other",
    status_draft: "Draft",
    status_sent: "Sent",
    status_paid: "Paid",
    status_partially_paid: "Partially Paid",
    status_overdue: "Overdue",
    status_void: "Void",
    linkedJobs: "Linked Jobs",
    noItems: "No items.",
  },
  es: {
    back: "← Volver a Facturas",
    loading: "Cargando…",
    notFound: "Factura no encontrada.",
    errorLoad: "Error al cargar la factura.",
    edit: "Editar",
    save: "Guardar Cambios",
    saving: "Guardando…",
    cancel: "Cancelar",
    editTitle: "Editar Factura",
    sectionDetails: "Detalles de la Factura",
    sectionCustomer: "Cliente",
    sectionItems: "Artículos",
    sectionPayment: "Pago",
    sectionNotes: "Notas",
    sectionActivity: "Actividad",
    invoiceNumber: "Factura #",
    issuedDate: "Fecha de Emisión",
    dueDate: "Fecha de Vencimiento",
    servicePeriod: "Período del Servicio",
    currency: "Moneda",
    status: "Estado",
    customerName: "Nombre",
    customerEmail: "Email",
    customerAddress: "Dirección",
    customerVat: "NIF/CIF",
    colDescription: "Descripción",
    colType: "Tipo",
    colQty: "Cant.",
    colUnit: "Unidad",
    colUnitPrice: "Precio Unit.",
    colTotal: "Total",
    subtotal: "Subtotal",
    discount: "Descuento",
    taxRate: "Impuesto",
    total: "Total",
    paymentMethod: "Método de Pago",
    sentAt: "Enviada el",
    paidAt: "Pagada el",
    createdAt: "Creado",
    updatedAt: "Actualizado",
    noNotes: "Sin notas.",
    none: "—",
    discountType: "Tipo de descuento",
    discountTypePct: "Porcentaje (%)",
    discountTypeFixed: "Monto fijo",
    discountValue: "Valor del descuento",
    selectPayment: "— Ninguno —",
    selectStatus: "— Seleccionar —",
    errorSave: "Error al guardar la factura.",
    savedOk: "Cambios guardados.",
    required: "El número de factura es obligatorio.",
    pm_cash: "Efectivo",
    pm_card: "Tarjeta",
    pm_bank_transfer: "Transferencia",
    pm_stripe: "Stripe",
    pm_paypal: "PayPal",
    pm_other: "Otro",
    status_draft: "Borrador",
    status_sent: "Enviada",
    status_paid: "Pagada",
    status_partially_paid: "Pago parcial",
    status_overdue: "Vencida",
    status_void: "Anulada",
    linkedJobs: "Trabajos vinculados",
    noItems: "Sin artículos.",
  },
  it: {
    back: "← Torna alle Fatture",
    loading: "Caricamento…",
    notFound: "Fattura non trovata.",
    errorLoad: "Errore nel caricamento della fattura.",
    edit: "Modifica",
    save: "Salva modifiche",
    saving: "Salvataggio…",
    cancel: "Annulla",
    editTitle: "Modifica Fattura",
    sectionDetails: "Dettagli Fattura",
    sectionCustomer: "Cliente",
    sectionItems: "Voci",
    sectionPayment: "Pagamento",
    sectionNotes: "Note",
    sectionActivity: "Attività",
    invoiceNumber: "Fattura #",
    issuedDate: "Data emissione",
    dueDate: "Scadenza",
    servicePeriod: "Periodo di servizio",
    currency: "Valuta",
    status: "Stato",
    customerName: "Nome",
    customerEmail: "Email",
    customerAddress: "Indirizzo",
    customerVat: "Partita IVA",
    colDescription: "Descrizione",
    colType: "Tipo",
    colQty: "Qtà",
    colUnit: "Unità",
    colUnitPrice: "Prezzo unit.",
    colTotal: "Totale",
    subtotal: "Subtotale",
    discount: "Sconto",
    taxRate: "IVA",
    total: "Totale",
    paymentMethod: "Metodo di pagamento",
    sentAt: "Inviata il",
    paidAt: "Pagata il",
    createdAt: "Creato il",
    updatedAt: "Modificato il",
    noNotes: "Nessuna nota.",
    none: "—",
    discountType: "Tipo sconto",
    discountTypePct: "Percentuale (%)",
    discountTypeFixed: "Importo fisso",
    discountValue: "Valore sconto",
    selectPayment: "— Nessuno —",
    selectStatus: "— Seleziona —",
    errorSave: "Errore nel salvataggio della fattura.",
    savedOk: "Modifiche salvate.",
    required: "Il numero fattura è obbligatorio.",
    pm_cash: "Contanti",
    pm_card: "Carta",
    pm_bank_transfer: "Bonifico",
    pm_stripe: "Stripe",
    pm_paypal: "PayPal",
    pm_other: "Altro",
    status_draft: "Bozza",
    status_sent: "Inviata",
    status_paid: "Pagata",
    status_partially_paid: "Parzialmente pagata",
    status_overdue: "Scaduta",
    status_void: "Annullata",
    linkedJobs: "Lavori collegati",
    noItems: "Nessuna voce.",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────
function formatDate(iso?: string, fallback = "—"): string {
  if (!iso) return fallback;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

function formatDateTime(iso?: string, fallback = "—"): string {
  if (!iso) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatCurrency(amount?: number, currency = "USD"): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount);
}

function getCustomerName(inv: Invoice): string {
  if (inv.customerSnapshot?.name) return inv.customerSnapshot.name;
  if (typeof inv.customerId === "object" && inv.customerId !== null) {
    const c = inv.customerId as Customer;
    return (
      [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "—"
    );
  }
  return "—";
}

// ─── Field component ──────────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{children}</span>
    </div>
  );
}

// ─── Edit form state ──────────────────────────────────────────────
interface EditForm {
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string;
  status: InvoiceStatus;
  currency: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  taxRate: string;
  paymentMethod: string;
  notes: string;
}

function invoiceToEditForm(inv: Invoice): EditForm {
  return {
    invoiceNumber: inv.invoiceNumber,
    issuedDate: inv.issuedDate ? inv.issuedDate.slice(0, 10) : "",
    dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : "",
    status: inv.status,
    currency: inv.currency ?? "USD",
    discountType: inv.discount?.type ?? "percentage",
    discountValue: String(inv.discount?.value ?? 0),
    taxRate: String(inv.taxRate ?? 0),
    paymentMethod: inv.paymentMethod ?? "",
    notes: inv.notes ?? "",
  };
}

// ─── Main component ───────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLang();
  const { hasRole } = useAuth();
  const l = T[lang as keyof typeof T] ?? T.en;

  const stateInvoice =
    (location.state as { invoice?: Invoice } | null)?.invoice ?? null;

  const [invoice, setInvoice] = useState<Invoice | null>(stateInvoice);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(!stateInvoice);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const canWrite = hasRole("owner", "director", "manager_operations");

  // ── Load invoice ──────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const hasStateData = !!stateInvoice;
    if (!hasStateData) setLoading(true);
    setLoadError("");

    invoiceService
      .getById(id)
      .then((data) => setInvoice(data))
      .catch(() => {
        if (!hasStateData) setLoadError(l.errorLoad);
      })
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start editing ─────────────────────────────────────────────
  const startEditing = () => {
    if (!invoice) return;
    setForm(invoiceToEditForm(invoice));
    setSaveError("");
    setSaveSuccess(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setForm(null);
    setSaveError("");
  };

  const set = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !invoice) return;
    if (!form.invoiceNumber.trim()) {
      setSaveError(l.required);
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const payload: Partial<Invoice> = {
        invoiceNumber: form.invoiceNumber.trim(),
        issuedDate: form.issuedDate || undefined,
        dueDate: form.dueDate || undefined,
        status: form.status,
        currency: form.currency,
        discount:
          Number(form.discountValue) > 0
            ? { type: form.discountType, value: Number(form.discountValue) }
            : undefined,
        taxRate: Number(form.taxRate),
        paymentMethod: (form.paymentMethod as PaymentMethod) || undefined,
        notes: form.notes.trim() || undefined,
      };
      const updated = await invoiceService.update(invoice._id, payload);
      setInvoice(updated);
      setEditing(false);
      setForm(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? l.errorSave;
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / error ───────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.stateMsg}>{l.loading}</p>
      </div>
    );
  }

  if (loadError || !invoice) {
    return (
      <div className={styles.page}>
        <p className={styles.errorMsg}>{loadError || l.notFound}</p>
      </div>
    );
  }

  const customerName = getCustomerName(invoice);
  const currency = invoice.currency ?? "USD";
  const statusKey = `status_${invoice.status}` as keyof typeof l;
  const statusLabel = (l[statusKey] as string) || invoice.status;

  // Linked job ids/numbers
  const jobIds: string[] = invoice.jobIds
    ? invoice.jobIds.map((j) => (typeof j === "object" ? (j as Job)._id : j))
    : invoice.jobId
      ? [
          typeof invoice.jobId === "object"
            ? (invoice.jobId as Job)._id
            : invoice.jobId,
        ]
      : [];

  // ── Edit mode ─────────────────────────────────────────────────
  if (editing && form) {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={cancelEditing}>
            {l.cancel}
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.avatarLg}>#</div>
            <div className={styles.cardHeaderText}>
              <h2 className={styles.cardTitle}>{l.editTitle}</h2>
              <p className={styles.cardSubtitle}>{customerName}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className={styles.editForm}>
            {saveError && <p className={styles.errorMsg}>{saveError}</p>}

            <h3 className={styles.sectionTitle}>{l.sectionDetails}</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {l.invoiceNumber} <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.input}
                  value={form.invoiceNumber}
                  onChange={(e) => set("invoiceNumber", e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.status}</label>
                <select
                  className={styles.input}
                  value={form.status}
                  onChange={(e) =>
                    set("status", e.target.value as InvoiceStatus)
                  }
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {(l[`status_${s}` as keyof typeof l] as string) || s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.issuedDate}</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.issuedDate}
                  onChange={(e) => set("issuedDate", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.dueDate}</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set("dueDate", e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.currency}</label>
                <select
                  className={styles.input}
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.paymentMethod}</label>
                <select
                  className={styles.input}
                  value={form.paymentMethod}
                  onChange={(e) => set("paymentMethod", e.target.value)}
                >
                  <option value="">{l.selectPayment}</option>
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {(l[`pm_${pm}` as keyof typeof l] as string) || pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.discountType}</label>
                <select
                  className={styles.input}
                  value={form.discountType}
                  onChange={(e) =>
                    set(
                      "discountType",
                      e.target.value as "percentage" | "fixed",
                    )
                  }
                >
                  <option value="percentage">{l.discountTypePct}</option>
                  <option value="fixed">{l.discountTypeFixed}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.discountValue}</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) => set("discountValue", e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.taxRate} (%)</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.taxRate}
                  onChange={(e) => set("taxRate", e.target.value)}
                />
              </div>
            </div>

            <h3 className={styles.sectionTitle}>{l.sectionNotes}</h3>
            <div className={styles.formGroup}>
              <textarea
                className={styles.textarea}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={4}
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={cancelEditing}
                disabled={saving}
              >
                {l.cancel}
              </button>
              <button
                type="submit"
                className={styles.btnSave}
                disabled={saving}
              >
                {saving ? l.saving : l.save}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── View mode ─────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate("/invoices")}
        >
          {l.back}
        </button>
        {canWrite && (
          <button className={styles.btnEdit} onClick={startEditing}>
            {l.edit}
          </button>
        )}
      </div>

      {saveSuccess && <div className={styles.successBanner}>{l.savedOk}</div>}

      <div className={styles.card}>
        {/* Card Header */}
        <div className={styles.cardHeader}>
          <div className={styles.avatarLg}>#</div>
          <div className={styles.cardHeaderText}>
            <h2 className={styles.cardTitle}>{invoice.invoiceNumber}</h2>
            <p className={styles.cardSubtitle}>{customerName}</p>
          </div>
          <div className={styles.headerBadges}>
            <span
              className={`${styles.badge} ${
                styles[`badge_${invoice.status}` as keyof typeof styles] ?? ""
              }`}
            >
              {statusLabel}
            </span>
            <span className={styles.totalBig}>
              {formatCurrency(invoice.total, currency)}
            </span>
          </div>
        </div>

        <div className={styles.sections}>
          {/* Invoice Details */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionDetails}</h3>
            <div className={styles.fields}>
              <Field label={l.invoiceNumber}>{invoice.invoiceNumber}</Field>
              <Field label={l.issuedDate}>
                {formatDate(invoice.issuedDate)}
              </Field>
              <Field label={l.dueDate}>{formatDate(invoice.dueDate)}</Field>
              <Field label={l.currency}>{currency}</Field>
              {invoice.servicePeriod && (
                <Field label={l.servicePeriod}>
                  {formatDate(invoice.servicePeriod.from)} →{" "}
                  {formatDate(invoice.servicePeriod.to)}
                </Field>
              )}
              {jobIds.length > 0 && (
                <Field label={l.linkedJobs}>{jobIds.length}</Field>
              )}
            </div>
          </div>

          {/* Customer */}
          {(invoice.customerSnapshot ||
            typeof invoice.customerId === "object") && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>{l.sectionCustomer}</h3>
              <div className={styles.fields}>
                {invoice.customerSnapshot?.name && (
                  <Field label={l.customerName}>
                    {invoice.customerSnapshot.name}
                  </Field>
                )}
                {invoice.customerSnapshot?.email && (
                  <Field label={l.customerEmail}>
                    <a
                      href={`mailto:${invoice.customerSnapshot.email}`}
                      className={styles.link}
                    >
                      {invoice.customerSnapshot.email}
                    </a>
                  </Field>
                )}
                {invoice.customerSnapshot?.address && (
                  <Field label={l.customerAddress}>
                    {invoice.customerSnapshot.address}
                  </Field>
                )}
                {invoice.customerSnapshot?.vatNumber && (
                  <Field label={l.customerVat}>
                    {invoice.customerSnapshot.vatNumber}
                  </Field>
                )}
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionItems}</h3>
            {invoice.items && invoice.items.length > 0 ? (
              <>
                <div className={styles.itemsTable}>
                  <div className={`${styles.itemsRow} ${styles.itemsHead}`}>
                    <span>{l.colDescription}</span>
                    <span>{l.colType}</span>
                    <span className={styles.right}>{l.colQty}</span>
                    <span>{l.colUnit}</span>
                    <span className={styles.right}>{l.colUnitPrice}</span>
                    <span className={styles.right}>{l.colTotal}</span>
                  </div>
                  {invoice.items.map((item, i) => (
                    <div key={i} className={styles.itemsRow}>
                      <span>{item.description || l.none}</span>
                      <span>{item.serviceType || l.none}</span>
                      <span className={styles.right}>
                        {item.quantity ?? l.none}
                      </span>
                      <span>{item.unit || l.none}</span>
                      <span className={styles.right}>
                        {formatCurrency(item.unitPrice, currency)}
                      </span>
                      <span className={styles.right}>
                        {formatCurrency(item.total, currency)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className={styles.totals}>
                  {invoice.subtotal != null && (
                    <div className={styles.totalsRow}>
                      <span className={styles.totalsLabel}>{l.subtotal}</span>
                      <span className={styles.totalsValue}>
                        {formatCurrency(invoice.subtotal, currency)}
                      </span>
                    </div>
                  )}
                  {invoice.discount && invoice.discount.value > 0 && (
                    <div className={styles.totalsRow}>
                      <span className={styles.totalsLabel}>
                        {l.discount}{" "}
                        {invoice.discount.type === "percentage"
                          ? `(${invoice.discount.value}%)`
                          : ""}
                      </span>
                      <span className={styles.totalsValue}>
                        −{" "}
                        {invoice.discount.type === "percentage"
                          ? `${invoice.discount.value}%`
                          : formatCurrency(
                              invoice.discount.amount ?? invoice.discount.value,
                              currency,
                            )}
                      </span>
                    </div>
                  )}
                  {invoice.taxRate != null && invoice.taxRate > 0 && (
                    <div className={styles.totalsRow}>
                      <span className={styles.totalsLabel}>
                        {l.taxRate} ({invoice.taxRate}%)
                      </span>
                      <span className={styles.totalsValue}>
                        {formatCurrency(invoice.tax, currency)}
                      </span>
                    </div>
                  )}
                  {invoice.total != null && (
                    <div className={`${styles.totalsRow} ${styles.grandTotal}`}>
                      <span className={styles.totalsLabel}>{l.total}</span>
                      <span className={styles.totalsValue}>
                        {formatCurrency(invoice.total, currency)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className={styles.emptyMsg}>{l.noItems}</p>
            )}
          </div>

          {/* Payment */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionPayment}</h3>
            <div className={styles.fields}>
              <Field label={l.status}>
                <span
                  className={`${styles.badge} ${
                    styles[`badge_${invoice.status}` as keyof typeof styles] ??
                    ""
                  }`}
                >
                  {statusLabel}
                </span>
              </Field>
              {invoice.paymentMethod && (
                <Field label={l.paymentMethod}>
                  {(l[
                    `pm_${invoice.paymentMethod}` as keyof typeof l
                  ] as string) || invoice.paymentMethod}
                </Field>
              )}
              {invoice.sentAt && (
                <Field label={l.sentAt}>{formatDateTime(invoice.sentAt)}</Field>
              )}
              {invoice.paidAt && (
                <Field label={l.paidAt}>{formatDateTime(invoice.paidAt)}</Field>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionNotes}</h3>
            {invoice.notes ? (
              <p className={styles.notesText}>{invoice.notes}</p>
            ) : (
              <p className={styles.emptyMsg}>{l.noNotes}</p>
            )}
          </div>

          {/* Activity */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{l.sectionActivity}</h3>
            <div className={styles.fields}>
              <Field label={l.createdAt}>
                {formatDateTime(invoice.createdAt)}
              </Field>
              <Field label={l.updatedAt}>
                {formatDateTime(invoice.updatedAt)}
              </Field>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
