import {
  GetNotesResponseBody,
  PatchNotesRequestBody,
} from '@translation/api-types';
import createRoute from '../../../../../../shared/Route';
import { client } from '../../../../../../shared/db';
import * as z from 'zod';
import { authorize } from '../../../../../../shared/access-control/authorize';

export default createRoute<{ code: string; wordId: string }>()
  .get<void, GetNotesResponseBody>({
    async handler(req, res) {
      const language = await client.language.findUnique({
        where: {
          code: req.query.code,
        },
      });

      if (!language) {
        res.notFound();
        return;
      }

      res.ok({
        data: await client.translatorNotes.findUnique({
          where: {
            wordId_languageId: {
              wordId: req.query.wordId,
              languageId: language.id,
            },
          },
        }),
      });
    },
  })
  .patch<PatchNotesRequestBody, void>({
    schema: z.object({
      content: z.string(),
      lastAuthorId: z.string(),
      lastEditedAt: z.string().datetime(),
    }),
    authorize: authorize((req) => ({
      action: 'translate',
      subject: 'Language',
      subjectId: req.query.code,
    })),
    async handler(req, res) {
      const language = await client.language.findUnique({
        where: {
          code: req.query.code,
        },
      });

      if (!language) {
        res.notFound();
        return;
      }

      await client.translatorNotes.upsert({
        where: {
          wordId_languageId: {
            wordId: req.query.wordId,
            languageId: language.id,
          },
        },
        update: {
          content: req.body.content,
          lastAuthorId: req.body.lastAuthorId,
          lastEditedAt: req.body.lastEditedAt,
        },
        create: {
          wordId: req.query.wordId,
          languageId: language.id,
          content: req.body.content,
          lastAuthorId: req.body.lastAuthorId,
          lastEditedAt: req.body.lastEditedAt,
        },
      });

      res.ok();
    },
  })
  .build();
