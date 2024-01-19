import { ComponentProps, forwardRef } from 'react';

export type TextInputProps = ComponentProps<'input'> & {
  name: string;
  onChange?(e: { target: HTMLInputElement }): void;
  onBlur?(e: { target: HTMLInputElement }): void;
  'aria-labelledby'?: string;
  'aria-label'?: string;
  hasErrors?: boolean;
};

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className = '', hasErrors, ...props }, ref) => {
    return (
      <input
        ref={ref}
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
      />
    );
  }
);
export default TextInput;
