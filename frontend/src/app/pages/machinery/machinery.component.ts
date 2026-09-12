import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CategoryService } from '../../core/services/category.service';
import { ContentService } from '../../core/services/content.service';
import { I18nService } from '../../core/services/i18n.service';
import { MACHINE_STATUSES, Machine, MachineQuery, MachineStatus } from '../../core/models/machine.model';
import { MachineService } from '../../core/services/machine.service';
import { SeoService } from '../../core/services/seo.service';
import { MachineCardComponent } from '../../shared/components/machine-card/machine-card.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { environment } from '../../../environments/environment';

type SortKey = NonNullable<MachineQuery['sort']>;

/**
 * Catalogue.
 *
 * Filter state lives in the URL, not in component fields — so a filtered view
 * can be bookmarked, shared with a customer, and survives the back button.
 * The component reacts to query-param changes rather than to its own controls.
 */
@Component({
  selector: 'app-machinery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MachineCardComponent, RevealDirective],
  templateUrl: './machinery.component.html',
  styleUrl: './machinery.component.scss',
})
export class MachineryComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly categoryService = inject(CategoryService);
  private readonly machines = inject(MachineService);
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly items = signal<Machine[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly page = signal(1);

  // Bound to the controls. The search box writes through a debounce; the
  // selects navigate immediately.
  protected searchTerm = '';
  protected readonly activeCategory = signal<string>('');
  protected readonly activeStatus = signal<string>('');
  protected readonly activeSort = signal<SortKey>('manual');

  protected readonly statuses = MACHINE_STATUSES;
  protected readonly sortKeys: SortKey[] = ['manual', 'newest', 'oldest', 'name', 'popular'];

  protected readonly hasFilters = computed(
    () =>
      Boolean(this.activeCategory() || this.activeStatus() || this.searchTerm) ||
      this.activeSort() !== 'manual',
  );

  /** Page numbers to render, windowed around the current page. */
  protected readonly pageNumbers = computed(() => {
    const current = this.page();
    const last = this.totalPages();
    const span = 2;

    const from = Math.max(1, Math.min(current - span, last - span * 2));
    const to = Math.min(last, Math.max(current + span, span * 2 + 1));

    const pages: number[] = [];
    for (let index = from; index <= to; index += 1) pages.push(index);
    return pages;
  });

  private readonly search$ = new Subject<string>();

  constructor() {
    // Single source of truth: whatever is in the URL is what we fetch.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.searchTerm = params.get('q') ?? '';
      this.activeCategory.set(params.get('category') ?? '');
      this.activeStatus.set(params.get('status') ?? '');
      this.activeSort.set((params.get('sort') as SortKey) ?? 'manual');
      this.page.set(Math.max(1, Number(params.get('page')) || 1));
      this.fetch();
    });

    this.search$
      .pipe(debounceTime(320), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => this.patchParams({ q: term || null, page: null }));

    effect(() => {
      const meta = this.content.siteMeta();
      this.seo.apply({
        title: this.i18n.dict().machinery.title,
        description: SeoService.truncate(
          `${this.i18n.dict().machinery.lead} ${meta?.defaultDescription ?? ''}`,
        ),
        path: '/machines',
        type: 'website',
      });
    });
  }

  private fetch(): void {
    this.loading.set(true);
    this.failed.set(false);

    this.machines
      .list({
        page: this.page(),
        pageSize: environment.ui.machinesPerPage,
        search: this.searchTerm || undefined,
        category: this.activeCategory() || undefined,
        status: (this.activeStatus() as MachineStatus) || undefined,
        sort: this.activeSort(),
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
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }

  protected onSearchInput(value: string): void {
    this.searchTerm = value;
    this.search$.next(value);
  }

  protected selectCategory(slug: string): void {
    this.patchParams({ category: slug || null, page: null });
  }

  protected selectStatus(status: string): void {
    this.patchParams({ status: status || null, page: null });
  }

  protected selectSort(sort: string): void {
    this.patchParams({ sort: sort === 'manual' ? null : sort, page: null });
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.patchParams({ page: page === 1 ? null : page });
    // Filters sit above the grid; returning to them keeps the context visible.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected clearFilters(): void {
    this.searchTerm = '';
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  protected retry(): void {
    this.fetch();
  }

  /** Merges into the existing query string; `null` removes a key. */
  private patchParams(params: Record<string, string | number | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

}
