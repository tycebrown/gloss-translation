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
      const rawGlossedVersesPercentageData = await client.$queryRaw<
        [{ glossedVersesPercentage: number }]
      >`
            -- Glossed verses percentage
            WITH word_glosses AS 
            (
                SELECT
                    * 
                FROM
                    "Word" 
                    JOIN
                        "Gloss" 
                        ON "Gloss"."wordId" = "Word"."id" 
                    JOIN
                        "Language" 
                        ON "Language"."id" = "Gloss"."languageId" 
                        AND "Language"."code" = ${req.query.code}
                        AND "Gloss"."state" = 'APPROVED'
            ),
            verse_gloss_counts AS 
            (
                SELECT
                    "Verse".id,
                    COUNT(*) "COUNT" 
                FROM
                    "Verse" 
                    JOIN
                        word_glosses 
                        ON "Verse".id = word_glosses."verseId" 
                GROUP BY
                    "Verse".id
            ),
            verse_word_counts AS 
            (
                SELECT
                    "Verse".id,
                    "Verse"."bookId",
                    COUNT(*) "COUNT" 
                FROM
                    "Verse" 
                    JOIN
                        "Word" 
                        ON "Verse".id = "Word"."verseId" 
                GROUP BY
                    "Verse".id
            ),
            glossed_verses AS 
            (
                SELECT
                    * 
                FROM
                    verse_gloss_counts 
                    JOIN
                        verse_word_counts 
                        ON verse_gloss_counts.id = verse_word_counts.id 
                WHERE
                    verse_gloss_counts."COUNT" = verse_word_counts."COUNT"
            )
            SELECT
            ((
                SELECT
                    COUNT(*) 
                FROM
                    glossed_verses)::DECIMAL / (
                    SELECT
                        COUNT(*) 
                    FROM
                        "Verse") * 100)::DECIMAL AS "glossedVersesPercentage"`;

      const rawGlossedVersesPerBookPercentageData = await client.$queryRaw<
        { bookId: number; glossedVersesPercentage: number }[]
      >`
            -- Glossed verses percentage by book
            WITH word_glosses AS 
            (
                SELECT
                    * 
                FROM
                    "Word" 
                    JOIN
                        "Gloss" 
                        ON "Gloss"."wordId" = "Word"."id" 
                    JOIN
                        "Language" 
                        ON "Language"."id" = "Gloss"."languageId" 
                        AND "Language"."code" = ${req.query.code}
                        AND "Gloss"."state" = 'APPROVED'
            ),
            verse_gloss_counts AS 
            (
                SELECT
                    "Verse".id,
                    COUNT(*) "COUNT" 
                FROM
                    "Verse" 
                    JOIN
                        word_glosses 
                        ON "Verse".id = word_glosses."verseId" 
                GROUP BY
                    "Verse".id
            ),
            verse_word_counts AS 
            (
                SELECT
                    "Verse".id,
                    "Verse"."bookId",
                    COUNT(*) "COUNT" 
                FROM
                    "Verse" 
                    JOIN
                        "Word" 
                        ON "Verse".id = "Word"."verseId" 
                GROUP BY
                    "Verse".id
            ),
            glossed_verses AS 
            (
                SELECT
                    * 
                FROM
                    verse_gloss_counts 
                    JOIN
                        verse_word_counts 
                        ON verse_gloss_counts.id = verse_word_counts.id 
                WHERE
                    verse_gloss_counts."COUNT" = verse_word_counts."COUNT"
            ),
            glossed_verses_count_by_book AS 
            (
                SELECT
                    glossed_verses."bookId",
                    COUNT(*) "COUNT" 
                FROM
                    glossed_verses 
                GROUP BY
                    glossed_verses."bookId"
            ),
            verses_count_by_book AS 
            (
                SELECT
                    "Verse"."bookId",
                    COUNT(*) "COUNT" 
                FROM
                    "Verse" 
                GROUP BY
                    "Verse"."bookId"
            )
            SELECT
                verses_count_by_book."bookId" AS "bookId",
                (COALESCE(glossed_verses_count_by_book."COUNT", 0)::DECIMAL / verses_count_by_book."COUNT" * 100)::DECIMAL AS "glossedVersesPercentage" 
            FROM
                glossed_verses_count_by_book 
                RIGHT JOIN
                    verses_count_by_book 
                    ON glossed_verses_count_by_book."bookId" = verses_count_by_book."bookId" 
            ORDER BY
                verses_count_by_book."bookId"`;

      console.log(
        'rawGlossedVersesPercentageData:',
        JSON.stringify(rawGlossedVersesPercentageData, undefined, 2)
      );
      console.log(
        'rawGlossedVersesPerBookPercentageData:',
        JSON.stringify(rawGlossedVersesPerBookPercentageData, undefined, 2)
      );
      res.ok({
        data: {
          versesGlossedPercentage:
            rawGlossedVersesPercentageData[0].glossedVersesPercentage,
          versesGlossedPercentageByBook: Object.fromEntries(
            rawGlossedVersesPerBookPercentageData.map(
              ({ bookId, glossedVersesPercentage }) => [
                bookId,
                glossedVersesPercentage,
              ]
            )
          ),
        },
      });
    },
  })
  .build();
