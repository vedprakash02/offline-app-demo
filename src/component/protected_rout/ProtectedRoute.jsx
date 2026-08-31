import { Navigate, Outlet, useLocation } from "react-router-dom";

const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  const activeSession = localStorage.getItem("activeSession");
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace />;
  if (!activeSession && location.pathname !== "/session") return <Navigate to="/session" replace />;
  return <Outlet />;
};
export default ProtectedRoute;
