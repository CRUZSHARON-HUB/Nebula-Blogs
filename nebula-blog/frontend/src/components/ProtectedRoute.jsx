import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { PageLoader } from "./Skeletons";

export function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <PageLoader label="Checking your credentials" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
