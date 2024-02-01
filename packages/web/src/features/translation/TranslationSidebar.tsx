import { Tab } from '@headlessui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Verse, VerseWord } from '@translation/api-types';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import apiClient from '../../shared/apiClient';
import { Icon } from '../../shared/components/Icon';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import RichTextInput from '../../shared/components/form/RichTextInput';
import RichText from '../../shared/components/RichText';
import { useAccessControl } from '../../shared/accessControl';
import { useDebouncedChangeHandler } from '../../shared/hooks/useDebouncedChangeHandler';
import { useState } from 'react';

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
              <NotesView language={language} word={word} verse={verse} />
            </Tab.Panel>
            {showComments && <Tab.Panel>{t('common:coming_soon')}</Tab.Panel>}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

function NotesView({
  language,
  word,
  verse,
}: {
  language: string;
  word: VerseWord;
  verse: Verse;
}) {
  const { t, i18n } = useTranslation();

  const [translatorNotesOpen, setTranslatorNotesOpen] = useState(false);
  const [footnotesOpen, setFootnotesOpen] = useState(false);

  const userCan = useAccessControl();
  const canEdit = userCan('translate', {
    type: 'Language',
    id: language,
  });

  const translatorNotesQuery = useQuery({
    queryKey: ['translator-notes', language, verse.id],
    queryFn: () =>
      apiClient.verses.findTranslatorNotes({
        verseId: verse.id,
        language,
      }),
  });
  const translatorNote = translatorNotesQuery.isSuccess
    ? translatorNotesQuery.data.data[word.id]
    : undefined;
  const updateTranslatorNoteMutation = useMutation({
    mutationFn: async (variables: { wordId: string; content: string }) =>
      apiClient.words.updateTranslatorNote({
        wordId: variables.wordId,
        language,
        content: variables.content,
      }),
    onSuccess: () => {
      translatorNotesQuery.refetch();
    },
  });
  const debouncedSaveTranslatorNote = useDebouncedChangeHandler<string>(
    (value) =>
      updateTranslatorNoteMutation.mutate({ wordId: word.id, content: value }),
    1000
  );

  const footnotesQuery = useQuery({
    queryKey: ['footnotes', language, verse.id],
    queryFn: () =>
      apiClient.verses.findFootnotes({
        verseId: verse.id,
        language,
      }),
  });
  const footnote = translatorNotesQuery.isSuccess
    ? translatorNotesQuery.data.data[word.id]
    : undefined;
  const updateFootnoteMutation = useMutation({
    mutationFn: async (variables: { wordId: string; content: string }) =>
      apiClient.words.updateFootnote({
        wordId: variables.wordId,
        language,
        content: variables.content,
      }),
    onSuccess: () => {
      footnotesQuery.refetch();
    },
  });
  const debouncedSaveFootnote = useDebouncedChangeHandler<string>(
    (value) =>
      updateTranslatorNoteMutation.mutate({ wordId: word.id, content: value }),
    1000
  );

  return (
    <>
      <div className="mb-3 text-lg font-bold">Notes</div>
      <div className="mb-1 font-bold">
        <button
          className="w-4"
          onClick={() => setTranslatorNotesOpen(!translatorNotesOpen)}
        >
          <Icon
            icon={translatorNotesOpen ? 'chevron-down' : 'chevron-right'}
            className={!translatorNotesOpen ? 'rtl:rotate-180' : ''}
          />
        </button>{' '}
        Translator Notes
      </div>
      {translatorNotesOpen && (
        <div className="mb-2.5 ms-4">
          {translatorNotesQuery.isLoading && (
            <div className="flex items-center justify-center w-full h-full">
              <LoadingSpinner />
            </div>
          )}
          {translatorNotesQuery.isSuccess &&
            (canEdit ? (
              <>
                <div className="mb-1 text-sm italic">
                  {updateTranslatorNoteMutation.isLoading ? (
                    <>{t('translate:saving')}...</>
                  ) : (
                    translatorNote &&
                    t('translate:last_edited', {
                      timestamp: new Date(
                        translatorNote.lastEditedAt
                      ).toLocaleDateString(i18n.language, {
                        hour12: true,
                        hour: 'numeric',
                        minute: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                      }),
                      author: translatorNote.lastAuthor?.name ?? 'Unknown',
                    })
                  )}
                </div>
                <RichTextInput
                  value={translatorNote?.content ?? ''}
                  name="translatorNotes"
                  onChange={debouncedSaveTranslatorNote}
                  autoFocus
                />
              </>
            ) : (
              <RichText content={translatorNote?.content ?? ''} />
            ))}
        </div>
      )}
      <div className="mb-1 font-bold">
        <button
          className="w-4"
          onClick={() => setFootnotesOpen(!footnotesOpen)}
        >
          <Icon
            icon={footnotesOpen ? 'chevron-down' : 'chevron-right'}
            className={!footnotesOpen ? 'rtl:rotate-180' : ''}
          />
        </button>{' '}
        Footnotes
      </div>
      {footnotesOpen && (
        <div className="mb-2.5 ms-4">
          {footnotesQuery.isLoading && (
            <div className="flex items-center justify-center w-full h-full">
              <LoadingSpinner />
            </div>
          )}
          {footnote &&
            (canEdit ? (
              <>
                <div className="mb-1 text-sm italic">
                  {updateFootnoteMutation.isLoading ? (
                    <>{t('translate:saving')}...</>
                  ) : (
                    t('translate:last_edited', {
                      timestamp: new Date(
                        footnote.lastEditedAt
                      ).toLocaleDateString(i18n.language, {
                        hour12: true,
                        hour: 'numeric',
                        minute: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                      }),
                      author: footnote.lastAuthor?.name ?? 'Unknown',
                    })
                  )}
                </div>
                <RichTextInput
                  value={footnote?.content ?? ''}
                  name="translatorNotes"
                  onChange={debouncedSaveFootnote}
                  autoFocus
                />
              </>
            ) : (
              <RichText content={footnote?.content ?? ''} />
            ))}
        </div>
      )}
    </>
  );
}
