import apiClient from "./apiClient";
import type { Job, JobStatus } from "../types";

export interface JobsQuery {
  page?: number;
  limit?: number;
  status?: JobStatus;
  search?: string;
  customerId?: string;
  assignedUserId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface JobsResponse {
  success: boolean;
  data: Job[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export const jobService = {
  getAll: async (params?: JobsQuery): Promise<JobsResponse> => {
    const res = await apiClient.get<JobsResponse>("/jobs", { params });
    return res.data;
  },

  getById: async (id: string): Promise<Job> => {
    const res = await apiClient.get<Job>(`/jobs/${id}`);
    return res.data;
  },

  create: async (payload: Partial<Job>): Promise<Job> => {
    const res = await apiClient.post<Job>("/jobs", payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<Job>): Promise<Job> => {
    const res = await apiClient.put<Job>(`/jobs/${id}`, payload);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/jobs/${id}`);
  },
};
