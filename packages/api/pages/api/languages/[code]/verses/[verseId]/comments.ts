import { GetVerseCommentsResponseBody } from '@translation/api-types';
import createRoute from '../../../../../../shared/Route';
import { client } from '../../../../../../shared/db';

export default createRoute<{ code: string; verseId: string }>()
  .get<void, GetVerseCommentsResponseBody>({
    async handler(req, res) {
      const language = await client.language.findUnique({
        where: { code: req.query.code },
      });
      if (!language) {
        res.notFound();
      }

      const responseBody: GetVerseCommentsResponseBody = { data: {} };

      const wordIds = await client.word.findMany({
        where: { id: { startsWith: req.query.verseId } },
        select: { id: true },
      });

      // Create an empty array of comment threads for every word in the verse
      for (const { id } of wordIds) {
        responseBody.data[id] = [];
      }

      const commentThreads = await client.commentThread.findMany({
        where: {
          wordId: { startsWith: req.query.verseId },
          languageId: language?.id,
        },
        include: { replies: true },
      });

      // Fill the previously created empty arrays with the actual comment threads
      commentThreads.forEach((commentThread) =>
        responseBody.data[commentThread.wordId].push(commentThread)
      );

      res.ok(responseBody);
    },
  })
  //   .post<>({
  //     async handler(req, res) {
  //       const commentThreads = await client.commentThread.findMany({
  //         where: { wordId: { startsWith: req.query.verseId } },
  //         include: { replies: true },
  //       });
  //       const result: { [wordId: string]: CommentThread } = {};
  //       commentThreads.forEach(
  //         (commentThread) => (result[commentThread.wordId] = commentThread)
  //       );

  //       res.ok(result);
  //     },
  //   })
  .build();
