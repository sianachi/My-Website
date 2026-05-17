import { useState } from "react";
import { useAdminAuth } from "@/lib/adminAuth";

export function SignInCard() {
  const { login } = useAdminAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      await login();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="core-shell">
      <section className="core-card" aria-labelledby="core-signin-heading">
        <p className="label label-accent core-meta">§ Restricted</p>
        <h1 id="core-signin-heading" className="core-heading">
          Sign in with your passkey.
        </h1>
        <p className="core-body">
          Use the passkey you registered to unlock the admin console.
        </p>
        <div className="core-actions">
          <button
            type="button"
            className="core-btn"
            onClick={onClick}
            disabled={busy}
          >
            {busy ? "Waiting for passkey…" : "Sign in →"}
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
  return err.message;
}
