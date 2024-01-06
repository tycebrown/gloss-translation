import { EditorContent, EditorProvider, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faBold,
  faIndent,
  faItalic,
  faListOl,
  faListUl,
  faOutdent,
  faStrikethrough,
} from '@fortawesome/free-solid-svg-icons';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';

export function RichTextEditor({
  onUpdate,
}: {
  onUpdate?: (newValue: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ListItem,
      BulletList.extend({
        addAttributes() {
          return { class: { default: 'list-disc ms-4' } };
        },
      }),
      OrderedList.extend({
        addAttributes() {
          return { class: { default: 'list-decimal ms-4' } };
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'p-2 outline-none',
      },
    },
    onUpdate: ({ editor }) => onUpdate?.(editor.getHTML()),
  });

  return (
    <div className="border border-gray-400 rounded focus-within:outline focus-within:outline-blue-700">
      <div className="flex flex-row gap-4 p-2 border-b border-gray-400">
        <MenuButton
          icon={faBold}
          disabled={!editor?.can().toggleBold()}
          isStyleActive={!!editor?.isActive('bold')}
          applyStyle={() => editor?.chain().focus().toggleBold().run()}
        />
        <MenuButton
          icon={faItalic}
          disabled={!editor?.can().toggleItalic()}
          isStyleActive={!!editor?.isActive('italic')}
          applyStyle={() => editor?.chain().focus().toggleItalic().run()}
        />
        <MenuButton
          icon={faStrikethrough}
          disabled={!editor?.can().toggleStrike()}
          isStyleActive={!!editor?.isActive('strike')}
          applyStyle={() => editor?.chain().focus().toggleStrike().run()}
        />
        <MenuButton
          icon={faListUl}
          disabled={!editor?.can().toggleBulletList()}
          isStyleActive={!!editor?.isActive('bulletList')}
          applyStyle={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <MenuButton
          icon={faListOl}
          disabled={!editor?.can().toggleOrderedList()}
          isStyleActive={!!editor?.isActive('orderedList')}
          applyStyle={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <MenuButton
          icon={faIndent}
          disabled={!editor?.can().sinkListItem('listItem')}
          isStyleActive={false}
          applyStyle={() =>
            editor?.chain().focus().sinkListItem('listItem').run()
          }
        />
        <MenuButton
          icon={faOutdent}
          disabled={!editor?.can().liftListItem('listItem')}
          isStyleActive={false}
          applyStyle={() =>
            editor?.chain().focus().liftListItem('listItem').run()
          }
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function MenuButton({
  icon,
  disabled,
  isStyleActive,
  applyStyle,
}: {
  icon: IconProp;
  disabled: boolean;
  isStyleActive: boolean;
  applyStyle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={applyStyle}
      className={`disabled:text-gray-500 rounded px-1.5 ${
        isStyleActive ? 'bg-gray-300' : ''
      }`}
    >
      <FontAwesomeIcon icon={icon}></FontAwesomeIcon>
    </button>
  );
}
