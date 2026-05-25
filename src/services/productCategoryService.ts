import apiClient from "./apiClient";
import type { ProductCategory } from "../types";

export interface ProductCategoriesQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export interface ProductCategoriesResponse {
  success: boolean;
  data: ProductCategory[];
  pagination: { total: number; page: number; limit: number };
}

export const productCategoryService = {
  getAll: async (
    params?: ProductCategoriesQuery,
  ): Promise<ProductCategoriesResponse> => {
    const res = await apiClient.get<ProductCategoriesResponse>(
      "/product-categories",
      { params },
    );
    return res.data;
  },

  getById: async (id: string): Promise<ProductCategory> => {
    const res = await apiClient.get<{
      success: boolean;
      data: ProductCategory;
    }>(`/product-categories/${id}`);
    return res.data.data;
  },

  create: async (
    payload: Partial<ProductCategory>,
  ): Promise<ProductCategory> => {
    const res = await apiClient.post<{
      success: boolean;
      data: ProductCategory;
    }>("/product-categories", payload);
    return res.data.data;
  },

  update: async (
    id: string,
    payload: Partial<ProductCategory>,
  ): Promise<ProductCategory> => {
    const res = await apiClient.put<{
      success: boolean;
      data: ProductCategory;
    }>(`/product-categories/${id}`, payload);
    return res.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/product-categories/${id}`);
  },
};
