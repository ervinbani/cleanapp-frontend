import apiClient from "./apiClient";
import type { ApiResponse, InternalMessage, SendMessagePayload } from "../types";

export const messageService = {
  getInbox: async (): Promise<InternalMessage[]> => {
    const res = await apiClient.get<ApiResponse<InternalMessage[]>>("/inbox");
    return res.data.data;
  },

  getSent: async (): Promise<InternalMessage[]> => {
    const res = await apiClient.get<ApiResponse<InternalMessage[]>>("/inbox/sent");
    return res.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get<ApiResponse<{ count: number }>>(
      "/inbox/unread-count"
    );
    return res.data.data.count;
  },

  getThread: async (userId: string): Promise<InternalMessage[]> => {
    const res = await apiClient.get<ApiResponse<InternalMessage[]>>(
      `/inbox/thread/${userId}`
    );
    return res.data.data;
  },

  send: async (payload: SendMessagePayload): Promise<InternalMessage> => {
    const res = await apiClient.post<ApiResponse<InternalMessage>>(
      "/inbox/send",
      payload
    );
    return res.data.data;
  },

  markAsRead: async (id: string): Promise<InternalMessage> => {
    const res = await apiClient.patch<ApiResponse<InternalMessage>>(
      `/inbox/${id}/read`
    );
    return res.data.data;
  },

  deleteMessage: async (id: string): Promise<void> => {
    await apiClient.delete(`/inbox/${id}`);
  },
};
