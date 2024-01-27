import { GetNotesResponseBody } from '@translation/api-types';
import createRoute from '../../../../../../shared/Route';
import { client } from '../../../../../../shared/db';

export default createRoute<{ code: string; wordId: string }>().get<
  void,
  GetNotesResponseBody
>({
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
      content: await client.translatorNotes.findUnique({
        wordId_languageId: {
          wordId: req.query.wordId,
          languageId: language.id,
        },
      }),
    });
  },
});
