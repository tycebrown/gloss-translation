import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CommentThread, Verse, VerseWord } from '@translation/api-types';
import { useTranslation } from 'react-i18next';
import apiClient from '../../shared/apiClient';
import { Icon } from '../../shared/components/Icon';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { parseVerseId } from './verse-utils';
import DOMPurify from 'dompurify';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Tab } from '@headlessui/react';
import Button from '../../shared/components/actions/Button';
import RichTextInput from '../../shared/components/form/RichTextInput';
import RichText from '../../shared/components/RichText';
import { useAccessControl } from '../../shared/accessControl';
import useAuth from '../../shared/hooks/useAuth';

/// ------------- TODO: add comment to database, (move replying)?

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
  languageUserOnly?: boolean;
};

const sidePanelTabs: TabData[] = [
  { title: 'Lexicon', content: LexiconTab },
  { title: 'Notes', content: NotesTab },
  { title: 'Usage', content: UsageTab },
  { title: 'Chapter', content: ChapterTab },
  { title: 'Comments', content: CommentsTab, languageUserOnly: true },
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
  const userCan = useAccessControl();
  const isLanguageUser =
    userCan('translate', { type: 'Language', id: language }) ||
    userCan('administer', 'User');
  const displayedTabs = sidePanelTabs.filter(
    ({ languageUserOnly }) => !languageUserOnly || isLanguageUser
  );
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
            {displayedTabs.map(({ title }) => (
              <Tab className="md:text-sm xl:text-base text-base select-none px-2 py-1 border-t-2 rounded-t-md border-x-2 relative ui-selected:bg-white ui-selected:top-0.5 bg-gray-300 outline-none">
                {title}
              </Tab>
            ))}
          </Tab.List>
          <div className="border-t-2"></div>
        </div>
        <div className="px-4 overflow-y-scroll grow">
          <Tab.Panels>
            {displayedTabs.map((tab) => (
              <Tab.Panel key={tab.title}>
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

function NotesTab({ language, verse, word }: TabProps) {
  return <h1>Notes content</h1>;
}

function UsageTab({ language, verse, word }: TabProps) {
  return <h1>Usage content</h1>;
}

function ChapterTab({ language, verse, word }: TabProps) {
  return <h1>Chapter content</h1>;
}

function CommentsTab({ language, verse, word }: TabProps) {
  const queryClient = useQueryClient();
  const commentsQuery = useQuery({
    queryKey: ['word-comments', language, word.id],
    queryFn: () => apiClient.words.findWordComments(word.id, language),
  });
  const wordComments = commentsQuery.isSuccess ? commentsQuery.data.data : [];

  const addCommentMutation = useMutation({
    mutationFn: ({ authorId, body }: { authorId: string; body: string }) =>
      apiClient.words.addComment({
        wordId: word.id,
        language,
        body: body,
        authorId: authorId,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries(['word-comments', language, word.id]),
  });

  return (
    <>
      <div className="mt-1 mb-4">
        <AddCommentsView addComment={addCommentMutation.mutate} />
      </div>
      {commentsQuery.isLoading && (
        <div className="flex items-center justify-center w-full h-full">
          <LoadingSpinner />
        </div>
      )}
      {commentsQuery.isSuccess &&
        wordComments.map((comment) => (
          <div key={comment.id} className="mb-2.5">
            <CommentThreadView comment={comment} />
          </div>
        ))}
    </>
  );

  function AddCommentsView({
    addComment,
  }: {
    addComment: (commentData: { body: string; authorId: string }) => void;
  }) {
    const [isAddingComment, setIsAddingComment] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    useEffect(() => {
      inputRef.current?.focus();
    }, [isAddingComment]);
    const { user } = useAuth();

    return (
      <>
        <Button
          className={`${isAddingComment ? 'mb-4' : ''} text-sm`}
          disabled={isAddingComment}
          onClick={() => setIsAddingComment(true)}
        >
          <Icon icon="plus" /> Comment
        </Button>

        <div className={!isAddingComment ? 'hidden' : ''}>
          <RichTextInput ref={inputRef} name="commentInput" />
          <div className="h-2" />
          <div className="flex flex-row justify-end gap-3">
            <button onClick={() => setIsAddingComment(false)}>Cancel</button>
            <Button
              className="text-sm font-bold"
              onClick={() => {
                addComment({
                  authorId: user?.id ?? '',
                  body: inputRef.current?.value ?? '',
                });
              }}
            >
              <Icon icon="comment" /> Submit
            </Button>
          </div>
        </div>
      </>
    );
  }
}

function CommentThreadView({ comment }: { comment: CommentThread }) {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const usersQuery = useQuery(['users'], () => apiClient.users.findAll());

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col px-3 py-2 border border-slate-400 gap-1.5 rounded">
        <div className="flex flex-row justify-between">
          <div className="font-bold">
            <button className="px-2" onClick={() => setIsViewOpen(!isViewOpen)}>
              <Icon icon={isViewOpen ? 'caret-up' : 'caret-down'} />
            </button>
            {usersQuery.isSuccess &&
              usersQuery?.data.data.find(({ id }) => id === comment.authorId)
                ?.name}
          </div>
          <div className="text-sm">
            {new Date(comment.timestamp).toLocaleDateString('en-US', {
              hour12: true,
              hour: 'numeric',
              minute: 'numeric',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>
        <RichText content={comment.body} />
        <div className="flex flex-row gap-2">
          <button className="font-bold">
            <Icon icon="check" /> Resolve
          </button>
          <button className="font-bold">
            <Icon icon="reply" /> Reply
          </button>
        </div>
      </div>
      {isViewOpen && (
        <>
          <ol className="flex flex-col gap-1">
            {comment.replies.map((reply) => (
              <li key={reply.id}>
                <div className="flex flex-col px-3 py-2 border border-slate-400 gap-1.5 rounded ml-8">
                  <div className="flex flex-row justify-between">
                    <div className="font-bold">
                      {usersQuery.isSuccess &&
                        usersQuery?.data.data.find(
                          ({ id }) => id === comment.authorId
                        )?.name}
                    </div>
                    <div className="text-sm">
                      {new Date(comment.timestamp).toLocaleDateString('en-US', {
                        hour12: true,
                        hour: 'numeric',
                        minute: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <RichText content={comment.body} />
                </div>
              </li>
            ))}
          </ol>
          <div>
            <button className="ml-12 font-bold">
              <Icon icon="reply" /> Reply
            </button>
          </div>
        </>
      )}
    </div>
  );
}
