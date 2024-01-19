import {
  ComponentProps,
  ReactNode,
  createContext,
  forwardRef,
  useContext,
} from 'react';

interface ButtonSelectorContextValue {
  defaultValue?: string;
  hasErrors?: boolean;
}

const ButtonSelectorContext = createContext<ButtonSelectorContextValue | null>(
  null
);

export interface ButtonSelectorInputProps
  extends Omit<ComponentProps<'fieldset'>, 'defaultValue'> {
  defaultValue?: string;
  hasErrors?: boolean;
}

export function ButtonSelectorInput({
  children,
  defaultValue,
  hasErrors,
  ...props
}: ButtonSelectorInputProps) {
  return (
    <ButtonSelectorContext.Provider value={{ defaultValue, hasErrors }}>
      <fieldset
        className={`
          inline-block rounded
          focus-within:outline focus-within:outline-2
          ${
            hasErrors
              ? 'focus-within:outline-red-700'
              : 'focus-within:outline-blue-600'
          }
        `}
        {...props}
      >
        {children}
      </fieldset>
    </ButtonSelectorContext.Provider>
  );
}

export interface ButtonSelectorOptionProps
  extends Omit<ComponentProps<'input'>, 'required' | 'name'> {
  value: string;
  children: ReactNode;
}

export const ButtonSelectorOption = forwardRef<
  HTMLInputElement,
  ButtonSelectorOptionProps
>(({ value, children, ...props }, ref) => {
  const selectorContext = useContext(ButtonSelectorContext);
  if (!selectorContext)
    throw new Error('ButtonSelectorOption must be within a ButtonSelector');

  return (
    <label
      className={`
        inline-block py-2 px-3 font-bold h-10 bg-white border border-l-0
        ltr:first:rounded-l ltr:first:border-l ltr:last:rounded-r
        rtl:last:rounded-l rtl:last:border-l rtl:first:rounded-r
        [&:has(:checked)]:bg-slate-900 [&:has(:checked)]:text-white
        shadow-inner [&:has(:checked)]:shadow-none
        ${
          selectorContext.hasErrors
            ? 'border-red-700 shadow-red-100'
            : 'border-slate-400'
        }
      `}
    >
      <input
        ref={ref}
        {...props}
        className="absolute opacity-0"
        type="radio"
        defaultChecked={selectorContext.defaultValue === value}
        value={value}
      />
      {children}
    </label>
  );
});
