import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { invoiceService } from "../services/invoiceService";
import apiClient from "../services/apiClient";
import type { Invoice, InvoiceStatus, Customer } from "../types";
import { jobService } from "../services/jobService";
import RichTextEditor from "../components/RichTextEditor";
import styles from "./InvoicesPage.module.css";

const PAGE_LIMIT = 20;

function getPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function formatDate(iso: string | undefined, lang: "en" | "es"): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCustomer(inv: Invoice): Customer | null {
  if (typeof inv.customerId === "object" && inv.customerId !== null)
    return inv.customerId as Customer;
  return null;
}

const STATUS_ORDER: InvoiceStatus[] = [
  "draft",
  "sent",
  "paid",
  "partially_paid",
  "overdue",
  "void",
];

const PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "stripe",
  "paypal",
  "other",
] as const;

const CURRENCIES = ["USD", "EUR"] as const;

const t = {
  en: {
    title: "Invoices",
    addInvoice: "+ Add Invoice",
    searchPlaceholder: "Search invoices...",
    colNumber: "Invoice #",
    colCustomer: "Customer",
    colIssued: "Issued",
    colDue: "Due Date",
    colTotal: "Total",
    colStatus: "Status",
    colActions: "Actions",
    btnView: "View",
    btnUpdate: "Update",
    allStatuses: "All statuses",
    filterNumber: "Filter number…",
    filterCustomer: "Filter customer…",
    filterStatus: "Filter status…",
    prev: "← Prev",
    next: "Next →",
    noResults: "No invoices found.",
    loading: "Loading…",
    page: "Page",
    of: "of",
    status_draft: "Draft",
    status_sent: "Sent",
    status_paid: "Paid",
    status_partially_paid: "Partially Paid",
    status_overdue: "Overdue",
    status_void: "Void",
    exportExcel: "Export Excel",
    exportPdf: "Export PDF",
  },
  es: {
    title: "Facturas",
    addInvoice: "+ Agregar Factura",
    searchPlaceholder: "Buscar facturas...",
    colNumber: "Factura #",
    colCustomer: "Cliente",
    colIssued: "Emitida",
    colDue: "Vencimiento",
    colTotal: "Total",
    colStatus: "Estado",
    colActions: "Acciones",
    btnView: "Ver",
    btnUpdate: "Editar",
    allStatuses: "Todos los estados",
    filterNumber: "Filtrar número…",
    filterCustomer: "Filtrar cliente…",
    filterStatus: "Filtrar estado…",
    prev: "← Prev",
    next: "Siguiente →",
    noResults: "No se encontraron facturas.",
    loading: "Cargando…",
    page: "Página",
    of: "de",
    status_draft: "Borrador",
    status_sent: "Enviada",
    status_paid: "Pagada",
    status_partially_paid: "Pago Parcial",
    status_overdue: "Vencida",
    status_void: "Anulada",
    exportExcel: "Exportar Excel",
    exportPdf: "Exportar PDF",
  },
};

// ── Invoice Form (inline) ────────────────────────────────────────────────
interface ItemForm {
  description: string;
  serviceType: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  priceUnit: string;
}

interface InvoiceForm {
  customerId: string;
  jobIds: string[];
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string;
  servicePeriodFrom: string;
  servicePeriodTo: string;
  status: InvoiceStatus;
  currency: string;
  discount: string;
  taxRate: string;
  paymentMethod: string;
  notes: string;
  items: ItemForm[];
}

const EMPTY_ITEM: ItemForm = {
  description: "",
  serviceType: "",
  quantity: "1",
  unit: "hours",
  unitPrice: "",
  priceUnit: "per_job",
};

const EMPTY_FORM: InvoiceForm = {
  customerId: "",
  jobIds: [],
  invoiceNumber: "",
  issuedDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  servicePeriodFrom: "",
  servicePeriodTo: "",
  status: "draft",
  currency: "USD",
  discount: "0",
  taxRate: "0",
  paymentMethod: "",
  notes: "",
  items: [{ ...EMPTY_ITEM }],
};

function invoiceToForm(inv: Invoice): InvoiceForm {
  const customerId =
    typeof inv.customerId === "object"
      ? (inv.customerId as Customer)._id
      : inv.customerId;
  // Support both old jobId (single) and new jobIds (array)
  const jobIds: string[] = inv.jobIds
    ? inv.jobIds.map((j) =>
        typeof j === "object" ? (j as { _id: string })._id : j,
      )
    : inv.jobId
      ? [
          typeof inv.jobId === "object"
            ? (inv.jobId as { _id: string })._id
            : inv.jobId,
        ]
      : [];
  return {
    customerId,
    jobIds,
    invoiceNumber: inv.invoiceNumber,
    issuedDate: inv.issuedDate ? inv.issuedDate.slice(0, 10) : "",
    dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : "",
    servicePeriodFrom: inv.servicePeriod?.from
      ? inv.servicePeriod.from.slice(0, 10)
      : "",
    servicePeriodTo: inv.servicePeriod?.to
      ? inv.servicePeriod.to.slice(0, 10)
      : "",
    status: inv.status,
    currency: inv.currency ?? "USD",
    discount: String(inv.discount ?? 0),
    taxRate: String(inv.taxRate ?? 0),
    paymentMethod: inv.paymentMethod ?? "",
    notes: inv.notes ?? "",
    items: inv.items.length
      ? inv.items.map((it) => ({
          description: it.description ?? "",
          serviceType: it.serviceType ?? "",
          quantity: String(it.quantity ?? 1),
          unit: it.unit ?? "hours",
          unitPrice: String(it.unitPrice ?? ""),
          priceUnit: "per_job",
        }))
      : [{ ...EMPTY_ITEM }],
  };
}

const formT = {
  en: {
    addTitle: "Add Invoice",
    editTitle: "Edit Invoice",
    customer: "Customer *",
    selectCustomer: "— Select customer —",
    invoiceNumber: "Invoice Number *",
    issuedDate: "Issued Date",
    dueDate: "Due Date",
    status: "Status",
    currency: "Currency",
    discount: "Discount (€)",
    taxRate: "Tax Rate (%)",
    paymentMethod: "Payment Method",
    selectPayment: "— None —",
    notes: "Notes",
    servicePeriod: "Service Period",
    from: "From",
    to: "To",
    itemsSection: "Items",
    description: "Description",
    serviceType: "Type",
    priceUnit: "Price Type",
    priceUnitLabels: { per_hour: "Hourly", per_job: "Fixed", per_day: "Daily" },
    quantity: "Qty",
    unit: "Unit",
    unitPrice: "Unit Price",
    lineTotal: "Total",
    addItem: "+ Add Item",
    cancel: "Cancel",
    save: "Save",
    update: "Update",
    downloadPdf: "Download PDF",
    required: "Customer and Invoice Number are required.",
    loadingOpts: "Loading options…",
    linkedJob: "Linked Jobs",
    selectJob: "— Add a job —",
    noJobs: "No jobs for this customer",
    pm_cash: "Cash",
    pm_card: "Card",
    pm_bank_transfer: "Bank Transfer",
    pm_stripe: "Stripe",
    pm_paypal: "PayPal",
    pm_other: "Other",
  },
  es: {
    addTitle: "Agregar Factura",
    editTitle: "Editar Factura",
    customer: "Cliente *",
    selectCustomer: "— Seleccionar cliente —",
    invoiceNumber: "Número de Factura *",
    issuedDate: "Fecha de Emisión",
    dueDate: "Fecha de Vencimiento",
    status: "Estado",
    currency: "Moneda",
    discount: "Descuento (€)",
    taxRate: "Tasa de Impuesto (%)",
    paymentMethod: "Método de Pago",
    selectPayment: "— Ninguno —",
    notes: "Notas",
    servicePeriod: "Período del Servicio",
    from: "Desde",
    to: "Hasta",
    itemsSection: "Artículos",
    description: "Descripción",
    serviceType: "Tipo",
    priceUnit: "Tipo precio",
    priceUnitLabels: {
      per_hour: "Por hora",
      per_job: "Fijo",
      per_day: "Por día",
    },
    quantity: "Cant.",
    unit: "Unidad",
    unitPrice: "Precio Unit.",
    lineTotal: "Total",
    addItem: "+ Agregar Artículo",
    cancel: "Cancelar",
    save: "Guardar",
    update: "Actualizar",
    downloadPdf: "Descargar PDF",
    required: "El cliente y el número de factura son obligatorios.",
    loadingOpts: "Cargando opciones…",
    linkedJob: "Trabajos vinculados",
    selectJob: "— Agregar trabajo —",
    noJobs: "Sin trabajos para este cliente",
    pm_cash: "Efectivo",
    pm_card: "Tarjeta",
    pm_bank_transfer: "Transferencia",
    pm_stripe: "Stripe",
    pm_paypal: "PayPal",
    pm_other: "Otro",
  },
};

interface DropdownCustomer {
  _id: string;
  firstName: string;
  lastName: string;
}

interface DropdownJob {
  _id: string;
  title?: string;
  scheduledStart: string;
  price?: number;
  priceUnit?: string;
  timeDuration?: number;
}

interface InvoiceFormProps {
  invoice?: Invoice;
  lang: "en" | "es";
  onClose: () => void;
  onSaved: () => void;
}

function InvoiceFormSection({
  invoice,
  lang,
  onClose,
  onSaved,
}: InvoiceFormProps) {
  const isEdit = !!invoice;
  const l = formT[lang];
  const [form, setForm] = useState<InvoiceForm>(
    isEdit ? invoiceToForm(invoice!) : EMPTY_FORM,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<DropdownCustomer[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [jobs, setJobs] = useState<DropdownJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  useEffect(() => {
    apiClient
      .get("/customers", { params: { limit: 200 } })
      .then((res) => {
        setCustomers((res.data as { data: DropdownCustomer[] }).data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingOptions(false));
  }, []);

  useEffect(() => {
    if (!form.customerId) {
      setJobs([]);
      return;
    }
    setLoadingJobs(true);
    jobService
      .getAll({ customerId: form.customerId, limit: 200 })
      .then((res) => setJobs(res.data as unknown as DropdownJob[]))
      .catch(() => setJobs([]))
      .finally(() => setLoadingJobs(false));
  }, [form.customerId]);

  const set = <K extends keyof InvoiceForm>(field: K, value: InvoiceForm[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateItem = (idx: number, field: keyof ItemForm, value: string) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) =>
        i === idx ? { ...it, [field]: value } : it,
      ),
    }));

  const addItem = () =>
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));

  const removeItem = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));

  // Compute totals
  const itemTotals = form.items.map((it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unitPrice) || 0;
    return qty * price;
  });
  const subtotal = itemTotals.reduce((s, v) => s + v, 0);
  const discount = parseFloat(form.discount) || 0;
  const taxRate = parseFloat(form.taxRate) || 0;
  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * (taxRate / 100);
  const total = afterDiscount + tax;

  const handleDownloadPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text("INVOICE", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`# ${form.invoiceNumber}`, 14, 30);

    // Customer name
    const customerName = customers.find((c) => c._id === form.customerId);
    if (customerName) {
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(
        `${l.customer.replace(" *", "")}: ${customerName.firstName} ${customerName.lastName}`,
        14,
        40,
      );
    }

    // Dates
    let yPos = 48;
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    if (form.issuedDate) {
      doc.text(`${l.issuedDate}: ${form.issuedDate}`, 14, yPos);
      yPos += 6;
    }
    if (form.dueDate) {
      doc.text(`${l.dueDate}: ${form.dueDate}`, 14, yPos);
      yPos += 6;
    }
    if (form.servicePeriodFrom || form.servicePeriodTo) {
      doc.text(
        `${l.servicePeriod}: ${form.servicePeriodFrom || "—"} → ${form.servicePeriodTo || "—"}`,
        14,
        yPos,
      );
      yPos += 6;
    }

    // Status + Payment
    const statusLabel =
      t[lang][`status_${form.status}` as keyof (typeof t)["en"]] ?? form.status;
    doc.text(`${l.status}: ${statusLabel}`, 14, yPos);
    yPos += 6;
    if (form.paymentMethod) {
      const pmLabel =
        (l[`pm_${form.paymentMethod}` as keyof typeof l] as
          | string
          | undefined) ?? form.paymentMethod;
      doc.text(`${l.paymentMethod}: ${pmLabel}`, 14, yPos);
      yPos += 6;
    }

    yPos += 4;

    // Items table
    autoTable(doc, {
      startY: yPos,
      head: [
        [l.description, l.serviceType, l.quantity, l.unitPrice, l.lineTotal],
      ],
      body: form.items
        .filter((it) => it.description.trim() || parseFloat(it.unitPrice) > 0)
        .map((it, i) => [
          it.description,
          it.serviceType || "—",
          it.quantity,
          parseFloat(it.unitPrice).toFixed(2),
          itemTotals[i].toFixed(2),
        ]),
      headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 255] },
    });

    // Totals
    const finalY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);

    const rightX = 196;
    let tY = finalY;
    doc.text("Subtotal:", rightX - 50, tY, { align: "right" });
    doc.text(`${subtotal.toFixed(2)} ${form.currency}`, rightX, tY, {
      align: "right",
    });
    tY += 6;
    doc.text(`${l.discount}:`, rightX - 50, tY, { align: "right" });
    doc.text(`-${discount.toFixed(2)} ${form.currency}`, rightX, tY, {
      align: "right",
    });
    tY += 6;
    doc.text(`${l.taxRate}:`, rightX - 50, tY, { align: "right" });
    doc.text(`${tax.toFixed(2)} ${form.currency}`, rightX, tY, {
      align: "right",
    });
    tY += 8;
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text("Total:", rightX - 50, tY, { align: "right" });
    doc.text(`${total.toFixed(2)} ${form.currency}`, rightX, tY, {
      align: "right",
    });

    // Notes
    if (form.notes.trim()) {
      tY += 14;
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(`${l.notes}:`, 14, tY);
      tY += 5;
      doc.setTextColor(55, 65, 81);
      const lines = doc.splitTextToSize(form.notes, 180);
      doc.text(lines, 14, tY);
    }

    doc.save(`invoice-${form.invoiceNumber || "draft"}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.invoiceNumber.trim()) {
      setError(l.required);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        customerId: form.customerId,
        jobIds: form.jobIds.length ? form.jobIds : undefined,
        jobId: form.jobIds[0] || undefined,
        invoiceNumber: form.invoiceNumber.trim(),
        issuedDate: form.issuedDate || undefined,
        dueDate: form.dueDate || undefined,
        servicePeriod:
          form.servicePeriodFrom || form.servicePeriodTo
            ? {
                from: form.servicePeriodFrom || undefined,
                to: form.servicePeriodTo || undefined,
              }
            : undefined,
        status: form.status,
        currency: form.currency,
        discount,
        taxRate,
        tax,
        subtotal,
        total,
        paymentMethod: form.paymentMethod || undefined,
        notes: form.notes.trim() || undefined,
        items: form.items
          .filter((it) => it.description.trim() || parseFloat(it.unitPrice) > 0)
          .map((it, i) => ({
            description: it.description.trim(),
            serviceType: it.serviceType.trim() || undefined,
            quantity: parseFloat(it.quantity) || 1,
            unit: it.unit,
            unitPrice: parseFloat(it.unitPrice) || 0,
            total: itemTotals[i],
          })),
      };
      if (isEdit) {
        await invoiceService.update(invoice!._id, payload as Partial<Invoice>);
      } else {
        await invoiceService.create(payload as Partial<Invoice>);
      }
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Error saving invoice.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.formSection}>
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>
          {isEdit ? l.editTitle : l.addTitle}
        </h3>
        <button
          type="button"
          className={styles.formCloseBtn}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      {loadingOptions ? (
        <p>{l.loadingOpts}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Customer row */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.customer}</label>
              <select
                className={styles.input}
                value={form.customerId}
                onChange={(e) => {
                  set("customerId", e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    customerId: e.target.value,
                    jobIds: [],
                  }));
                }}
                required
              >
                <option value="">{l.selectCustomer}</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.invoiceNumber}</label>
              <input
                className={styles.input}
                value={form.invoiceNumber}
                onChange={(e) => set("invoiceNumber", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Linked Jobs picker */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{l.linkedJob}</label>
            <div className={styles.jobPickerRow}>
              <select
                className={styles.input}
                defaultValue=""
                disabled={loadingJobs || !form.customerId}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id || form.jobIds.includes(id)) return;
                  const job = jobs.find((j) => j._id === id);
                  setForm((prev) => {
                    // per_job = fixed price, qty always 1; otherwise use timeDuration (fallback 1 if 0/unset)
                    const qty =
                      job?.priceUnit === "per_job" ? 1 : job?.timeDuration || 1;
                    const unitPrice = job?.price ?? 0;
                    const newItem: ItemForm = {
                      description: job?.title || id.slice(-6),
                      serviceType: `job:${id}`,
                      quantity: String(qty),
                      unit:
                        job?.priceUnit === "per_day"
                          ? "days"
                          : job?.priceUnit === "per_hour"
                            ? "hours"
                            : "job",
                      unitPrice: String(unitPrice),
                      priceUnit: job?.priceUnit || "per_job",
                    };
                    const items =
                      prev.items.length === 1 &&
                      !prev.items[0].description &&
                      !prev.items[0].unitPrice
                        ? [newItem]
                        : [...prev.items, newItem];
                    return { ...prev, jobIds: [...prev.jobIds, id], items };
                  });
                  e.target.value = "";
                }}
              >
                <option value="">
                  {!form.customerId
                    ? l.selectCustomer
                    : loadingJobs
                      ? l.loadingOpts
                      : jobs.filter((j) => !form.jobIds.includes(j._id))
                            .length === 0
                        ? l.noJobs
                        : l.selectJob}
                </option>
                {jobs
                  .filter((j) => !form.jobIds.includes(j._id))
                  .map((j) => (
                    <option key={j._id} value={j._id}>
                      {j.title || j._id.slice(-6)} —{" "}
                      {new Date(j.scheduledStart).toLocaleDateString()}
                    </option>
                  ))}
              </select>
            </div>
            {form.jobIds.length > 0 && (
              <div className={styles.jobTagList}>
                {form.jobIds.map((id) => {
                  const job = jobs.find((j) => j._id === id);
                  return (
                    <span key={id} className={styles.jobTag}>
                      {job
                        ? `${job.title || id.slice(-6)} — ${new Date(job.scheduledStart).toLocaleDateString()}`
                        : id.slice(-6)}
                      <button
                        type="button"
                        className={styles.jobTagRemove}
                        onClick={() =>
                          setForm((prev) => {
                            const remaining = prev.jobIds.filter(
                              (j) => j !== id,
                            );
                            const items = prev.items.filter(
                              (it) => it.serviceType !== `job:${id}`,
                            );
                            return {
                              ...prev,
                              jobIds: remaining,
                              items: items.length ? items : [{ ...EMPTY_ITEM }],
                            };
                          })
                        }
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className={styles.formRow3}>
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
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.status}</label>
              <select
                className={styles.input}
                value={form.status}
                onChange={(e) => set("status", e.target.value as InvoiceStatus)}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {(formT[lang][`pm_${s}` as keyof typeof l] as
                      | string
                      | undefined) ??
                      t[lang][`status_${s}` as keyof (typeof t)["en"]]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Service Period */}
          <p className={styles.sectionDivider}>{l.servicePeriod}</p>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.from}</label>
              <input
                className={styles.input}
                type="date"
                value={form.servicePeriodFrom}
                onChange={(e) => set("servicePeriodFrom", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.to}</label>
              <input
                className={styles.input}
                type="date"
                value={form.servicePeriodTo}
                onChange={(e) => set("servicePeriodTo", e.target.value)}
              />
            </div>
          </div>

          {/* Items */}
          <p className={styles.sectionDivider}>{l.itemsSection}</p>
          {form.items.map((item, idx) => (
            <div key={idx} className={styles.itemRow}>
              <div className={styles.formGroup}>
                {idx === 0 && (
                  <label className={styles.label}>{l.description}</label>
                )}
                <input
                  className={styles.input}
                  value={item.description}
                  onChange={(e) =>
                    updateItem(idx, "description", e.target.value)
                  }
                  placeholder={l.description}
                />
              </div>
              <div className={styles.formGroup}>
                {idx === 0 && (
                  <label className={styles.label}>
                    {item.serviceType.startsWith("job:")
                      ? l.priceUnit
                      : l.serviceType}
                  </label>
                )}
                {item.serviceType.startsWith("job:") ? (
                  <select
                    className={styles.input}
                    value={item.priceUnit}
                    onChange={(e) => {
                      const pu = e.target.value;
                      updateItem(idx, "priceUnit", pu);
                      updateItem(
                        idx,
                        "unit",
                        pu === "per_day"
                          ? "days"
                          : pu === "per_hour"
                            ? "hours"
                            : "job",
                      );
                    }}
                  >
                    {(
                      Object.entries(
                        (
                          l as unknown as {
                            priceUnitLabels: Record<string, string>;
                          }
                        ).priceUnitLabels,
                      ) as [string, string][]
                    ).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={styles.input}
                    value={item.serviceType}
                    onChange={(e) =>
                      updateItem(idx, "serviceType", e.target.value)
                    }
                    placeholder={l.serviceType}
                  />
                )}
              </div>
              <div className={styles.formGroup}>
                {idx === 0 && (
                  <label className={styles.label}>{l.quantity}</label>
                )}
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                {idx === 0 && (
                  <label className={styles.label}>{l.unitPrice}</label>
                )}
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                {idx === 0 && (
                  <label className={styles.label}>{l.lineTotal}</label>
                )}
                <input
                  className={styles.input}
                  readOnly
                  value={itemTotals[idx]?.toFixed(2) ?? "0.00"}
                />
              </div>
              <button
                type="button"
                className={styles.btnRemoveItem}
                onClick={() => removeItem(idx)}
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className={styles.btnAddItem} onClick={addItem}>
            {l.addItem}
          </button>

          {/* Discount, Tax, Currency, Payment */}
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
              <label className={styles.label}>{l.discount}</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={(e) => set("discount", e.target.value)}
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.taxRate}</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                value={form.taxRate}
                onChange={(e) => set("taxRate", e.target.value)}
              />
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
                    {l[`pm_${pm}` as keyof typeof l] as string}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Totals */}
          <div className={styles.totalsWrap}>
            <table className={styles.totalsTable}>
              <tbody>
                <tr>
                  <td>Subtotal</td>
                  <td>
                    {subtotal.toFixed(2)} {form.currency}
                  </td>
                </tr>
                {discount > 0 && (
                  <tr>
                    <td>{l.discount}</td>
                    <td>
                      -{discount.toFixed(2)} {form.currency}
                    </td>
                  </tr>
                )}
                {taxRate > 0 && (
                  <tr>
                    <td>
                      {l.taxRate} ({taxRate}%)
                    </td>
                    <td>
                      {tax.toFixed(2)} {form.currency}
                    </td>
                  </tr>
                )}
                <tr className={styles.totalRow}>
                  <td>Total</td>
                  <td>
                    {total.toFixed(2)} {form.currency}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{l.notes}</label>
            <RichTextEditor
              value={form.notes}
              onChange={(html) => set("notes", html)}
              placeholder={l.notes}
            />
          </div>

          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.formFooter}>
            {isEdit && (
              <button
                type="button"
                className={styles.btnDownloadPdf}
                onClick={handleDownloadPdf}
                disabled={saving}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  width="15"
                  height="15"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                {l.downloadPdf}
              </button>
            )}
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
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { lang } = useLang();
  const { hasRole } = useAuth();
  const l = t[lang];

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [apiStatus, setApiStatus] = useState<InvoiceStatus | "">("");

  const [colNumber, setColNumber] = useState("");
  const [colCustomer, setColCustomer] = useState("");
  const [colStatus, setColStatus] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const canWrite = hasRole(
    "owner",
    "director",
    "manager_operations",
    "manager_hr",
    "staff",
  );
  const canDelete = hasRole("owner");

  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1" && canWrite) {
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, canWrite]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceService.getAll({
        page,
        limit: PAGE_LIMIT,
        search: search.trim() || undefined,
        status: apiStatus || undefined,
      });
      setInvoices(res.data);
      setTotal(res.pagination.total);
    } catch {
      setInvoices([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, apiStatus]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
  useEffect(() => {
    setPage(1);
  }, [search, apiStatus]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await invoiceService.remove(id);
      fetchInvoices();
    } catch {
      alert("Error deleting invoice.");
    }
  };

  const displayed = invoices.filter((inv) => {
    if (
      colNumber &&
      !inv.invoiceNumber.toLowerCase().includes(colNumber.toLowerCase())
    )
      return false;
    const customer = getCustomer(inv);
    const customerName = customer
      ? `${customer.firstName} ${customer.lastName}`.toLowerCase()
      : "";
    if (colCustomer && !customerName.includes(colCustomer.toLowerCase()))
      return false;
    if (colStatus && inv.status !== colStatus) return false;
    return true;
  });

  const pageRange = getPageRange(page, totalPages);

  const handleExportExcel = useCallback(async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Invoices");
    sheet.columns = [
      { header: l.colNumber, key: "number", width: 18 },
      { header: l.colCustomer, key: "customer", width: 25 },
      { header: l.colIssued, key: "issued", width: 14 },
      { header: l.colDue, key: "due", width: 14 },
      { header: l.colTotal, key: "total", width: 12 },
      { header: l.colStatus, key: "status", width: 14 },
    ];
    displayed.forEach((inv) => {
      const customer = getCustomer(inv);
      sheet.addRow({
        number: inv.invoiceNumber,
        customer: customer ? `${customer.firstName} ${customer.lastName}` : "—",
        issued: formatDate(inv.issuedDate, lang),
        due: formatDate(inv.dueDate, lang),
        total: inv.total != null ? inv.total.toFixed(2) : "—",
        status: l[`status_${inv.status}` as keyof typeof l] as string,
      });
    });
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }, [displayed, l, lang]);

  const handleExportPdf = useCallback(async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(l.title, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [
        [
          l.colNumber,
          l.colCustomer,
          l.colIssued,
          l.colDue,
          l.colTotal,
          l.colStatus,
        ],
      ],
      body: displayed.map((inv) => {
        const customer = getCustomer(inv);
        return [
          inv.invoiceNumber,
          customer ? `${customer.firstName} ${customer.lastName}` : "—",
          formatDate(inv.issuedDate, lang),
          formatDate(inv.dueDate, lang),
          inv.total != null ? inv.total.toFixed(2) : "—",
          l[`status_${inv.status}` as keyof typeof l] as string,
        ];
      }),
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 255] },
    });
    doc.save("invoices.pdf");
  }, [displayed, l, lang]);

  const closeForm = () => {
    setShowForm(false);
    setEditingInvoice(null);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{l.title}</h2>
        {canWrite && !showForm && !editingInvoice && (
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            {l.addInvoice}
          </button>
        )}
      </div>

      {/* Inline Form */}
      {showForm && canWrite && (
        <InvoiceFormSection
          lang={lang}
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            fetchInvoices();
          }}
        />
      )}
      {editingInvoice && canWrite && (
        <InvoiceFormSection
          invoice={editingInvoice}
          lang={lang}
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            fetchInvoices();
          }}
        />
      )}

      {/* Toolbar + Table + Pagination — hidden while form is open */}
      {!showForm && !editingInvoice && (
        <>
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
                  d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                className={styles.searchInput}
                placeholder={l.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={styles.filterSelect}
              value={apiStatus}
              onChange={(e) =>
                setApiStatus(e.target.value as InvoiceStatus | "")
              }
            >
              <option value="">{l.allStatuses}</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {l[`status_${s}` as keyof typeof l]}
                </option>
              ))}
            </select>
            <div className={styles.exportBtns}>
              <button
                className={styles.btnExcelExport}
                onClick={handleExportExcel}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  width="15"
                  height="15"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L17 13.586V12a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {l.exportExcel}
              </button>
              <button className={styles.btnPdfExport} onClick={handleExportPdf}>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  width="15"
                  height="15"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L17 13.586V12a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {l.exportPdf}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.headRow}>
                  <th>{l.colNumber}</th>
                  <th>{l.colCustomer}</th>
                  <th>{l.colIssued}</th>
                  <th>{l.colDue}</th>
                  <th>{l.colTotal}</th>
                  <th>{l.colStatus}</th>
                  <th>{l.colActions}</th>
                </tr>
                <tr className={styles.filterRow}>
                  <th>
                    <input
                      className={styles.colFilter}
                      placeholder={l.filterNumber}
                      value={colNumber}
                      onChange={(e) => setColNumber(e.target.value)}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.colFilter}
                      placeholder={l.filterCustomer}
                      value={colCustomer}
                      onChange={(e) => setColCustomer(e.target.value)}
                    />
                  </th>
                  <th />
                  <th />
                  <th />
                  <th>
                    <select
                      className={styles.colFilter}
                      value={colStatus}
                      onChange={(e) => setColStatus(e.target.value)}
                    >
                      <option value="">{l.filterStatus}</option>
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {l[`status_${s}` as keyof typeof l]}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      {l.loading}
                    </td>
                  </tr>
                ) : displayed.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      {l.noResults}
                    </td>
                  </tr>
                ) : (
                  displayed.map((inv) => {
                    const customer = getCustomer(inv);
                    return (
                      <tr key={inv._id} className={styles.bodyRow}>
                        <td className={styles.invoiceNumCell}>
                          {inv.invoiceNumber}
                        </td>
                        <td className={styles.customerCell}>
                          {customer
                            ? `${customer.firstName} ${customer.lastName}`
                            : "—"}
                        </td>
                        <td className={styles.dateCell}>
                          {formatDate(inv.issuedDate, lang)}
                        </td>
                        <td className={styles.dateCell}>
                          {formatDate(inv.dueDate, lang)}
                        </td>
                        <td className={styles.amountCell}>
                          {inv.total != null
                            ? `${inv.total.toFixed(2)} ${inv.currency}`
                            : "—"}
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${styles[`badge_${inv.status}`]}`}
                          >
                            {l[`status_${inv.status}` as keyof typeof l]}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button className={styles.btnView}>
                              <svg viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 3C5 3 1.73 7.11 1.07 9.69a1 1 0 000 .62C1.73 12.89 5 17 10 17s8.27-4.11 8.93-6.69a1 1 0 000-.62C18.27 7.11 15 3 10 3zm0 11a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" />
                              </svg>
                              {l.btnView}
                            </button>
                            {canWrite && (
                              <button
                                className={styles.btnUpdate}
                                onClick={() => {
                                  setShowForm(false);
                                  setEditingInvoice(inv);
                                }}
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.5 9.5A2 2 0 015.5 16.5H4a1 1 0 01-1-1v-1.5a2 2 0 01.586-1.414l9.5-9.5z" />
                                </svg>
                                {l.btnUpdate}
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className={styles.btnDelete}
                                onClick={() => handleDelete(inv._id)}
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                                    clipRule="evenodd"
                                  />
                                </svg>
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
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {l.prev}
            </button>
            <div className={styles.pageNumbers}>
              {pageRange.map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className={styles.ellipsis}>
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`${styles.pageNum} ${p === page ? styles.pageNumActive : ""}`}
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
              {l.next}
            </button>
            <span className={styles.pageInfo}>
              {l.page} {page} {l.of} {totalPages} &bull; {total} total
            </span>
          </div>
        </>
      )}
    </div>
  );
}
