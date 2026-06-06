import { AccountSection } from "./AccountSection";
import { BlogEditor } from "./BlogEditor";
import { BlogManager } from "./BlogManager";
import { ContentEditor } from "./ContentEditor";
import { CVUploader } from "./CVUploader";
import { Launchpad } from "./Launchpad";
import { MissionBar } from "./MissionBar";
import { PreviewSection } from "./PreviewSection";

type Props = {
  credentialCount: number;
  path: string;
  navigate: (to: string) => void;
};

export function AdminConsole({ credentialCount, path, navigate }: Props) {
  const sub = subRoute(path);

  if (sub === "") {
    return <Launchpad credentialCount={credentialCount} navigate={navigate} />;
  }

  if (sub === "content") {
    return (
      <ModulePage
        title="Cargo manifest"
        subtitle="Edit the four content docs."
        navigate={navigate}
      >
        <ContentEditor />
      </ModulePage>
    );
  }

  if (sub === "blog") {
    return (
      <ModulePage
        title="Field notes"
        subtitle="Write, publish, and archive blog posts."
        navigate={navigate}
      >
        <BlogManager
          onNew={() => navigate("/core/blog/new")}
          onOpen={(slug) => navigate(`/core/blog/${slug}`)}
        />
      </ModulePage>
    );
  }

  if (sub === "blog/new") {
    return (
      <ModulePage
        title="Field notes · new"
        subtitle="Drafting a new post."
        navigate={navigate}
      >
        <BlogEditor
          initialSlug={null}
          onClose={() => navigate("/core/blog")}
          onCreated={(slug) => navigate(`/core/blog/${slug}`)}
        />
      </ModulePage>
    );
  }

  if (sub.startsWith("blog/")) {
    const slug = sub.slice("blog/".length);
    return (
      <ModulePage
        title="Field notes · edit"
        subtitle={slug}
        navigate={navigate}
      >
        <BlogEditor
          key={slug}
          initialSlug={slug}
          onClose={() => navigate("/core/blog")}
          onCreated={(s) => navigate(`/core/blog/${s}`)}
        />
      </ModulePage>
    );
  }

  if (sub === "preview") {
    return (
      <ModulePage
        title="Window seat"
        subtitle="Live view of the public site."
        navigate={navigate}
      >
        <PreviewSection />
      </ModulePage>
    );
  }

  if (sub === "cv") {
    return (
      <ModulePage
        title="Resume capsule"
        subtitle="Eject a new CV PDF."
        navigate={navigate}
      >
        <CVUploader />
      </ModulePage>
    );
  }

  if (sub === "account") {
    return (
      <ModulePage
        title="Crew quarters"
        subtitle="Passkeys and exit hatch."
        navigate={navigate}
      >
        <AccountSection credentialCount={credentialCount} />
      </ModulePage>
    );
  }

  return <UnknownModule navigate={navigate} sub={sub} />;
}

function ModulePage({
  title,
  subtitle,
  navigate,
  children,
}: {
  title: string;
  subtitle?: string;
  navigate: (to: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="core-shell core-shell--stack">
      <div className="core-stack">
        <MissionBar title={title} subtitle={subtitle} navigate={navigate} />
        {children}
      </div>
    </div>
  );
}

function UnknownModule({
  sub,
  navigate,
}: {
  sub: string;
  navigate: (to: string) => void;
}) {
  return (
    <div className="core-shell core-shell--stack">
      <div className="core-stack">
        <MissionBar title="Lost in space" navigate={navigate} />
        <section className="core-card core-card--wide">
          <p className="core-body">
            No module at <code>/core/{sub}</code>. Head back to mission control.
          </p>
        </section>
      </div>
    </div>
  );
}

function subRoute(path: string): string {
  if (path === "/core") return "";
  if (path.startsWith("/core/")) return path.slice("/core/".length).replace(/\/$/, "");
  return "";
}
