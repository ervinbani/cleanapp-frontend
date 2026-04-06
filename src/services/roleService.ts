import apiClient from "./apiClient";
import type { Role, Permission, ApiResponse } from "../types";

export const roleService = {
  getAll: (): Promise<Role[]> =>
    apiClient.get<ApiResponse<Role[]>>("/roles").then((r) => r.data.data),

  create: (data: {
    name: string;
    code: string;
    description: string;
    isActive: boolean;
    permissionIds: string[];
  }): Promise<Role> =>
    apiClient.post<ApiResponse<Role>>("/roles", data).then((r) => r.data.data),

  update: (id: string, permissionIds: string[]): Promise<Role> =>
    apiClient
      .put<ApiResponse<Role>>(`/roles/${id}`, { permissionIds })
      .then((r) => r.data.data),

  updateMeta: (
    id: string,
    data: { name: string; code: string; description: string; isActive: boolean },
  ): Promise<Role> =>
    apiClient
      .put<ApiResponse<Role>>(`/roles/${id}`, data)
      .then((r) => r.data.data),

  deleteRole: (id: string): Promise<void> =>
    apiClient.delete(`/roles/${id}`).then(() => undefined),
};

export const permissionService = {
  getAll: (): Promise<Permission[]> =>
    apiClient
      .get<ApiResponse<Permission[]>>("/permissions")
      .then((r) => r.data.data),
};
