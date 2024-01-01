import { useQuery } from '@tanstack/react-query';
import { Verse, VerseWord } from '@translation/api-types';
import { useTranslation } from 'react-i18next';
import apiClient from '../../shared/apiClient';
import { Icon } from '../../shared/components/Icon';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { parseVerseId } from './verse-utils';
import DOMPurify from 'dompurify';
import { ReactNode, createContext, useContext, useState } from 'react';

type TranslationContextObject = {
  language: string;
  verse: Verse;
  word: VerseWord;
};

const TranslationContext = createContext<TranslationContextObject | undefined>(
  undefined
);

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
    <TranslationContext.Provider value={{ language, verse, word }}>
      <div
        className="
        border-t h-[320px] flex flex-col gap-4 pt-3 flex-shrink-0
        md:border-t-0 md:ltr:border-l md:rtl:border-r md:h-auto md:w-1/3 md:min-w-[360px] md:max-w-[480px] md:pt-0
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
              className={
                isHebrew ? 'font-hebrew text-2xl' : 'font-greek text-xl'
              }
            >
              {word.text}
            </span>
            <span>{word.lemmaId}</span>
          </div>
        </div>
        <SidePanelTabs />
      </div>
    </TranslationContext.Provider>
  );
};

const tabs = [
  { title: 'BDB', buildContent: () => <BDBTab /> },
  { title: 'Strongs', buildContent: () => <StrongsTab /> },
  { title: 'Usage', buildContent: () => <UsageTab /> },
  { title: 'Chapter', buildContent: () => <ChapterTab /> },
  { title: 'Comments', buildContent: () => <CommentsTab /> },
];

function SidePanelTabs() {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <>
      <div className="flex flex-row gap-x-0.5 xl:text-base md:text-sm border-b-2 ps-1">
        {tabs.map(({ title }, i) => (
          <div
            className={`select-none px-2 py-1 border-t-2 rounded-t border-x-2 relative ${
              activeTab === i ? 'bg-white top-0.5' : 'bg-gray-300'
            }`}
            onClick={() => setActiveTab(i)}
          >
            {title}
          </div>
        ))}
      </div>
      <div className="px-4 overflow-y-auto grow ">
        {tabs[activeTab].buildContent()}
      </div>
    </>
  );
}

function BDBTab() {
  const { language, verse, word } = useContext(TranslationContext)!;
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

function StrongsTab() {
  const { language, verse, word } = useContext(TranslationContext)!;
  return (
    <>
      <h1 className="mb-3 text-lg font-bold me-2">Strongs content</h1>
      <p>
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Ex iure fugit
        sequi dolore autem laboriosam adipisci consectetur vero eius quod?
        Ratione veritatis quam esse perspiciatis maiores eveniet sint iusto
        atque? Lorem ipsum dolor sit amet consectetur adipisicing elit. Quis
        sapiente reprehenderit officiis tempore nostrum cupiditate, nemo quae
        qui consectetur dignissimos rerum consequatur beatae natus ea totam
        voluptatum autem hic dolores. Lorem ipsum, dolor sit amet consectetur
        adipisicing elit. Ex iure fugit sequi dolore autem laboriosam adipisci
        consectetur vero eius quod? Ratione veritatis quam esse perspiciatis
        maiores eveniet sint iusto atque? Lorem ipsum dolor sit amet consectetur
        adipisicing elit. Quis sapiente reprehenderit officiis tempore nostrum
        cupiditate, nemo quae qui consectetur dignissimos rerum consequatur
        beatae natus ea totam voluptatum autem hic dolores. Lorem ipsum, dolor
        sit amet consectetur adipisicing elit. Ex iure fugit sequi dolore autem
        laboriosam adipisci consectetur vero eius quod? Ratione veritatis quam
        esse perspiciatis maiores eveniet sint iusto atque? Lorem ipsum dolor
        sit amet consectetur adipisicing elit. Quis sapiente reprehenderit
        officiis tempore nostrum cupiditate, nemo quae qui consectetur
        dignissimos rerum consequatur beatae natus ea totam voluptatum autem hic
        dolores. Lorem ipsum, dolor sit amet consectetur adipisicing elit. Ex
        iure fugit sequi dolore autem laboriosam adipisci consectetur vero eius
        quod? Ratione veritatis quam esse perspiciatis maiores eveniet sint
        iusto atque? Lorem ipsum dolor sit amet consectetur adipisicing elit.
        Quis sapiente reprehenderit officiis tempore nostrum cupiditate, nemo
        quae qui consectetur dignissimos rerum consequatur beatae natus ea totam
        voluptatum autem hic dolores. Lorem ipsum, dolor sit amet consectetur
        adipisicing elit. Ex iure fugit sequi dolore autem laboriosam adipisci
        consectetur vero eius quod? Ratione veritatis quam esse perspiciatis
        maiores eveniet sint iusto atque? Lorem ipsum dolor sit amet consectetur
        adipisicing elit. Quis sapiente reprehenderit officiis tempore nostrum
        cupiditate, nemo quae qui consectetur dignissimos rerum consequatur
        beatae natus ea totam voluptatum autem hic dolores. Lorem ipsum, dolor
        sit amet consectetur adipisicing elit. Ex iure fugit sequi dolore autem
        laboriosam adipisci consectetur vero eius quod? Ratione veritatis quam
        esse perspiciatis maiores eveniet sint iusto atque? Lorem ipsum dolor
        sit amet consectetur adipisicing elit. Quis sapiente reprehenderit
        officiis tempore nostrum cupiditate, nemo quae qui consectetur
        dignissimos rerum consequatur beatae natus ea totam voluptatum autem hic
        dolores.
      </p>
    </>
  );
}

function UsageTab() {
  const { language, verse, word } = useContext(TranslationContext)!;
  return <h1>Usage content</h1>;
}

function ChapterTab() {
  const { language, verse, word } = useContext(TranslationContext)!;
  return <h1>Chapter content</h1>;
}

function CommentsTab() {
  const { language, verse, word } = useContext(TranslationContext)!;
  return <h1>Comments content</h1>;
}
