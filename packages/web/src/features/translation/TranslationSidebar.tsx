import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CommentThread, Verse, VerseWord } from '@translation/api-types';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import apiClient from '../../shared/apiClient';
import { Icon } from '../../shared/components/Icon';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { useCallback, useRef, useState } from 'react';
import Button from '../../shared/components/actions/Button';
import RichTextInput from '../../shared/components/form/RichTextInput';
import RichText from '../../shared/components/RichText';
import useAuth from '../../shared/hooks/useAuth';
import { Tab } from '@headlessui/react';

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
        border-t h-[320px] flex flex-col gap-4 pt-3 flex-shrink-0
        md:border-t-0 md:ltr:border-l md:rtl:border-r md:h-auto md:w-1/3 md:min-w-[320px] md:max-w-[480px] md:pt-0
      "
    >
      <div className="flex flex-row items-center gap-4 ps-3">
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
          <Tab.List className="flex flex-row">
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
          <Tab.Panels className="p-3 overflow-y-auto">
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
  const { user } = useAuth();
  const { t } = useTranslation();

  const queryClient = useQueryClient();
  const commentsQuery = useQuery({
    queryKey: ['word-comments', language, word.id],
    queryFn: () => apiClient.words.findWordComments(word.id, language),
  });
  const comments = commentsQuery.isSuccess ? commentsQuery.data.data : [];
  const postCommentMutation = useMutation({
    mutationFn: useCallback(
      ({ body }: { body: string }) =>
        apiClient.words.postComment({
          wordId: word.id,
          language,
          body,
          authorId: user?.id ?? '',
        }),
      [word, language, user]
    ),
    onSuccess: () =>
      queryClient.invalidateQueries(['word-comments', language, word.id]),
  });

  const [isCommentEditorOpen, setIsCommentEditorOpen] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="mt-1 mb-4">
        <Button
          className="text-sm"
          disabled={isCommentEditorOpen || postCommentMutation.isLoading}
          onClick={() => setIsCommentEditorOpen(true)}
        >
          <Icon icon="plus" /> {t('common:comment')}
        </Button>
        {(isCommentEditorOpen || postCommentMutation.isLoading) && (
          <div className="mt-4">
            <RichTextInput
              name="commentBody"
              ref={commentInputRef}
              editable={!postCommentMutation.isLoading}
            />
            <div className="flex flex-row justify-end gap-3 mt-2">
              <button
                className="disabled:text-slate-500"
                onClick={() => setIsCommentEditorOpen(false)}
                disabled={postCommentMutation.isLoading}
              >
                {t('common:cancel')}
              </button>
              <Button
                className="text-sm font-bold"
                onClick={() => {
                  postCommentMutation.mutate({
                    body: commentInputRef.current?.value ?? '',
                  });
                  setIsCommentEditorOpen(false);
                }}
                disabled={postCommentMutation.isLoading}
              >
                <Icon icon="comment" /> {t('common:submit')}
              </Button>
            </div>
          </div>
        )}
      </div>
      {commentsQuery.isLoading && (
        <div className="flex items-center justify-center w-full h-full">
          <LoadingSpinner />
        </div>
      )}
      {commentsQuery.isSuccess &&
        comments.map((comment) => (
          <div key={comment.id} className="mb-2.5">
            <CommentThreadView
              word={word}
              language={language}
              comment={comment}
            />
          </div>
        ))}
    </>
  );
}

function CommentThreadView({
  word,
  language,
  comment,
}: {
  word: VerseWord;
  language: string;
  comment: CommentThread;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const usersQuery = useQuery(['users'], () => apiClient.users.findAll());
  const postReplyMutation = useMutation({
    mutationFn: useCallback(
      ({ body }: { body: string }) =>
        apiClient.words.postReply({
          language,
          wordId: word.id,
          commentId: comment.id,
          authorId: user?.id ?? '',
          body,
        }),
      [word, language, comment, user]
    ),
    onSuccess: () =>
      queryClient.invalidateQueries(['word-comments', language, word.id]),
  });
  const replyInputRef = useRef<HTMLInputElement>(null);

  const [isRepliesViewOpen, setIsRepliesViewOpen] = useState(false);
  const [isReplyEditorOpen, setIsReplyEditorOpen] = useState(false);
  const { t, i18n } = useTranslation();

  return (
    <>
      <div className="flex flex-col px-3 py-2 border border-slate-400 gap-1.5 rounded">
        <div className="flex flex-row justify-between">
          <div className="font-bold">
            <button
              className="px-2"
              onClick={() => setIsRepliesViewOpen(!isRepliesViewOpen)}
            >
              <Icon icon={isRepliesViewOpen ? 'caret-up' : 'caret-down'} />
            </button>
            {usersQuery.isLoading && <LoadingSpinner className="inline" />}
            {usersQuery.isSuccess &&
              usersQuery.data.data.find(({ id }) => id === comment.authorId)
                ?.name}
          </div>
          <div className="text-sm">
            {new Date(comment.timestamp).toLocaleDateString(i18n.language, {
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
          <button
            className="font-bold"
            onClick={() => {
              setIsRepliesViewOpen(true);
              setIsReplyEditorOpen(true);
            }}
          >
            <Icon icon="reply" /> {t('translate:reply')}
          </button>
        </div>
      </div>
      {isRepliesViewOpen && (
        <div className="ms-6">
          {comment.replies.length > 0 &&
            comment.replies.map((reply) => (
              <div
                className="my-1 flex flex-col px-3 py-2 border border-slate-400 gap-1.5 rounded"
                key={reply.id}
              >
                <div className="flex flex-row justify-between">
                  <div className="font-bold">
                    {usersQuery.isLoading && (
                      <LoadingSpinner className="inline" />
                    )}
                    {usersQuery.isSuccess &&
                      usersQuery.data.data.find(
                        ({ id }) => id === reply.authorId
                      )?.name}
                  </div>
                  <div className="text-sm">
                    {new Date(reply.timestamp).toLocaleDateString(
                      i18n.language,
                      {
                        hour12: true,
                        hour: 'numeric',
                        minute: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }
                    )}
                  </div>
                </div>
                <RichText content={reply.body} />
              </div>
            ))}
          {(isReplyEditorOpen || postReplyMutation.isLoading) && (
            <div className="mt-4">
              <RichTextInput
                name="replyBody"
                ref={replyInputRef}
                editable={!postReplyMutation.isLoading}
              />
              <div className="h-2" />
              <div className="flex flex-row justify-end gap-3 mt-2">
                <button
                  className="disabled:text-slate-500"
                  onClick={() => setIsReplyEditorOpen(false)}
                  disabled={postReplyMutation.isLoading}
                >
                  {t('common:cancel')}
                </button>
                <Button
                  className="text-sm font-bold"
                  onClick={() => {
                    postReplyMutation.mutate({
                      body: replyInputRef.current?.value ?? '',
                    });
                    setIsReplyEditorOpen(false);
                  }}
                  disabled={postReplyMutation.isLoading}
                >
                  <Icon icon="reply" /> {t('common:submit')}
                </Button>
              </div>
            </div>
          )}
          {comment.replies.length > 0 && (
            <button
              className="font-bold"
              onClick={() => setIsReplyEditorOpen(true)}
            >
              <Icon icon="reply" /> {t('translate:reply')}
            </button>
          )}
        </div>
      )}
    </>
  );
}
