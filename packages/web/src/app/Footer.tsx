import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DialogRef } from '../shared/components/Dialog';
import { Icon } from '../shared/components/Icon';
import LanguageDialog from './LanguageDialog';
import { initialLanguageChosen } from './i18n';
import interfaceLanguages from './languages.json';

export default function Footer() {
  const languageDialog = useRef<DialogRef>(null);
  const { t, i18n } = useTranslation(['languages']);

  useEffect(() => {
    if (!initialLanguageChosen) {
      languageDialog.current?.open();
    }
  }, []);

  return (
    <footer className="sticky bottom-0 z-10 flex flex-row justify-end p-2 end-0">
      <button
        type="button"
        onClick={() => {
          languageDialog.current?.open();
        }}
      >
        <Icon icon="earth" className="me-2" fixedWidth />
        {(interfaceLanguages as { [code: string]: string })[
          i18n.resolvedLanguage
        ] ?? t('languages:language', { count: 100 })}
      </button>
      <LanguageDialog ref={languageDialog} />
    </footer>
  );
}
