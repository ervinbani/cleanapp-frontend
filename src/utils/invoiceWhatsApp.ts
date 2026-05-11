import type { Invoice, Customer, Language } from "../types";

const labels = {
  en: {
    greeting: (name: string) => `Hi${name ? ` ${name}` : ""},`,
    invoice: "Invoice",
    issued: "Issued",
    due: "Due",
    items: (n: number) => `Items (${n}):`,
    subtotal: "Subtotal",
    discount: "Discount",
    tax: (rate: number) => `Tax (${rate}%)`,
    total: "TOTAL",
    notes: "Notes",
    closing: "Thank you for your business!",
    locale: "en-US",
  },
  es: {
    greeting: (name: string) => `Estimado/a${name ? ` ${name}` : ""},`,
    invoice: "Factura",
    issued: "Fecha emisión",
    due: "Vencimiento",
    items: (n: number) => `Artículos (${n}):`,
    subtotal: "Subtotal",
    discount: "Descuento",
    tax: (rate: number) => `IVA (${rate}%)`,
    total: "TOTAL",
    notes: "Notas",
    closing: "¡Gracias por su confianza!",
    locale: "es-ES",
  },
  it: {
    greeting: (name: string) => `Gentile${name ? ` ${name}` : ""},`,
    invoice: "Fattura",
    issued: "Data emissione",
    due: "Scadenza",
    items: (n: number) => `Voci (${n}):`,
    subtotal: "Subtotale",
    discount: "Sconto",
    tax: (rate: number) => `IVA (${rate}%)`,
    total: "TOTALE",
    notes: "Note",
    closing: "Grazie per la fiducia!",
    locale: "it-IT",
  },
};

export function buildWhatsAppMessage(inv: Invoice, lang: Language): string {
  const t = labels[lang] ?? labels.en;
  const currency = inv.currency || "USD";

  const fmt = (amount: number) =>
    new Intl.NumberFormat(t.locale, { style: "currency", currency }).format(
      amount,
    );

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    return new Intl.DateTimeFormat(t.locale, { dateStyle: "medium" }).format(
      new Date(iso),
    );
  };

  const customerName =
    inv.customerSnapshot?.name ||
    (typeof inv.customerId === "object" && inv.customerId !== null
      ? [
          (inv.customerId as Customer).firstName,
          (inv.customerId as Customer).lastName,
        ]
          .filter(Boolean)
          .join(" ")
      : "");

  const lines: string[] = [];

  // Greeting
  lines.push(t.greeting(customerName));
  lines.push("");

  // Invoice header
  lines.push(`📄 ${t.invoice}: ${inv.invoiceNumber}`);
  if (inv.issuedDate) lines.push(`📅 ${t.issued}: ${fmtDate(inv.issuedDate)}`);
  if (inv.dueDate) lines.push(`📅 ${t.due}: ${fmtDate(inv.dueDate)}`);
  lines.push("");

  // Line items
  if (inv.items && inv.items.length > 0) {
    lines.push(`🧾 ${t.items(inv.items.length)}`);
    for (const item of inv.items) {
      const qty = item.quantity ?? 1;
      const price = item.unitPrice ?? 0;
      const lineTotal = item.total ?? qty * price;
      const desc = item.description || "—";
      lines.push(`  • ${desc} — ${qty} × ${fmt(price)} = ${fmt(lineTotal)}`);
    }
    lines.push("");
  }

  // Totals
  if (inv.subtotal != null) lines.push(`${t.subtotal}: ${fmt(inv.subtotal)}`);
  if (inv.discount?.amount && inv.discount.amount > 0)
    lines.push(`${t.discount}: -${fmt(inv.discount.amount)}`);
  if (inv.tax != null && inv.tax > 0)
    lines.push(`${t.tax(inv.taxRate ?? 0)}: ${fmt(inv.tax)}`);
  if (inv.total != null) lines.push(`💰 ${t.total}: ${fmt(inv.total)}`);

  // Notes
  if (inv.notes?.trim()) {
    lines.push("");
    lines.push(`📝 ${t.notes}: ${inv.notes.trim()}`);
  }

  lines.push("");
  lines.push(t.closing);

  return lines.join("\n");
}
