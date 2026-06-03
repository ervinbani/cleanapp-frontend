import apiClient from "./apiClient";
import type { ApiResponse } from "../types";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export const aiService = {
  chat: async (messages: AiMessage[]): Promise<string> => {
    const res = await apiClient.post<ApiResponse<{ reply: string }>>(
      "/ai/chat",
      { messages },
    );
    return res.data.data.reply;
  },
};
