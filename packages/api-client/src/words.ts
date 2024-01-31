import type {
  UpdateNotesRequestBody,
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

  async updateTranslatorNote({
    wordId,
    language,
    ...body
  }: { wordId: string; language: string } & UpdateNotesRequestBody) {
    await this.client.patch({
      path: `/api/languages/${language}/words/${wordId}/note`,
      body,
    });
  }
}
