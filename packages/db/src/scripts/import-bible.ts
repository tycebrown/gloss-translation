import { readFileSync } from 'fs';
import { bookKeys } from '../../../../data/book-keys';
import { morphologyData } from '../../../../data/morphology';
import { PrismaClient } from '@prisma/client';
import { assert } from 'console';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const usfm = require('usfm-js');

const client = new PrismaClient();

const STRONGS_REGEX = / \[e\]/;
// TODO: compress adjacent (with same strongs), make sure to use sheldon hebrew text.
//  - do the ktiv-qere situation
async function run() {
  await client.gloss.deleteMany();
  await client.word.deleteMany();
  await client.verse.deleteMany();
  await client.book.deleteMany();
  await client.language.deleteMany();
  const wordData: {
    id: string;
    text: string;
    verseId: string;
    grammar: string;
    strongs: string;
    english: string;
  }[] = [];
  const lemmas: {
    [strongs: string]: {
      [grammar: string]: { verseIds: string[]; formId?: string };
    };
  } = {};

  for (let bookIndex = 0; bookIndex < (39 || bookKeys.length); bookIndex++) {
    const bookKey = bookKeys[bookIndex];
    const chapters = morphologyData[bookKey];

    const book = await client.book.create({
      data: {
        id: bookIndex + 1,
        name: bookKey,
      },
    });

    const sheldonData = morphologyData[bookKey].map((value) =>
      value.map((value) =>
        value.filter(
          ([text, , , grammar]) =>
            !(
              (text.length === 1 && grammar === undefined) ||
              text.includes('׆')
            )
        )
      )
    );

    buildUsfmBookData({ book, sheldonData });
    continue;

    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
      const verses = chapters[chapterIndex];
      const chapterNumber = chapterIndex + 1;

      for (let verseIndex = 0; verseIndex < verses.length; verseIndex++) {
        let words = verses[verseIndex].filter(
          ([text, , english, grammar]) =>
            !(english === ' - ' && grammar === undefined) && !(text === 'ס')
        );
        words = words
          .filter(([text], index) => {
            if (text.startsWith('[') && text.endsWith(']')) {
              if (
                words[index - 1] &&
                words[index - 1][0].startsWith('(') &&
                words[index - 1][0].endsWith(')')
              ) {
                return true;
              } else if (
                words[index + 1] &&
                words[index + 1][0].startsWith('(') &&
                words[index + 1][0].endsWith(')')
              ) {
                return true;
              }
              return false;
            }
            return true;
          })
          .filter(([text]) => {
            return !(text.startsWith('(') && text.endsWith(')'));
          });

        const verseNumber = verseIndex + 1;

        const verseId = [
          book.id.toString().padStart(2, '0'),
          chapterNumber.toString().padStart(3, '0'),
          verseNumber.toString().padStart(3, '0'),
        ].join('');

        const verse = await client.verse.create({
          data: {
            id: verseId,
            number: verseNumber,
            chapter: chapterNumber,
            book: { connect: { id: book.id } },
          },
        });

        for (
          let sheldonWordIndex = 0;
          sheldonWordIndex < words.length;
          sheldonWordIndex++
        ) {
          const [text, , english, grammar = '', rawStrongs = ''] =
            words[sheldonWordIndex];

          console.log(words[sheldonWordIndex]);

          const sheldonStrongs = toCleanSheldonStrongs(
            rawStrongs,
            book.id < 40 ? 'H' : 'G'
          );

          const strongs = sheldonStrongs;

          // We have to accumulate word data until we have inserted all of the lemma data.
          const wordId = `${verseId}${(sheldonWordIndex + 1)
            .toString()
            .padStart(2, '0')}`;
          wordData.push({
            id: wordId,
            text,
            verseId: verse.id,
            grammar,
            strongs,
            english,
          });

          lemmas[strongs] ??= {};
          lemmas[strongs][grammar] ??= { verseIds: [] };
          lemmas[strongs][grammar].verseIds.push(wordId);
        }
      }
    }
  }

  for (const [lemma, forms] of Object.entries(lemmas)) {
    try {
      await client.lemma.create({
        data: {
          id: lemma,
          forms: {
            createMany: {
              data: Object.keys(forms).map((grammar, i) => {
                const id = `${lemma}-${(i + 1).toString().padStart(3, '0')}`;
                lemmas[lemma][grammar].formId = id;
                return {
                  id,
                  grammar,
                };
              }),
            },
          },
        },
      });
    } catch (error) {
      console.log(
        lemma,
        Object.values(forms).map((form) => form.formId)
      );
      throw error;
    }
  }

  await client.word.createMany({
    data: wordData.map((word) => ({
      id: word.id,
      verseId: word.verseId,
      text: word.text,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      formId: lemmas[word.strongs][word.grammar].formId!,
    })),
  });

  const language = await client.language.create({
    data: {
      code: 'eng',
      name: 'English',
    },
  });

  await client.gloss.createMany({
    data: wordData.map((word) => ({
      wordId: word.id,
      languageId: language.id,
      gloss: word.english,
    })),
  });

  await client.$disconnect();
}

function toCleanSheldonStrongs(rawStrongs: string, prefix: 'G' | 'H') {
  return rawStrongs !== ''
    ? `${prefix}${rawStrongs.replace(STRONGS_REGEX, '').padStart(4, '0')}`
    : '';
}

async function buildUsfmBookData({
  book,
  sheldonData,
}: {
  book: any;
  sheldonData: any;
}) {
  // build database.
  const rawData = usfm.toJSON(
    readFileSync(
      `data/unfoldingWord/${book.id
        .toString()
        .padStart(2, '0')}-${book.name.toUpperCase()}.usfm`,
      'utf-8'
    )
  );

  const runningAdjustedChapters: any = {};
  let currentChapterNumber = 1;
  let currentVerseNumber = 1;

  for (const [chapterNumber, chapter] of Object.entries(rawData['chapters'])) {
    currentChapterNumber = +chapterNumber.trim();
    runningAdjustedChapters[currentChapterNumber] =
      runningAdjustedChapters[currentChapterNumber] || {};

    delete (chapter as any)['front'];
    for (const [verseNumber, verse] of Object.entries(chapter as any)) {
      currentVerseNumber = +verseNumber.trim();
      for (const verseObject of (verse as any)['verseObjects']) {
        runningAdjustedChapters[currentChapterNumber] =
          runningAdjustedChapters[currentChapterNumber] || {};
        const currentVerse = (runningAdjustedChapters[currentChapterNumber][
          currentVerseNumber
        ] =
          runningAdjustedChapters[currentChapterNumber][currentVerseNumber] ||
          []);
        switch (verseObject['tag']) {
          case 'w':
            currentVerse.push({
              type: 'word',
              text: verseObject['text'],
              strong: verseObject['strong'],
            });
            break;
          case 'ca':
            currentChapterNumber = +verseObject['content'].trim();
            break;
          case 'va': {
            const theVerseNumber = verseObject['content'].trim();
            if (theVerseNumber.indexOf(':') === -1) {
              currentVerseNumber = +theVerseNumber;
            } else {
              const [alternateChapterNumber, alternateVerseNumber] =
                theVerseNumber.split(':');
              currentChapterNumber = alternateChapterNumber;
              currentVerseNumber = alternateVerseNumber;
            }
            break;
          }
          case 'f': {
            currentVerse.push(parseFootnoteContent(verseObject['content']));
            break;
          }
          default:
        }
      }
    }
  }
  console.log(book.name);

  const result = flattenChapters(runningAdjustedChapters);

  console.log(compareShape(result, sheldonData));
}

function parseFootnoteContent(content: string) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  let footnoteObject = content.match(
    /^\+ \\ft (?<footnoteType>[Q|K]) \\\+w (?<word>[^|]+)\|(?<attributes>.*)/
  )?.groups;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  footnoteObject = footnoteObject!;
  const footnoteAttributes: { [key: string]: string } = {};

  for (const attributeMatch of footnoteObject['attributes'].matchAll(
    /(?<key>[^=\s]+)="(?<value>[^"]+)"/g
  )) {
    const { key, value } = attributeMatch!.groups!;
    footnoteAttributes[key] = value;
  }

  delete footnoteObject['attributes'];

  return {
    ...footnoteObject,
    ...footnoteAttributes,
    type: 'footnote',
  };
}

function flattenChapters(chapters: any) {
  const resultingChapters: any[] = [];
  Object.entries(chapters).forEach(
    ([chapterNumber, chapterData]: [any, any]) => {
      const currentChapter: any[] = (resultingChapters[+chapterNumber - 1] =
        []);
      Object.entries(chapterData).forEach(
        ([verseNumber, verseData]: [any, any]) => {
          currentChapter[+verseNumber - 1] = verseData;
        }
      );
    }
  );
  return resultingChapters;
}

function compareShape(
  currentUsfmData: any,
  currentSheldonData: any,
  i?: number
) {
  if (Array.isArray(currentUsfmData) && Array.isArray(currentSheldonData)) {
    console.log(
      `  ${(i ?? -1) + 1 ? `${i} ` : ''}${currentUsfmData.length} : ${
        currentSheldonData.length
      }`
    );
    if (currentUsfmData.length !== currentSheldonData.length) {
      if (
        !(
          currentUsfmData[0] instanceof Object &&
          currentSheldonData[0] instanceof Array &&
          typeof currentSheldonData[0][0] === 'string' &&
          rectifyShape(currentUsfmData, currentSheldonData)
        )
      ) {
        return false;
      }
    }
    for (let i = 0; i < currentUsfmData.length; ++i) {
      if (!compareShape(currentUsfmData[i], currentSheldonData[i], i)) {
        // console.log(currentUsfmData[i]);
        // console.log(currentSheldonData[i]);
        return false;
      }
    }
    return true;
  }

  return (
    Array.isArray(currentSheldonData) &&
    typeof currentSheldonData[0] === 'string' &&
    !Array.isArray(currentUsfmData)
  );
}

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

function suspend() {
  return new Promise(() => {
    suspendSync();
  });
}

function suspendSync() {
  const x = true;
  while (x);
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

run();
