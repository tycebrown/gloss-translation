import { importLexicon } from './helpers/import-lexicon';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { toMarkDown } from './helpers/to-mark-down';

/**
 * This is used to parse the BDB lexicon file, so that it can be inserted into
 * the DB.
 */
export const parseLexicon: ParseLexiconFunctionType = async (
  filename: string,
  keys: string[]
): Promise<Record<string, Record<string, string>>> => {
  const input = createReadStream(filename);
  const reader = createInterface({ input });
  const parsed: Record<string, Record<string, string>> = {};
  let currentId = '';
  let currentData: Record<string, string> = {};
  for await (const line of reader) {
    const indicator = line[0];
    const rest = line.substring(1);
    if (indicator == '$') {
      if (currentId) {
        // Record the last data before overwriting the temporary variables.
        parsed[currentId] = currentData;
      }
      currentData = {};
    } else if (indicator == '@') {
      const [key, value] = rest.split('=\t', 2);
      if (keys.includes(key)) {
        currentData[key] = toMarkDown(value);
      } else if (key == 'StrNo') {
        currentId = value;
      }
    }
  }
  reader.close();
  return parsed;
};

const resourceCode = 'BDB';
const filename = 'data/lexicon/hebrew.txt';
const definitionField = 'BdbMedDef';

importLexicon({ resourceCode, filename, definitionField, parseLexicon });
