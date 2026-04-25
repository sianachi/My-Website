import { AdminAuthProvider, useAdminAuth } from "@/lib/adminAuth";
import { AdminConsole } from "@/pages/admin/AdminConsole";
import { RegisterCard } from "@/pages/admin/RegisterCard";
import { SignInCard } from "@/pages/admin/SignInCard";

export function AdminPage() {
  return (
    <AdminAuthProvider>
      <AdminGate />
    </AdminAuthProvider>
  );
}

function AdminGate() {
  const { status, refresh } = useAdminAuth();

  if (status.state === "loading") {
    return (
      <div className="site-splash" aria-busy="true" aria-live="polite">
        <span className="site-splash-dot" />
      </div>
    );
  }

  if (status.state === "error") {
    return (
      <div className="site-error" role="alert">
        <div className="label label-accent">§ Couldn&apos;t reach /core</div>
        <p className="site-error-msg">{status.error.message}</p>
        <button type="button" className="site-error-retry" onClick={refresh}>
          Retry →
        </button>
      </div>
    );
  }

  if (status.state === "needs-registration") {
    return <RegisterCard />;
  }

  if (status.state === "needs-login") {
    return <SignInCard />;
  }

  return <AdminConsole credentialCount={status.credentialCount} />;
}
