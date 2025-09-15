import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ORChatRequest, ORChatResponse } from './openrouter.models';
import { environment } from '../../../environments/environment';

type ExtraHeaders = Record<string, string>;

@Injectable({ providedIn: 'root' })
export class OpenRouterChatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly apiKey = environment.genAI.OpenRouter.apiKey;
  private readonly defaultModel = environment.genAI.OpenRouter.defaultModel;

  /** Streaming */
  chat(
    params: Omit<ORChatRequest, 'model'> & { stream: true },
    headers?: ExtraHeaders
  ): Observable<string>;
  /** Non-streaming */
  chat(
    params: Omit<ORChatRequest, 'model'> & { stream?: false },
    headers?: ExtraHeaders
  ): Observable<ORChatResponse>;
  chat(
    params: Omit<ORChatRequest, 'model'> & { stream?: boolean } = {},
    headers: ExtraHeaders = {}
  ): Observable<ORChatResponse | string> {
    const payload: ORChatRequest = {
      ...params,
      model: this.defaultModel,
    };

    const httpHeaders = new HttpHeaders({
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...headers,
    });

    if (payload.stream) {
      return this.http.post(this.apiUrl, payload, {
        headers: httpHeaders,
        responseType: 'text',
      });
    } else {
      return this.http.post<ORChatResponse>(this.apiUrl, payload, {
        headers: httpHeaders,
        responseType: 'json',
      });
    }
  }
}
