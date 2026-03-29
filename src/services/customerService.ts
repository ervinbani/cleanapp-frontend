import apiClient from "./apiClient";
import type { Customer, CustomerStatus } from "../types";

export type CustomerSource =
  | "manual"
  | "website"
  | "phone"
  | "referral"
  | "facebook"
  | "google";

export interface CustomersQuery {
  page?: number;
  limit?: number;
  status?: CustomerStatus;
  source?: CustomerSource;
  search?: string;
}

export interface CustomersResponse {
  success: boolean;
  data: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export const customerService = {
  getAll: async (params?: CustomersQuery): Promise<CustomersResponse> => {
    const res = await apiClient.get<CustomersResponse>("/customers", {
      params,
    });
    return res.data;
  },

  getById: async (id: string): Promise<Customer> => {
    const res = await apiClient.get<Customer>(`/customers/${id}`);
    return res.data;
  },

  create: async (payload: Partial<Customer>): Promise<Customer> => {
    const res = await apiClient.post<Customer>("/customers", payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<Customer>): Promise<Customer> => {
    const res = await apiClient.put<Customer>(`/customers/${id}`, payload);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },
};
