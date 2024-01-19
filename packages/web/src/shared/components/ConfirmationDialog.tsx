import { Dialog, Transition } from '@headlessui/react';
import {
  Fragment,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import Button from './actions/Button';
import TextInput from './form/TextInput';
import Form from './form/Form';
import { useForm } from 'react-hook-form';

export interface ConfirmationDialogProps {
  title: string;
  description: string;
  confirmationValue: string;
}

export interface ConfirmationDialogRef {
  open(): Promise<boolean>;
}

interface FormData {
  confirm: string;
}

const ConfirmationDialog = forwardRef<
  ConfirmationDialogRef,
  ConfirmationDialogProps
>(({ title, description, confirmationValue }: ConfirmationDialogProps, ref) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const resolveOpen = useRef<
    ((value: boolean | PromiseLike<boolean>) => void) | null
  >(null);
  const { t } = useTranslation(['common']);
  const [enableConfirmationButton, setEnableConfirmationButton] =
    useState<boolean>(false);
  const formContext = useForm<FormData>();

  useImperativeHandle(
    ref,
    () => ({
      open: async () =>
        new Promise<boolean>((resolve) => {
          setIsOpen(true);
          resolveOpen.current = resolve;
        }),
    }),
    []
  );

  function handleResult(result: boolean) {
    setIsOpen(false);
    formContext.reset();
    if (resolveOpen.current) {
      resolveOpen.current(result);
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => handleResult(false)}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="flex flex-col w-full max-w-md gap-2 p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  {title}
                </Dialog.Title>
                <p className="text-sm font-bold text-red-500">{description}</p>
                <p id="prompt" className="text-sm text-gray-600">
                  {t('common:confirm_prompt', { value: confirmationValue })}
                </p>
                <Form context={formContext} onSubmit={() => handleResult(true)}>
                  <TextInput
                    id="confirm"
                    className="w-full"
                    autoComplete="off"
                    hasErrors={!!formContext.formState.errors.confirm}
                    {...formContext.register('confirm', { required: true })}
                    onChange={async (event) =>
                      setEnableConfirmationButton(
                        event.target.value === confirmationValue
                      )
                    }
                    aria-describedby="prompt"
                  />
                  <div className="flex flex-row justify-end gap-4 mt-4">
                    <button
                      className="outline-none focus:underline"
                      type="button"
                      onClick={() => handleResult(false)}
                    >
                      {t('common:cancel')}
                    </button>
                    <Button disabled={!enableConfirmationButton} type="submit">
                      {t('common:confirm')}
                    </Button>
                  </div>
                </Form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
});
export default ConfirmationDialog;
