import { readFileSync } from 'fs';
import { bookKeys } from '../../../../data/book-keys';
import { morphologyData } from '../../../../data/morphology';
import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const usfm = require('usfm-js');

const client = new PrismaClient();

const STRONGS_REGEX = / \[e\]/;
// incoporate unfolding word. strong's syntax: {prefixes}:{base_id}{letter}
// look: applies only to bible, only to lex, or both?
// add, also see: need data given of bible? or unfolding word?
// vas and cas
async function run() {
  await client.word.deleteMany();
  await client.verse.deleteMany();
  await client.book.deleteMany();
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

  for (let bookIndex = 0; bookIndex < bookKeys.length; bookIndex++) {
    const bookKey = bookKeys[bookIndex];
    const chapters = morphologyData[bookKey];

    const book = await client.book.create({
      data: {
        id: bookIndex + 1,
        name: bookKey,
      },
    });

    const rawUsfmData = usfm.toJSON(
      readFileSync(
        `data/unfoldingWord/${(bookIndex + 1)
          .toString()
          .padStart(2, '0')}-${bookKey.toUpperCase()}.usfm`,
        'utf-8'
      )
    );

    const usfmChapters = rawUsfmData.chapters;

    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
      const verses = chapters[chapterIndex];
      const chapterNumber = chapterIndex + 1;
      const usfmVerses = usfmChapters[chapterNumber];

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
        const usfmWords = usfmVerses[verseNumber]['verseObjects'].filter(
          (word: { type: string }) => word.type === 'word'
        );

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

        for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
          const [, , english, grammar = '', rawStrongs = ''] = words[wordIndex];

          console.log(usfmWords[wordIndex]);
          console.log(words[wordIndex]);

          const { text, strong: usfmStrongsWithForm } = usfmWords[wordIndex];
          const usfmStrongs = stripForm(usfmStrongsWithForm);

          const sheldonStrongs =
            rawStrongs !== ''
              ? `${book.id < 40 ? 'H' : 'G'}${rawStrongs
                  .replace(STRONGS_REGEX, '')
                  .padStart(4, '0')}`
              : '';

          const strongs = usfmStrongs || sheldonStrongs;

          if (eStrongToSimple(usfmStrongs) !== sheldonStrongs) {
            console.log(
              `Warning; usfmStrongs does not equal sheldonStrongs: '${eStrongToSimple(
                usfmStrongs
              )}' !== '${sheldonStrongs}'`
            );
            console.log(
              `  ----- in book: ${bookKey}, chapter: ${chapterNumber}, verse: ${verseNumber}, word: ${wordIndex}`
            );
          }

          // We have to accumulate word data until we have inserted all of the lemma data.
          const wordId = `${verseId}${(wordIndex + 1)
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

function stripForm(strongsWithForm: string) {
  return strongsWithForm.slice(
    strongsWithForm.lastIndexOf(':') + 1 || undefined
  );
}
function eStrongToSimple(eStrong: string) {
  return eStrong.replace(/[a-z]/, '');
}
run();
