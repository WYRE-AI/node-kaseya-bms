/**
 * Knowledge base operations.
 */

import type { HttpClient } from '../http.js';
import type { BmsKnowledgeBaseArticle } from '../types/knowledge-base.js';
import {
  PaginatedIterable,
  buildPaginationParams,
  type PaginationParams,
} from '../pagination.js';

/**
 * Operations on knowledge base articles.
 */
export class KnowledgeBaseResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /** List knowledge base articles (single page). */
  async list(params?: PaginationParams): Promise<BmsKnowledgeBaseArticle[]> {
    return this.httpClient.get<BmsKnowledgeBaseArticle[]>(
      '/v2/service/knowledgebase',
      buildPaginationParams(params)
    );
  }

  /** Iterate every knowledge base article. */
  listAll(params?: PaginationParams): PaginatedIterable<BmsKnowledgeBaseArticle> {
    return new PaginatedIterable<BmsKnowledgeBaseArticle>(
      this.httpClient,
      '/v2/service/knowledgebase',
      params
    );
  }
}
