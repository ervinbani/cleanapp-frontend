import apiClient from "./apiClient";
import type { Invoice, InvoiceStatus } from "../types";

export interface InvoicesQuery {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  search?: string;
  customerId?: string;
}

export interface InvoicesResponse {
  success: boolean;
  data: Invoice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export const invoiceService = {
  getAll: async (params?: InvoicesQuery): Promise<InvoicesResponse> => {
    const res = await apiClient.get<InvoicesResponse>("/invoices", { params });
    return res.data;
  },

  getById: async (id: string): Promise<Invoice> => {
    const res = await apiClient.get<Invoice>(`/invoices/${id}`);
    return res.data;
  },

  create: async (payload: Partial<Invoice>): Promise<Invoice> => {
    const res = await apiClient.post<Invoice>("/invoices", payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<Invoice>): Promise<Invoice> => {
    const res = await apiClient.put<Invoice>(`/invoices/${id}`, payload);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoices/${id}`);
  },
};
