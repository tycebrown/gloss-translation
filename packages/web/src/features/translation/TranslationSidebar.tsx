import { useQuery } from '@tanstack/react-query';
import { Verse, VerseWord } from '@translation/api-types';
import { useTranslation } from 'react-i18next';
import apiClient from '../../shared/apiClient';
import { Icon } from '../../shared/components/Icon';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { parseVerseId } from './verse-utils';
import DOMPurify from 'dompurify';
import { ReactNode, useState } from 'react';

type TranslationSidebarProps = {
  language: string;
  verse: Verse;
  wordIndex: number;
  onClose: () => void;
};

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
      <SidePanelTabs language={language} verse={verse} word={word} />
    </div>
  );
};

type TabProps = {
  language: string;
  verse: Verse;
  word: VerseWord;
};

type TabData = {
  title: string;
  buildContent: (props: TabProps) => ReactNode;
};

const sidePanelTabs: TabData[] = [
  { title: 'Lexicon', buildContent: (props) => <LexiconTab {...props} /> },
  { title: 'Notes', buildContent: (props) => <NotesTab {...props} /> },
  { title: 'Usage', buildContent: (props) => <UsageTab {...props} /> },
  { title: 'Chapter', buildContent: (props) => <ChapterTab {...props} /> },
  { title: 'Comments', buildContent: (props) => <CommentsTab {...props} /> },
];

function SidePanelTabs(props: TabProps) {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <>
      <ol className="flex flex-row gap-x-0.5 xl:text-base md:text-sm border-b-2 ps-1">
        {sidePanelTabs.map(({ title }, i) => (
          <li
            className={`select-none px-2 py-1 border-t-2 rounded-t border-x-2 relative ${
              activeTab === i ? 'bg-white top-0.5' : 'bg-gray-300'
            }`}
            onClick={() => setActiveTab(i)}
          >
            {title}
          </li>
        ))}
      </ol>
      <div className="px-4 overflow-y-auto grow">
        {sidePanelTabs[activeTab].buildContent(props)}
      </div>
    </>
  );
}

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
    <div className="">
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
    </div>
  );
}

function NotesTab({ language, verse, word }: TabProps) {
  return <h1>NOtes content</h1>;
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
