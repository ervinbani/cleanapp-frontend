import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User, UserRole } from "../types";
import {
  login as loginApi,
  register as registerApi,
  getMe,
  updateMe as updateMeApi,
} from "../services/authService";
import type { LoginCredentials, RegisterPayload } from "../types";
import { QueryClient } from "@tanstack/react-query";

// Static permission map derived from actual backend roles data.
// Key = "entity.action", values match what /api/roles returns.
// Update this when backend roles change, or replace with dynamic fetch
// from /auth/me once the backend returns permissions in that response.
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: [
    "users.read",
    "users.create",
    "users.update",
    "users.delete",
    "jobs.read",
    "jobs.create",
    "jobs.update",
    "jobs.delete",
    "services.read",
    "services.create",
    "services.update",
    "services.delete",
    "invoices.read",
    "invoices.create",
    "invoices.update",
    "invoices.delete",
    "roles.read",
    "roles.create",
    "roles.update",
    "roles.delete",
    "permissions.read",
    "permissions.update",
  ],
  director: [
    "users.read",
    "users.update",
    "jobs.read",
    "jobs.create",
    "jobs.update",
    "jobs.delete",
    "services.read",
    "services.create",
    "services.update",
    "invoices.read",
    "invoices.update",
    "roles.read",
    "permissions.read",
  ],
  manager_operations: [
    "jobs.read",
    "jobs.create",
    "jobs.update",
    "jobs.delete",
    "services.read",
    "users.read",
    "invoices.read",
  ],
  manager_hr: ["users.read", "users.create", "users.update", "users.delete"],
  staff: ["jobs.read", "services.read", "invoices.read"],
  worker: ["jobs.read"],
};

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  hasPermission: (entity: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("brillo_token"),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("brillo_token");
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (credentials: LoginCredentials) => {
    const data = await loginApi(credentials);
    localStorage.setItem("brillo_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (payload: RegisterPayload) => {
    const data = await registerApi(payload);
    localStorage.setItem("brillo_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("brillo_token");
    setToken(null);
    setUser(null);
  };

  const updateUser = async (data: Partial<User>) => {
    const updated = await updateMeApi(data);
    setUser(updated);
  };

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const hasPermission = (entity: string, action: string): boolean => {
    if (!user) return false;
    return (
      ROLE_PERMISSIONS[user.role]?.includes(`${entity}.${action}`) ?? false
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
