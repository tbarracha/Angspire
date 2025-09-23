// src/app/modules/files/file-transfer.service.ts
import { Injectable, inject } from '@angular/core';
import {
  HttpEvent,
  HttpEventType,
  HttpHeaders,
  HttpResponse
} from '@angular/common/http';
import { Observable, tap, catchError, finalize, throwError } from 'rxjs';
import { OperationsClient } from '../../core/operations/operations-client/operations-client';

export interface FileMetadata {
  title?: string | null;
  description?: string | null;
  mimeType?: string | null;
  data?: unknown;
}

export interface UploadResponse {
  dbPath: string;
  metadata?: FileMetadata | null;
}

export interface DownloadQuery {
  container: string;
  key: string;
  inline?: boolean;
  [k: string]: string | number | boolean | undefined;
}

@Injectable({ providedIn: 'root' })
export class FileTransferService {
  private readonly ops = inject(OperationsClient);
  private readonly tagU = '[UploadOp]';
  private readonly tagD = '[DownloadOp]';

  /**
   * Upload to op route (e.g., 'files/upload/with-metadata')
   */
  uploadWithMetadata(
    route: string,
    file: File,
    metadata: FileMetadata,
    extra?: { headers?: HttpHeaders | Record<string, string | string[]> }
  ): Observable<HttpEvent<UploadResponse>> {
    // PRE-CALL log
    console.info(this.tagU, 'BEGIN', {
      route,
      file: { name: file?.name, size: file?.size, type: file?.type },
      meta: {
        title: metadata?.title ?? null,
        description: metadata?.description ? '…' : null, // avoid dumping long text
        mimeType: metadata?.mimeType ?? null,
        hasData: metadata?.data != null
      },
      hasHeaders: !!extra?.headers
    });

    const startedAt = performance.now();

    return this.ops.uploadOp<UploadResponse>(route, file, metadata, { headers: extra?.headers }).pipe(
      tap((evt: HttpEvent<UploadResponse>) => {
        switch (evt.type) {
          case HttpEventType.Sent:
            console.debug(this.tagU, 'SENT');
            break;
          case HttpEventType.UploadProgress:
            // We don't compute % here (component already does), just raw bytes to correlate
            // (evt as HttpProgressEvent) has loaded/total
            // Casting loosely to avoid import of HttpProgressEvent type in this file.
            const pe = evt as any;
            console.debug(this.tagU, 'PROGRESS', { loaded: pe?.loaded, total: pe?.total });
            break;
          case HttpEventType.Response:
            console.info(this.tagU, 'RESPONSE', {
              status: (evt as HttpResponse<UploadResponse>).status,
              ok: (evt as HttpResponse<UploadResponse>).ok,
              hasBody: !!(evt as HttpResponse<UploadResponse>).body
            });
            break;
          default:
            console.debug(this.tagU, 'EVENT', { type: evt.type });
            break;
        }
      }),
      catchError(err => {
        console.error(this.tagU, 'ERROR', summarizeHttpError(err));
        return throwError(() => err);
      }),
      finalize(() => {
        const ms = Math.round(performance.now() - startedAt);
        console.info(this.tagU, 'END', { elapsedMs: ms });
      })
    );
  }

  /**
   * Download with progress from op route (e.g., 'files/download')
   */
  download(
    route: string,
    query: DownloadQuery,
    extra?: { headers?: HttpHeaders | Record<string, string | string[]> }
  ): Observable<HttpEvent<Blob>> {
    console.info(this.tagD, 'BEGIN', { route, query, hasHeaders: !!extra?.headers });
    const startedAt = performance.now();

    return this.ops.downloadOp(route, query, { headers: extra?.headers }).pipe(
      tap((evt: HttpEvent<Blob>) => {
        switch (evt.type) {
          case HttpEventType.Sent:
            console.debug(this.tagD, 'SENT');
            break;
          case HttpEventType.DownloadProgress: {
            const pe = evt as any;
            console.debug(this.tagD, 'PROGRESS', { loaded: pe?.loaded, total: pe?.total });
            break;
          }
          case HttpEventType.Response: {
            const res = evt as HttpResponse<Blob>;
            console.info(this.tagD, 'RESPONSE', { status: res.status, ok: res.ok, size: res.body?.size });
            break;
          }
          default:
            console.debug(this.tagD, 'EVENT', { type: evt.type });
            break;
        }
      }),
      catchError(err => {
        console.error(this.tagD, 'ERROR', summarizeHttpError(err));
        return throwError(() => err);
      }),
      finalize(() => {
        const ms = Math.round(performance.now() - startedAt);
        console.info(this.tagD, 'END', { elapsedMs: ms });
      })
    );
  }

  /**
   * One-shot download (no progress), returns Blob and filename if provided.
   */
  downloadOnce(
    route: string,
    query: DownloadQuery,
    extra?: { headers?: HttpHeaders | Record<string, string | string[]> }
  ): Observable<{ blob: Blob; fileName: string | null; response: HttpResponse<Blob> }> {
    console.info(this.tagD, 'BEGIN-ONCE', { route, query });
    const startedAt = performance.now();

    return this.ops.downloadOnceOp(route, query, { headers: extra?.headers }).pipe(
      tap(({ response }) => {
        console.info(this.tagD, 'RESPONSE-ONCE', { status: response.status, ok: response.ok });
      }),
      catchError(err => {
        console.error(this.tagD, 'ERROR-ONCE', summarizeHttpError(err));
        return throwError(() => err);
      }),
      finalize(() => {
        const ms = Math.round(performance.now() - startedAt);
        console.info(this.tagD, 'END-ONCE', { elapsedMs: ms });
      })
    );
  }

  /** Helper: save a Blob locally */
  static saveBlob(blob: Blob, fileName = 'download'): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

function summarizeHttpError(err: any) {
  const status = err?.status ?? null;
  const message = typeof err?.error === 'string' ? err.error
                : typeof err?.message === 'string' ? err.message
                : 'Request failed';
  return { status, message };
}
