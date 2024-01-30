import {
  GetVerseNotesResponseBody,
  TranslatorNote,
} from '@translation/api-types';
import createRoute from '../../../../../../shared/Route';
import { client } from '../../../../../../shared/db';

export default createRoute<{ code: string; verseId: string }>()
  .get<void, GetVerseNotesResponseBody>({
    async handler(req, res) {
      console.log('notes query...');
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
      const databaseNotes = await client.translatorNotes.findMany({
        where: {
          wordId: { startsWith: req.query.verseId },
          languageId: language.id,
        },
      });
      databaseNotes.forEach((note) => (responseData[note.wordId] = note));
      console.log('packed up yer notes!');
      res.ok({
        data: responseData,
      });
    },
  })
  .build();
