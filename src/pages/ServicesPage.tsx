import { useEffect, useState, useCallback } from "react";
import { useLang } from "../contexts/LangContext";
import { useTrans } from "../i18n";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../services/apiClient";
import type { Service } from "../types";
import styles from "./ServicesPage.module.css";

const PAGE_LIMIT = 20;

interface ServicesResponse {
  success: boolean;
  data: Service[];
  pagination: { total: number; page: number; limit: number };
}

function getPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// ── Service Modal ────────────────────────────────────────────────────────────
type PriceUnit = "per_hour" | "per_job" | "per_day";

interface ServiceForm {
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  basePrice: string;
  priceUnit: PriceUnit;
  isActive: boolean;
  overtimeEnabled: boolean;
  overtimeUnit: PriceUnit;
  overtimePercentage: string;
}

const EMPTY_SERVICE_FORM: ServiceForm = {
  nameEn: "",
  nameEs: "",
  descriptionEn: "",
  descriptionEs: "",
  basePrice: "",
  priceUnit: "per_job",
  isActive: true,
  overtimeEnabled: false,
  overtimeUnit: "per_hour",
  overtimePercentage: "",
};

function serviceToForm(s: Service): ServiceForm {
  return {
    nameEn: s.name?.en ?? "",
    nameEs: s.name?.es ?? "",
    descriptionEn: s.description?.en ?? "",
    descriptionEs: s.description?.es ?? "",
    basePrice: s.basePrice != null ? String(s.basePrice) : "",
    priceUnit: (s.priceUnit as PriceUnit) ?? "per_job",
    isActive: s.isActive,
    overtimeEnabled: s.overtime?.isEnabled ?? false,
    overtimeUnit: (s.overtime?.unit as PriceUnit) ?? "per_hour",
    overtimePercentage:
      s.overtime?.extraPercentage != null
        ? String(s.overtime.extraPercentage)
        : "",
  };
}

interface ServiceModalProps {
  service?: Service;
  lang: "en" | "es";
  onClose: () => void;
  onSaved: () => void;
}

function ServiceModal({
  service,
  onClose,
  onSaved,
}: Omit<ServiceModalProps, "lang">) {
  const isEdit = !!service;
  const l = useTrans("servicesModal");
  const [form, setForm] = useState<ServiceForm>(
    isEdit ? serviceToForm(service!) : EMPTY_SERVICE_FORM,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"en" | "es">("en");

  const set = (field: keyof ServiceForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameEn.trim()) {
      setError(l.required);
      setActiveTab("en");
      return;
    }
    if (form.overtimeEnabled && form.overtimePercentage === "") {
      setError(l.overtimePercentageRequired);
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
        basePrice: form.basePrice !== "" ? Number(form.basePrice) : undefined,
        priceUnit: form.priceUnit,
        isActive: form.isActive,
        overtime: form.overtimeEnabled
          ? {
              isEnabled: true,
              unit: form.overtimeUnit,
              extraPercentage: Number(form.overtimePercentage),
            }
          : { isEnabled: false },
      };
      if (isEdit) {
        await apiClient.put(`/services/${service!._id}`, payload);
      } else {
        await apiClient.post("/services", payload);
      }
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Error saving service.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
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

          {/* Per-language fields */}
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
                  rows={4}
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
                  rows={4}
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
              <label className={styles.label}>{l.price}</label>
              <div className={styles.priceRow}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basePrice}
                  onChange={(e) => set("basePrice", e.target.value)}
                />
                <select
                  value={form.priceUnit}
                  onChange={(e) =>
                    set("priceUnit", e.target.value as PriceUnit)
                  }
                >
                  <option value="per_hour">{l.unitPerHour}</option>
                  <option value="per_job">{l.unitPerJob}</option>
                  <option value="per_day">{l.unitPerDay}</option>
                </select>
              </div>
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

          <div className={styles.formGroup}>
            <label className={styles.label}>{l.overtimeLabel}</label>
            <div className={styles.toggleRow}>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={form.overtimeEnabled}
                  onChange={(e) => set("overtimeEnabled", e.target.checked)}
                />
                <span className={styles.toggleSlider} />
              </label>
              <span className={styles.toggleLabel}>
                {form.overtimeEnabled ? l.overtimeOn : l.overtimeOff}
              </span>
            </div>
          </div>

          {form.overtimeEnabled && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.overtimeUnit}</label>
                <select
                  className={styles.select}
                  value={form.overtimeUnit}
                  onChange={(e) =>
                    set("overtimeUnit", e.target.value as PriceUnit)
                  }
                >
                  <option value="per_hour">{l.unitPerHour}</option>
                  <option value="per_job">{l.unitPerJob}</option>
                  <option value="per_day">{l.unitPerDay}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{l.overtimePercentage}</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  className={styles.input}
                  value={form.overtimePercentage}
                  onChange={(e) => set("overtimePercentage", e.target.value)}
                />
              </div>
            </div>
          )}

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

export default function ServicesPage() {
  const { lang } = useLang();
  const { hasRole } = useAuth();
  const l = useTrans("services");

  const [services, setServices] = useState<Service[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Column filters
  const [colName, setColName] = useState("");
  const [colDescription, setColDescription] = useState("");
  const [colStatus, setColStatus] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const canWrite = hasRole(
    "owner",
    "director",
    "manager_operations",
    "manager_hr",
  );
  const canDelete = hasRole(
    "owner",
    "director",
    "manager_operations",
    "manager_hr",
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ServicesResponse>("/services", {
        params: {
          page,
          limit: PAGE_LIMIT,
          search: search.trim() || undefined,
        },
      });
      setServices(res.data.data);
      setTotal(res.data.pagination.total);
    } catch {
      setServices([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      await apiClient.delete(`/services/${id}`);
      fetchServices();
    } catch {
      alert("Error deleting service.");
    }
  };

  const displayed = services.filter((s) => {
    const name = (s.name?.[lang] ?? s.name?.en ?? "").toLowerCase();
    const desc = (
      s.description?.[lang] ??
      s.description?.en ??
      ""
    ).toLowerCase();
    if (colName && !name.includes(colName.toLowerCase())) return false;
    if (colDescription && !desc.includes(colDescription.toLowerCase()))
      return false;
    if (colStatus === "active" && !s.isActive) return false;
    if (colStatus === "inactive" && s.isActive) return false;
    return true;
  });

  const pageRange = getPageRange(page, totalPages);

  const exportExcel = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Services");
    ws.columns = [
      { header: l.colName, key: "name", width: 28 },
      { header: l.colDescription, key: "description", width: 40 },
      { header: l.colPrice, key: "price", width: 14 },
      { header: l.colPriceUnit, key: "priceUnit", width: 12 },
      { header: l.colStatus, key: "status", width: 12 },
    ];
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE5E7EB" },
      };
    });
    displayed.forEach((s) => {
      ws.addRow({
        name: s.name?.[lang] ?? s.name?.en ?? "",
        description: s.description?.[lang] ?? s.description?.en ?? "",
        price: s.basePrice != null ? `$${s.basePrice.toFixed(2)}` : "",
        priceUnit: s.priceUnit
          ? (l.priceUnitLabels[s.priceUnit] ?? s.priceUnit)
          : "",
        status: s.isActive ? l.active : l.inactive,
      });
    });
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "services.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(l.title, 14, 16);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      startY: 22,
      head: [
        [l.colName, l.colDescription, l.colPrice, l.colPriceUnit, l.colStatus],
      ],
      body: displayed.map((s) => [
        s.name?.[lang] ?? s.name?.en ?? "",
        s.description?.[lang] ?? s.description?.en ?? "",
        s.basePrice != null ? `$${s.basePrice.toFixed(2)}` : "",
        s.priceUnit ? (l.priceUnitLabels[s.priceUnit] ?? s.priceUnit) : "",
        s.isActive ? l.active : l.inactive,
      ]),
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    doc.save("services.pdf");
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>{l.title}</h2>
        {canWrite && (
          <button
            className={styles.addBtn}
            onClick={() => setShowAddModal(true)}
          >
            {l.addService}
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
        <div className={styles.exportBtns}>
          <button className={styles.btnExcelExport} onClick={exportExcel}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h14a1 1 0 001-1V7.414A1 1 0 0017.707 7L14 3.293A1 1 0 0013.586 3H3zm9 1.414L15.586 8H13a1 1 0 01-1-1V4.414zM7 9a1 1 0 000 2h6a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
            {l.exportExcel}
          </button>
          <button className={styles.btnPdfExport} onClick={exportPdf}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h4a1 1 0 100-2H7z"
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
              <th>{l.colName}</th>
              <th>{l.colDescription}</th>
              <th>{l.colPrice}</th>
              <th>{l.colPriceUnit}</th>
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
                  placeholder={l.filterDescription}
                  value={colDescription}
                  onChange={(e) => setColDescription(e.target.value)}
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
              displayed.map((s) => (
                <tr key={s._id} className={styles.bodyRow}>
                  <td className={styles.nameCell}>
                    {s.name?.[lang] ?? s.name?.en ?? "—"}
                  </td>
                  <td className={styles.descCell}>
                    {s.description?.[lang] ?? s.description?.en ?? "—"}
                  </td>
                  <td className={styles.priceCell}>
                    {s.basePrice != null ? `$${s.basePrice.toFixed(2)}` : "—"}
                    {s.overtime?.isEnabled && (
                      <span className={styles.badgeOT}>
                        OT +{s.overtime.extraPercentage}%
                      </span>
                    )}
                  </td>
                  <td className={styles.priceCell}>
                    {s.priceUnit
                      ? (l.priceUnitLabels[s.priceUnit] ?? s.priceUnit)
                      : "—"}
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${s.isActive ? styles.badge_active : styles.badge_inactive}`}
                    >
                      {s.isActive ? l.active : l.inactive}
                    </span>
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
                          onClick={() => setEditingService(s)}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.5 9.5A2 2 0 015.5 16.5H4a1 1 0 01-1-1v-1.5a2 2 0 01.586-1.414l9.5-9.5z" />
                          </svg>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className={styles.btnDelete}
                          onClick={() => handleDelete(s._id)}
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
              <span key={`e-${i}`} className={styles.ellipsis}>
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

      {showAddModal && canWrite && (
        <ServiceModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            fetchServices();
          }}
        />
      )}
      {editingService && canWrite && (
        <ServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSaved={() => {
            setEditingService(null);
            fetchServices();
          }}
        />
      )}
    </div>
  );
}
