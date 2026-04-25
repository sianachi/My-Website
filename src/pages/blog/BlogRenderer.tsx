type Props = {
  // HTML produced by the TinyMCE admin editor. Trusted because authoring
  // is gated by the passkey-protected admin console.
  html: string;
};

export function BlogRenderer({ html }: Props) {
  return (
    <div
      className="blog-prose"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
