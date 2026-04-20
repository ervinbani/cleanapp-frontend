import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useTrans } from "../i18n";
import { useAuth } from "../contexts/AuthContext";
import { invoiceService } from "../services/invoiceService";
import apiClient from "../services/apiClient";
import type { Invoice, InvoiceStatus, Customer, Tenant } from "../types";
import { getTenant } from "../services/authService";
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

function getInvoiceTodayRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
}
function getInvoiceWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMon,
  );
  const sun = new Date(
    mon.getFullYear(),
    mon.getMonth(),
    mon.getDate() + 6,
    23,
    59,
    59,
    999,
  );
  return { dateFrom: mon.toISOString(), dateTo: sun.toISOString() };
}
function getInvoiceMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
}

function getCustomer(inv: Invoice): Customer | null {
  if (typeof inv.customerId === "object" && inv.customerId !== null)
    return inv.customerId as Customer;
  return null;
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function buildInvoicePdfHeader(
  doc: import("jspdf").jsPDF,
  tenant: Tenant | null | undefined,
  customer: Customer | null,
  invoiceNumber: string,
  issuedDate: string | undefined,
  dueDate: string | undefined,
  lang: "en" | "es",
): Promise<number> {
  const l = formT[lang];
  const PAGE_W = 210; // A4 mm
  const LEFT = 14;
  const RIGHT = PAGE_W - 14;
  const COL_MID = 110; // right column starts here

  const y = 14;

  // ── Left: Logo + Company info ──────────────────────────────────
  let logoH = 0;
  if (tenant?.branding?.logoUrl) {
    const dataUrl = await loadImageAsDataUrl(tenant.branding.logoUrl);
    if (dataUrl) {
      const maxW = 36;
      const maxH = 14;
      doc.addImage(dataUrl, "PNG", LEFT, y, maxW, maxH);
      logoH = maxH + 2;
    }
  }

  const companyY = y + logoH;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(tenant?.name ?? "—", LEFT, companyY);
  doc.setFont("helvetica", "normal");

  let cy = companyY + 5;
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  if (tenant?.address?.street) {
    doc.text(tenant.address.street, LEFT, cy);
    cy += 4;
  }
  const cityLine = [
    tenant?.address?.city,
    tenant?.address?.state,
    tenant?.address?.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
  if (cityLine) {
    doc.text(cityLine, LEFT, cy);
    cy += 4;
  }
  if (tenant?.address?.country) {
    doc.text(tenant.address.country, LEFT, cy);
    cy += 4;
  }
  if (tenant?.contactPhone) {
    doc.text(tenant.contactPhone, LEFT, cy);
    cy += 4;
  }
  if (tenant?.contactEmail) {
    doc.text(tenant.contactEmail, LEFT, cy);
    cy += 4;
  }

  // ── Right: INVOICE title + number + dates ─────────────────────
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text("INVOICE", RIGHT, y + 8, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  let ry = y + 16;
  doc.text(`# ${invoiceNumber}`, RIGHT, ry, { align: "right" });
  ry += 5;
  if (issuedDate) {
    doc.text(`${l.issuedDate}: ${issuedDate}`, RIGHT, ry, { align: "right" });
    ry += 4;
  }
  if (dueDate) {
    doc.text(`${l.dueDate}: ${dueDate}`, RIGHT, ry, { align: "right" });
    ry += 4;
  }

  // ── Divider ───────────────────────────────────────────────────
  const divY = Math.max(cy, ry) + 4;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(LEFT, divY, RIGHT, divY);

  // ── Bill To ───────────────────────────────────────────────────
  let by = divY + 6;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(156, 163, 175);
  doc.text(lang === "en" ? "BILL TO" : "FACTURAR A", LEFT, by);
  by += 4;
  if (customer) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`${customer.firstName} ${customer.lastName}`, LEFT, by);
    by += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    if (customer.email) {
      doc.text(customer.email, LEFT, by);
      by += 4;
    }
    if (customer.phone) {
      doc.text(customer.phone, LEFT, by);
      by += 4;
    }
    const cAddr = customer.address;
    if (cAddr?.street) {
      doc.text(cAddr.street, LEFT, by);
      by += 4;
    }
    const cCity = [cAddr?.city, cAddr?.state, cAddr?.zipCode]
      .filter(Boolean)
      .join(", ");
    if (cCity) {
      doc.text(cCity, LEFT, by);
      by += 4;
    }
  }

  // Reset to col mid for right-side use
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(156, 163, 175);
  doc.text(lang === "en" ? "INVOICE DATE" : "FECHA", COL_MID, divY + 6);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(17, 24, 39);
  if (issuedDate) {
    doc.text(issuedDate, COL_MID, divY + 10);
  }

  // Final Y after header block
  const finalHeaderY = by + 6;
  // Separator below header block
  doc.setDrawColor(229, 231, 235);
  doc.line(LEFT, finalHeaderY, RIGHT, finalHeaderY);

  doc.setFont("helvetica", "normal");
  return finalHeaderY + 6;
}

async function downloadInvoicePdf(
  inv: Invoice,
  lang: "en" | "es",
  tenant?: Tenant | null,
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const l = formT[lang];
  const doc = new jsPDF();
  const customer = getCustomer(inv);

  let yPos = await buildInvoicePdfHeader(
    doc,
    tenant,
    customer,
    inv.invoiceNumber,
    inv.issuedDate,
    inv.dueDate,
    lang,
  );

  // Service period + status + payment
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  if (inv.servicePeriod?.from || inv.servicePeriod?.to) {
    doc.text(
      `${l.servicePeriod}: ${inv.servicePeriod?.from || "—"} → ${inv.servicePeriod?.to || "—"}`,
      14,
      yPos,
    );
    yPos += 5;
  }
  const statusLabel =
    (l[`status_${inv.status}` as keyof typeof l] as string) ?? inv.status;
  doc.text(`${l.status}: ${statusLabel}`, 14, yPos);
  yPos += 5;
  if (inv.paymentMethod) {
    const pmLabel =
      (l[`pm_${inv.paymentMethod}` as keyof typeof l] as string | undefined) ??
      inv.paymentMethod;
    doc.text(`${l.paymentMethod}: ${pmLabel}`, 14, yPos);
    yPos += 5;
  }
  yPos += 3;

  // Items table
  autoTable(doc, {
    startY: yPos,
    head: [
      [l.description, l.serviceType, l.quantity, l.unitPrice, l.lineTotal],
    ],
    body: inv.items
      .filter(
        (it) =>
          it.description?.trim() || (it.unitPrice != null && it.unitPrice > 0),
      )
      .map((it) => [
        it.description ?? "",
        it.serviceType ?? "—",
        String(it.quantity ?? ""),
        (it.unitPrice ?? 0).toFixed(2),
        (it.total ?? 0).toFixed(2),
      ]),
    headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
  });

  // Totals
  const finalY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 10;
  const rightX = 196;
  let tY = finalY;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text("Subtotal:", rightX - 50, tY, { align: "right" });
  doc.text(`${(inv.subtotal ?? 0).toFixed(2)} ${inv.currency}`, rightX, tY, {
    align: "right",
  });
  tY += 6;
  doc.text(`${l.discountValue}:`, rightX - 50, tY, { align: "right" });
  doc.text(
    `-${(inv.discount?.amount ?? 0).toFixed(2)} ${inv.currency}`,
    rightX,
    tY,
    { align: "right" },
  );
  tY += 6;
  doc.text(`${l.taxRate}:`, rightX - 50, tY, { align: "right" });
  doc.text(`${(inv.tax ?? 0).toFixed(2)} ${inv.currency}`, rightX, tY, {
    align: "right",
  });
  tY += 8;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("Total:", rightX - 50, tY, { align: "right" });
  doc.text(`${(inv.total ?? 0).toFixed(2)} ${inv.currency}`, rightX, tY, {
    align: "right",
  });

  // Notes
  if (inv.notes && inv.notes.replace(/<[^>]*>/g, "").trim()) {
    tY += 14;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(`${l.notes}:`, 14, tY);
    tY += 5;

    const DEFAULT_COLOR: [number, number, number] = [55, 65, 81];
    const parseRgb = (color: string): [number, number, number] => {
      const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (m) return [+m[1], +m[2], +m[3]];
      const h = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      if (h)
        return [parseInt(h[1], 16), parseInt(h[2], 16), parseInt(h[3], 16)];
      return DEFAULT_COLOR;
    };
    type Run = { text: string; color: [number, number, number] };
    const getRuns = (node: Node, inheritColor?: string): Run[] => {
      const runs: Run[] = [];
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? "";
        if (text)
          runs.push({
            text,
            color: inheritColor ? parseRgb(inheritColor) : DEFAULT_COLOR,
          });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const color = el.style?.color || inheritColor;
        for (const child of el.childNodes)
          getRuns(child, color).forEach((r) => runs.push(r));
      }
      return runs;
    };

    const container = document.createElement("div");
    container.innerHTML = inv.notes;
    const blocks = container.querySelectorAll("p, h1, h2, h3, li");
    let cy = tY;
    blocks.forEach((block) => {
      const tag = block.tagName;
      const fs = tag === "H1" ? 13 : tag === "H2" ? 11 : 9;
      const lh = tag === "H1" ? 7 : tag === "H2" ? 6 : 5;
      doc.setFontSize(fs);
      const runs = getRuns(block);
      let cx = 14;
      runs.forEach(({ text, color }) => {
        doc.setTextColor(...color);
        const words = text.split(/(\s+)/);
        words.forEach((word) => {
          if (!word) return;
          const w = doc.getTextWidth(word);
          if (cx + w > 194 && cx > 14) {
            cy += lh;
            cx = 14;
          }
          doc.text(word, cx, cy);
          cx += w;
        });
      });
      cy += lh;
      doc.setFontSize(9);
    });
  }

  doc.save(`invoice-${inv.invoiceNumber || "draft"}.pdf`);
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
  discountType: "percentage" | "fixed";
  discountValue: string;
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
  discountType: "percentage",
  discountValue: "0",
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
    discountType: inv.discount?.type ?? "percentage",
    discountValue: String(inv.discount?.value ?? 0),
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
          priceUnit: it.priceUnit ?? "per_job",
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
    discountType: "Discount Type",
    discountTypePct: "Percentage (%)",
    discountTypeFixed: "Fixed amount",
    discountValue: "Discount value",
    taxRate: "Tax Rate (%)",
    paymentMethod: "Payment Method",
    selectPayment: "— None —",
    notes: "Notes",
    servicePeriod: "Service Period",
    from: "From",
    to: "To",
    periodLastWeek: "Last week",
    periodTwoWeeks: "2 weeks",
    periodThisMonth: "This month",
    periodCustom: "Custom",
    itemsSection: "Items",
    description: "Description",
    serviceType: "Type",
    priceUnit: "Price Type",
    priceUnitLabels: {
      per_hour: "Hourly",
      per_job: "Fixed",
      per_day: "Daily",
      no_price: "No price",
    },
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
    addAllJobs: "Add all",
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
    discountType: "Tipo de descuento",
    discountTypePct: "Porcentaje (%)",
    discountTypeFixed: "Monto fijo",
    discountValue: "Valor del descuento",
    taxRate: "Tasa de Impuesto (%)",
    paymentMethod: "Método de Pago",
    selectPayment: "— Ninguno —",
    notes: "Notas",
    servicePeriod: "Período del Servicio",
    from: "Desde",
    to: "Hasta",
    periodLastWeek: "Última semana",
    periodTwoWeeks: "2 semanas",
    periodThisMonth: "Este mes",
    periodCustom: "Personalizado",
    itemsSection: "Artículos",
    description: "Descripción",
    serviceType: "Tipo",
    priceUnit: "Tipo precio",
    priceUnitLabels: {
      per_hour: "Por hora",
      per_job: "Fijo",
      per_day: "Por día",
      no_price: "Sin precio",
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
    addAllJobs: "Agregar todos",
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
  tenant?: Tenant | null;
  onClose: () => void;
  onSaved: () => void;
}

function InvoiceFormSection({
  invoice,
  lang,
  tenant,
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
  const [showPeriodDates, setShowPeriodDates] = useState(
    !!(invoice?.servicePeriod?.from || invoice?.servicePeriod?.to),
  );
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
      .getAll({
        customerId: form.customerId,
        status: "confirmed",
        limit: 200,
        dateFrom: form.servicePeriodFrom || undefined,
        dateTo: form.servicePeriodTo || undefined,
      })
      .then((res) => setJobs(res.data as unknown as DropdownJob[]))
      .catch(() => setJobs([]))
      .finally(() => setLoadingJobs(false));
  }, [form.customerId, form.servicePeriodFrom, form.servicePeriodTo]);

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
    if (it.priceUnit === "no_price") return 0;
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unitPrice) || 0;
    return qty * price;
  });
  const subtotal = itemTotals.reduce((s, v) => s + v, 0);
  const discountValue = parseFloat(form.discountValue) || 0;
  const discountAmount =
    form.discountType === "percentage"
      ? subtotal * (discountValue / 100)
      : discountValue;
  const taxRate = parseFloat(form.taxRate) || 0;
  const taxBase = subtotal - discountAmount;
  const tax = taxBase * (taxRate / 100);
  const total = taxBase + tax;

  const handleDownloadPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();

    const customerObj = customers.find((c) => c._id === form.customerId);
    const customerForHeader = customerObj
      ? ({
          firstName: customerObj.firstName,
          lastName: customerObj.lastName,
        } as Customer)
      : null;

    let yPos = await buildInvoicePdfHeader(
      doc,
      tenant,
      customerForHeader,
      form.invoiceNumber,
      form.issuedDate,
      form.dueDate,
      lang,
    );

    // Service period + status + payment
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    if (form.servicePeriodFrom || form.servicePeriodTo) {
      doc.text(
        `${l.servicePeriod}: ${form.servicePeriodFrom || "—"} → ${form.servicePeriodTo || "—"}`,
        14,
        yPos,
      );
      yPos += 5;
    }
    const statusLabel =
      l[`status_${form.status}` as keyof typeof l] ?? form.status;
    doc.text(`${l.status}: ${statusLabel}`, 14, yPos);
    yPos += 5;
    if (form.paymentMethod) {
      const pmLabel =
        (l[`pm_${form.paymentMethod}` as keyof typeof l] as
          | string
          | undefined) ?? form.paymentMethod;
      doc.text(`${l.paymentMethod}: ${pmLabel}`, 14, yPos);
      yPos += 5;
    }
    yPos += 3;

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
    const rightX = 196;
    let tY = finalY;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text("Subtotal:", rightX - 50, tY, { align: "right" });
    doc.text(`${subtotal.toFixed(2)} ${form.currency}`, rightX, tY, {
      align: "right",
    });
    tY += 6;
    doc.text(`${l.discountValue}:`, rightX - 50, tY, { align: "right" });
    doc.text(`-${discountAmount.toFixed(2)} ${form.currency}`, rightX, tY, {
      align: "right",
    });
    tY += 6;
    doc.text(`${l.taxRate}:`, rightX - 50, tY, { align: "right" });
    doc.text(`${tax.toFixed(2)} ${form.currency}`, rightX, tY, {
      align: "right",
    });
    tY += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text("Total:", rightX - 50, tY, { align: "right" });
    doc.text(`${total.toFixed(2)} ${form.currency}`, rightX, tY, {
      align: "right",
    });

    // Notes
    const renderRichHtml = (
      html: string,
      startY: number,
      leftX: number,
      maxW: number,
    ): number => {
      const DEFAULT_COLOR: [number, number, number] = [55, 65, 81];
      const parseRgb = (color: string): [number, number, number] => {
        const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (m) return [+m[1], +m[2], +m[3]];
        const h = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (h)
          return [parseInt(h[1], 16), parseInt(h[2], 16), parseInt(h[3], 16)];
        return DEFAULT_COLOR;
      };
      type Run = { text: string; color: [number, number, number] };
      const getRuns = (node: Node, inheritColor?: string): Run[] => {
        const runs: Run[] = [];
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent ?? "";
          if (text)
            runs.push({
              text,
              color: inheritColor ? parseRgb(inheritColor) : DEFAULT_COLOR,
            });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const color = el.style?.color || inheritColor;
          for (const child of el.childNodes)
            getRuns(child, color).forEach((r) => runs.push(r));
        }
        return runs;
      };
      const container = document.createElement("div");
      container.innerHTML = html;
      const blocks = container.querySelectorAll("p, h1, h2, h3, li");
      let cy = startY;
      blocks.forEach((block) => {
        const tag = block.tagName;
        const fs = tag === "H1" ? 13 : tag === "H2" ? 11 : 9;
        const lh = tag === "H1" ? 7 : tag === "H2" ? 6 : 5;
        doc.setFontSize(fs);
        const runs = getRuns(block);
        let cx = leftX;
        runs.forEach(({ text, color }) => {
          doc.setTextColor(...color);
          const words = text.split(/(\s+)/);
          words.forEach((word) => {
            if (!word) return;
            const w = doc.getTextWidth(word);
            if (cx + w > leftX + maxW && cx > leftX) {
              cy += lh;
              cx = leftX;
            }
            doc.text(word, cx, cy);
            cx += w;
          });
        });
        cy += lh;
        doc.setFontSize(9);
      });
      return cy;
    };

    if (form.notes && form.notes.replace(/<[^>]*>/g, "").trim()) {
      tY += 14;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(`${l.notes}:`, 14, tY);
      tY += 5;
      tY = renderRichHtml(form.notes, tY, 14, 180);
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
        discount: {
          type: form.discountType,
          value: parseFloat(form.discountValue) || 0,
          amount: +discountAmount.toFixed(2),
        },
        taxRate,
        tax: +tax.toFixed(2),
        subtotal: +subtotal.toFixed(2),
        total: +total.toFixed(2),
        paymentMethod: form.paymentMethod || undefined,
        notes: form.notes.trim() || undefined,
        items: form.items
          .filter((it) => it.description.trim() || parseFloat(it.unitPrice) > 0)
          .map((it, i) => ({
            description: it.description.trim(),
            serviceType: it.serviceType.trim() || undefined,
            quantity:
              it.priceUnit === "no_price" ? 0 : parseFloat(it.quantity) || 1,
            unit: it.priceUnit === "no_price" ? "no_price" : it.unit,
            unitPrice: parseFloat(it.unitPrice) || 0,
            priceUnit: it.priceUnit || undefined,
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
          {/* ── Invoice Header Preview ────────────────────── */}
          <div className={styles.invoiceHeaderPreview}>
            {/* Left: company */}
            <div className={styles.invoiceHeaderLeft}>
              {tenant?.branding?.logoUrl && (
                <img
                  src={tenant.branding.logoUrl}
                  alt="logo"
                  className={styles.invoiceLogo}
                />
              )}
              <div className={styles.invoiceCompanyName}>
                {tenant?.name ?? "—"}
              </div>
              {tenant?.address?.street && (
                <div className={styles.invoiceCompanyDetail}>
                  {tenant.address.street}
                </div>
              )}
              {(tenant?.address?.city ||
                tenant?.address?.state ||
                tenant?.address?.zipCode) && (
                <div className={styles.invoiceCompanyDetail}>
                  {[
                    tenant?.address?.city,
                    tenant?.address?.state,
                    tenant?.address?.zipCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}
              {tenant?.address?.country && (
                <div className={styles.invoiceCompanyDetail}>
                  {tenant.address.country}
                </div>
              )}
              {tenant?.contactPhone && (
                <div className={styles.invoiceCompanyDetail}>
                  {tenant.contactPhone}
                </div>
              )}
              {tenant?.contactEmail && (
                <div className={styles.invoiceCompanyDetail}>
                  {tenant.contactEmail}
                </div>
              )}
            </div>
            {/* Right: invoice meta + bill to */}
            <div className={styles.invoiceHeaderRight}>
              <div className={styles.invoiceTitle}>INVOICE</div>
              {form.invoiceNumber && (
                <div className={styles.invoiceNumber}>
                  #{form.invoiceNumber}
                </div>
              )}
              {form.issuedDate && (
                <div className={styles.invoiceMeta}>
                  {l.issuedDate}: {form.issuedDate}
                </div>
              )}
              {form.dueDate && (
                <div className={styles.invoiceMeta}>
                  {l.dueDate}: {form.dueDate}
                </div>
              )}
              {form.customerId &&
                customers.find((cx) => cx._id === form.customerId) && (
                  <div className={styles.invoiceBillTo}>
                    <div className={styles.invoiceBillToLabel}>
                      {lang === "en" ? "Bill To" : "Facturar a"}
                    </div>
                    <div className={styles.invoiceBillToName}>
                      {
                        customers.find((cx) => cx._id === form.customerId)!
                          .firstName
                      }{" "}
                      {
                        customers.find((cx) => cx._id === form.customerId)!
                          .lastName
                      }
                    </div>
                  </div>
                )}
            </div>
          </div>

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

          {/* Linked Jobs + Service Period side by side */}
          <div className={styles.jobPeriodRow}>
            {/* Left: Linked Jobs picker */}
            <div className={styles.jobPeriodCol}>
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
                          job?.priceUnit === "per_job"
                            ? 1
                            : job?.timeDuration || 1;
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
                {jobs.filter((j) => !form.jobIds.includes(j._id)).length >
                  0 && (
                  <button
                    type="button"
                    className={styles.addAllJobsBtn}
                    disabled={loadingJobs}
                    onClick={() => {
                      const unlinked = jobs.filter(
                        (j) => !form.jobIds.includes(j._id),
                      );
                      setForm((prev) => {
                        const newItems: ItemForm[] = unlinked.map((job) => ({
                          description: job.title || job._id.slice(-6),
                          serviceType: `job:${job._id}`,
                          quantity: String(
                            job.priceUnit === "per_job"
                              ? 1
                              : job.timeDuration || 1,
                          ),
                          unit:
                            job.priceUnit === "per_day"
                              ? "days"
                              : job.priceUnit === "per_hour"
                                ? "hours"
                                : "job",
                          unitPrice: String(job.price ?? 0),
                          priceUnit: job.priceUnit || "per_job",
                        }));
                        const existingItems =
                          prev.items.length === 1 &&
                          !prev.items[0].description &&
                          !prev.items[0].unitPrice
                            ? []
                            : prev.items;
                        return {
                          ...prev,
                          jobIds: [
                            ...prev.jobIds,
                            ...unlinked.map((j) => j._id),
                          ],
                          items: [...existingItems, ...newItems],
                        };
                      });
                    }}
                  >
                    {l.addAllJobs} (
                    {jobs.filter((j) => !form.jobIds.includes(j._id)).length})
                  </button>
                )}
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
                                  items: items.length
                                    ? items
                                    : [{ ...EMPTY_ITEM }],
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
            </div>

            {/* Right: Service Period */}
            <div className={styles.jobPeriodCol}>
              <label className={styles.label}>{l.servicePeriod}</label>
              <div className={styles.periodBar}>
                {(
                  [
                    {
                      key: "lastWeek",
                      label: l.periodLastWeek,
                      fn: () => {
                        const now = new Date();
                        const to = new Date(now);
                        to.setDate(to.getDate() - 1);
                        const from = new Date(now);
                        from.setDate(from.getDate() - 7);
                        return {
                          from: from.toISOString().slice(0, 10),
                          to: to.toISOString().slice(0, 10),
                        };
                      },
                    },
                    {
                      key: "twoWeeks",
                      label: l.periodTwoWeeks,
                      fn: () => {
                        const now = new Date();
                        const to = new Date(now);
                        to.setDate(to.getDate() - 1);
                        const from = new Date(now);
                        from.setDate(from.getDate() - 14);
                        return {
                          from: from.toISOString().slice(0, 10),
                          to: to.toISOString().slice(0, 10),
                        };
                      },
                    },
                    {
                      key: "thisMonth",
                      label: l.periodThisMonth,
                      fn: () => {
                        const now = new Date();
                        const from = new Date(
                          now.getFullYear(),
                          now.getMonth(),
                          1,
                        );
                        return {
                          from: from.toISOString().slice(0, 10),
                          to: now.toISOString().slice(0, 10),
                        };
                      },
                    },
                  ] as {
                    key: string;
                    label: string;
                    fn: () => { from: string; to: string };
                  }[]
                ).map(({ key, label, fn }) => (
                  <button
                    key={key}
                    type="button"
                    className={styles.periodBtn}
                    onClick={() => {
                      const { from, to } = fn();
                      setForm((prev) => ({
                        ...prev,
                        servicePeriodFrom: from,
                        servicePeriodTo: to,
                      }));
                      setShowPeriodDates(true);
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.periodBtn} ${showPeriodDates ? styles.periodBtnActive : ""}`}
                  onClick={() => setShowPeriodDates((v) => !v)}
                >
                  {l.periodCustom}
                </button>
                {(form.servicePeriodFrom || form.servicePeriodTo) && (
                  <span className={styles.periodSummary}>
                    {form.servicePeriodFrom || "…"} →{" "}
                    {form.servicePeriodTo || "…"}
                  </span>
                )}
              </div>
              {showPeriodDates && (
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
              )}
            </div>
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
                    {(l[`status_${s}` as keyof typeof l] as string) ?? s}
                  </option>
                ))}
              </select>
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
                  <label className={styles.label}>{l.priceUnit}</label>
                )}
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
                          : pu === "no_price"
                            ? ""
                            : "job",
                    );
                    if (pu === "no_price") {
                      updateItem(idx, "quantity", "0");
                      updateItem(idx, "unitPrice", "0");
                    }
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
              </div>
              {item.priceUnit !== "no_price" && (
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
                    onChange={(e) =>
                      updateItem(idx, "quantity", e.target.value)
                    }
                  />
                </div>
              )}
              {item.priceUnit !== "no_price" && (
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
                    onChange={(e) =>
                      updateItem(idx, "unitPrice", e.target.value)
                    }
                  />
                </div>
              )}
              {item.priceUnit !== "no_price" && (
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
              )}
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

          {/* Discount Type + Value */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{l.discountType}</label>
              <select
                className={styles.input}
                value={form.discountType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    discountType: e.target.value as "percentage" | "fixed",
                  }))
                }
              >
                <option value="percentage">{l.discountTypePct}</option>
                <option value="fixed">{l.discountTypeFixed}</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {l.discountValue}{" "}
                {form.discountType === "percentage"
                  ? "(%)"
                  : `(${form.currency})`}
              </label>
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                value={form.discountValue}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    discountValue: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          {/* Tax Rate + Currency + Payment */}
          <div className={styles.formRow3}>
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
                {discountAmount > 0 && (
                  <tr>
                    <td>
                      {l.discountValue}{" "}
                      {form.discountType === "percentage"
                        ? `(${discountValue}%)`
                        : `(${form.currency})`}
                    </td>
                    <td>
                      -{discountAmount.toFixed(2)} {form.currency}
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
  const l = useTrans("invoices");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    getTenant()
      .then(setTenant)
      .catch(() => {});
  }, []);

  const [search, setSearch] = useState("");
  const [apiStatus, setApiStatus] = useState<InvoiceStatus | "">("");
  const [dateMode, setDateMode] = useState<
    "" | "today" | "week" | "month" | "custom"
  >("");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

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
    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    if (dateMode === "today") ({ dateFrom, dateTo } = getInvoiceTodayRange());
    else if (dateMode === "week")
      ({ dateFrom, dateTo } = getInvoiceWeekRange());
    else if (dateMode === "month")
      ({ dateFrom, dateTo } = getInvoiceMonthRange());
    else if (dateMode === "custom") {
      dateFrom = customDateFrom
        ? new Date(customDateFrom).toISOString()
        : undefined;
      dateTo = customDateTo
        ? new Date(customDateTo + "T23:59:59").toISOString()
        : undefined;
    }
    try {
      const res = await invoiceService.getAll({
        page,
        limit: PAGE_LIMIT,
        search: search.trim() || undefined,
        status: apiStatus || undefined,
        dateFrom,
        dateTo,
      });
      setInvoices(res.data);
      setTotal(res.pagination.total);
    } catch {
      setInvoices([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, apiStatus, dateMode, customDateFrom, customDateTo]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
  useEffect(() => {
    setPage(1);
  }, [search, apiStatus, dateMode, customDateFrom, customDateTo]);

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
          tenant={tenant}
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
          tenant={tenant}
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
            {/* Date filters */}
            <div className={styles.dateFilterWrap}>
              {(
                [
                  { key: "today", label: l.today },
                  { key: "week", label: l.thisWeek },
                  { key: "month", label: l.thisMonth },
                  { key: "custom", label: l.customRange },
                ] as { key: typeof dateMode; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.dateModeBtn}${dateMode === key ? ` ${styles.dateModeActive}` : ""}`}
                  onClick={() => setDateMode(dateMode === key ? "" : key)}
                >
                  {label}
                </button>
              ))}
              {dateMode === "custom" && (
                <>
                  <input
                    type="date"
                    className={styles.dateInput}
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                  />
                  <span className={styles.dateSeparator}>→</span>
                  <input
                    type="date"
                    className={styles.dateInput}
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                  />
                </>
              )}
            </div>
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
                            <button
                              className={styles.btnView}
                              title={l.btnView}
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 3C5 3 1.73 7.11 1.07 9.69a1 1 0 000 .62C1.73 12.89 5 17 10 17s8.27-4.11 8.93-6.69a1 1 0 000-.62C18.27 7.11 15 3 10 3zm0 11a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" />
                              </svg>
                            </button>
                            <button
                              className={styles.btnDownloadRow}
                              title="PDF"
                              onClick={() =>
                                downloadInvoicePdf(inv, lang, tenant)
                              }
                            >
                              <svg
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                width="14"
                                height="14"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                            {canWrite && (
                              <button
                                className={styles.btnUpdate}
                                title={l.btnUpdate}
                                onClick={() => {
                                  setShowForm(false);
                                  setEditingInvoice(inv);
                                }}
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.5 9.5A2 2 0 015.5 16.5H4a1 1 0 01-1-1v-1.5a2 2 0 01.586-1.414l9.5-9.5z" />
                                </svg>
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
