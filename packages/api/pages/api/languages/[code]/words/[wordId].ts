import * as z from 'zod';
import { GlossState, PatchWordGlossRequestBody } from '@translation/api-types';
import createRoute from '../../../../../shared/Route';
import { PrismaTypes, client } from '../../../../../shared/db';
import { authorize } from '../../../../../shared/access-control/authorize';

export default createRoute<{ code: string; wordId: string }>()
  .patch<PatchWordGlossRequestBody, void>({
    schema: z.object({
      gloss: z.string().optional(),
      state: z
        .enum(Object.values(GlossState) as [GlossState, ...GlossState[]])
        .optional(),
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
        throw new Error('No user session');
      }

      const fields: {
        gloss?: string;
        state?: PrismaTypes.GlossState;
      } = {};

      if (typeof req.body.state !== 'undefined') {
        fields.state = req.body.state;
      }
      if (typeof req.body.gloss !== 'undefined') {
        // This ensures that glosses are coded consistently,
        // while also being compatible with fonts.
        fields.gloss = req.body.gloss.normalize('NFC');
        if (!fields.gloss) {
          fields.state = GlossState.Unapproved;
        }
      }

      const now = new Date();

      await client.gloss.upsert({
        where: {
          wordId_languageId: {
            wordId: req.query.wordId,
            languageId: language.id,
          },
        },
        update: {
          ...fields,
          lastUpdatedAt: now,
          lastUpdatedById: req.session.user.id,
        },
        create: {
          ...fields,
          createdAt: now,
          lastUpdatedAt: now,
          lastUpdatedById: req.session.user.id,
          wordId: req.query.wordId,
          languageId: language.id,
        },
      });

      res.ok();
    },
  })
  .build();
