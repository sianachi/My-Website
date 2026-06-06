import { useState } from "react";
import { useAdminAuth } from "@/lib/adminAuth";

type Props = {
  credentialCount: number;
};

export function AccountSection({ credentialCount }: Props) {
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
    <section className="core-card core-card--wide" aria-labelledby="core-account-heading">
      <p className="label label-accent core-meta">§ Crew quarters</p>
      <h2 id="core-account-heading" className="core-heading core-heading--sm">
        {credentialCount} passkey{credentialCount === 1 ? "" : "s"} aboard.
      </h2>
      <p className="core-body">
        Authenticated as <code>admin</code>. Add another passkey before you fly
        out — there&apos;s no recovery once you&apos;re locked out.
      </p>
      <div className="core-actions">
        <button
          type="button"
          className="core-btn"
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
