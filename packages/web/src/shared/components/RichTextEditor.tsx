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
import '@tippyjs/react';
import Tippy from '@tippyjs/react';
import { placements } from '@popperjs/core';
import { useEffect, useRef, useState } from 'react';
import { time } from 'console';

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
          tooltip="Ctrl+B"
          disabled={!editor?.can().toggleBold()}
          isStyleActive={!!editor?.isActive('bold')}
          applyStyle={() => editor?.chain().focus().toggleBold().run()}
        />
        <MenuButton
          icon={faItalic}
          tooltip="Ctrl+I"
          disabled={!editor?.can().toggleItalic()}
          isStyleActive={!!editor?.isActive('italic')}
          applyStyle={() => editor?.chain().focus().toggleItalic().run()}
        />
        <MenuButton
          icon={faStrikethrough}
          tooltip="Ctrl+Shift+S"
          disabled={!editor?.can().toggleStrike()}
          isStyleActive={!!editor?.isActive('strike')}
          applyStyle={() => editor?.chain().focus().toggleStrike().run()}
        />
        <MenuButton
          icon={faListUl}
          tooltip="Ctrl+Shift+8"
          disabled={!editor?.can().toggleBulletList()}
          isStyleActive={!!editor?.isActive('bulletList')}
          applyStyle={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <MenuButton
          icon={faListOl}
          tooltip="Ctrl+Shift+7"
          disabled={!editor?.can().toggleOrderedList()}
          isStyleActive={!!editor?.isActive('orderedList')}
          applyStyle={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <MenuButton
          icon={faIndent}
          tooltip="Tab"
          disabled={!editor?.can().sinkListItem('listItem')}
          isStyleActive={false}
          applyStyle={() =>
            editor?.chain().focus().sinkListItem('listItem').run()
          }
        />
        <MenuButton
          icon={faOutdent}
          tooltip="Shift+Tab"
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
  tooltip,
  disabled,
  isStyleActive,
  applyStyle,
}: {
  icon: IconProp;
  tooltip?: string;
  disabled: boolean;
  isStyleActive: boolean;
  applyStyle: () => void;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const isTooltipVisible = useTooltipVisible(isHovering);
  return (
    <Tippy
      content={<div className="text-xs bg-white border">{tooltip}</div>}
      placement="top"
      visible={isTooltipVisible}
    >
      <button
        tabIndex={0}
        type="button"
        disabled={disabled}
        onClick={applyStyle}
        className={`disabled:text-gray-500 rounded px-1.5 ${
          isStyleActive ? 'bg-gray-300' : ''
        }`}
        onMouseOver={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <FontAwesomeIcon icon={icon} />
      </button>
    </Tippy>
  );
}

function useTooltipVisible(isHovering: boolean, milliseconds = 1500) {
  const [isVisible, setIsVisible] = useState(isHovering);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>();

  useEffect(() => {
    if (isHovering)
      timeoutRef.current = setTimeout(() => setIsVisible(true), milliseconds);
    else setIsVisible(false);

    return () => clearTimeout(timeoutRef.current);
  }, [isHovering, milliseconds]);

  return isVisible;
}
