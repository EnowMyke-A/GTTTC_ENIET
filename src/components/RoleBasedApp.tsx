import { useAuth } from "@/hooks/useAuth";
import { AdminApp } from "./AdminApp";
import { LecturerApp } from "./LecturerApp";
import { LoadingOverlay } from "./ui/loading";
import { Suspense } from "react";

export const RoleBasedApp = () => {
  const { user, userRole, loading, roleLoading } = useAuth();

  // Show loading while determining user role OR if no role is determined yet
  if (loading || (user && roleLoading) || (user && !userRole)) {
    return <LoadingOverlay message="Loading your workspace..." size="xl" />;
  }

  // Redirect to auth if no user
  if (!user) {
    return null; // This will be handled by the auth route
  }

  // Only render when we have a confirmed role to prevent any flashing
  if (userRole === 'admin') {
    return (
      <Suspense fallback={<LoadingOverlay message="Loading admin workspace..." size="xl" />}>
        <AdminApp />
      </Suspense>
    );
  } else if (userRole === 'lecturer') {
    return (
      <Suspense fallback={<LoadingOverlay message="Loading lecturer workspace..." size="xl" />}>
        <LecturerApp />
      </Suspense>
    );
  }

  // Fallback loading if role is still being determined
  return <LoadingOverlay message="Determining user role..." size="xl" />;
};
