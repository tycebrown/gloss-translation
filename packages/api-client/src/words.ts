import type {
  GetWordCommentsResponseBody,
  PatchWordGlossRequestBody,
  PostCommentRequestBody,
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

  findWordComments(
    wordId: string,
    language: string
  ): Promise<GetWordCommentsResponseBody> {
    return this.client.get({
      path: `/api/languages/${language}/words/${wordId}/comments`,
    });
  }

  async postComment({
    wordId,
    language,
    ...body
  }: PostCommentRequestBody & {
    wordId: string;
    language: string;
  }): Promise<void> {
    await this.client.post({
      path: `/api/languages/${language}/words/${wordId}/comments`,
      body,
    });
  }

  async postReply({
    wordId,
    language,
    commentId,
    ...body
  }: PostCommentRequestBody & {
    wordId: string;
    language: string;
    commentId: string;
  }): Promise<void> {
    await this.client.post({
      path: `/api/languages/${language}/words/${wordId}/comments/${commentId}/replies`,
      body,
    });
  }
}
