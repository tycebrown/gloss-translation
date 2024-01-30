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
import { useRef, useState } from 'react';
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

  const notesQuery = useQuery({
    queryKey: ['translator-notes', language, verse.id],
    queryFn: () =>
      apiClient.verses.findTranslatorNotes({
        verseId: verse.id,
        language,
      }),
  });
  const note = notesQuery.isSuccess ? notesQuery.data.data[word.id] : undefined;
  const updateNotesMutation = useMutation({
    mutationFn: async (variables: { wordId: string; content: string }) =>
      apiClient.words.updateTranslatorNotes({
        wordId: variables.wordId,
        language,
        content: variables.content,
      }),
    onSuccess: () => {
      notesQuery.refetch();
    },
  });
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.users.findAll(),
  });
  const userCan = useAccessControl();
  const isLanguageUser = userCan('translate', {
    type: 'Language',
    id: language,
  });
  const notesInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <div className="mb-3 text-lg font-bold">Notes</div>
      {notesQuery.isLoading && (
        <div className="flex items-center justify-center w-full h-full">
          <LoadingSpinner />
        </div>
      )}
      {notesQuery.isSuccess && usersQuery.isSuccess && (
        <>
          {!isEditing && (
            <>
              <RichText content={note?.content ?? ''} />
              {isLanguageUser && (
                <Button
                  className="mt-4"
                  onClick={() => setIsEditing(true)}
                  disabled={
                    notesQuery.isFetching || updateNotesMutation.isLoading
                  }
                >
                  <Icon icon="edit" /> {t('common:edit')}
                </Button>
              )}
            </>
          )}
          {isEditing && (
            <>
              <div className="mb-1 text-sm italic">
                {note &&
                  t('translate:last_edited', {
                    timestamp: new Date(note.lastEditedAt).toLocaleDateString(
                      i18n.language,
                      {
                        hour12: true,
                        hour: 'numeric',
                        minute: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }
                    ),
                    author:
                      usersQuery.data.data.find(
                        ({ id }) => id === note.lastAuthorId
                      )?.name ?? 'Unknown',
                  })}
              </div>
              <RichTextInput
                ref={notesInputRef}
                value={note?.content ?? ''}
                name="translatorNotes"
                editable={
                  !notesQuery.isFetching && !updateNotesMutation.isLoading
                }
                autoFocus
              />
              <div className="flex flex-row justify-end gap-4 mt-2">
                <Button
                  variant="tertiary"
                  onClick={() => setIsEditing(false)}
                  disabled={updateNotesMutation.isLoading}
                >
                  {t('common:cancel')}
                </Button>
                <Button
                  onClick={() => {
                    console.log(notesInputRef.current?.value);
                    updateNotesMutation.mutate({
                      wordId: word.id,
                      content: notesInputRef.current?.value ?? '',
                    });
                    setIsEditing(false);
                  }}
                  disabled={updateNotesMutation.isLoading}
                >
                  {updateNotesMutation.isLoading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <Icon icon="save" /> {t('common:save')}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
