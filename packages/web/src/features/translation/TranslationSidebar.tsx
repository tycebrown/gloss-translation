import { Tab } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { Verse } from '@translation/api-types';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import apiClient from '../../shared/apiClient';
import { Icon } from '../../shared/components/Icon';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import RichTextInput from '../../shared/components/form/RichTextInput';
import RichText from '../../shared/components/RichText';
import { useState } from 'react';
import { useAccessControl } from '../../shared/accessControl';
import Button from '../../shared/components/actions/Button';

type TranslationSidebarProps = {
  language: string;
  verse: Verse;
  wordIndex: number;
  showComments: boolean;
  onClose: () => void;
};

export const TranslationSidebar = ({
  language,
  verse,
  wordIndex,
  showComments,
  onClose,
}: TranslationSidebarProps) => {
  const word = verse.words[wordIndex];
  const lemmaResourcesQuery = useQuery(
    ['verse-lemma-resources', language, verse.id],
    () => apiClient.verses.findLemmaResources(verse.id)
  );
  const resources = lemmaResourcesQuery.isSuccess
    ? lemmaResourcesQuery.data.data[word.lemmaId]
    : [];
  const lexiconResource = resources.find(({ resource }) =>
    ['BDB', 'LSJ'].includes(resource)
  );
  const lexiconEntry = lexiconResource?.entry ?? '';
  const { t } = useTranslation(['common', 'translate']);

  const tabTitles = ['translate:lexicon', 'translate:notes'];
  if (showComments) {
    tabTitles.push('translate:comments');
  }

  return (
    <div
      className="
        border-t h-[320px] flex flex-col gap-4 pt-3 flex-shrink-0 border-slate-400
        md:border-t-0 md:ltr:border-l md:rtl:border-r md:h-auto md:w-1/3 md:min-w-[320px] md:max-w-[480px] md:pt-0 md:ps-3
      "
    >
      <div className="flex items-start">
        <button onClick={onClose} type="button" className="w-6 h-7">
          <Icon icon="chevron-down" className="block md:hidden" />
          <Icon
            icon="chevron-right"
            className="hidden md:block rtl:rotate-180"
          />
          <span className="sr-only">{t('common:close')}</span>
        </button>
        <div>
          <div className="flex items-baseline gap-4">
            <span className="text-xl font-mixed">{word.text}</span>
            <span>{word.lemmaId}</span>
          </div>
          <div>{word.grammar}</div>
        </div>
      </div>
      <div className="flex flex-col min-h-0 grow">
        <Tab.Group>
          <Tab.List className="flex flex-row -mx-4 md:-ms-3">
            <div className="w-4 h-full border-b border-slate-400"></div>
            {tabTitles.map((title) => (
              <>
                <Tab
                  key={title}
                  className="px-4 py-1 border rounded-t-lg border-slate-400 ui-selected:border-b-transparent focus:outline-blue-600 focus:outline focus:outline-2"
                >
                  {t(title)}
                </Tab>
                <div className="w-1 h-full border-b border-slate-400"></div>
              </>
            ))}
            <div className="h-full border-b border-slate-400 grow"></div>
          </Tab.List>
          <Tab.Panels className="p-3 -mx-4 overflow-y-auto grow md:-ms-3">
            <Tab.Panel>
              {lemmaResourcesQuery.isLoading && (
                <div className="flex items-center justify-center w-full h-full">
                  <LoadingSpinner />
                </div>
              )}
              {lemmaResourcesQuery.isSuccess && lexiconEntry && (
                <div>
                  <div className="mb-3 text-lg font-bold me-2">
                    {lexiconResource?.resource}
                  </div>
                  <div
                    className="leading-7 font-mixed"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(lexiconEntry),
                    }}
                  />
                </div>
              )}
            </Tab.Panel>
            <Tab.Panel>
              <NotesView language={language} />
            </Tab.Panel>
            {showComments && <Tab.Panel>{t('common:coming_soon')}</Tab.Panel>}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

function NotesView({ language }: { language: string }) {
  const loremIpsum = `<p>
      Lorem ipsum dolor sit amet consectetur adipisicing elit. Odit in molestiae
      minus? Libero, exercitationem laboriosam porro beatae quisquam, doloribus
      facere ea cupiditate suscipit dignissimos atque aut odit saepe facilis
      culpa?
    </p>`;
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);

  const userCan = useAccessControl();
  const isLanguageUser = userCan('translate', {
    type: 'Language',
    id: language,
  });
  return (
    <>
      <div className="mb-3 text-lg font-bold">Notes</div>
      {!isEditing && (
        <>
          <RichText content={loremIpsum} />
          {isLanguageUser && (
            <Button className="mt-4" onClick={() => setIsEditing(true)}>
              <Icon icon="edit" /> {t('common:edit')}
            </Button>
          )}
        </>
      )}
      {isEditing && (
        <>
          <div className="mb-1 text-sm italic">
            Edited 1 Jan 2024, by Baron Weisschmoranoff von Steimich the Third
          </div>
          <RichTextInput value={loremIpsum} name="translatorNotes" />
          <div className="flex flex-row justify-end gap-4 mt-2">
            <Button variant="tertiary" onClick={() => setIsEditing(false)}>
              {t('common:cancel')}
            </Button>
            <Button>
              <Icon icon="save" /> {t('common:save')}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
