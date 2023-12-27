import { readFileSync } from 'fs';
import { bookKeys } from '../../../../data/book-keys';
import { morphologyData } from '../../../../data/morphology';
import { Book, Language, PrismaClient, Verse } from '@prisma/client';
import * as assert from 'assert';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const usfm = require('usfm-js');

const client = new PrismaClient();
/// TODO:
/// REMOVED OCMMENTED OUT CODE!
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
interface UsfmEntry extends CommonEntryData {
  type: string;
}
interface UsfmFootnoteEntry extends UsfmEntry {
  type: 'footnote';
  footnoteType: string;
}
interface LemmaDataEntry {
  [grammar: string]: {
    verseIds: string[];
    formId?: string;
  };
}
const verseErrors: object[] = [];

async function run() {
  //------- FOR TESTING -----------
  await client.gloss.deleteMany();
  await client.word.deleteMany();
  await client.verse.deleteMany();
  await client.book.deleteMany();
  await client.lemmaForm.deleteMany();
  await client.lemmaResource.deleteMany();
  await client.lemma.deleteMany();
  await client.language.deleteMany();

  //-------------------------------

  const wordData: WordDataEntry[] = [];
  const lemmas: { [strong: string]: LemmaDataEntry } = {};
  const verseData: { [verseId: string]: Verse } = {};

  const books: Book[] = await createBooks();
  console.log(books);

  for (const book of books) {
    const sheldonData = parseSheldonData(book);
    const usfmData = parseUsfmData(book);
    console.log(`------------- Book: ${book.name}`);
    console.log('parsed data....');
    rectifyData({ sheldonData, usfmData, context: { book } });
    console.log('rectified data');

    extractData(usfmData, {
      wordIdTag: 'U',
      from: book,
      into: { wordData, lemmas, verseData },
    });
    console.log('extracted usfm data');
    console.log(
      JSON.stringify(
        sheldonData
          .flatMap<object>((chapter, chapterIndex) =>
            chapter.flatMap<object>((verse, verseIndex) => {
              return verse.map((word, index) => {
                return {
                  book: book.name,
                  chapterNumber: chapterIndex + 1,
                  verseNumber: verseIndex + 1,
                  wordIndex: index,
                  ...word,
                };
              });
            })
          )
          .filter((o) => !('text' in o) || !o['text'])
      )
    );
    extractData(sheldonData, {
      wordIdTag: 'S',
      from: book,
      into: { wordData, lemmas, verseData },
    });
    console.log('extracted sheldon data');
  }

  console.log('did extracting');
  const language = await client.language.create({
    data: {
      code: 'eng',
      name: 'English',
    },
  });

  console.log(`Total verse errors: ${verseErrors.length}`);
  console.log(`VERSE ERRORS: ${JSON.stringify(verseErrors)}`);
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
  const books: Book[] = [...Array(39 || bookKeys.length).keys()].map(
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
  const WORD_SEP_REGEX = /־(?![)\]]|$)| (?!׀)/;
  return text
    .split(WORD_SEP_REGEX)
    .filter((subText) => subText.trim().length > 0)
    .map((subText) => {
      return {
        text: subText,
        transliteration,
        english,
        grammar,
        strong:
          strong !== ''
            ? `${context.book.id < 40 ? 'H' : 'G'}${strong
                .replace(' [e]', '')
                .padStart(4, '0')}`
            : '????',
      };
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
      [verseNumber: number]: UsfmEntry[];
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
              strong: stripForm(verseObject['strong']),
              grammar: verseObject['morph'],
            });
            break;
          case 'ca':
            if (['Gen', 'Exo'].includes(book.name) || {}) break;
            currentChapterNumber = +verseObject['content'].trim();
            break;
          case 'va': {
            // console.log(`Hitting va! ${verseObject['content']}`);
            if (['Gen', 'Exo'].includes(book.name) || {}) break;
            const unparsedVerseNumber = verseObject['content'].trim();
            if (unparsedVerseNumber.indexOf(':') === -1) {
              currentVerseNumber = +unparsedVerseNumber;
            } else {
              const [alternateChapterNumber, alternateVerseNumber] =
                unparsedVerseNumber.split(':');
              currentChapterNumber = +alternateChapterNumber;
              currentVerseNumber = +alternateVerseNumber;
            }
            // console.log(
            //   `current: ${currentChapterNumber}:${currentVerseNumber}`
            // );
            break;
          }
          case 'f': {
            // order K, Q
            // K --> [], Q --> ()
            const footnote = parseFootnoteContent(verseObject['content']);
            if (footnote.footnoteType === 'Q' || footnote.footnoteType === 'K')
              currentVerse.push(footnote);
            // if (footnote.footnoteType === 'K') {
            //   [
            //     currentVerse[currentVerse.length - 1],
            //     currentVerse[currentVerse.length - 2],
            //   ] = [
            //     currentVerse[currentVerse.length - 2],
            //     currentVerse[currentVerse.length - 1],
            //   ];
            //   footnote.attachedToWord = 'below';
            // }
            break;
          }
        }
      }
    }
  }
  return flattenChapters(runningAdjustedChapters)
    .filter((chapter) => chapter && Object.keys(chapter).length !== 0)
    .map((chapter) => chapter.filter((verse) => verse && verse.length > 0));
}

function parseFootnoteContent(content: string): UsfmFootnoteEntry {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const footnoteObject = content.match(
    /^\+ \\ft (?<footnoteType>.*?) ?\\\+w (?<text>[^|]+)\|(?<attributes>.*)/
  )?.groups;
  if (!footnoteObject)
    return {
      type: 'footnote',
      footnoteType: 'unknown',
      text: 'N/A',
      grammar: 'N/A',
      strong: 'N/A',
    };

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
      footnoteType: string;
      text: string;
    }),
    ...(footnoteAttributes as { grammar: string; strong: string }),
    type: 'footnote',
  };
}

function flattenChapters(chapters: object) {
  const resultingChapters: UsfmEntry[][][] = [];
  Object.entries(chapters).forEach(
    ([chapterNumber, chapterData]: [string, object]) => {
      const currentChapter: object[] = (resultingChapters[+chapterNumber - 1] =
        []);
      Object.entries(chapterData).forEach(
        ([verseNumber, verseData]: [string, UsfmEntry]) => {
          currentChapter[+verseNumber - 1] = verseData;
        }
      );
    }
  );
  return resultingChapters;
}

function rectifyData({
  sheldonData,
  usfmData,
  context,
}: {
  sheldonData: ProcessedSheldonWordEntry[][][];
  usfmData: UsfmEntry[][][];
  context: { book: Book };
}) {
  assert.strictEqual(
    sheldonData.length,
    usfmData.length,
    `Book length mismatch; sheldon: ${sheldonData.length}, usfm: ${usfmData.length}`
  );
  for (
    let chapterIndex = 0;
    chapterIndex < sheldonData.length;
    ++chapterIndex
  ) {
    const sheldonChapter = sheldonData[chapterIndex];
    assert.strictEqual(
      sheldonChapter.length,
      usfmData[chapterIndex].length,
      `Chapter length mismatch (${chapterIndex + 1}); sheldon: ${
        sheldonChapter.length
      }, usfm: ${usfmData[chapterIndex].length}`
    );
    for (let verseIndex = 0; verseIndex < sheldonChapter.length; ++verseIndex) {
      let sheldonVerse = sheldonChapter[verseIndex];
      const usfmVerse = usfmData[chapterIndex][verseIndex];
      // Deuteronomy 22:20
      if (
        generateVerseId(context.book, chapterIndex + 1, verseIndex + 1) ===
        '05022020'
      ) {
        sheldonVerse[sheldonVerse.length - 2] = sheldonVerse.splice(
          sheldonVerse.length - 1,
          1,
          sheldonVerse[sheldonVerse.length - 2]
        )[0];
        continue;
      } else if (
        ['05022021', '05022023'].includes(
          generateVerseId(context.book, chapterIndex + 1, verseIndex + 1)
        )
      ) {
        sheldonVerse[2] = sheldonVerse.splice(3, 1, sheldonVerse[2])[0];
        continue;
      }
      for (
        let wordIndex = 0;
        wordIndex < sheldonVerse.length && wordIndex < usfmVerse.length;
        ++wordIndex
      ) {
        if (isSheldonWordKtivQere(sheldonVerse[wordIndex])) {
          let sheldonWords = sheldonVerse.slice(wordIndex);
          const nextNonKtivQereSheldonWordIndex = sheldonWords.findIndex(
            (word) => !isSheldonWordKtivQere(word)
          );
          if (nextNonKtivQereSheldonWordIndex !== -1) {
            sheldonWords = sheldonWords.slice(
              0,
              nextNonKtivQereSheldonWordIndex
            );
          }
          interface SheldonWordRef {
            index: number;
            word: ProcessedSheldonWordEntry;
            usfmWordIndex?: number;
          }
          interface UsfmWordRef {
            type: 'K' | 'Q';
            index: number;
            word: UsfmEntry;
          }

          const sheldonWordsObject: {
            K: SheldonWordRef[];
            Q: SheldonWordRef[];
          } = sheldonWords.reduce(
            (running, word, offset) => {
              const currentKtivQere = isSheldonWordKtivQere(word);
              assert(currentKtivQere);
              running[currentKtivQere].push({
                index: wordIndex + offset,
                word,
              });
              return running;
            },
            { K: [] as SheldonWordRef[], Q: [] as SheldonWordRef[] }
          );
          let usfmWords: UsfmWordRef[] = [];
          if (usfmVerse[wordIndex + 1]?.type === 'footnote') {
            const entries = [usfmVerse.slice(wordIndex, wordIndex + 2)] as [
              UsfmEntry,
              UsfmFootnoteEntry
            ][];
            for (
              let offset = 2;
              wordIndex + offset < usfmVerse.length - 1;
              offset += 2
            ) {
              if (usfmVerse[wordIndex + offset + 1]?.type === 'footnote') {
                entries.push(
                  usfmVerse.slice(
                    wordIndex + offset,
                    wordIndex + offset + 2
                  ) as [UsfmEntry, UsfmFootnoteEntry]
                );
              } else break;
            }

            const footnote = usfmVerse[wordIndex + 1] as UsfmFootnoteEntry;
            usfmWords = entries.flatMap<UsfmWordRef>(
              ([word, footnote], halfOffset) => {
                return [
                  {
                    type: footnote.footnoteType === 'K' ? 'Q' : 'K',
                    index: wordIndex + halfOffset * 2,
                    word,
                  },
                  {
                    type: footnote.footnoteType as 'K' | 'Q',
                    index: wordIndex + halfOffset * 2 + 1,
                    word: footnote,
                  },
                ];
              }
            );
            // usfmWords = [
            //   {
            //     type: footnote.footnoteType === 'K' ? 'Q' : 'K',
            //     index: wordIndex,
            //     word: usfmVerse[wordIndex],
            //   },
            //   {
            //     type: footnote.footnoteType as 'K' | 'Q',
            //     index: wordIndex + 1,
            //     word: usfmVerse[wordIndex + 1],
            //   },
            // ];
            ++wordIndex;
          } else {
            usfmWords = [
              { type: 'K', index: wordIndex, word: usfmVerse[wordIndex] },
              { type: 'Q', index: wordIndex, word: usfmVerse[wordIndex] },
            ];
          }
          for (const usfmWord of usfmWords) {
            for (const sheldonWord of sheldonWordsObject[
              usfmWord.type as 'K' | 'Q'
            ]) {
              console.log(
                `sheldon: ${extractBaseHebrewWord(
                  sheldonWord.word.text
                )} === usfm: ${extractBaseHebrewWord(usfmWord.word.text)}; ${
                  extractBaseHebrewWord(sheldonWord.word.text) ===
                  extractBaseHebrewWord(usfmWord.word.text)
                }`
              );
              if (
                extractBaseHebrewWord(sheldonWord.word.text) ===
                extractBaseHebrewWord(usfmWord.word.text)
              ) {
                sheldonWord.usfmWordIndex = usfmWord.index;
                break;
              }
            }
          }
          const newSheldonVerse: (ProcessedSheldonWordEntry | undefined)[] = [
            ...sheldonVerse,
          ];
          [...sheldonWordsObject.K, ...sheldonWordsObject.Q].forEach(
            ({ index }) => {
              newSheldonVerse[index] = undefined;
            }
          );
          [...sheldonWordsObject.K, ...sheldonWordsObject.Q]
            .filter(
              (sheldonWordRef) => sheldonWordRef.usfmWordIndex !== undefined
            )
            .forEach((sheldonWordRef) => {
              newSheldonVerse[sheldonWordRef.usfmWordIndex!] =
                sheldonWordRef.word;
            });
          sheldonVerse = sheldonChapter[verseIndex] = newSheldonVerse.filter(
            (value) => value !== undefined
          ) as ProcessedSheldonWordEntry[];
        } else if (usfmVerse[wordIndex].type === 'footnote') {
          usfmVerse.splice(wordIndex, 1);
        }
      }

      if (sheldonVerse.length !== usfmVerse.length) {
        verseErrors.push({
          verseId: generateVerseId(
            context.book,
            chapterIndex + 1,
            verseIndex + 1
          ),
          book: context.book,
          chapterNumber: chapterIndex + 1,
          verseNumber: verseIndex + 1,
          sheldonLength: sheldonVerse.length,
          usfmLength: usfmVerse.length,
        });
      }
      // assert.strictEqual(
      //   sheldonVerse.length,
      //   usfmVerse.length,
      //   `Verse length mismatch after rectification (${chapterIndex + 1}:${
      //     verseIndex + 1
      //   }); sheldon: ${sheldonVerse.length}, usfm: ${
      //     usfmVerse.length
      //   }\n\nVerses:\n---- sheldon: ${JSON.stringify(
      //     sheldonVerse,
      //     undefined,
      //     2
      //   )}\n---- usfm: ${JSON.stringify(usfmVerse, undefined, 2)}`
      // );
      // assert.strictEqual(
      //   extractBaseHebrewWord(sheldonVerse[wordIndex].text),
      //   extractBaseHebrewWord(usfmVerse[wordIndex].text)
      // );
    }
  }
}

function isSheldonWordKtivQere({
  text,
}: ProcessedSheldonWordEntry): 'Q' | 'K' | false {
  return text.includes('(') ? 'Q' : text.includes('[') ? 'K' : false;
}

// function rectifyKtivQere({
//   sheldonVerse,
//   usfmVerse,
//   i,
// }: {
//   sheldonVerse: string[][];
//   usfmVerse: { [key: string]: string; type: string }[];
//   i: number;
// }) {
//   // simple case: \w+\f --- []+() or ()+[] or ""+() or ""+[]
//   if (
//     usfmVerse[i].type === 'word' &&
//     usfmVerse[i + 1]?.type === 'footnote' &&
//     sheldonVerse[i + 1] &&
//     isSheldonWordKtivQere(sheldonVerse[i + 1]) &&
//     isSheldonWordKtivQere(sheldonVerse[i + 1]) !==
//       isSheldonWordKtivQere(sheldonVerse[i])
//   ) {
//     usfmVerse[i + 1]['type'] = 'word';
//     return 1;
//   } else if (
//     usfmVerse[i].type === 'word' &&
//     usfmVerse[i + 1]?.type === 'word'
//   ) {
//     if (
//       eStrongToSimple(stripForm(usfmVerse[i]['strong'])) ===
//       toCleanSheldonStrongs(sheldonVerse[i][4], 'H')
//     ) {
//       console.log('OK, back to the lobby....');
//     } else {
//       sheldonVerse.splice(i, 1);
//       return -1;
//     }
//   } else {
//     console.log('EHH?????');
//     console.log(usfmVerse[i]);
//     console.log(usfmVerse[i + 1]);
//     console.log(sheldonVerse[i]);
//     console.log(sheldonVerse[i + 1]);
//     suspendSync();
//   }
//   return 0;

//   // // slightly less simple case: \w+\f --- [] or ()     //does it occur?
// }

// function toCleanSheldonStrongs(arg0: string, arg1: string) {
//   throw 0;
//   return '';
// }

function extractData(
  baseData: CommonEntryData[][][],
  {
    wordIdTag,
    from: book,
    into: { wordData, lemmas, verseData },
  }: {
    wordIdTag: string;
    from: Book;
    into: {
      wordData: WordDataEntry[];
      lemmas: { [strong: string]: LemmaDataEntry };
      verseData: { [verseId: string]: Verse };
    };
  }
) {
  for (let chapterIndex = 0; chapterIndex < baseData.length; chapterIndex++) {
    const verses = baseData[chapterIndex];
    const chapterNumber = chapterIndex + 1;

    for (let verseIndex = 0; verseIndex < verses.length; verseIndex++) {
      const words = verses[verseIndex];
      const verseNumber = verseIndex + 1;

      const verseId = generateVerseId(book, chapterNumber, verseNumber);
      verseData[verseId] ??= {
        id: verseId,
        number: verseNumber,
        chapter: chapterNumber,
        bookId: book.id,
      };

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

        const wordId = `${wordIdTag}-${verseId}${(wordIndex + 1)
          .toString()
          .padStart(2, '0')}`;
        wordData.push({
          id: wordId,
          text: text
            .replace(/[\u2060\uFEFF\u200B\u202A\u202C\s]/g, '')
            .replace(/\u05BA/g, '\u05B9')
            .normalize(),
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

function generateVerseId(
  book: Book,
  chapterNumber: number,
  verseNumber: number
) {
  return [
    book.id.toString().padStart(2, '0'),
    chapterNumber.toString().padStart(3, '0'),
    verseNumber.toString().padStart(3, '0'),
  ].join('');
}

async function createVerses(verseData: { [verseId: string]: Verse }) {
  await client.verse.createMany({
    data: Object.values(verseData),
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

function extractBaseHebrewWord(text: string) {
  return (
    text
      .replace(
        // eslint-disable-next-line no-misleading-character-class, no-useless-escape
        /[ \n\r\t\]\[\)\(\u05BF\u05BD\u05b0\u202A\u202C\u05C3\u0591\u0592\u0593\u0594\u0595\u0596\u0597\u0599\u05AE\u05A8\u059A\u059B\u05A1\u059F\u05A0\u059C\u059E\u05C0\u05A5\u05A3\u05A4\u05A7\u05A8\u05A9\u05A6\u05AA\u05BE\u2060\uFEFF\u200B]+/g,
        ''
      )
      // holam and holam haser should be counted as the same char
      .replace(/\u05BA/g, '\u05B9')
      // vowels should be considered the same whether they have a sheva or not
      .replace(/[\u05B1-\u05B3]/g, (c) => {
        return String.fromCharCode(c.charCodeAt(0) + 5);
      })
      .normalize()
  );
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

// function rectifyShape(
//   usfmVerse: { type: string; [key: string]: string }[],
//   sheldonVerse: string[][]
// ) {
//   if (usfmVerse.length === sheldonVerse.length) {
//     console.log('Eh???? Rectifying called, but unnecessary');
//     suspendSync();
//   }

//   /// so we know that probably the usfm verse length is greater than the sheldon verse
//   for (let i = 0; i < usfmVerse.length && i < sheldonVerse.length; ++i) {
//     console.log(JSON.stringify(usfmVerse[i + 1]));
//     if (usfmVerse[i]['type'] !== 'footnote') {
//       /////////// harmonize sure gloss word combination process works with ktiv qere - get offsets right
//       if (
//         stripForm(usfmVerse[i]['strong']) ===
//         (usfmVerse[i + 1]?.type === 'word' &&
//           stripForm(usfmVerse[i + 1]['strong']))
//       ) {
//         if (
//           sheldonVerse[i][4] !== sheldonVerse[i + 1]?.[4] &&
//           toCleanSheldonStrongs(sheldonVerse[i + 1]?.[4] ?? '', 'H') !==
//             eStrongToSimple(stripForm(usfmVerse[i]['strong']))
//         ) {
//           usfmVerse.splice(i, 1);
//           usfmVerse[i]['text'] = '????';
//           --i;
//         }
//       }
//       if (
//         sheldonVerse[i] &&
//         (isSheldonWordKtivQere(sheldonVerse[i]) ||
//           usfmVerse[i + 1]?.type === 'footnote')
//       ) {
//         const offset = rectifyKtivQere({ sheldonVerse, usfmVerse, i });
//         i += offset;
//       }
//     } else {
//       console.log('ZEH WHAT???????');
//       suspendSync();
//     }
//   }
//   if (usfmVerse.length !== sheldonVerse.length) {
//     console.log(
//       `MA???? didn't rectify! lengths: ${usfmVerse.length} - ${sheldonVerse.length}`
//     );
//     console.log(
//       `usfm: \n${JSON.stringify(
//         usfmVerse.map(({ text }) => text),
//         null,
//         1
//       )}\n\nsheldon: \n${JSON.stringify(
//         sheldonVerse.map((value) => value[0]),
//         null,
//         1
//       )}`
//     );
//     suspendSync();
//   } else console.log('RECTIFIED! :)');
//   return true;
//   return false;
// }

function stripForm(strongsWithForm: string) {
  return strongsWithForm.slice(
    strongsWithForm.lastIndexOf(':') + 1 || undefined
  );
}

function eStrongToSimple(eStrong: string) {
  return eStrong.replace(/[a-z]/, '');
}

run();
