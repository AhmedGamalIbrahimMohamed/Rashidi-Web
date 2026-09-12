import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/services/i18n.service';
import { MACHINE_STATUSES, Machine, MachineStatus } from '../../core/models/machine.model';
import { MachineService } from '../../core/services/machine.service';
import { ToastService } from '../../core/services/toast.service';
import { MachineImageComponent } from '../../shared/components/machine-image/machine-image.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';

@Component({
  selector: 'app-admin-machines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MachineImageComponent, ConfirmDialogComponent],
  templateUrl: './admin-machines.component.html',
  styleUrl: './admin-machines.component.scss',
})
export class AdminMachinesComponent {
  protected readonly i18n = inject(I18nService);
  private readonly machines = inject(MachineService);
  private readonly toasts = inject(ToastService);

  protected readonly items = signal<Machine[]>([]);
  protected readonly loading = signal(true);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);

  protected search = '';
  protected readonly statusFilter = signal<string>('');
  protected readonly statuses = MACHINE_STATUSES;

  /** The machine queued for deletion; drives the confirm dialog. */
  protected readonly pendingDelete = signal<Machine | null>(null);
  protected readonly deleting = signal(false);

  /** Ids currently mid-request, so a row can show a busy state. */
  protected readonly busyIds = signal<Set<string>>(new Set());

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

    this.machines
      .list({
        page: this.page(),
        pageSize: 20,
        search: this.search || undefined,
        status: (this.statusFilter() as MachineStatus) || undefined,
        sort: 'manual',
        // The admin list must show drafts as well as live machines.
        includeUnpublished: true,
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

  /** Cycles Available → In stock → Sold → Available, straight from the row. */
  protected cycleStatus(machine: Machine): void {
    const order: MachineStatus[] = ['AVAILABLE', 'IN_STOCK', 'SOLD'];
    const next = order[(order.indexOf(machine.status) + 1) % order.length];

    this.setBusy(machine.id, true);
    this.machines.setStatus(machine.id, next).subscribe({
      next: (updated) => {
        this.items.update((list) =>
          list.map((item) => (item.id === machine.id ? { ...item, status: updated.status } : item)),
        );
        this.setBusy(machine.id, false);
        this.toasts.success(this.i18n.dict().admin.machines.statusChanged);
      },
      error: (failure: { message?: string }) => {
        this.setBusy(machine.id, false);
        this.toasts.error(failure.message ?? this.i18n.dict().common.error);
      },
    });
  }

  protected togglePublished(machine: Machine): void {
    this.setBusy(machine.id, true);
    this.machines.update(machine.id, { isPublished: !machine.isPublished }).subscribe({
      next: (updated) => {
        this.items.update((list) =>
          list.map((item) =>
            item.id === machine.id ? { ...item, isPublished: updated.isPublished } : item,
          ),
        );
        this.setBusy(machine.id, false);
        this.toasts.success(this.i18n.dict().admin.machines.saved);
      },
      error: (failure: { message?: string }) => {
        this.setBusy(machine.id, false);
        this.toasts.error(failure.message ?? this.i18n.dict().common.error);
      },
    });
  }

  protected confirmDelete(): void {
    const machine = this.pendingDelete();
    if (!machine) return;

    this.deleting.set(true);
    this.machines.remove(machine.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((item) => item.id !== machine.id));
        this.total.update((count) => Math.max(0, count - 1));
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toasts.success(this.i18n.dict().admin.machines.deleted);
      },
      error: (failure: { message?: string }) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toasts.error(failure.message ?? this.i18n.dict().common.error);
      },
    });
  }

  protected mainImage(machine: Machine) {
    return MachineService.mainImage(machine);
  }

  protected isBusy(id: string): boolean {
    return this.busyIds().has(id);
  }

  private setBusy(id: string, busy: boolean): void {
    this.busyIds.update((set) => {
      const next = new Set(set);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
