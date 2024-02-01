import { UpdateTranslatorNoteRequestBody } from '@translation/api-types';
import createRoute from '../../../../../../shared/Route';
import { client } from '../../../../../../shared/db';
import * as z from 'zod';
import { authorize } from '../../../../../../shared/access-control/authorize';

export default createRoute<{ code: string; wordId: string }>()
  .patch<UpdateTranslatorNoteRequestBody, void>({
    schema: z.object({
      content: z.string(),
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

      if (!req.session || !req.session.user) {
        throw new Error('No User Session');
      }

      const lastAuthorId = req.session.user.id;
      const lastEditedAt = new Date();

      await client.translatorNote.upsert({
        where: {
          wordId_languageId: {
            wordId: req.query.wordId,
            languageId: language.id,
          },
        },
        update: {
          content: req.body.content,
          lastAuthorId,
          lastEditedAt,
        },
        create: {
          wordId: req.query.wordId,
          languageId: language.id,
          content: req.body.content,
          lastAuthorId,
          lastEditedAt,
        },
      });

      res.ok();
    },
  })
  .build();
