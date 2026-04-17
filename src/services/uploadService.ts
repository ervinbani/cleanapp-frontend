import apiClient from "./apiClient";

export type UploadResource =
  | "invoices"
  | "customers"
  | "jobs"
  | "services"
  | "tenants";

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

export interface PresignedReadResult {
  readUrl: string;
  expiresIn: number;
}

/** Step 1: get a presigned PUT URL from the backend */
async function getPresignedUploadUrl(
  resource: UploadResource,
  refId: string,
  file: File,
): Promise<PresignedUploadResult> {
  const params = new URLSearchParams({
    resource,
    refId,
    filename: file.name,
    contentType: file.type,
    fileSize: String(file.size),
  });
  const res = await apiClient.get<{ success: boolean; data: PresignedUploadResult }>(
    `/uploads/presigned-url?${params}`,
  );
  return res.data.data;
}

/** Step 2: upload the file binary directly to R2 */
async function uploadToR2(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`R2 upload failed: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Network error during R2 upload"));
    xhr.send(file);
  });
}

/** Full upload flow — returns the stored key */
export async function uploadFile(
  resource: UploadResource,
  refId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { uploadUrl, key } = await getPresignedUploadUrl(resource, refId, file);
  await uploadToR2(uploadUrl, file, onProgress);
  return key;
}

/** Get a short-lived read URL for a stored key */
export async function getReadUrl(key: string): Promise<string> {
  const res = await apiClient.get<{ success: boolean; data: PresignedReadResult }>(
    `/uploads/presigned-read?key=${encodeURIComponent(key)}`,
  );
  return res.data.data.readUrl;
}

/** Delete a file by key */
export async function deleteFile(key: string): Promise<void> {
  await apiClient.delete("/uploads", { data: { key } });
}

export interface FileListItem {
  key: string;
  filename: string;
  resource: UploadResource;
  refId: string;
  size: number;
  uploadedAt: string;
}

export interface FileListResult {
  files: FileListItem[];
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
}

/** List tenant files — resource is required by the backend */
export async function listFiles(params: {
  resource: UploadResource;
  refId?: string;
  cursor?: string;
}): Promise<FileListResult> {
  const query = new URLSearchParams({ resource: params.resource });
  if (params.refId) query.set("refId", params.refId);
  if (params.cursor) query.set("cursor", params.cursor);
  const res = await apiClient.get<{ success: boolean; data: FileListResult }>(
    `/uploads/list?${query}`,
  );
  return res.data.data;
}
