import apiClient from "./apiClient";
import type { ApiResponse } from "../types";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  reply: string;
  sessionId: string;
}

export const aiService = {
  chat: async (
    messages: AiMessage[],
    sessionId: string | null,
  ): Promise<ChatResult> => {
    const body: { messages: AiMessage[]; sessionId?: string } = { messages };
    if (sessionId) body.sessionId = sessionId;
    const res = await apiClient.post<ApiResponse<{ reply: string; sessionId: string }>>(
      "/ai/chat",
      body,
    );
    return res.data.data;
  },
};
