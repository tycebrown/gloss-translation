import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Verse, VerseWord } from '@translation/api-types';
import { useTranslation } from 'react-i18next';
import apiClient from '../../shared/apiClient';
import { Icon } from '../../shared/components/Icon';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { parseVerseId } from './verse-utils';
import DOMPurify from 'dompurify';
import {
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Tab } from '@headlessui/react';
import Button from '../../shared/components/actions/Button';
import RichTextInput from '../../shared/components/form/RichTextInput';
import RichText from '../../shared/components/RichText';

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
  { title: 'Notes', content: NotesTab },
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

type CommentThread = {
  id: number;
  author: string;
  body: string;
  timestamp: string;
  resolved: boolean;
  replies: CommentReply[];
};
type CommentReply = {
  id: number;
  author: string;
  body: string;
  timestamp: string;
};
const comments: CommentThread[] = [
  {
    id: 0,
    author: 'Andrew Case',
    body: 'Lorem ipsum, dolor sit amet consectetur adipisicing elit. Officiis, mollitia vero voluptate tempora in, aut sed iusto molestiae deleniti corrupti sapiente quae a dolore harum tempore numquam. Maxime, dolore optio?',
    timestamp: new Date().toISOString(),
    resolved: false,
    replies: [
      {
        id: 0,
        author: 'Addison Emig',
        body: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Sed, ut quo. Minima aspernatur id blanditiis doloremque incidunt. Est nulla error voluptates distinctio vero doloremque, molestiae, nobis deleniti numquam esse adipisci.',
        timestamp: new Date().toISOString(),
      },
      {
        id: 1,
        author: 'Adrian Rocke',
        body: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Sed, ut quo. Minima aspernatur id blanditiis doloremque incidunt. Est nulla error voluptates distinctio vero doloremque, molestiae, nobis deleniti numquam esse adipisci.',
        timestamp: new Date().toISOString(),
      },
    ],
  },
];

function CommentsTab({ language, verse, word }: TabProps) {
  const queryClient = useQueryClient();
  const commentsQuery = useQuery({
    queryKey: ['comments'],
    queryFn: async () => {
      console.log('invalid');
      return [...comments];
    },
  });

  const { mutate: createComment } = useMutation({
    mutationFn: async (body: string) => {
      comments.push({
        resolved: false,
        replies: [],
        body,
        timestamp: new Date().toISOString(),
        author: 'Tyce Brown',
        id:
          comments
            .map(({ id }) => id)
            .reduce(
              (runningMaxId, currentId) =>
                currentId > runningMaxId ? currentId : runningMaxId,
              -1
            ) + 1,
      });
      console.log(
        comments
          .map(({ id }) => id)
          .reduce(
            (runningMaxId, currentId) =>
              currentId > runningMaxId ? currentId : runningMaxId,
            -1
          ) + 1
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['comments']);
    },
  });

  return (
    <>
      <div className="mt-1 mb-4">
        <AddCommentsView createComment={createComment} />
      </div>
      <ol>
        {commentsQuery.data?.map((comment) => (
          <li key={comment.id}>
            <CommentThreadView comment={comment} />
          </li>
        ))}
      </ol>
    </>
  );

  function AddCommentsView({
    createComment,
  }: {
    createComment: (body: string) => void;
  }) {
    const [isAddingComment, setIsAddingComment] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    useEffect(() => {
      inputRef.current?.focus();
    }, [isAddingComment]);

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
            <button onClick={() => setIsAddingComment(false)}>Discard</button>
            <Button
              className="text-sm font-bold"
              onClick={() => createComment(inputRef.current?.value ?? '')}
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
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col px-3 py-2 border border-slate-400 gap-1.5 rounded">
        <div className="flex flex-row justify-between">
          <div className="font-bold">
            <button className="px-2" onClick={() => setIsViewOpen(!isViewOpen)}>
              <Icon icon={isViewOpen ? 'caret-up' : 'caret-down'} />
            </button>
            {comment.author}
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
                    <div className="font-bold">{comment.author}</div>
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
