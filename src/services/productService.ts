import apiClient from "./apiClient";
import type { Product } from "../types";

export interface ProductsQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  categoryId?: string;
  search?: string;
}

export interface ProductsResponse {
  success: boolean;
  data: Product[];
  pagination: { total: number; page: number; limit: number };
}

export const productService = {
  getAll: async (params?: ProductsQuery): Promise<ProductsResponse> => {
    const res = await apiClient.get<ProductsResponse>("/products", { params });
    return res.data;
  },

  getById: async (id: string): Promise<Product> => {
    const res = await apiClient.get<{ success: boolean; data: Product }>(
      `/products/${id}`,
    );
    return res.data.data;
  },

  create: async (payload: Partial<Product>): Promise<Product> => {
    const res = await apiClient.post<{ success: boolean; data: Product }>(
      "/products",
      payload,
    );
    return res.data.data;
  },

  update: async (id: string, payload: Partial<Product>): Promise<Product> => {
    const res = await apiClient.put<{ success: boolean; data: Product }>(
      `/products/${id}`,
      payload,
    );
    return res.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },
};
