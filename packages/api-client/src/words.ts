import type {
  GetNotesResponseBody as GetTranslatorNotesResponseBody,
  PatchNotesRequestBody as PatchTranslatorNotesRequestBody,
  PatchWordGlossRequestBody,
} from '@translation/api-types';
import ApiClient from './client';

export { PatchWordGlossRequestBody };

export default class Verses {
  constructor(private readonly client: ApiClient) {}

  async updateGloss({
    wordId,
    language,
    ...body
  }: PatchWordGlossRequestBody & {
    wordId: string;
    language: string;
  }): Promise<void> {
    await this.client.patch({
      path: `/api/languages/${language}/words/${wordId}`,
      body,
    });
  }

  findTranslatorNotes({
    wordId,
    language,
  }: {
    wordId: string;
    language: string;
  }): Promise<GetTranslatorNotesResponseBody> {
    return this.client.get({
      path: `/api/languages/${language}/words/${wordId}/notes`,
    });
  }

  async updateTranslatorNotes({
    wordId,
    language,
    ...body
  }: { wordId: string; language: string } & PatchTranslatorNotesRequestBody) {
    await this.client.patch({
      path: `/api/languages/${language}/words/${wordId}/notes`,
      body,
    });
  }
}
