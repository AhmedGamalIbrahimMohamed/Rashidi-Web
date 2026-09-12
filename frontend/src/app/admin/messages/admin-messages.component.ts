import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiFailure } from '../../core/models/api.model';
import { ContactMessage, MessageStatus } from '../../core/models/auth.model';
import { ContactService } from '../../core/services/contact.service';
import { I18nService } from '../../core/services/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';

const STATUSES: MessageStatus[] = ['NEW', 'READ', 'REPLIED', 'ARCHIVED'];

@Component({
  selector: 'app-admin-messages',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ConfirmDialogComponent],
  templateUrl: './admin-messages.component.html',
  styleUrl: './admin-messages.component.scss',
})
export class AdminMessagesComponent {
  protected readonly i18n = inject(I18nService);
  private readonly contact = inject(ContactService);
  private readonly toasts = inject(ToastService);

  protected readonly statuses = STATUSES;

  protected readonly items = signal<ContactMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);

  protected search = '';
  protected readonly statusFilter = signal<string>('');

  /** The message shown in the reading pane. */
  protected readonly selected = signal<ContactMessage | null>(null);
  protected readonly pendingDelete = signal<ContactMessage | null>(null);
  protected readonly deleting = signal(false);

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });

    this.load();
  }

  protected load(): void {
    this.loading.set(true);

    this.contact
      .list({
        page: this.page(),
        pageSize: 20,
        search: this.search || undefined,
        status: (this.statusFilter() as MessageStatus) || undefined,
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.meta.total);
          this.totalPages.set(result.meta.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.loading.set(false);
        },
      });
  }

  protected onSearch(value: string): void {
    this.search = value;
    this.search$.next(value);
  }

  protected onStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.load();
  }

  protected changePage(delta: number): void {
    const next = this.page() + delta;
    if (next < 1 || next > this.totalPages()) return;
    this.page.set(next);
    this.load();
  }

  /**
   * Opening a message marks it read on the server. The row is updated locally
   * from the response rather than by refetching the whole page.
   */
  protected open(message: ContactMessage): void {
    this.selected.set(message);

    if (message.status !== 'NEW') return;

    this.contact.get(message.id).subscribe({
      next: (fresh) => {
        this.selected.set(fresh);
        this.items.update((list) =>
          list.map((item) => (item.id === fresh.id ? { ...item, status: fresh.status } : item)),
        );
      },
      error: () => undefined,
    });
  }

  protected setStatus(message: ContactMessage, status: MessageStatus): void {
    this.contact.setStatus(message.id, status).subscribe({
      next: (updated) => {
        this.items.update((list) =>
          list.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
        );
        if (this.selected()?.id === updated.id) {
          this.selected.update((current) => (current ? { ...current, status: updated.status } : current));
        }
      },
      error: (failure: ApiFailure) => this.toasts.error(failure.message),
    });
  }

  protected confirmDelete(): void {
    const message = this.pendingDelete();
    if (!message) return;

    this.deleting.set(true);
    this.contact.remove(message.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((item) => item.id !== message.id));
        if (this.selected()?.id === message.id) this.selected.set(null);
        this.total.update((count) => Math.max(0, count - 1));
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toasts.success(this.i18n.dict().admin.messages.deleted);
      },
      error: (failure: ApiFailure) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toasts.error(failure.message);
      },
    });
  }

  /** `mailto:` with the original subject, so replies thread naturally. */
  protected replyHref(message: ContactMessage): string {
    return `mailto:${message.email}?subject=${encodeURIComponent('Re: ' + message.subject)}`;
  }

  protected statusLabel(status: MessageStatus): string {
    return this.i18n.dict().admin.messages.statuses[status];
  }
}
