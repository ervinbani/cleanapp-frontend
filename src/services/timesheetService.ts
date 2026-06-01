import apiClient from "./apiClient";
import type { TimesheetEntry } from "../types";

export type { TimesheetEntry };

export interface TimesheetsQuery {
  jobId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TimesheetsResponse {
  success: boolean;
  data: TimesheetEntry[];
}

export interface TimesheetPatchPayload {
  clockIn?: string;
  clockOut?: string;
  duration?: number;
}

export const timesheetService = {
  getAll: async (params?: TimesheetsQuery): Promise<TimesheetEntry[]> => {
    const res = await apiClient.get<TimesheetsResponse>("/timesheets", {
      params,
    });
    return res.data.data ?? [];
  },

  update: async (
    jobId: string,
    entryId: string,
    payload: TimesheetPatchPayload,
  ): Promise<void> => {
    await apiClient.patch(`/timesheets/${jobId}/${entryId}`, payload);
  },

  remove: async (jobId: string, entryId: string): Promise<void> => {
    await apiClient.delete(`/timesheets/${jobId}/${entryId}`);
  },
};
