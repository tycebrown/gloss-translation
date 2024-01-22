import * as z from 'zod';
import createRoute from '../../../../../../shared/Route';
import { client } from '../../../../../../shared/db';
import {
  GetWordCommentsResponseBody,
  PostCommentRequestBody,
} from '@translation/api-types';
import { authorize } from '../../../../../../shared/access-control/authorize';

export default createRoute<{ code: string; wordId: string }>()
  .get<void, GetWordCommentsResponseBody>({
    async handler(req, res) {
      const language = await client.language.findUnique({
        where: { code: req.query.code },
      });
      if (!language) {
        res.notFound();
        return;
      }

      const responseBody: GetWordCommentsResponseBody = {
        data: await client.commentThread.findMany({
          select: {
            id: true,
            authorId: true,
            body: true,
            timestamp: true,
            resolved: true,
            replies: true,
          },
          where: {
            wordId: req.query.wordId,
            languageId: language.id,
          },
        }),
      };

      res.ok(responseBody);
    },
  })
  .post<PostCommentRequestBody, void>({
    schema: z.object({
      body: z.string(),
      authorId: z.string(),
    }),
    authorize: authorize((req) => ({
      action: 'translate',
      subject: 'Language',
      subjectId: req.query.code,
    })),
    async handler(req, res) {
      const language = await client.language.findUnique({
        where: { code: req.query.code },
      });
      if (!language) {
        res.notFound();
        return;
      }

      await client.commentThread.create({
        data: {
          body: req.body.body,
          authorId: req.body.authorId,
          languageId: language.id,
          wordId: req.query.wordId,
        },
      });

      res.created(
        `/api/languages/${language}/words/${req.query.wordId}/comments`
      );
    },
  })
  .build();
