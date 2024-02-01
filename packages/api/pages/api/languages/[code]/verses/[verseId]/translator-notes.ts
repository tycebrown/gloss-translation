import {
  GetVerseTranslatorNotesResponseBody,
  TranslatorNote,
} from '@translation/api-types';
import createRoute from '../../../../../../shared/Route';
import { client } from '../../../../../../shared/db';

export default createRoute<{ code: string; verseId: string }>()
  .get<void, GetVerseTranslatorNotesResponseBody>({
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

      const responseData: { [wordId: string]: TranslatorNote } = {};
      const databaseNotes = await client.translatorNote.findMany({
        where: {
          wordId: { startsWith: req.query.verseId },
          languageId: language.id,
        },
        include: {
          lastAuthor: true,
        },
      });
      databaseNotes.forEach((note) => (responseData[note.wordId] = note));
      res.ok({
        data: responseData,
      });
    },
  })
  .build();
