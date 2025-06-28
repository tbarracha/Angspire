import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Task {
  text: string;
  done?: boolean;
}

interface KanbanCard {
  text: string;
  id: number;
}

@Component({
  selector: 'app-todo-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full space-y-6">
      <div>
        <h2 class="text-2xl font-bold">To-Do & Kanban 📝</h2>
        <p class="text-sm text-muted">Organize your daily tasks and drag tasks across your Kanban workflow.</p>
      </div>
      <div class="flex flex-1 flex-col md:flex-row gap-8 h-0 min-h-0">
        <!-- Todo List -->
        <div class="flex-1 flex flex-col bg-card text-card-contrast rounded-xl shadow p-6 max-w-lg mx-auto md:mx-0 h-full min-h-0">
          <form (submit)="addTask(); $event.preventDefault()" class="flex gap-2 mb-4">
            <input
              [(ngModel)]="newTask"
              name="newTask"
              placeholder="Add a new task..."
              class="flex-1 px-3 py-2 rounded border border-input text-base bg-input-background text-input-text placeholder-muted"
              required
              autocomplete="off"
            />
            <button
              type="submit"
              class="px-4 py-2 rounded bg-primary text-primary-contrast font-bold hover:bg-primary/90 transition"
            >Add</button>
          </form>
          <ul class="flex-1 overflow-auto space-y-2">
            <li
              *ngFor="let task of tasks; let i = index"
              class="flex items-center gap-2 bg-highlight p-2 rounded"
              draggable="true"
              (dragstart)="onDragStartList(i, $event)"
            >
              <input
                type="checkbox"
                class="accent-success"
                [(ngModel)]="task.done"
              />
              <span
                class="flex-1"
                [ngClass]="{'line-through text-muted': task.done}"
              >{{ task.text }}</span>
              <button
                (click)="removeTask(i)"
                class="text-error text-lg hover:scale-125 transition"
                title="Delete"
                aria-label="Delete"
              >×</button>
              <span class="ml-2 cursor-move text-muted text-xs" title="Drag to Kanban">⤴</span>
            </li>
          </ul>
          <div *ngIf="!tasks.length" class="text-muted text-center py-6">No tasks yet. Add your first task above!</div>
        </div>

        <!-- Kanban Board -->
        <div class="flex-[2] flex flex-col bg-card text-card-contrast rounded-xl shadow p-6 overflow-x-auto h-full">
          <div class="flex flex-1 justify-between gap-4 h-full">
            <div
              *ngFor="let col of kanbanColumns; let colIdx = index"
              class="w-48 min-w-[180px] flex flex-col h-full rounded-lg"
              [ngClass]="{
                'bg-highlight/60 border-2 border-primary': dragOverColumn === colIdx,
                'bg-highlight/40': dragOverColumn !== colIdx
              }"
              (dragover)="onDragOverColumn(colIdx, $event)"
              (dragleave)="onDragLeaveColumn($event)"
              (drop)="onDropCard(colIdx, $event)"
            >
              <h4 class="font-semibold text-base mb-2 px-2 pt-2">{{ col.title }}</h4>
              <div class="flex-1 flex flex-col gap-2 p-2 min-h-[60px] overflow-auto">
                <div
                  *ngFor="let card of kanbanCards[col.key]; let cardIdx = index"
                  class="bg-white/80 text-foreground p-2 rounded shadow cursor-move flex items-center justify-between"
                  draggable="true"
                  (dragstart)="onDragStartKanban(col.key, cardIdx, $event)"
                >
                  <span>{{ card.text }}</span>
                  <button
                    class="text-error font-bold ml-2"
                    title="Remove"
                    (click)="removeKanbanCard(col.key, cardIdx)"
                  >×</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    input[type="checkbox"].accent-success:checked {
      accent-color: var(--success);
    }
  `]
})
export class TodoListPageComponent {
  tasks: Task[] = [];
  newTask: string = '';

  kanbanColumns = [
    { key: 'todo', title: 'To Do' },
    { key: 'doing', title: 'In Progress' },
    { key: 'done', title: 'Done' }
  ];
  kanbanCards: Record<string, KanbanCard[]> = {
    todo: [],
    doing: [],
    done: []
  };

  dragOverColumn: number | null = null;

  private nextCardId = 1;
  private dragData: { from: string; index: number } | null = null;

  addTask() {
    if (!this.newTask.trim()) return;
    this.tasks.push({ text: this.newTask.trim(), done: false });
    this.newTask = '';
  }

  removeTask(index: number) {
    this.tasks.splice(index, 1);
  }

  onDragStartList(taskIdx: number, event: DragEvent) {
    this.dragData = { from: 'list', index: taskIdx };
    event.dataTransfer?.setData('text/plain', '');
  }

  onDragStartKanban(colKey: string, cardIdx: number, event: DragEvent) {
    this.dragData = { from: colKey, index: cardIdx };
    event.dataTransfer?.setData('text/plain', '');
  }

  onDragOverColumn(colIdx: number, event: DragEvent) {
    event.preventDefault();
    this.dragOverColumn = colIdx;
  }

  onDragLeaveColumn(event: DragEvent) {
    this.dragOverColumn = null;
  }

  onDropCard(colIdx: number, event: DragEvent) {
    event.preventDefault();
    const colKey = this.kanbanColumns[colIdx].key;
    if (this.dragData) {
      if (this.dragData.from === 'list') {
        const task = this.tasks[this.dragData.index];
        if (task) {
          this.kanbanCards[colKey].push({ text: task.text, id: this.nextCardId++ });
          this.tasks.splice(this.dragData.index, 1);
        }
      } else {
        const fromKey = this.dragData.from;
        const cardArr = this.kanbanCards[fromKey];
        const card = cardArr?.[this.dragData.index];
        if (card) {
          cardArr.splice(this.dragData.index, 1);
          this.kanbanCards[colKey].push(card);
        }
      }
    }
    this.dragData = null;
    this.dragOverColumn = null;
  }

  removeKanbanCard(colKey: string, idx: number) {
    this.kanbanCards[colKey].splice(idx, 1);
  }
}
