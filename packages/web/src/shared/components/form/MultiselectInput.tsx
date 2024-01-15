import { forwardRef } from 'react';
import { Combobox } from '@headlessui/react';
import { Controller, useFormContext } from 'react-hook-form';
import { Icon } from '../Icon';

export interface MultiselectInputProps {
  className?: string;
  name: string;
  items: { label: string; value: string }[];
  value?: string[];
  defaultValue?: string[];
  hasErrors?: boolean;
  placeholder?: string;
  onChange?(value: string[]): void;
  onBlur?(): void;
}

const MultiselectInput = forwardRef<HTMLInputElement, MultiselectInputProps>(
  (
    {
      className = '',
      hasErrors,
      value,
      onChange,
      onBlur,
      items,
      name,
      defaultValue,
      placeholder,
    },
    ref
  ) => {
    return (
      <div className={`${className} group/multiselect relative`}>
        <Combobox
          value={value}
          onChange={onChange}
          multiple
          name={name}
          defaultValue={defaultValue}
        >
          <div
            className={`
            border rounded shadow-inner flex
            group-focus-within/multiselect:outline group-focus-within/multiselect:outline-2
            ${
              hasErrors
                ? 'border-red-700 shadow-red-100 group-focus-within/multiselect:outline-red-700'
                : 'border-slate-400 group-focus-within/multiselect:outline-blue-600'
            }
          `}
          >
            <Combobox.Input
              className="flex-grow w-full h-10 px-3 py-2 bg-transparent rounded rounded-b focus:outline-none"
              readOnly
              ref={ref}
              onBlur={onBlur}
              displayValue={(value: string[]) =>
                value
                  .map((v) => items.find((i) => i.value === v)?.label ?? '')
                  .join(', ')
              }
              placeholder={placeholder}
            />
            <Combobox.Button className="w-8">
              {({ open }) => <Icon icon={open ? 'caret-up' : 'caret-down'} />}
            </Combobox.Button>
          </div>
          <Combobox.Options className="absolute z-20 w-full mt-1 overflow-auto bg-white border rounded shadow max-h-80 border-slate-400">
            {items.map((item) => (
              <Combobox.Option
                className="px-3 py-2 ui-active:bg-blue-400"
                key={item.value}
                value={item.value}
              >
                {({ selected }) => (
                  <>
                    <span className="inline-block w-6">
                      {selected && <Icon icon="check" />}
                    </span>
                    {item.label}
                  </>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Combobox>
      </div>
    );
  }
);

export default MultiselectInput;
