-- select 
-- 	(select * from "Word" 
-- 	 	JOIN "Gloss" ON "Gloss"."wordId" = "Word"."id" 
-- 	 	JOIN "Language" ON "Language"."id" = "Gloss"."languageId" AND "Language"."code" ='spa' where "Word".id like '01%' and "Gloss"."state" = 'APPROVED')--/
-- 	(select Count(*)::decimal from "Word" where "Word".id like '01%') * 100 as glossed_percentage

-- WITH 
-- 	word_glosses as (select * from "Word" 
-- 	  	JOIN "Gloss" ON "Gloss"."wordId" = "Word"."id" 
-- 	 	JOIN "Language" ON "Language"."id" = "Gloss"."languageId" AND "Language"."code" ='spa')
-- select * from "Verse" where
-- 	(select Count(*) from word_glosses where word_glosses."verseId" = "Verse".id and word_glosses."state" = 'APPROVED') =
-- 	(select Count(*) from "Word" where "Word"."verseId" = "Verse".id )
	
-- Glossed verses percentage
WITH 
	word_glosses as (select * from "Word" 
	  	JOIN "Gloss" ON "Gloss"."wordId" = "Word"."id" 
	 	JOIN "Language" ON "Language"."id" = "Gloss"."languageId" 
					 AND "Language"."code" ='spa' 
					 AND "Gloss"."state" = 'APPROVED'),
	verse_gloss_counts as (select "Verse".id, COUNT(*) "count" from "Verse" 
		JOIN word_glosses ON "Verse".id = word_glosses."verseId" GROUP BY "Verse".id),
	verse_word_counts as (select "Verse".id, "Verse"."bookId", COUNT(*) "count" from "Verse" 
		JOIN "Word" ON "Verse".id = "Word"."verseId" GROUP BY "Verse".id),
	glossed_verses as (select * from verse_gloss_counts 
		JOIN verse_word_counts on verse_gloss_counts.id = verse_word_counts.id 
		where verse_gloss_counts."count" = verse_word_counts."count")
select (select COUNT(*) from glossed_verses)::decimal/(select COUNT(*) from "Verse") * 100 as glossed_verses_percentage 
-- Glossed verses percentage by book
WITH 
	word_glosses as (select * from "Word" 
	  	JOIN "Gloss" ON "Gloss"."wordId" = "Word"."id" 
	 	JOIN "Language" ON "Language"."id" = "Gloss"."languageId" 
					 AND "Language"."code" ='spa' 
					 AND "Gloss"."state" = 'APPROVED'),
	verse_gloss_counts as (select "Verse".id, COUNT(*) "count" from "Verse" 
		JOIN word_glosses ON "Verse".id = word_glosses."verseId" GROUP BY "Verse".id),
	verse_word_counts as (select "Verse".id, "Verse"."bookId", COUNT(*) "count" from "Verse" 
		JOIN "Word" ON "Verse".id = "Word"."verseId" GROUP BY "Verse".id),
	glossed_verses as (select * from verse_gloss_counts 
		JOIN verse_word_counts on verse_gloss_counts.id = verse_word_counts.id 
		where verse_gloss_counts."count" = verse_word_counts."count"),
	glossed_verses_count_by_book as (select glossed_verses."bookId", COUNT(*) "count" from glossed_verses GROUP BY glossed_verses."bookId"),
	verses_count_by_book as (select "Verse"."bookId", COUNT(*) "count" from "Verse" GROUP BY "Verse"."bookId")
select verses_count_by_book."bookId", COALESCE(glossed_verses_count_by_book."count", 0)::decimal/verses_count_by_book."count" * 100 as glossed_verses_percentage from glossed_verses_count_by_book 
	RIGHT JOIN verses_count_by_book ON glossed_verses_count_by_book."bookId" = verses_count_by_book."bookId" ORDER BY verses_count_by_book."bookId"
	
	 