import { importLexicon } from './helpers/import-lexicon';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { toMarkDown } from './helpers/to-mark-down';
import { isEmpty } from './helpers/is-empty';
import './helpers/shared-types';

const parseLexicon: ParseLexiconFunctionType = async (
  filename: string,
  keys: string[]
): Promise<Record<string, Record<string, string>>> => {
  const input = createReadStream(filename);
  const reader = createInterface({ input });
  const parsed: Record<string, Record<string, string>> = {};

  let isReadingEntries = false;
  let nonMatches = 0;

  const entryRegex =
    /^(?<lemmaBaseId>G\d{4})\s+(?<lemmaId>G\d{4}[A-Z]?)\s+=\s+.*?\s(?<lemma>\S*?[\u037A-\u03CD]\S*?(?:,\s*\S*?[\u037A-\u03CD]\S*)*)\s+\S+\s+\S+\s+(?<definition>.*)/g;

  for await (const line of reader) {
    if (isReadingEntries) {
      if (!isEmpty(line)) {
        // There should only be one match (entryRegex should match the whole line), but we have to use matchAll to get access to the groups captured by the regex
        const parsedEntry = [...line.matchAll(entryRegex)][0];
        if (parsedEntry?.groups) {
          const lemmaId = parsedEntry.groups['lemmaId'];
          const lemma = parsedEntry.groups['lemma'];
          const lemmaDefinition = parsedEntry.groups['definition'];
          const fullDefinitionField = `${lemma} ${lemmaDefinition}`;
          parsed[lemmaId] = {
            // keys[0] is the definition field key
            [keys[0]]: toMarkDown(fullDefinitionField.trim()),
          };
        } else {
          ++nonMatches;
        }
      }
      // see if this line is the beginning of the entries
    } else if (line.match(/={120}/)) isReadingEntries = true;
  }
  console.log(`Unparsable entries count: ${nonMatches}`);
  reader.close();
  return parsed;
};

const resourceCode = 'LSJ';
const filename = 'data/lexicon/greek.txt';
const definitionField = 'FLsjDefs';

importLexicon({ resourceCode, filename, definitionField, parseLexicon });
