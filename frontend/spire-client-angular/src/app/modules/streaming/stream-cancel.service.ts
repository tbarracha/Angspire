// File: src/app/modules/streaming/stream-cancel.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { CancelStreamRequestDto, CancelStreamResponseDto } from './stream-cancel-dtos';
import { environment } from '../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class StreamCancelService {
  private readonly http = inject(HttpClient);

  // normalize base url (strip trailing slashes)
  private readonly base = environment.apiUrl.replace(/\/+$/, '');
  private readonly url = `${this.base}/stream/cancel`;

  /**
   * Cancels a running server-side stream by RequestId.
   * Mirrors: POST /stream/cancel
   */
  cancel(requestId: string): Observable<CancelStreamResponseDto> {
    const body: CancelStreamRequestDto = { requestId: requestId.trim() };
    return this.http.post<CancelStreamResponseDto>(this.url, body);
  }

  /**
   * Convenience helper that returns just the boolean.
   */
  cancelAndGetSuccess(requestId: string): Observable<boolean> {
    return this.cancel(requestId).pipe(map(r => !!r.success));
  }
}
