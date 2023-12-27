CREATE OR REPLACE FUNCTION computeTrueId(id text) RETURNS text
	RETURN substring(id from 3);
CREATE OR REPLACE FUNCTION getBaseText(value text) RETURNS text
	RETURN translate(translate(replace(value, U&'\05BA', U&'\05B9'), U&'\05B1\05B2\05B3', U&'\05B6\05B7\05B8'), ' \n\t\r' || '][)(' || U&'\05BF\05BD\202a\202c\05C3\0591\0592\0593\0594\0595\0596\0597\0599\05AE\05A8\059A\059B\05A1\059F\05A0\059C\059E\05C0\05A5\05A3\05A4\05A7\05A8\05A9\05A6\05AA\05BE\2060\FEFF\200B', '');
	
WITH sheldonWords as (SELECT computeTrueId(id) as trueId, getBaseText("text") as "text", regexp_replace("formId", '-\d{3}', '') as "strong" FROM "Word" WHERE id ^@ 'S'), 
     usfmWords    as (SELECT computeTrueId(id) as trueId, getBaseText("text") as "text", regexp_replace("formId", '-\d{3}', '') as "strong" FROM "Word" WHERE id ^@ 'U') 

SELECT sheldonWords.trueId, sheldonWords."text", length(sheldonWords."text") as len, sheldonWords."strong", usfmWords."text", length(usfmWords."text") as len, usfmWords."strong" FROM sheldonWords JOIN usfmWords ON (sheldonWords.trueId = usfmWords.trueId AND regexp_replace(sheldonWords."text", '[\[\]\(\)]', '', 'g') != usfmWords."text") ORDER BY trueId