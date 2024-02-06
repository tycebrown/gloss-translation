import { client } from '../../../../shared/db';
import createRoute from '../../../../shared/Route';
import { authorize } from '../../../../shared/access-control/authorize';
import { GetGlossPercentagesResponseBody } from '@translation/api-types';

export default createRoute<{ code: string }>()
  .get<void, GetGlossPercentagesResponseBody>({
    authorize: authorize((req) => ({
      action: 'read',
      subject: 'Language',
      subjectId: req.query.code,
    })),
    async handler(req, res) {
      const [{ versesGlossedPercentage }] = (await client.$queryRaw`
            -- Verses glossed percentage
            WITH 
                word_glosses AS (SELECT * FROM "Word" 
                    JOIN "Gloss" ON "Gloss"."wordId" = "Word"."id" 
                    JOIN "Language" ON "Language"."id" = "Gloss"."languageId" AND "Language"."code" ='spa' AND "Gloss"."state" = 'APPROVED'),
                glossed_words_per_verse AS (SELECT "Verse".id, COUNT(*) "count" FROM "Verse" 
                    JOIN word_glosses ON "Verse".id = word_glosses."verseId" GROUP BY "Verse".id),
                words_per_verse AS (SELECT "Verse".id, "Verse"."bookId", COUNT(*) "count" FROM "Verse" 
                    JOIN "Word" ON "Verse".id = "Word"."verseId" GROUP BY "Verse".id),
                glossed_verses AS (SELECT * FROM glossed_words_per_verse 
                    JOIN words_per_verse ON glossed_words_per_verse.id = words_per_verse.id 
                    WHERE glossed_words_per_verse."count" = words_per_verse."count")
            SELECT (SELECT COUNT(*) FROM glossed_verses)::decimal/(SELECT COUNT(*) FROM "Verse") * 100.0 AS "versesGlossedPercentage"`) as [
        { versesGlossedPercentage: number }
      ];

      const versesGlossedPerBookPercentageData = (await client.$queryRaw`
            -- Verses glossed percentage by book
            WITH 
                word_glosses AS (SELECT * FROM "Word" 
                    JOIN "Gloss" ON "Gloss"."wordId" = "Word"."id" 
                    JOIN "Language" ON "Language"."id" = "Gloss"."languageId" 
                                AND "Language"."code" ='spa' 
                                AND "Gloss"."state" = 'APPROVED'),
                glossed_words_per_verse AS (SELECT "Verse".id, COUNT(*) "count" FROM "Verse" 
                    JOIN word_glosses ON "Verse".id = word_glosses."verseId" GROUP BY "Verse".id),
                words_per_verse AS (SELECT "Verse".id, "Verse"."bookId", COUNT(*) "count" FROM "Verse" 
                    JOIN "Word" ON "Verse".id = "Word"."verseId" GROUP BY "Verse".id),
                glossed_verses AS (SELECT * FROM glossed_words_per_verse 
                    JOIN words_per_verse ON glossed_words_per_verse.id = words_per_verse.id 
                    where glossed_words_per_verse."count" = words_per_verse."count"),
                glossed_verses_per_book AS (SELECT glossed_verses."bookId", COUNT(*) "count" FROM glossed_verses GROUP BY glossed_verses."bookId"),
                verses_per_book AS (SELECT "Verse"."bookId", COUNT(*) "count" FROM "Verse" GROUP BY "Verse"."bookId")
            SELECT verses_per_book."bookId", COALESCE(glossed_verses_per_book."count", 0)::decimal/verses_per_book."count" * 100.0 AS "versesGlossedPercentage" FROM glossed_verses_per_book 
                RIGHT JOIN verses_per_book ON glossed_verses_per_book."bookId" = verses_per_book."bookId" ORDER BY verses_per_book."bookId"
	`) as {
        bookId: number;
        versesGlossedPercentage: number;
      }[];
      res.ok({
        data: {
          versesGlossedPercentage,
          versesGlossedPercentagePerBook: Object.fromEntries(
            versesGlossedPerBookPercentageData.map(
              ({ bookId, versesGlossedPercentage }) => [
                bookId,
                versesGlossedPercentage,
              ]
            )
          ),
        },
      });
    },
  })
  .build();
