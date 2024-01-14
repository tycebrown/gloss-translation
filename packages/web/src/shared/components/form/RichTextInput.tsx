import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Icon } from '../Icon';
import { ComponentProps, forwardRef, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface RichTextInputProps {
  name: string;
  onChange?(e: { target: HTMLInputElement }): void;
  onBlur?(e: { target: HTMLInputElement }): void;
  'aria-labelledby'?: string;
  'aria-label'?: string;
}

export interface RichTextInputRef {
  focus(): void;
}

export const extensions = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    blockquote: false,
    heading: false,
    horizontalRule: false,
  }),
];

const RichTextInput = forwardRef<RichTextInputRef, RichTextInputProps>(
  ({ name, onChange, onBlur, ...props }, ref) => {
    const { t } = useTranslation(['common']);
    const hiddenInput = useRef<HTMLInputElement>(null);

    const editor = useEditor({
      extensions,
      editorProps: {
        attributes: {
          class: 'focus:outline-none min-h-[24px] rich-text',
          ...props,
        },
      },
      onCreate({ editor }) {
        const input = hiddenInput.current;
        if (input) {
          input.value = editor.getHTML();
        }
      },
      onUpdate({ editor }) {
        const input = hiddenInput.current;
        if (input) {
          input.value = editor.getHTML();
          onChange?.({ target: input });
        }
      },
      onBlur() {
        const input = hiddenInput.current;
        if (input) {
          onBlur?.({ target: input });
        }
      },
    });

    // We expose a ref that can be consumed by react hook form without a Controller.
    // This requires the ability to set the value, and focus.
    useImperativeHandle(ref, () => ({
      get value() {
        return editor?.getHTML();
      },
      set value(value: string | undefined) {
        if (editor?.getHTML() === value) return;

        editor?.commands.setContent(value ?? '', false);
        const input = hiddenInput.current;
        if (input) {
          input.value = value ?? '';
        }
      },
      focus() {
        editor?.commands.focus();
      },
    }));

    return (
      <div className="border rounded border-slate-400 focus-within:outline focus-within:outline-2 focus-within:outline-blue-600">
        <input type="hidden" ref={hiddenInput} name={name} />
        <div className="flex gap-3 p-1 border-b border-slate-400">
          <div className="flex gap-1">
            <RichTextInputButton
              active={editor?.isActive('bold')}
              disabled={!editor?.can().toggleBold()}
              icon="bold"
              label={t('common:rich_text.bold_tooltip')}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <RichTextInputButton
              active={editor?.isActive('italic')}
              disabled={!editor?.can().toggleItalic()}
              icon="italic"
              label={t('common:rich_text.italic_tooltip')}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <RichTextInputButton
              active={editor?.isActive('strike')}
              disabled={!editor?.can().toggleStrike()}
              icon="strikethrough"
              label={t('common:rich_text.strike_tooltip')}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            />
          </div>
          <div className="flex gap-1">
            <RichTextInputButton
              active={editor?.isActive('bulletList')}
              disabled={!editor?.can().toggleBulletList()}
              icon="list-ul"
              label={t('common:rich_text.bullet_list_tooltip')}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <RichTextInputButton
              active={editor?.isActive('orderedList')}
              disabled={!editor?.can().toggleOrderedList()}
              icon="list-ol"
              label={t('common:rich_text.ordered_list_tooltip')}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
            <RichTextInputButton
              disabled={!editor?.can().sinkListItem('listItem')}
              icon="indent"
              label={t('common:rich_text.indent_tooltip')}
              onClick={() =>
                editor?.chain().focus().sinkListItem('listItem').run()
              }
            />
            <RichTextInputButton
              disabled={!editor?.can().liftListItem('listItem')}
              icon="outdent"
              label={t('common:rich_text.outdent_tooltip')}
              onClick={() =>
                editor?.chain().focus().liftListItem('listItem').run()
              }
            />
          </div>
        </div>
        <EditorContent editor={editor} className="px-3 py-2" />
      </div>
    );
  }
);

export default RichTextInput;

interface RichTextInputButtonProps {
  active?: boolean;
  onClick?(): void;
  disabled?: boolean;
  icon: ComponentProps<typeof Icon>['icon'];
  label: string;
}

function RichTextInputButton({
  active = false,
  disabled = false,
  icon,
  label,
  onClick,
}: RichTextInputButtonProps) {
  return (
    <button
      type="button"
      tabIndex={-1}
      className={`
        w-7 h-7 disabled:text-slate-400
        ${active ? 'rounded bg-slate-200' : ''}
      `}
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      <Icon icon={icon} />
      <span className="sr-only">{label}</span>
    </button>
  );
}
