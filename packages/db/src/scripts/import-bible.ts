import { readFileSync } from 'fs';
import { bookKeys } from '../../../../data/book-keys';
import { morphologyData } from '../../../../data/morphology';
import { PrismaClient } from '@prisma/client';
import { assert } from 'console';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const usfm = require('usfm-js');

const client = new PrismaClient();

const STRONGS_REGEX = / \[e\]/;
// TODO: compress adjacent (with same storngs), make sure to use sheldon hebrew text.
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
        value
          .filter(
            ([text, , english, grammar]) =>
              !(english === ' - ' && grammar === undefined) && !(text === 'ס')
          )
          .filter(([text], index, words) => {
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
          })
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

          const sheldonStrongs =
            rawStrongs !== ''
              ? `${book.id < 40 ? 'H' : 'G'}${rawStrongs
                  .replace(STRONGS_REGEX, '')
                  .padStart(4, '0')}`
              : '';

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
          default:
        }
      }
    }
  }
  console.log(book.name);

  console.log(
    compareShape(flattenChapters(runningAdjustedChapters), sheldonData)
  );
  console.log(
    compareShape(sheldonData, flattenChapters(runningAdjustedChapters))
  );
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

function compareShape(a: any, b: any, i?: number) {
  if (Array.isArray(a) && Array.isArray(b)) {
    console.log(`  ${(i ?? -1) + 1 ? `${i} ` : ''}${a.length} : ${b.length}`);
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; ++i) {
      if (!compareShape(a[i], b[i], i)) {
        console.log(a[i]);
        console.log(b[i]);
        throw NaN;
        return false;
      }
    }
    return true;
  }

  return !(
    (Array.isArray(a) && (Array.isArray(a[0]) || typeof b !== 'object')) ||
    (Array.isArray(b) && (Array.isArray(b[0]) || typeof a !== 'object'))
  );
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
    const x = true;
    while (x);
  });
}
run();
