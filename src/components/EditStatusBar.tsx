import { useIsAdmin } from "@/lib/adminAware";
import { useContentSaveStatus } from "@/lib/siteContent";

export function EditStatusBar() {
  const isAdmin = useIsAdmin();
  const status = useContentSaveStatus();

  if (!isAdmin) return null;
  if (status.kind === "idle") return null;

  if (status.kind === "saving") {
    return (
      <div className="ed-status ed-status--saving" role="status">
        Saving {status.docId}…
      </div>
    );
  }

  if (status.kind === "saved") {
    return (
      <div className="ed-status ed-status--saved" role="status">
        Saved
      </div>
    );
  }

  return (
    <div className="ed-status ed-status--error" role="alert">
      <strong>{status.message}</strong>
      {status.issues.length > 0 && (
        <ul>
          {status.issues.slice(0, 4).map((issue, i) => (
            <li key={i}>
              <code>{issue.path.join(".") || "(root)"}</code>: {issue.message}
            </li>
          ))}
          {status.issues.length > 4 && <li>…{status.issues.length - 4} more</li>}
        </ul>
      )}
    </div>
  );
}
