import DOMPurify from 'dompurify';
import { EditorView } from 'prosemirror-view';

export function RichText({ content }: { content: string }) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(content),
      }}
    />
  );
}
