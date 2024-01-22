import * as z from 'zod';
import createRoute from '../../../../../../../../shared/Route';
import { client } from '../../../../../../../../shared/db';
import { PostCommentReplyRequestBody } from '@translation/api-types';
import { authorize } from '../../../../../../../../shared/access-control/authorize';

export default createRoute<{
  code: string;
  wordId: string;
  commentId: string;
}>()
  .post<PostCommentReplyRequestBody, void>({
    schema: z.object({ authorId: z.string(), body: z.string() }),
    authorize: authorize((req) => ({
      action: 'translate',
      subject: 'Language',
      subjectId: req.query.code,
    })),
    async handler(req, res) {
      await client.commentReply.create({
        data: {
          parentId: req.query.commentId,
          body: req.body.body,
          authorId: req.body.authorId,
        },
      });

      res.created(
        `/api/languages/${req.query.code}/words/${req.query.wordId}/comments`
      );
    },
  })
  .build();
