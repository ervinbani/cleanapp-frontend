import apiClient from "./apiClient";
import type { RecurringRule } from "../types";

interface RecurringPayload {
  customerId: string;
  serviceId?: string;
  frequency: "daily" | "weekly" | "monthly";
  daysOfWeek?: number[];
  monthsOfYear?: number[];
  startDate: string;
  endDate?: string;
  startTime: string;
  timeDuration?: number;
  title?: string;
  price?: number;
  priceUnit?: "per_hour" | "per_job" | "per_day";
  propertyAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  assignedUsers?: string[];
}

interface CreateResponse {
  rule: RecurringRule;
  jobsGenerated: number;
}

interface GenerateResponse {
  jobsGenerated: number;
}

export const recurringService = {
  create: (payload: RecurringPayload): Promise<CreateResponse> =>
    apiClient
      .post<{ success: boolean; data: CreateResponse }>("/recurring", payload)
      .then((r) => r.data.data),

  getAll: (): Promise<RecurringRule[]> =>
    apiClient
      .get<{ success: boolean; data: RecurringRule[] }>("/recurring")
      .then((r) => r.data.data),

  getById: (id: string): Promise<RecurringRule> =>
    apiClient
      .get<{ success: boolean; data: RecurringRule }>(`/recurring/${id}`)
      .then((r) => r.data.data),

  update: (
    id: string,
    payload: Partial<RecurringPayload>,
  ): Promise<RecurringRule> =>
    apiClient
      .put<{
        success: boolean;
        data: RecurringRule;
      }>(`/recurring/${id}`, payload)
      .then((r) => r.data.data),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/recurring/${id}`).then(() => undefined),

  generate: (id: string, from: string, to: string): Promise<GenerateResponse> =>
    apiClient
      .post<{
        success: boolean;
        data: GenerateResponse;
      }>(`/recurring/${id}/generate`, {}, { params: { from, to } })
      .then((r) => r.data.data),
};
