// src/app/lib/components/theme/theme-editor-toolbar.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeEditorModalComponent } from './theme-editor.modal'; // ⬅️ new modal content
import { ModalService } from '../../../components/ui/modal-components/modal.service';

@Component({
  standalone: true,
  selector: 'app-theme-editor-toolbar',
  imports: [CommonModule],
  template: `
    <button
      class="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white/70 backdrop-blur shadow-sm hover:shadow transition"
      (click)="openModal()"
    >
      🎨 Theme
      <svg width="14" height="14" viewBox="0 0 20 20" class="opacity-60">
        <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
  `
})
export class ThemeEditorToolbarComponent {
  constructor(private modals: ModalService) {}

  openModal() {
    this.modals.open(ThemeEditorModalComponent, [], {
      title: 'Theme Editor',
      hideFooter: true,
      width: 'min(1100px,95vw)',
      height: 'auto',
      maxWidth: '95vw',
      maxHeight: '80vh',
    });
  }
}
