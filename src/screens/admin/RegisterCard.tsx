import { useState } from "react";
import { useAdminAuth } from "@/lib/adminAuth";

export function RegisterCard() {
  const { register } = useAdminAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      await register();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="core-shell">
      <section className="core-card" aria-labelledby="core-register-heading">
        <p className="label label-accent core-meta">§ First-time setup</p>
        <h1 id="core-register-heading" className="core-heading">
          Register a passkey to claim this admin.
        </h1>
        <p className="core-body">
          No admin exists yet. Create a passkey on this device — Touch ID,
          Windows Hello, 1Password, or any platform authenticator — to take
          ownership of <code>/core</code>. After this, only your passkey can
          sign in.
        </p>
        <div className="core-actions">
          <button
            type="button"
            className="core-btn"
            onClick={onClick}
            disabled={busy}
          >
            {busy ? "Waiting for passkey…" : "Create passkey →"}
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
