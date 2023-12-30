import { useQuery } from '@tanstack/react-query';
import { Verse } from '@translation/api-types';
import { useTranslation } from 'react-i18next';
import apiClient from '../../shared/apiClient';
import { Icon } from '../../shared/components/Icon';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { parseVerseId } from './verse-utils';
import DOMPurify from 'dompurify';
import { ReactNode, createContext, useState } from 'react';

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
        md:border-t-0 md:ltr:border-l md:rtl:border-r md:h-auto md:w-1/3 md:min-w-[320px] md:max-w-[480px] md:pt-0 md:ps-3
      "
    >
      <div className="flex flex-row gap-4 items-center">
        <button onClick={onClose} type="button">
          <Icon icon="chevron-down" className="block sm:hidden" />
          <Icon icon="chevron-right" className="hidden sm:block" />
          <span className="sr-only">{t('common:close')}</span>
        </button>
        <span
          className={isHebrew ? 'font-hebrew text-2xl' : 'font-greek text-xl'}
        >
          {word.text}
        </span>
        <span>{word.lemmaId}</span>
      </div>
      <Tabs language={language} verse={verse} word={word} />
    </div>
  );
};

function P({
  language,
  verse,
  word,
}: {
  language: any;
  verse: any;
  word: any;
}) {
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
    <div className="overflow-y-auto grow">
      {lemmaResourcesQuery.isLoading && (
        <div className="h-full w-full flex items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
      {lemmaResourcesQuery.isSuccess && lexiconEntry && (
        <div>
          <div className="text-lg mb-3 font-bold me-2">
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

function Tabs({
  language,
  verse,
  word,
}: {
  language: any;
  verse: any;
  word: any;
}) {
  const tabs = [
    { title: 'BDB', content: <h1>BDB content</h1> },
    { title: 'Strongs', content: <h1>Strongs content</h1> },
    { title: 'Usage', content: <h1>Usage content</h1> },
    { title: 'Chapter', content: <h1>Chapter content</h1> },
    { title: 'Comments', content: <h1>Comments content</h1> },
  ];
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      <div className="flex flex-row gap-1 text-sm [&>*]:px-1 [&>*]:border-2 rounded-3xl">
        {tabs.map(({ title }, i) => (
          <div
            className={`select-none ${
              activeTab === i ? 'bg-white' : 'bg-gray-300'
            }`}
            onClick={() => setActiveTab(i)}
          >
            {title}
          </div>
        ))}
      </div>
      {tabs[activeTab].content}
      {/* <P language={language} verse={verse} word={word}></P> */}
    </>
  );
}
