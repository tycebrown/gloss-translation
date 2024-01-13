import * as z from 'zod';
import createRoute from '../../../../../../shared/Route';
import { client } from '../../../../../../shared/db';
import {
  GetWordCommentsResponseBody,
  PostCommentRequestBody,
} from '@translation/api-types';

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
          where: {
            wordId: req.query.wordId,
            languageId: language.id,
          },
          include: { replies: true },
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
