import apiClient from "./apiClient";
import type { Role, Permission, ApiResponse } from "../types";

export const roleService = {
  getAll: (): Promise<Role[]> =>
    apiClient.get<ApiResponse<Role[]>>("/roles").then((r) => r.data.data),

  update: (id: string, permissionIds: string[]): Promise<Role> =>
    apiClient
      .put<ApiResponse<Role>>(`/roles/${id}`, { permissions: permissionIds })
      .then((r) => r.data.data),
};

export const permissionService = {
  getAll: (): Promise<Permission[]> =>
    apiClient.get<ApiResponse<Permission[]>>("/permissions").then((r) => r.data.data),
};
