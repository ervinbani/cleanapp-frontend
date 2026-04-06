import apiClient from "./apiClient";
import type {
  ApiResponse,
  AuthData,
  LoginCredentials,
  RegisterPayload,
  User,
} from "../types";

export const login = async (
  credentials: LoginCredentials,
): Promise<AuthData> => {
  const res = await apiClient.post<ApiResponse<AuthData>>(
    "/auth/login",
    credentials,
  );
  return res.data.data;
};

export const register = async (payload: RegisterPayload): Promise<AuthData> => {
  const res = await apiClient.post<ApiResponse<AuthData>>(
    "/auth/register",
    payload,
  );
  return res.data.data;
};

export const getMe = async (): Promise<AuthData["user"]> => {
  const res = await apiClient.get<ApiResponse<AuthData["user"]>>("/auth/me");
  return res.data.data;
};

export const updateMe = async (data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  preferredLanguage?: string;
}): Promise<User> => {
  const res = await apiClient.put<ApiResponse<User>>("/auth/me", data);
  return res.data.data;
};

export const deleteTenant = async (password: string): Promise<void> => {
  await apiClient.delete("/tenant", { data: { password } });
};
