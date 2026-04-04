import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { customerService } from "../services/customerService";
import type { CustomerSource } from "../services/customerService";
import type { Customer, CustomerStatus } from "../types";
import styles from "./CustomersPage.module.css";

const PAGE_LIMIT = 20;

function countryFlag(code?: string): string {
  if (!code || code.length !== 2) return "";
  const offset = 0x1f1e6 - 65;
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + offset))
    .join("");
}

function getPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

const t = {
  en: {
    title: "Clients",
    addClient: "+ Add Client",
    searchPlaceholder: "Search clients...",
    colName: "Name",
    colEmail: "Email",
    colCountry: "Country",
    colStatus: "Status",
    colSource: "Source",
    colActions: "Actions",
    btnView: "View",
    btnUpdate: "Update",
    allStatuses: "All statuses",
    allSources: "All sources",
    filterName: "Filter name…",
    filterEmail: "Filter email…",
    filterCountry: "Filter country…",
    filterStatus: "Filter status…",
    filterSource: "Filter source…",
    prev: "← Prev",
    next: "Next →",
    noResults: "No clients found.",
    loading: "Loading…",
    page: "Page",
    of: "of",
    exportExcel: "Export Excel",
    exportPdf: "Export PDF",
  },
  es: {
    title: "Clientes",
    addClient: "+ Agregar Cliente",
    searchPlaceholder: "Buscar clientes...",
    colName: "Nombre",
    colEmail: "Correo",
    colCountry: "País",
    colStatus: "Estado",
    colSource: "Fuente",
    colActions: "Acciones",
    btnView: "Ver",
    btnUpdate: "Editar",
    allStatuses: "Todos los estados",
    allSources: "Todas las fuentes",
    filterName: "Filtrar nombre…",
    filterEmail: "Filtrar correo…",
    filterCountry: "Filtrar país…",
    filterStatus: "Filtrar estado…",
    filterSource: "Filtrar fuente…",
    prev: "← Prev",
    next: "Siguiente →",
    noResults: "No se encontraron clientes.",
    loading: "Cargando…",
    page: "Página",
    of: "de",
    exportExcel: "Exportar Excel",
    exportPdf: "Exportar PDF",
  },
};

// ─── CustomerModal (Add + Edit) ────────────────────────────────────────
interface CustomerForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredLanguage: "en" | "es";
  status: CustomerStatus;
  source: CustomerSource;
  notes: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const EMPTY_CUSTOMER_FORM: CustomerForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  preferredLanguage: "en",
  status: "lead",
  source: "manual",
  notes: "",
  street: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
};

function customerToForm(c: Customer): CustomerForm {
  return {
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email ?? "",
    phone: c.phone ?? "",
    preferredLanguage: c.preferredLanguage,
    status: c.status,
    source: c.source,
    notes: c.notes ?? "",
    street: c.address?.street ?? "",
    city: c.address?.city ?? "",
    state: c.address?.state ?? "",
    zipCode: c.address?.zipCode ?? "",
    country: c.address?.country ?? "",
  };
}

interface CustomerModalProps {
  customer?: Customer; // undefined = add mode
  lang: "en" | "es";
  onClose: () => void;
  onSaved: () => void;
}

const ml = {
  en: {
    titleAdd: "Add Client",
    subtitleAdd: "Create a new client",
    titleEdit: "Edit Client",
    subtitleEdit: "Update client details",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    prefLang: "Preferred Language",
    status: "Status",
    source: "Source",
    notes: "Internal Notes",
    addressSection: "Address",
    street: "Street",
    city: "City",
    stateField: "State",
    zipCode: "Zip Code",
    country: "Country",
    cancel: "Cancel",
    save: "Save Client",
    saveEdit: "Save Changes",
    saving: "Saving…",
    placeholderEmail: "client@example.com",
    placeholderPhone: "+1 234 567 8900",
    placeholderNotes: "Internal notes…",
    placeholderStreet: "123 Main St",
    placeholderCity: "Miami",
    placeholderState: "FL",
    placeholderZip: "33101",
    placeholderCountry: "US",
  },
  es: {
    titleAdd: "Agregar Cliente",
    subtitleAdd: "Crear un nuevo cliente",
    titleEdit: "Editar Cliente",
    subtitleEdit: "Actualizar datos del cliente",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo",
    phone: "Teléfono",
    prefLang: "Idioma preferido",
    status: "Estado",
    source: "Fuente",
    notes: "Notas internas",
    addressSection: "Dirección",
    street: "Calle",
    city: "Ciudad",
    stateField: "Estado / Provincia",
    zipCode: "Código postal",
    country: "País",
    cancel: "Cancelar",
    save: "Guardar Cliente",
    saveEdit: "Guardar Cambios",
    saving: "Guardando…",
    placeholderEmail: "cliente@ejemplo.com",
    placeholderPhone: "+1 234 567 8900",
    placeholderNotes: "Notas internas…",
    placeholderStreet: "Calle Mayor 123",
    placeholderCity: "Miami",
    placeholderState: "FL",
    placeholderZip: "33101",
    placeholderCountry: "US",
  },
};

function CustomerModal({
  customer,
  lang,
  onClose,
  onSaved,
}: CustomerModalProps) {
  const isEdit = !!customer;
  const [form, setForm] = useState<CustomerForm>(
    isEdit ? customerToForm(customer!) : EMPTY_CUSTOMER_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lm = ml[lang];

  const set = <K extends keyof CustomerForm>(k: K, v: CustomerForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      preferredLanguage: form.preferredLanguage,
      status: form.status,
      source: form.source,
      notes: form.notes.trim() || undefined,
      address: {
        street: form.street.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        zipCode: form.zipCode.trim() || undefined,
        country: form.country.trim() || undefined,
      },
    };
    try {
      if (isEdit) {
        await customerService.update(customer!._id, payload);
      } else {
        await customerService.create(payload);
      }
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Error saving client.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>
              {isEdit ? lm.titleEdit : lm.titleAdd}
            </h3>
            <p className={styles.modalSubtitle}>
              {isEdit ? lm.subtitleEdit : lm.subtitleAdd}
            </p>
          </div>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {/* Name */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {lm.firstName} <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {lm.lastName} <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{lm.email}</label>
              <input
                className={styles.input}
                type="email"
                placeholder={lm.placeholderEmail}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{lm.phone}</label>
              <input
                className={styles.input}
                type="tel"
                placeholder={lm.placeholderPhone}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>

          {/* Status + Source */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {lm.status} <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.input}
                value={form.status}
                onChange={(e) =>
                  set("status", e.target.value as CustomerStatus)
                }
                required
              >
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {lm.source} <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.input}
                value={form.source}
                onChange={(e) =>
                  set("source", e.target.value as CustomerSource)
                }
                required
              >
                <option value="manual">Manual</option>
                <option value="website">Website</option>
                <option value="phone">Phone</option>
                <option value="referral">Referral</option>
                <option value="facebook">Facebook</option>
                <option value="google">Google</option>
              </select>
            </div>
          </div>

          {/* Preferred Language */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{lm.prefLang}</label>
            <select
              className={styles.input}
              value={form.preferredLanguage}
              onChange={(e) =>
                set("preferredLanguage", e.target.value as "en" | "es")
              }
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </div>

          {/* Address section */}
          <div className={styles.sectionDivider}>{lm.addressSection}</div>
          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
              <label className={styles.label}>{lm.street}</label>
              <input
                className={styles.input}
                placeholder={lm.placeholderStreet}
                value={form.street}
                onChange={(e) => set("street", e.target.value)}
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{lm.city}</label>
              <input
                className={styles.input}
                placeholder={lm.placeholderCity}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{lm.stateField}</label>
              <input
                className={styles.input}
                placeholder={lm.placeholderState}
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{lm.zipCode}</label>
              <input
                className={styles.input}
                placeholder={lm.placeholderZip}
                value={form.zipCode}
                onChange={(e) => set("zipCode", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{lm.country}</label>
              <input
                className={styles.input}
                placeholder={lm.placeholderCountry}
                value={form.country}
                onChange={(e) =>
                  set("country", e.target.value.toUpperCase().slice(0, 2))
                }
                maxLength={2}
              />
            </div>
          </div>

          {/* Notes */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{lm.notes}</label>
            <textarea
              className={styles.textarea}
              placeholder={lm.placeholderNotes}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
            >
              {lm.cancel}
            </button>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {saving ? lm.saving : isEdit ? lm.saveEdit : lm.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { lang } = useLang();
  const { hasRole } = useAuth();
  const l = t[lang];

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // API-level filters
  const [search, setSearch] = useState("");
  const [apiStatus, setApiStatus] = useState<CustomerStatus | "">("");
  const [apiSource, setApiSource] = useState<CustomerSource | "">("");

  // Column-level client filters
  const [colName, setColName] = useState("");
  const [colEmail, setColEmail] = useState("");
  const [colCountry, setColCountry] = useState("");
  const [colStatus, setColStatus] = useState("");
  const [colSource, setColSource] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const canWrite = hasRole("owner", "director", "manager_operations", "manager_hr", "staff");
  const canDelete = hasRole("owner", "director", "manager_operations", "manager_hr");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1" && canWrite) {
      setShowAddModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, canWrite]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerService.getAll({
        page,
        limit: PAGE_LIMIT,
        search: search.trim() || undefined,
        status: apiStatus || undefined,
        source: apiSource || undefined,
      });
      setCustomers(res.data);
      setTotal(res.pagination.total);
    } catch {
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, apiStatus, apiSource]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset to page 1 when API-level filters change
  useEffect(() => {
    setPage(1);
  }, [search, apiStatus, apiSource]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this client?")) return;
    try {
      await customerService.remove(id);
      fetchCustomers();
    } catch {
      alert("Error deleting client.");
    }
  };

  const displayed = customers.filter((c) => {
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    if (colName && !name.includes(colName.toLowerCase())) return false;
    if (
      colEmail &&
      !(c.email ?? "").toLowerCase().includes(colEmail.toLowerCase())
    )
      return false;
    if (
      colCountry &&
      !(c.address?.country ?? "")
        .toLowerCase()
        .includes(colCountry.toLowerCase())
    )
      return false;
    if (colStatus && c.status !== colStatus) return false;
    if (colSource && c.source !== colSource) return false;
    return true;
  });

  const pageRange = getPageRange(page, totalPages);

  const handleExportExcel = useCallback(async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Clients");
    sheet.columns = [
      { header: l.colName, key: "name", width: 25 },
      { header: l.colEmail, key: "email", width: 30 },
      { header: l.colCountry, key: "country", width: 12 },
      { header: l.colStatus, key: "status", width: 12 },
      { header: l.colSource, key: "source", width: 14 },
    ];
    displayed.forEach((c) => {
      sheet.addRow({
        name: `${c.firstName} ${c.lastName}`,
        email: c.email ?? "",
        country: c.address?.country?.toUpperCase() ?? "",
        status: c.status,
        source: c.source,
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
    a.download = "clients.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }, [displayed, l]);

  const handleExportPdf = useCallback(async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(l.title, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [[l.colName, l.colEmail, l.colCountry, l.colStatus, l.colSource]],
      body: displayed.map((c) => [
        `${c.firstName} ${c.lastName}`,
        c.email ?? "—",
        c.address?.country?.toUpperCase() ?? "—",
        c.status,
        c.source,
      ]),
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 255] },
    });
    doc.save("clients.pdf");
  }, [displayed, l]);

  return (
    <div className={styles.page}>
      {showAddModal && canWrite && (
        <CustomerModal
          lang={lang}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            fetchCustomers();
          }}
        />
      )}
      {editingCustomer && canWrite && (
        <CustomerModal
          customer={editingCustomer}
          lang={lang}
          onClose={() => setEditingCustomer(null)}
          onSaved={() => {
            setEditingCustomer(null);
            fetchCustomers();
          }}
        />
      )}

      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{l.title}</h2>
        {canWrite && (
          <button
            className={styles.addBtn}
            onClick={() => setShowAddModal(true)}
          >
            {l.addClient}
          </button>
        )}
      </div>

      {/* Toolbar: global search + API filters */}
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
          onChange={(e) => setApiStatus(e.target.value as CustomerStatus | "")}
        >
          <option value="">{l.allStatuses}</option>
          <option value="lead">Lead</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          className={styles.filterSelect}
          value={apiSource}
          onChange={(e) => setApiSource(e.target.value as CustomerSource | "")}
        >
          <option value="">{l.allSources}</option>
          <option value="manual">Manual</option>
          <option value="website">Website</option>
          <option value="phone">Phone</option>
          <option value="referral">Referral</option>
          <option value="facebook">Facebook</option>
          <option value="google">Google</option>
        </select>

        <div className={styles.exportBtns}>
          <button className={styles.btnExcelExport} onClick={handleExportExcel}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 01-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L17 13.586V12a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            {l.exportExcel}
          </button>
          <button className={styles.btnPdfExport} onClick={handleExportPdf}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
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
            {/* Column labels */}
            <tr className={styles.headRow}>
              <th>
                {l.colName}
                <span className={styles.sortIcon}>⇅</span>
              </th>
              <th>{l.colEmail}</th>
              <th>{l.colCountry}</th>
              <th>{l.colStatus}</th>
              <th>{l.colSource}</th>
              <th>{l.colActions}</th>
            </tr>
            {/* Column filters */}
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
                  placeholder={l.filterEmail}
                  value={colEmail}
                  onChange={(e) => setColEmail(e.target.value)}
                />
              </th>
              <th>
                <input
                  className={styles.colFilter}
                  placeholder={l.filterCountry}
                  value={colCountry}
                  onChange={(e) => setColCountry(e.target.value)}
                />
              </th>
              <th>
                <select
                  className={styles.colFilter}
                  value={colStatus}
                  onChange={(e) => setColStatus(e.target.value)}
                >
                  <option value="">{l.filterStatus}</option>
                  <option value="lead">Lead</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </th>
              <th>
                <select
                  className={styles.colFilter}
                  value={colSource}
                  onChange={(e) => setColSource(e.target.value)}
                >
                  <option value="">{l.filterSource}</option>
                  <option value="manual">Manual</option>
                  <option value="website">Website</option>
                  <option value="phone">Phone</option>
                  <option value="referral">Referral</option>
                  <option value="facebook">Facebook</option>
                  <option value="google">Google</option>
                </select>
              </th>
              <th />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  {l.loading}
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  {l.noResults}
                </td>
              </tr>
            ) : (
              displayed.map((c) => (
                <tr key={c._id} className={styles.bodyRow}>
                  <td className={styles.nameCell}>
                    {c.firstName} {c.lastName}
                  </td>
                  <td className={styles.emailCell}>{c.email ?? "—"}</td>
                  <td>
                    {c.address?.country ? (
                      <span className={styles.countryCell}>
                        <span>{countryFlag(c.address.country)}</span>
                        <span>{c.address.country.toUpperCase()}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${styles[`badge_${c.status}`]}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <span className={styles.sourceCell}>{c.source}</span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.btnView} title={l.btnView}>
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 3C5 3 1.73 7.11 1.07 9.69a1 1 0 000 .62C1.73 12.89 5 17 10 17s8.27-4.11 8.93-6.69a1 1 0 000-.62C18.27 7.11 15 3 10 3zm0 11a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" />
                        </svg>
                      </button>
                      {canWrite && (
                        <button
                          className={styles.btnUpdate}
                          title={l.btnUpdate}
                          onClick={() => setEditingCustomer(c)}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.5 9.5A2 2 0 015.5 16.5H4a1 1 0 01-1-1v-1.5a2 2 0 01.586-1.414l9.5-9.5z" />
                          </svg>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className={styles.btnDelete}
                          onClick={() => handleDelete(c._id)}
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
              ))
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
    </div>
  );
}
