import { CommentThread, Verse, VerseWord } from '@translation/api-types';
import { Tab } from '@headlessui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import apiClient from '../../shared/apiClient';
import { Icon } from '../../shared/components/Icon';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { parseVerseId } from './verse-utils';
import { ReactNode, useEffect, useRef, useState } from 'react';
import Button from '../../shared/components/actions/Button';
import RichTextInput from '../../shared/components/form/RichTextInput';
import RichText from '../../shared/components/RichText';
import { useAccessControl } from '../../shared/accessControl';
import useAuth from '../../shared/hooks/useAuth';

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
  const { bookId } = parseVerseId(verse.id);
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
        border-t h-[320px] flex flex-col gap-4 pt-3 flex-shrink-0
        md:border-t-0 md:ltr:border-l md:rtl:border-r md:h-auto md:w-1/3 md:min-w-[320px] md:max-w-[480px] md:pt-0 md:ps-3
      "
    >
      <div className="flex flex-row items-center gap-4">
        <button onClick={onClose} type="button">
          <Icon icon="chevron-down" className="block sm:hidden" />
          <Icon
            icon="chevron-right"
            className="hidden sm:block rtl:rotate-180"
          />
          <span className="sr-only">{t('common:close')}</span>
        </button>
        <span className="text-xl font-mixed">{word.text}</span>
        <span>{word.lemmaId}</span>
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
            <Tab.Panel>{t('common:coming_soon')}</Tab.Panel>
            {showComments && (
              <Tab.Panel>
                <CommentsView language={language} word={word} />
              </Tab.Panel>
            )}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

interface CommentsViewProps {
  language: string;
  word: VerseWord;
}
function CommentsView({ language, word }: CommentsViewProps) {
  const queryClient = useQueryClient();
  const commentsQuery = useQuery({
    queryKey: ['word-comments', language, word.id],
    queryFn: () => apiClient.words.findWordComments(word.id, language),
  });
  const comments = commentsQuery.isSuccess ? commentsQuery.data.data : [];
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
        <AddCommentView addComment={addCommentMutation.mutate} />
      </div>
      {commentsQuery.isLoading && (
        <div className="flex items-center justify-center w-full h-full">
          <LoadingSpinner />
        </div>
      )}
      {commentsQuery.isSuccess &&
        comments.map((comment) => (
          <div key={comment.id} className="mb-2.5">
            <CommentThreadView comment={comment} />
          </div>
        ))}
    </>
  );
}

function AddCommentView({
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
  const { t } = useTranslation();

  return (
    <>
      <Button
        className={`${isAddingComment ? 'mb-4' : ''} text-sm`}
        disabled={isAddingComment}
        onClick={() => setIsAddingComment(true)}
      >
        <Icon icon="plus" /> {t('common:comment')}
      </Button>

      <div className={!isAddingComment ? 'hidden' : ''}>
        <RichTextInput name="commentBody" />
        <div className="h-2" />
        <div className="flex flex-row justify-end gap-3">
          <button onClick={() => setIsAddingComment(false)}>
            {t('common:cancel')}
          </button>
          <Button
            className="text-sm font-bold"
            onClick={() => {
              addComment({
                authorId: user?.id ?? '',
                body: inputRef.current?.value ?? '',
              });
              setIsAddingComment(false);
            }}
          >
            <Icon icon="comment" /> {t('common:submit')}
          </Button>
        </div>
      </div>
    </>
  );
}

function CommentThreadView({ comment }: { comment: CommentThread }) {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const usersQuery = useQuery(['users'], () => apiClient.users.findAll());
  const { t } = useTranslation();

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
            <Icon icon="check" /> {t('translate:resolve')}
          </button>
          <button className="font-bold">
            <Icon icon="reply" /> {t('translate:reply')}
          </button>
        </div>
      </div>
    </div>
  );
}
