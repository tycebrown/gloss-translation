import { useQuery } from '@tanstack/react-query';
import { Verse, VerseWord } from '@translation/api-types';
import { useTranslation } from 'react-i18next';
import apiClient from '../../shared/apiClient';
import { Icon } from '../../shared/components/Icon';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { parseVerseId } from './verse-utils';
import DOMPurify from 'dompurify';
import { Fragment, ReactNode, useState } from 'react';
import { Tab } from '@headlessui/react';

type TranslationSidebarProps = {
  language: string;
  verse: Verse;
  wordIndex: number;
  onClose: () => void;
};

type TabProps = {
  language: string;
  verse: Verse;
  word: VerseWord;
};

type TabData = {
  title: string;
  content: (props: TabProps) => ReactNode;
};

const sidePanelTabs: TabData[] = [
  { title: 'Lexicon', content: LexiconTab },
  { title: 'Strongs', content: StrongsTab },
  { title: 'Usage', content: UsageTab },
  { title: 'Chapter', content: ChapterTab },
  { title: 'Comments', content: CommentsTab },
];

export const TranslationSidebar = ({
  language,
  verse,
  wordIndex,
  onClose,
}: TranslationSidebarProps) => {
  const word = verse.words[wordIndex];
  const { bookId } = parseVerseId(verse.id);
  const isHebrew = bookId < 40;
  const { t } = useTranslation(['common', 'translate']);
  return (
    <div
      className="
        border-t h-[320px] flex flex-col gap-4 pt-3 flex-shrink-0
        md:border-t-0 md:ltr:border-l md:rtl:border-r md:h-auto md:w-1/3 md:min-w-[400px] md:max-w-[480px] md:pt-0
      "
    >
      <div className="ps-4">
        <div className="flex flex-row items-center gap-4">
          <button onClick={onClose} type="button">
            <Icon icon="chevron-down" className="block md:hidden" />
            <Icon icon="chevron-right" className="hidden md:block" />
            <span className="sr-only">{t('common:close')}</span>
          </button>
          <span
            className={isHebrew ? 'font-hebrew text-2xl' : 'font-greek text-xl'}
          >
            {word.text}
          </span>
          <span>{word.lemmaId}</span>
        </div>
      </div>
      <Tab.Group>
        <div>
          <Tab.List className="flex flex-row gap-x-0.5 ps-1">
            {sidePanelTabs.map(({ title }) => (
              <Tab className="md:text-sm xl:text-base text-base select-none px-2 py-1 border-t-2 rounded-t-md border-x-2 relative ui-selected:bg-white ui-selected:top-0.5 bg-gray-300 outline-none">
                {title}
              </Tab>
            ))}
          </Tab.List>
          <div className="border-t-2"></div>
        </div>
        <div className="px-4 overflow-y-scroll grow">
          <Tab.Panels>
            {sidePanelTabs.map((tab) => (
              <Tab.Panel>
                <tab.content language={language} verse={verse} word={word} />
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </div>
      </Tab.Group>
    </div>
  );
};

function LexiconTab({ language, verse, word }: TabProps) {
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
  return (
    <>
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
            className="leading-7"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(lexiconEntry),
            }}
          />
        </div>
      )}
    </>
  );
}

function StrongsTab({ language, verse, word }: TabProps) {
  return <h1>Strongs content</h1>;
}

function UsageTab({ language, verse, word }: TabProps) {
  return <h1>Usage content</h1>;
}

function ChapterTab({ language, verse, word }: TabProps) {
  return <h1>Chapter content</h1>;
}

function CommentsTab({ language, verse, word }: TabProps) {
  return <h1>Comments content</h1>;
}
