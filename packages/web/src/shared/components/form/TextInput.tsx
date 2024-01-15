import { ComponentProps, forwardRef, useImperativeHandle, useRef } from 'react';
import { useFormContext } from 'react-hook-form';

export interface TextInputProps extends ComponentProps<'input'> {
  name: string;
  hasErrors: boolean;
}

export interface TextInputRef {
  focus(): void;
}

const TextInput = forwardRef<TextInputRef, TextInputProps>(
  ({ className = '', name, hasErrors, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({
      get value() {
        return inputRef.current?.value ?? '';
      },
      set value(newValue: string | undefined) {
        const input = inputRef.current;
        if (input) {
          input.value = newValue ?? '';
        }
      },
      focus() {
        inputRef.current?.focus();
      },
    }));
    return (
      <input
        className={`
          border rounded shadow-inner py-2 px-3 h-10
          focus:outline focus:outline-2
          ${
            hasErrors
              ? 'border-red-700 shadow-red-100 focus:outline-red-700'
              : 'border-slate-400 focus:outline-blue-600'
          }
          ${className}
        `}
        {...props}
        ref={inputRef}
      />
    );
  }
);
export default TextInput;
