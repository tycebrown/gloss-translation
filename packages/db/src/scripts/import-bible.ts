import { readFileSync } from 'fs';
import { bookKeys } from '../../../../data/book-keys';
import { morphologyData } from '../../../../data/morphology';
import { Book, Language, PrismaClient, Verse } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const usfm = require('usfm-js');

const client = new PrismaClient();
/// TODO:
/// Serious cleaning!!!!!!!!!!!!!!!!!!!!!!!!!
// TODO: compress adjacent (with same strongs), make sure to use sheldon hebrew text.
//  - do the ktiv-qere situation

function suspendSync() {
  const x = true;
  while (x);
}

interface CommonEntryData {
  text: string;
  grammar: string;
  strong: string;
}
interface WordDataEntry extends CommonEntryData {
  id: string;
  verseId: string;
  english: string;
}
interface ProcessedSheldonWordEntry extends CommonEntryData {
  transliteration: string;
  english: string;
}
interface UsfmWordEntry extends CommonEntryData {
  type: string;
}
interface UsfmFootnoteEntry extends UsfmWordEntry {
  footnoteType: 'Q' | 'K';
}

interface LemmaDataEntry {
  [grammar: string]: {
    verseIds: string[];
    formId?: string;
  };
}

async function run() {
  //------- FOR TESTING -----------
  // await client.gloss.deleteMany();
  // await client.word.deleteMany();
  // await client.verse.deleteMany();
  // await client.book.deleteMany();
  // await client.lemmaForm.deleteMany();
  // await client.lemmaResource.deleteMany();
  // await client.lemma.deleteMany();
  // await client.language.deleteMany();

  //-------------------------------

  const wordData: WordDataEntry[] = [];
  const lemmas: { [strong: string]: LemmaDataEntry } = {};
  const verseData: Verse[] = [];

  const books: Book[] = await createBooks();

  for (const book of books) {
    const sheldonData = parseSheldonData(book);
    console.log('parsed sheldon data');
    // const usfmData = parseUsfmData(book);

    await extractData(sheldonData, {
      verseIdTag: 'S',
      from: book,
      into: { wordData, lemmas, verseData },
    });
    console.log('extracted sheldon data');
    // extractData(usfmData, {
    //   verseIdTag: 'U',
    //   from: book,
    //   into: { wordData, lemmas },
    // });
  }

  console.log('did extracting');
  const language = await client.language.create({
    data: {
      code: 'eng',
      name: 'English',
    },
  });

  console.log('made language');
  await createVerses(verseData);

  addLemmaFormIds(lemmas);
  console.log('added form ids');
  await createLemmas(lemmas);
  console.log('created lemmas');
  await createWords(wordData, lemmas);
  console.log('created words');
  await createGlosses(wordData, language);
  console.log('created glosses');
  console.log('du-done!');

  await client.$disconnect();
}

async function createBooks() {
  const books: Book[] = [...Array(1 || bookKeys.length).keys()].map(
    (bookIndex) => {
      return { id: bookIndex + 1, name: bookKeys[bookIndex] };
    }
  );

  await client.book.createMany({
    data: books,
  });
  return books;
}

function parseSheldonData(book: Book): ProcessedSheldonWordEntry[][][] {
  return morphologyData[book.name].map((chapter) =>
    chapter.map((verse) =>
      verse
        .filter(
          ([text]: string[]) =>
            !(text === 'פ' || text === 'ס' || text.includes('׆'))
        )
        .flatMap((rawWordEntry) => toSheldonWordEntries(rawWordEntry, { book }))
    )
  );
}

function toSheldonWordEntries(
  [text, transliteration, english, grammar = '', strong = '']: string[],
  context: { book: Book }
): ProcessedSheldonWordEntry[] {
  const WORD_SEP_REGEX = /־(?!$)| (?!׀)/;
  return text.split(WORD_SEP_REGEX).map((subText) => {
    return {
      text: subText,
      transliteration,
      english,
      grammar,
      strong:
        strong !== ''
          ? `${context.book.id < 40 ? 'H' : 'G'}${strong
              .replace(/ \[e\]/, '')
              .padStart(4, '0')}`
          : '????',
    };
  });
}

async function extractData(
  baseData: CommonEntryData[][][],
  {
    verseIdTag,
    from: book,
    into: { wordData, lemmas, verseData },
  }: {
    verseIdTag: string;
    from: Book;
    into: {
      wordData: WordDataEntry[];
      lemmas: { [strong: string]: LemmaDataEntry };
      verseData: Verse[];
    };
  }
) {
  for (let chapterIndex = 0; chapterIndex < baseData.length; chapterIndex++) {
    const verses = baseData[chapterIndex];
    const chapterNumber = chapterIndex + 1;

    for (let verseIndex = 0; verseIndex < verses.length; verseIndex++) {
      const words = verses[verseIndex];
      const verseNumber = verseIndex + 1;

      const verseId = [
        // `${verseIdTag}-`,
        book.id.toString().padStart(2, '0'),
        chapterNumber.toString().padStart(3, '0'),
        verseNumber.toString().padStart(3, '0'),
      ].join('');
      verseData.push({
        id: verseId,
        number: verseNumber,
        chapter: chapterNumber,
        bookId: book.id,
      });

      for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
        const {
          text,
          grammar,
          strong,
          english = '?',
        }: {
          text: string;
          grammar: string;
          strong: string;
          english?: string;
        } = words[wordIndex];

        const wordId = `${verseId}${(wordIndex + 1)
          .toString()
          .padStart(2, '0')}`;
        wordData.push({
          id: wordId,
          text: text.normalize(),
          verseId: verseId,
          grammar,
          strong,
          english,
        });

        lemmas[strong] ??= {};
        lemmas[strong][grammar] ??= { verseIds: [] };
        lemmas[strong][grammar].verseIds.push(wordId);
      }
    }
  }
}

async function createVerses(verseData: Verse[]) {
  await client.verse.createMany({
    data: verseData,
  });
}

function addLemmaFormIds(lemmas: { [strong: string]: LemmaDataEntry }) {
  for (const [lemma, forms] of Object.entries(lemmas)) {
    Object.values(forms).forEach((form, i) => {
      form.formId = `${lemma}-${(i + 1).toString().padStart(3, '0')}`;
    });
  }
}

async function createLemmas(lemmas: { [strong: string]: LemmaDataEntry }) {
  for (const [lemma, forms] of Object.entries(lemmas)) {
    try {
      await client.lemma.create({
        data: {
          id: lemma,
          forms: {
            createMany: {
              data: Object.entries(forms).map(([grammar, { formId }]) => {
                return {
                  id: formId!,
                  grammar,
                };
              }),
            },
          },
        },
      });
    } catch (e) {
      console.log(`${lemma}: ${JSON.stringify(forms, undefined, 2)}`);
      suspendSync();
    }
  }
}

async function createWords(
  wordData: WordDataEntry[],
  lemmas: { [strong: string]: LemmaDataEntry }
) {
  await client.word.createMany({
    data: wordData.map((word) => ({
      id: word.id,
      verseId: word.verseId,
      text: word.text,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      formId: lemmas[word.strong][word.grammar].formId!,
    })),
  });
}

async function createGlosses(wordData: WordDataEntry[], language: Language) {
  await client.gloss.createMany({
    data: wordData.map((word) => ({
      wordId: word.id,
      languageId: language.id,
      gloss: word.english,
    })),
  });
}

function parseUsfmData(book: Book) {
  const rawData: {
    chapters: {
      [chapterNumber: number]: { [verseNumber: string]: object; front?: any };
    };
  } = usfm.toJSON(
    readFileSync(
      `data/unfoldingWord/${book.id
        .toString()
        .padStart(2, '0')}-${book.name.toUpperCase()}.usfm`,
      'utf-8'
    )
  );

  const runningAdjustedChapters: {
    [chapterNumber: number]: {
      [verseNumber: number]: UsfmWordEntry[];
    };
  } = {};
  let currentChapterNumber = 1;
  let currentVerseNumber = 1;

  for (const [chapterNumber, chapter] of Object.entries(rawData.chapters)) {
    currentChapterNumber = +chapterNumber.trim();
    delete chapter['front'];
    for (const [verseNumber, verse] of Object.entries(chapter)) {
      currentVerseNumber = +verseNumber.trim();
      for (const verseObject of verse['verseObjects']) {
        runningAdjustedChapters[currentChapterNumber] ??= {};
        const currentVerse = (runningAdjustedChapters[currentChapterNumber][
          currentVerseNumber
        ] ??= []);
        switch (verseObject['tag']) {
          case 'w':
            currentVerse.push({
              type: 'word',
              text: verseObject['text'],
              strong: verseObject['strong'],
              grammar: verseObject['morph'],
            });
            break;
          case 'ca':
            currentChapterNumber = +verseObject['content'].trim();
            break;
          case 'va': {
            const unparsedVerseNumber = verseObject['content'].trim();
            if (unparsedVerseNumber.indexOf(':') === -1) {
              currentVerseNumber = +unparsedVerseNumber;
            } else {
              const [alternateChapterNumber, alternateVerseNumber] =
                unparsedVerseNumber.split(':');
              currentChapterNumber = +alternateChapterNumber;
              currentVerseNumber = +alternateVerseNumber;
            }
            break;
          }
          case 'f': {
            currentVerse.push(parseFootnoteContent(verseObject['content']));
            break;
          }
        }
      }
    }
  }
  return flattenChapters(runningAdjustedChapters);
}

function parseFootnoteContent(content: string): UsfmFootnoteEntry {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const footnoteObject = content.match(
    /^\+ \\ft (?<footnoteType>[Q|K]) \\\+w (?<text>[^|]+)\|(?<attributes>.*)/
  )!.groups!;

  const footnoteAttributes: { [key: string]: string } = {};

  for (const attributeMatch of footnoteObject['attributes'].matchAll(
    /(?<key>[^=\s]+)="(?<value>[^"]+)"/g
  )) {
    const { key, value } = attributeMatch!.groups!;
    footnoteAttributes[key] = value;
  }

  if ('x-morph' in footnoteAttributes) {
    footnoteAttributes['grammar'] = footnoteAttributes['x-morph'];
  }

  delete footnoteObject['attributes'];

  return {
    ...(footnoteObject as {
      footnoteType: 'Q' | 'K';
      text: string;
    }),
    ...(footnoteAttributes as { grammar: string; strong: string }),
    type: 'footnote',
  };
}

function flattenChapters(chapters: object) {
  const resultingChapters: UsfmWordEntry[][][] = [];
  Object.entries(chapters).forEach(
    ([chapterNumber, chapterData]: [string, object]) => {
      const currentChapter: object[] = (resultingChapters[+chapterNumber - 1] =
        []);
      Object.entries(chapterData).forEach(
        ([verseNumber, verseData]: [string, UsfmWordEntry]) => {
          currentChapter[+verseNumber - 1] = verseData;
        }
      );
    }
  );
  return resultingChapters;
}

// function compareShape(
//   currentUsfmData: UsfmWordEntry[][][],
//   currentSheldonData: ProcessedSheldonWordEntry[][][],
//   i?: number
// ) {
//   if (Array.isArray(currentUsfmData) && Array.isArray(currentSheldonData)) {
//     console.log(
//       `  ${(i ?? -1) + 1 ? `${i} ` : ''}${currentUsfmData.length} : ${
//         currentSheldonData.length
//       }`
//     );
//     if (currentUsfmData.length !== currentSheldonData.length) {
//       if (
//         !(
//           currentUsfmData[0] instanceof Object &&
//           currentSheldonData[0] instanceof Array &&
//           typeof currentSheldonData[0][0] === 'string' &&
//           rectifyShape(currentUsfmData, currentSheldonData)
//         )
//       ) {
//         return false;
//       }
//     }
//     for (let i = 0; i < currentUsfmData.length; ++i) {
//       if (!compareShape(currentUsfmData[i], currentSheldonData[i], i)) {
//         // console.log(currentUsfmData[i]);
//         // console.log(currentSheldonData[i]);
//         return false;
//       }
//     }
//     return true;
//   }

//   return (
//     Array.isArray(currentSheldonData) &&
//     typeof currentSheldonData[0] === 'string' &&
//     !Array.isArray(currentUsfmData)
//   );
// }

function rectifyShape(
  usfmVerse: { type: string; [key: string]: string }[],
  sheldonVerse: string[][]
) {
  if (usfmVerse.length === sheldonVerse.length) {
    console.log('Eh???? Rectifying called, but unnecessary');
    suspendSync();
  }

  /// so we know that probably the usfm verse length is greater than the sheldon verse
  for (let i = 0; i < usfmVerse.length && i < sheldonVerse.length; ++i) {
    console.log(JSON.stringify(usfmVerse[i + 1]));
    if (usfmVerse[i]['type'] !== 'footnote') {
      /////////// harmonize sure gloss word combination process works with ktiv qere - get offsets right
      if (
        stripForm(usfmVerse[i]['strong']) ===
        (usfmVerse[i + 1]?.type === 'word' &&
          stripForm(usfmVerse[i + 1]['strong']))
      ) {
        if (
          sheldonVerse[i][4] !== sheldonVerse[i + 1]?.[4] &&
          toCleanSheldonStrongs(sheldonVerse[i + 1]?.[4] ?? '', 'H') !==
            eStrongToSimple(stripForm(usfmVerse[i]['strong']))
        ) {
          usfmVerse.splice(i, 1);
          usfmVerse[i]['text'] = '????';
          --i;
        }
      }
      if (
        sheldonVerse[i] &&
        (isSheldonWordKtivQere(sheldonVerse[i]) ||
          usfmVerse[i + 1]?.type === 'footnote')
      ) {
        const offset = rectifyKtivQere({ sheldonVerse, usfmVerse, i });
        i += offset;
      }
    } else {
      console.log('ZEH WHAT???????');
      suspendSync();
    }
  }
  if (usfmVerse.length !== sheldonVerse.length) {
    console.log(
      `MA???? didn't rectify! lengths: ${usfmVerse.length} - ${sheldonVerse.length}`
    );
    console.log(
      `usfm: \n${JSON.stringify(
        usfmVerse.map(({ text }) => text),
        null,
        1
      )}\n\nsheldon: \n${JSON.stringify(
        sheldonVerse.map((value) => value[0]),
        null,
        1
      )}`
    );
    suspendSync();
  } else console.log('RECTIFIED! :)');
  return true;
  return false;
}

function stripForm(strongsWithForm: string) {
  return strongsWithForm.slice(
    strongsWithForm.lastIndexOf(':') + 1 || undefined
  );
}

function eStrongToSimple(eStrong: string) {
  return eStrong.replace(/[a-z]/, '');
}

function rectifyKtivQere({
  sheldonVerse,
  usfmVerse,
  i,
}: {
  sheldonVerse: string[][];
  usfmVerse: { [key: string]: string; type: string }[];
  i: number;
}) {
  // simple case: \w+\f --- []+() or ()+[] or ""+() or ""+[]
  if (
    usfmVerse[i].type === 'word' &&
    usfmVerse[i + 1]?.type === 'footnote' &&
    sheldonVerse[i + 1] &&
    isSheldonWordKtivQere(sheldonVerse[i + 1]) &&
    isSheldonWordKtivQere(sheldonVerse[i + 1]) !==
      isSheldonWordKtivQere(sheldonVerse[i])
  ) {
    usfmVerse[i + 1]['type'] = 'word';
    return 1;
  } else if (
    usfmVerse[i].type === 'word' &&
    usfmVerse[i + 1]?.type === 'word'
  ) {
    if (
      eStrongToSimple(stripForm(usfmVerse[i]['strong'])) ===
      toCleanSheldonStrongs(sheldonVerse[i][4], 'H')
    ) {
      console.log('OK, back to the lobby....');
    } else {
      sheldonVerse.splice(i, 1);
      return -1;
    }
  } else {
    console.log('EHH?????');
    console.log(usfmVerse[i]);
    console.log(usfmVerse[i + 1]);
    console.log(sheldonVerse[i]);
    console.log(sheldonVerse[i + 1]);
    suspendSync();
  }
  return 0;

  // // slightly less simple case: \w+\f --- [] or ()     //does it occur?
}

function isSheldonWordKtivQere([word]: string[]): 'Q' | 'K' | false {
  return word.includes('(') ? 'Q' : word.includes('[') ? 'K' : false;
}

function toCleanSheldonStrongs(arg0: string, arg1: string) {
  throw 0;
  return '';
}
run();
