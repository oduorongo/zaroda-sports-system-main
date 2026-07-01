import DOMPurify from "isomorphic-dompurify";

export function SanitizedHtml({ html, className }: { html: string; className?: string }) {
  const clean = DOMPurify.sanitize(html);
  // eslint-disable-next-line react/no-danger
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
