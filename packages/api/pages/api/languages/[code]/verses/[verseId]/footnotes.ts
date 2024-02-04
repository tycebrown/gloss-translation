import { GetVerseFootnotesResponseBody } from '@translation/api-types';
import createRoute from '../../../../../../shared/Route';
import { client } from '../../../../../../shared/db';

export default createRoute<{ code: string; verseId: string }>()
  .get<void, GetVerseFootnotesResponseBody>({
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

      const databaseNotes = await client.footnote.findMany({
        where: {
          wordId: { startsWith: req.query.verseId },
          languageId: language.id,
        },
        include: {
          lastAuthor: true,
        },
      });

      res.ok({
        data: Object.fromEntries(
          databaseNotes.map((note) => [note.wordId, note])
        ),
      });
    },
  })
  .build();
