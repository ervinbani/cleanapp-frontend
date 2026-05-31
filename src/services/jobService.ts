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
    const res = await apiClient.put<{ success: boolean; data: Job } | Job>(
      `/jobs/${id}`,
      payload,
    );
    const d = res.data as { success?: boolean; data?: Job };
    return d.success !== undefined && d.data ? d.data : (res.data as Job);
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/jobs/${id}`);
  },

  punchIn: async (id: string): Promise<Job> => {
    const res = await apiClient.post<{ success: boolean; data: Job }>(
      `/jobs/${id}/punch-in`,
    );
    return res.data.data ?? (res.data as unknown as Job);
  },

  punchOut: async (id: string): Promise<Job> => {
    const res = await apiClient.post<{ success: boolean; data: Job }>(
      `/jobs/${id}/punch-out`,
    );
    return res.data.data ?? (res.data as unknown as Job);
  },

  addTimeEntry: async (
    id: string,
    payload: { userId: string; clockIn: string; durationMinutes: number },
  ): Promise<Job> => {
    const res = await apiClient.post<{ success: boolean; data: Job }>(
      `/jobs/${id}/time-entries`,
      payload,
    );
    return res.data.data ?? (res.data as unknown as Job);
  },
};
