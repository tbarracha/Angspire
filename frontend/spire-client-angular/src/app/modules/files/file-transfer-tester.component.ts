// Angular 19+ (Standalone, Signals, Modern Control Flow)
// File: app/features/files/file-transfer-tester.component.ts
import {
  Component, EventEmitter, HostListener, Input, Output,
  WritableSignal, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HttpClient, HttpEvent, HttpEventType, HttpProgressEvent, HttpResponse
} from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { DownloadQuery, FileMetadata, FileTransferService, UploadResponse } from './file-transfer.service';

@Component({
  standalone: true,
  selector: 'app-file-transfer-tester',
  imports: [CommonModule, FormsModule],
  template: `
<div class="w-full max-w-5xl mx-auto p-4 rounded-2xl border border-gray-200 shadow-sm bg-white">
  <h2 class="text-xl font-semibold mb-4">File Transfer Tester</h2>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- =======================
         LEFT: UPLOAD
         ======================= -->
    <section>
      <h3 class="text-lg font-semibold mb-3">Upload with Metadata</h3>

      <!-- File drop zone -->
      <div
        class="border-2 border-dashed rounded-2xl p-6 text-center transition hover:bg-gray-50 cursor-pointer"
        [class.border-blue-400]="isDragging()"
        [class.bg-blue-50]="isDragging()"
        role="button"
        tabindex="0"
        (click)="openFileDialog($event, fileInputEl)"
        (keydown.enter)="openFileDialog($event, fileInputEl)"
        (keydown.space)="openFileDialog($event, fileInputEl)"
      >
        <p class="text-sm text-gray-600">
          Drop a file here, or <span class="text-blue-600 underline">browse</span>
        </p>
        <input
          #fileInputEl
          type="file"
          class="hidden"
          (click)="$event.stopPropagation()"
          (change)="onFilePicked($event)"
        />
        @if (file()) { <p class="mt-2 text-gray-800">Selected: <b>{{ file()!.name }}</b></p> }
      </div>

      <!-- Metadata form -->
      <div class="mt-4 grid grid-cols-1 gap-3">
        <input class="w-full rounded-xl border border-gray-300 px-3 py-2"
               placeholder="Title (optional)" [(ngModel)]="metaTitle" />
        <input class="w-full rounded-xl border border-gray-300 px-3 py-2"
               placeholder="Description (optional)" [(ngModel)]="metaDescription" />
        <input class="w-full rounded-xl border border-gray-300 px-3 py-2"
               placeholder="Mime Type (optional, e.g. image/png)" [(ngModel)]="metaMime" />

        <label class="text-sm text-gray-600">Data (JSON, optional)</label>
        <textarea class="w-full rounded-xl border border-gray-300 px-3 py-2 font-mono text-sm"
                  rows="5" [(ngModel)]="metaDataJson"
                  placeholder='{"any":"thing"}'></textarea>
      </div>

      <!-- Endpoint override (optional) -->
      <div class="mt-3">
        <label class="text-sm text-gray-600">Upload endpoint</label>
        <input class="w-full rounded-xl border border-gray-300 px-3 py-2"
               [(ngModel)]="uploadEndpoint" />
      </div>

      <!-- Actions -->
      <div class="mt-4 flex items-center gap-3">
        <button class="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                [disabled]="!file() || isUploading()"
                (click)="onUpload()">
          @if (!isUploading()) { Upload }
          @else { Uploading... }
        </button>

        @if (uploadError()) {
          <span class="text-red-600 text-sm">{{ uploadError() }}</span>
        }
      </div>

      <!-- Progress -->
      @if (uploadProgress() > 0 && uploadProgress() < 100) {
        <div class="mt-4">
          <div class="w-full h-3 bg-gray-200 rounded-xl overflow-hidden">
            <div class="h-3 bg-blue-600" [style.width.%]="uploadProgress()"></div>
          </div>
          <p class="text-sm text-gray-600 mt-1">{{ uploadProgress() }}%</p>
        </div>
      }

      <!-- Result -->
      @if (uploadResult()) {
        <div class="mt-4 p-3 rounded-xl bg-green-50 border border-green-200">
          <div class="text-sm text-green-800">
            <div><b>Uploaded:</b> {{ uploadResult()!.dbPath }}</div>
            @if (uploadResult()!.metadata) {
              <pre class="mt-2 text-xs text-gray-800 bg-white p-2 rounded-lg overflow-auto">{{ uploadResult()!.metadata | json }}</pre>
            }
          </div>
        </div>
      }
    </section>

    <!-- =======================
         RIGHT: DOWNLOAD
         ======================= -->
    <section>
      <h3 class="text-lg font-semibold mb-3">Download</h3>

      <div class="grid grid-cols-1 gap-3">
        <label class="text-sm text-gray-600">Download endpoint</label>
        <input class="w-full rounded-xl border border-gray-300 px-3 py-2"
               [(ngModel)]="downloadEndpoint" />

        <label class="text-sm text-gray-600">Container</label>
        <input class="w-full rounded-xl border border-gray-300 px-3 py-2"
               [(ngModel)]="dlContainer" placeholder="Resources/Images" />

        <label class="text-sm text-gray-600">Key (filename / path)</label>
        <input class="w-full rounded-xl border border-gray-300 px-3 py-2"
               [(ngModel)]="dlKey" placeholder="logo.png" />

        <label class="inline-flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" class="rounded" [(ngModel)]="dlInline" />
          Open inline (instead of attachment)
        </label>
      </div>

      <div class="mt-4 flex items-center gap-3">
        <button class="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                [disabled]="isDownloading() || !dlContainer || !dlKey"
                (click)="onDownload()">
          @if (!isDownloading()) { Download }
          @else { Downloading... }
        </button>

        @if (downloadError()) {
          <span class="text-red-600 text-sm">{{ downloadError() }}</span>
        }
      </div>

      <!-- Progress -->
      @if (downloadProgress() > 0 && downloadProgress() < 100) {
        <div class="mt-4">
          <div class="w-full h-3 bg-gray-200 rounded-xl overflow-hidden">
            <div class="h-3 bg-emerald-600" [style.width.%]="downloadProgress()"></div>
          </div>
          <p class="text-sm text-gray-600 mt-1">{{ downloadProgress() }}%</p>
        </div>
      }

      <!-- Result -->
      @if (downloadedFileName()) {
        <div class="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-900">
          Saved <b>{{ downloadedFileName() }}</b>
        </div>
      }
    </section>
  </div>
</div>
  `,
})
export class FileTransferTesterComponent {
  // Defaults match your mapped endpoints
  @Input() uploadEndpoint = '/api/files/upload/with-metadata';
  @Input() downloadEndpoint = '/api/files/download';

  @Output() uploadCompleted = new EventEmitter<UploadResponse>();

  // Upload state
  readonly file: WritableSignal<File | null> = signal<File | null>(null);
  readonly isDragging = signal(false);
  readonly isUploading = signal(false);
  readonly uploadProgress = signal(0);
  readonly uploadResult = signal<UploadResponse | null>(null);
  readonly uploadError = signal<string | null>(null);

  // Download state
  readonly isDownloading = signal(false);
  readonly downloadProgress = signal(0);
  readonly downloadError = signal<string | null>(null);
  readonly downloadedFileName = signal<string | null>(null);

  // Metadata model
  metaTitle = '';
  metaDescription = '';
  metaMime = '';
  metaDataJson = '';

  // Download model
  dlContainer = 'Resources/Images';
  dlKey = 'logo.png';
  dlInline = false;

  private svc = inject(FileTransferService);
  private http = inject(HttpClient);

  // ===== Instrumentation state =====
  private lastPickerToken: string | null = null;
  private pickerOpenedAt: number | null = null;
  private openingPicker = false; // re-entrancy guard
  private readonly tag = '[FilePicker]';

  // Drag & drop handlers (upload)
  @HostListener('dragover', ['$event'])
  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    this.isDragging.set(true);
    console.debug(this.tag, 'dragover');
  }

  @HostListener('dragleave')
  onDragLeave() {
    this.isDragging.set(false);
    console.debug(this.tag, 'dragleave');
  }

  @HostListener('drop', ['$event'])
  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.isDragging.set(false);
    const f = ev.dataTransfer?.files?.item(0) ?? null;
    console.debug(this.tag, 'drop', { hasFile: !!f, count: ev.dataTransfer?.files?.length });
    if (f) this.file.set(f);
  }

  // Window focus/blur to infer picker open/close
  @HostListener('window:blur')
  onWindowBlur() {
    if (this.lastPickerToken) {
      console.debug(this.tag, 'window blur (likely picker opened)', { token: this.lastPickerToken });
    }
  }

  @HostListener('window:focus')
  onWindowFocus() {
    if (!this.lastPickerToken) return;
    const elapsed = this.pickerOpenedAt ? Date.now() - this.pickerOpenedAt : null;
    const hasSelection = !!this.file();
    console.debug(this.tag, 'window focus (picker closed)', {
      token: this.lastPickerToken,
      elapsedMs: elapsed,
      result: hasSelection ? 'SELECT' : 'CANCEL'
    });

    // reset token + unlock for next open
    this.lastPickerToken = null;
    this.pickerOpenedAt = null;
    this.openingPicker = false;
  }

  // Explicit open entrypoint so we can log before the native dialog shows
  openFileDialog(ev: Event, input: HTMLInputElement) {
    ev.stopPropagation();
    ev.preventDefault();

    if (this.openingPicker) {
      // ignore re-entrant or bubbled calls
      return;
    }

    this.openingPicker = true;
    this.lastPickerToken = cryptoRandomToken();
    this.pickerOpenedAt = Date.now();
    console.info(this.tag, 'OPEN', { token: this.lastPickerToken, time: new Date().toISOString() });

    // Defer to next tick to ensure handler returns before synthetic click fires
    queueMicrotask(() => {
      try {
        input.click();
        console.debug(this.tag, 'input.click() dispatched');
      } catch (err) {
        this.openingPicker = false; // unlock if click fails
        console.error(this.tag, 'input.click() threw', err);
      }
    });
  }

  onFilePicked(ev: Event) {
    // unlock regardless of outcome; focus will also unlock
    this.openingPicker = false;

    const input = ev.target as HTMLInputElement;
    const len = input.files?.length ?? 0;
    const f = input.files?.item(0) ?? null;
    console.info(this.tag, 'CHANGE', {
      token: this.lastPickerToken,
      filesLength: len,
      selectedName: f?.name,
      size: f?.size,
      type: f?.type
    });
    if (f) {
      this.file.set(f);
    } else {
      this.file.set(null);
    }
  }

  // Upload handler
  onUpload() {
    this.uploadError.set(null);
    this.uploadResult.set(null);
    const f = this.file();
    console.info('[Upload]', 'BEGIN', { hasFile: !!f, endpoint: this.uploadEndpoint });
    if (!f) { this.uploadError.set('Please select a file.'); return; }

    // Optional JSON
    let data: unknown = undefined;
    if (this.metaDataJson?.trim()) {
      try {
        data = JSON.parse(this.metaDataJson);
      } catch (e) {
        console.warn('[Upload]', 'Invalid JSON metadata', e);
        this.uploadError.set('Metadata Data must be valid JSON.');
        return;
      }
    }

    const metadata: FileMetadata = {
      title: this.metaTitle || undefined,
      description: this.metaDescription || undefined,
      mimeType: this.metaMime || undefined,
      data
    };

    this.isUploading.set(true);
    this.uploadProgress.set(0);

    this.svc.uploadWithMetadata(this.uploadEndpoint, f, metadata).subscribe({
      next: (evt: HttpEvent<UploadResponse>) => {
        switch (evt.type) {
          case HttpEventType.Sent:
            console.debug('[Upload]', 'SENT');
            break;
          case HttpEventType.UploadProgress: {
            const pe = evt as HttpProgressEvent;
            const pct = pe.total ? Math.round((100 * pe.loaded) / pe.total)
                                 : Math.min(99, Math.round(pe.loaded / 1000));
            this.uploadProgress.set(pct);
            console.debug('[Upload]', 'PROGRESS', { loaded: pe.loaded, total: pe.total, pct });
            break;
          }
          case HttpEventType.Response: {
            const body = (evt as HttpResponse<UploadResponse>).body!;
            this.uploadProgress.set(100);
            this.uploadResult.set(body);
            this.uploadCompleted.emit(body);
            this.isUploading.set(false);
            console.info('[Upload]', 'DONE', { dbPath: body?.dbPath });
            break;
          }
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        const formatted = this.formatHttpError(err);
        console.error('[Upload]', 'ERROR', err);
        this.uploadError.set(formatted);
      }
    });
  }

  // Download handler
  onDownload() {
    this.downloadError.set(null);
    this.downloadedFileName.set(null);
    this.downloadProgress.set(0);
    this.isDownloading.set(true);

    const query: DownloadQuery = {
      container: this.dlContainer,
      key: this.dlKey,
      inline: this.dlInline
    };

    console.info('[Download]', 'BEGIN', { endpoint: this.downloadEndpoint, query });

    this.svc.download(this.downloadEndpoint, query).subscribe({
      next: (evt: HttpEvent<Blob>) => {
        switch (evt.type) {
          case HttpEventType.Sent:
            console.debug('[Download]', 'SENT');
            break;
          case HttpEventType.DownloadProgress: {
            const pe = evt as HttpProgressEvent;
            const pct = pe.total ? Math.round((100 * pe.loaded) / pe.total)
                                 : Math.min(99, Math.round(pe.loaded) / 1000);
            this.downloadProgress.set(pct);
            console.debug('[Download]', 'PROGRESS', { loaded: pe.loaded, total: pe.total, pct });
            break;
          }
          case HttpEventType.Response: {
            const res = evt as HttpResponse<Blob>;
            const fileName = this.extractFileName(res) ?? this.dlKey.split('/').pop() ?? 'download.bin';
            FileTransferService.saveBlob(res.body!, fileName);
            this.downloadProgress.set(100);
            this.downloadedFileName.set(fileName);
            this.isDownloading.set(false);
            console.info('[Download]', 'DONE', { fileName });
            break;
          }
        }
      },
      error: (err) => {
        this.isDownloading.set(false);
        const formatted = this.formatHttpError(err);
        console.error('[Download]', 'ERROR', err);
        this.downloadError.set(formatted);
      }
    });
  }

  private formatHttpError(err: any): string {
    const msg = err?.error ?? err?.message ?? 'Request failed.';
    return typeof msg === 'string' ? msg : 'Request failed.';
  }

  // Extract filename from Content-Disposition (handles RFC5987 filename*)
  private extractFileName(resp: HttpResponse<Blob>): string | null {
    const cd = resp.headers.get('Content-Disposition') || resp.headers.get('content-disposition');
    if (!cd) return null;

    const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(cd);
    if (star?.[2]) {
      try { return decodeURIComponent(star[2].trim().replace(/^"|"$/g, '')); } catch { /* ignore */ }
    }

    const basic = /filename\s*=\s*([^;]+)/i.exec(cd);
    return basic?.[1]?.trim().replace(/^"|"$/g, '') ?? null;
  }
}

// Tiny helper to keep tokens readable in logs
function cryptoRandomToken(): string {
  try {
    const buf = new Uint8Array(8);
    crypto.getRandomValues(buf);
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Math.random().toString(16).slice(2, 10);
  }
}
