import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PrivateRoute() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <span style={{ color: "#2563eb", fontSize: "1rem" }}>Loading…</span>
      </div>
    );
  }

  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
