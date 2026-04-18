import { useState, useRef, useEffect, useCallback } from "react";
import { useLang } from "../contexts/LangContext";
import {
  uploadFile,
  getReadUrl,
  deleteFile,
  listFiles,
} from "../services/uploadService";
import type { UploadResource, FileListItem } from "../services/uploadService";
import styles from "./DocumentsPage.module.css";

const ACCEPTED = "application/pdf,image/jpeg,image/png,image/webp,image/gif";
const MAX_MB = 20;

const RESOURCES: UploadResource[] = [
  "invoices",
  "customers",
  "jobs",
  "services",
  "tenants",
];

const IMAGE_EXTS = /\.(jpe?g|png|webp|gif)$/i;

function FileThumbnail({
  filename,
  fileKey,
}: {
  filename: string;
  fileKey: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!IMAGE_EXTS.test(filename)) return;
    let cancelled = false;
    getReadUrl(fileKey)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [filename, fileKey]);

  if (IMAGE_EXTS.test(filename)) {
    return url ? (
      <img src={url} alt={filename} className={styles.thumb} />
    ) : (
      <span className={styles.fileIcon}>🖼️</span>
    );
  }
  if (/\.pdf$/i.test(filename))
    return <span className={styles.fileIcon}>📕</span>;
  return <span className={styles.fileIcon}>📄</span>;
}

export default function DocumentsPage() {
  const { lang } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<FileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [activeCursorResource, setActiveCursorResource] =
    useState<UploadResource | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  // upload form state
  const [resource, setResource] = useState<UploadResource>("invoices");
  const [refId, setRefId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocs = useCallback(
    async (nextCursor?: string, cursorResource?: UploadResource) => {
      if (nextCursor && cursorResource) {
        // load-more for a specific resource
        setLoadingMore(true);
        try {
          const result = await listFiles({
            resource: cursorResource,
            cursor: nextCursor,
          });
          setDocs((prev) => [...prev, ...result.files]);
          setHasMore(result.hasMore);
          setCursor(result.nextCursor);
          setActiveCursorResource(cursorResource);
        } catch {
          setListError(t("Failed to load more.", "Error al cargar más."));
        } finally {
          setLoadingMore(false);
        }
        return;
      }
      // initial load — fetch all resources in parallel
      setLoading(true);
      setListError("");
      try {
        const results = await Promise.all(
          RESOURCES.map((r) =>
            listFiles({ resource: r }).catch(() => ({
              files: [],
              count: 0,
              hasMore: false,
              nextCursor: null,
            })),
          ),
        );
        const all = results
          .flatMap((r) => r.files)
          .sort(
            (a, b) =>
              new Date(b.uploadedAt).getTime() -
              new Date(a.uploadedAt).getTime(),
          );
        setDocs(all);
        // only track cursor/hasMore for the last resource that has more — simple approach
        const firstWithMore = results.find((r) => r.hasMore);
        setHasMore(!!firstWithMore);
        setCursor(firstWithMore?.nextCursor ?? null);
        setActiveCursorResource(
          firstWithMore ? RESOURCES[results.indexOf(firstWithMore)] : null,
        );
      } catch {
        setListError(
          t("Failed to load documents.", "Error al cargar los documentos."),
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleCancel = () => {
    setShowForm(false);
    setSelectedFile(null);
    setRefId("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const t = (en: string, es: string) => (lang === "en" ? en : es);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_MB * 1024 * 1024) {
      setError(
        t(
          `File exceeds ${MAX_MB} MB limit.`,
          `El archivo supera el límite de ${MAX_MB} MB.`,
        ),
      );
      setSelectedFile(null);
      return;
    }
    setError("");
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !refId.trim()) {
      setError(
        t(
          "Please select a file and enter a reference ID.",
          "Selecciona un archivo e ingresa un ID de referencia.",
        ),
      );
      return;
    }
    setError("");
    setUploading(true);
    setProgress(0);
    try {
      const key = await uploadFile(
        resource,
        refId.trim(),
        selectedFile,
        setProgress,
      );
      // Optimistic prepend, then re-fetch to get full metadata from backend
      const optimistic: FileListItem = {
        key,
        filename: selectedFile.name,
        resource,
        refId: refId.trim(),
        size: selectedFile.size,
        uploadedAt: new Date().toISOString(),
      };
      setDocs((prev) => [optimistic, ...prev]);
      setSelectedFile(null);
      setRefId("");
      setShowForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError(
        t(
          "Upload failed. Please try again.",
          "Error al cargar. Inténtalo de nuevo.",
        ),
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleView = async (key: string) => {
    try {
      const url = await getReadUrl(key);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError(t("Could not open file.", "No se pudo abrir el archivo."));
    }
  };

  const handleCopyUrl = async (key: string) => {
    try {
      const url = await getReadUrl(key);
      await navigator.clipboard.writeText(url);
    } catch {
      setError(t("Could not copy URL.", "No se pudo copiar la URL."));
    }
  };

  const handleDelete = async (doc: FileListItem) => {
    if (
      !window.confirm(
        t(`Delete "${doc.filename}"?`, `¿Eliminar "${doc.filename}"?`),
      )
    )
      return;
    try {
      await deleteFile(doc.key);
      setDocs((prev) => prev.filter((d) => d.key !== doc.key));
    } catch {
      setListError(t("Delete failed.", "Error al eliminar."));
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{t("Documents", "Documentos")}</h1>
        {!showForm && (
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            + {t("Add file", "Agregar archivo")}
          </button>
        )}
      </div>

      {/* Upload card */}
      {showForm && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            {t("Upload a file", "Cargar archivo")}
          </h2>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t("Resource", "Recurso")}</label>
              <select
                className={styles.select}
                value={resource}
                onChange={(e) => setResource(e.target.value as UploadResource)}
              >
                {RESOURCES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                {t("Reference ID", "ID de referencia")}
              </label>
              <input
                className={styles.input}
                type="text"
                placeholder={t("e.g. invoice-001", "ej. factura-001")}
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
              />
            </div>
          </div>

          <div
            className={styles.dropzone}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) {
                if (file.size > MAX_MB * 1024 * 1024) {
                  setError(
                    t(
                      `File exceeds ${MAX_MB} MB limit.`,
                      `El archivo supera el límite de ${MAX_MB} MB.`,
                    ),
                  );
                  return;
                }
                setError("");
                setSelectedFile(file);
              }
            }}
          >
            <span className={styles.dropzoneIcon}>📎</span>
            {selectedFile ? (
              <span className={styles.dropzoneFile}>
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            ) : (
              <span>
                {t(
                  "Click or drag a file here",
                  "Haz clic o arrastra un archivo aquí",
                )}
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className={styles.hiddenInput}
              onChange={handleFileChange}
            />
          </div>

          {uploading && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              className={styles.cancelBtn}
              onClick={handleCancel}
              disabled={uploading}
            >
              {t("Cancel", "Cancelar")}
            </button>
            <button
              className={styles.uploadBtn}
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
            >
              {uploading
                ? `${t("Uploading", "Cargando")}… ${progress}%`
                : t("Upload", "Cargar")}
            </button>
          </div>
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <p className={styles.empty}>{t("Loading…", "Cargando…")}</p>
      ) : listError ? (
        <p className={styles.error}>{listError}</p>
      ) : docs.length > 0 ? (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            {t("Uploaded files", "Archivos cargados")}
          </h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("Preview", "Vista previa")}</th>
                <th>{t("File", "Archivo")}</th>
                <th>{t("Resource", "Recurso")}</th>
                <th>{t("Ref ID", "ID Ref")}</th>
                <th>{t("Date", "Fecha")}</th>
                <th>{t("Actions", "Acciones")}</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.key}>
                  <td className={styles.thumbCell}>
                    <FileThumbnail filename={doc.filename} fileKey={doc.key} />
                  </td>
                  <td className={styles.filenameCell}>{doc.filename}</td>
                  <td>
                    <span className={styles.badge}>{doc.resource}</span>
                  </td>
                  <td className={styles.refCell}>{doc.refId}</td>
                  <td className={styles.dateCell}>
                    {new Date(doc.uploadedAt).toLocaleString()}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        className={styles.viewBtn}
                        onClick={() => handleView(doc.key)}
                        title={t("View", "Ver")}
                      >
                        👁
                      </button>
                      <button
                        className={styles.copyBtn}
                        onClick={() => handleCopyUrl(doc.key)}
                        title={t("Copy URL", "Copiar URL")}
                      >
                        🔗
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(doc)}
                        title={t("Delete", "Eliminar")}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className={styles.loadMoreRow}>
              <button
                className={styles.loadMoreBtn}
                onClick={() =>
                  cursor &&
                  activeCursorResource &&
                  fetchDocs(cursor, activeCursorResource)
                }
                disabled={loadingMore}
              >
                {loadingMore
                  ? t("Loading…", "Cargando…")
                  : t("Load more", "Cargar más")}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className={styles.empty}>
          {t("No documents uploaded yet.", "Aún no hay documentos cargados.")}
        </p>
      )}
    </div>
  );
}
