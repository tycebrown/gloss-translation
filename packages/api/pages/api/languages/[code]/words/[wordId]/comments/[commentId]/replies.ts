import * as z from 'zod';
import createRoute from '../../../../../../../../shared/Route';
import { client } from '../../../../../../../../shared/db';
import { PostCommentRequestBody } from '@translation/api-types';
import { authorize } from '../../../../../../../../shared/access-control/authorize';

export default createRoute<{
  code: string;
  wordId: string;
  commentId: string;
}>()
  .post<PostCommentRequestBody, void>({
    schema: z.object({ authorId: z.string(), body: z.string() }),
    authorize: authorize((req) => ({
      action: 'translate',
      subject: 'Language',
      subjectId: req.query.code,
    })),
    async handler(req, res) {
      if (!req.session || !req.session.user) {
        res.unauthorized();
        return;
      }
      await client.commentReply.create({
        data: {
          parentId: req.query.commentId,
          body: req.body.body,
          authorId: req.session.user.id,
        },
      });

      res.created(
        `/api/languages/${req.query.code}/words/${req.query.wordId}/comments`
      );
    },
  })
  .build();
