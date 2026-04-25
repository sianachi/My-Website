import { useState } from "react";
import { useAdminAuth } from "@/lib/adminAuth";

export function AdminConsole({ credentialCount }: { credentialCount: number }) {
  const { addCredential, logout } = useAdminAuth();
  const [busy, setBusy] = useState<"add" | "logout" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: "add" | "logout", fn: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="core-shell">
      <section className="core-card" aria-labelledby="core-console-heading">
        <p className="label label-accent core-meta">§ Signed in</p>
        <h1 id="core-console-heading" className="core-heading">
          Admin console.
        </h1>
        <p className="core-body">
          Authenticated as <code>admin</code> with {credentialCount} passkey
          {credentialCount === 1 ? "" : "s"} on file. Elevated actions land
          here in a follow-up.
        </p>
        <div className="core-actions">
          <button
            type="button"
            className="core-btn core-btn--ghost"
            onClick={() => run("add", addCredential)}
            disabled={busy !== null}
          >
            {busy === "add" ? "Waiting…" : "Add another passkey"}
          </button>
          <button
            type="button"
            className="core-btn core-btn--ghost"
            onClick={() => run("logout", logout)}
            disabled={busy !== null}
          >
            {busy === "logout" ? "Signing out…" : "Sign out"}
          </button>
        </div>
        {error && (
          <p role="alert" className="core-error">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

function toMessage(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  if (err.name === "NotAllowedError") {
    return "Cancelled. The passkey prompt was dismissed or timed out.";
  }
  if (err.name === "InvalidStateError") {
    return "This authenticator is already registered.";
  }
  return err.message;
}
