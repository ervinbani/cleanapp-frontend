import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { invoiceService } from "../services/invoiceService";
import type { Invoice, Customer, Job } from "../types";
import { buildWhatsAppMessage } from "../utils/invoiceWhatsApp";
import styles from "./InvoiceDetailPage.module.css";

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
    btnWhatsApp: "Send via WhatsApp",
    sendNoPhone: "Customer has no phone \u2014 add one to their profile first.",
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
    btnWhatsApp: "Enviar por WhatsApp",
    sendNoPhone:
      "El cliente no tiene tel\u00e9fono \u2014 a\u00f1ade uno a su perfil primero.",
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
    btnWhatsApp: "Invia via WhatsApp",
    sendNoPhone:
      "Il cliente non ha un numero di telefono \u2014 aggiungilo al profilo.",
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

function formatAddress(addr: unknown): string {
  if (!addr) return "—";

  // Runtime object (backend sends address as object despite type saying string)
  if (typeof addr === "object") {
    const a = addr as {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    return (
      [a.street, a.city, a.state, a.zipCode, a.country]
        .filter(Boolean)
        .join(", ") || "—"
    );
  }

  if (typeof addr === "string") {
    const s = addr.trim();
    if (!s) return "—";
    // If it's a JS-object-notation string, extract fields via regex
    if (s.startsWith("{")) {
      const extract = (key: string) => {
        const m = s.match(new RegExp(`${key}:\\s*'([^']*)'`));
        return m?.[1] || "";
      };
      const parts = [
        extract("street"),
        extract("city"),
        extract("state"),
        extract("zipCode"),
        extract("country"),
      ].filter(Boolean);
      return parts.length ? parts.join(", ") : s;
    }
    return s;
  }

  return "—";
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

  const canWrite = hasRole("owner", "director", "manager_operations");

  // ── Load invoice ──────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const hasStateData = !!stateInvoice;
    if (!hasStateData) setLoading(true);
    setLoadError("");
    invoiceService
      .getById(id)
      .then((raw) => {
        // Backend may wrap response as { success: true, data: Invoice }
        const data =
          raw && typeof raw === "object" && "success" in raw && "data" in raw
            ? (raw as unknown as { success: boolean; data: Invoice }).data
            : raw;
        setInvoice(data);
      })
      .catch(() => {
        if (!hasStateData) setLoadError(l.errorLoad);
      })
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <button
            className={styles.btnEdit}
            onClick={() =>
              navigate("/invoices", { state: { editInvoice: invoice } })
            }
          >
            {l.edit}
          </button>
        )}
        {invoice.status !== "void" &&
          (() => {
            const phone =
              typeof invoice.customerId === "object"
                ? (invoice.customerId as Customer).phone
                : undefined;
            const msg = buildWhatsAppMessage(invoice, lang);
            return (
              <button
                className={styles.btnWhatsApp}
                title={l.btnWhatsApp}
                onClick={() => {
                  if (!phone) {
                    alert(l.sendNoPhone);
                    return;
                  }
                  const clean = phone.replace(/\D/g, "");
                  const url = `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                {/* WhatsApp icon */}
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="16"
                  height="16"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {l.btnWhatsApp}
              </button>
            );
          })()}
      </div>

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
            typeof invoice.customerId === "object") &&
            (() => {
              const snap = invoice.customerSnapshot;
              const populated =
                typeof invoice.customerId === "object" &&
                invoice.customerId !== null
                  ? (invoice.customerId as Customer)
                  : null;
              const name =
                snap?.name ||
                (populated
                  ? [populated.firstName, populated.lastName]
                      .filter(Boolean)
                      .join(" ")
                  : null);
              const email = snap?.email || populated?.email;
              const addr = snap?.address || populated?.address;
              const vatNumber = snap?.vatNumber;
              return (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>{l.sectionCustomer}</h3>
                  <div className={styles.fields}>
                    {name && <Field label={l.customerName}>{name}</Field>}
                    {email && (
                      <Field label={l.customerEmail}>
                        <a href={`mailto:${email}`} className={styles.link}>
                          {email}
                        </a>
                      </Field>
                    )}
                    {addr && (
                      <Field label={l.customerAddress}>
                        {formatAddress(addr)}
                      </Field>
                    )}
                    {vatNumber && (
                      <Field label={l.customerVat}>{vatNumber}</Field>
                    )}
                  </div>
                </div>
              );
            })()}

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
