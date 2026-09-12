import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ContentService } from '../../core/services/content.service';
import { I18nService } from '../../core/services/i18n.service';
import { Machine, MachineImage, MachineSpecification } from '../../core/models/machine.model';
import { MachineService } from '../../core/services/machine.service';
import { SeoService } from '../../core/services/seo.service';
import { MachineCardComponent } from '../../shared/components/machine-card/machine-card.component';
import { MachineImageComponent } from '../../shared/components/machine-image/machine-image.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

interface SpecGroup {
  title: string;
  rows: MachineSpecification[];
}

interface MetaRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-machine-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MachineImageComponent,
    StatusBadgeComponent,
    MachineCardComponent,
    RevealDirective,
  ],
  templateUrl: './machine-detail.component.html',
  styleUrl: './machine-detail.component.scss',
})
export class MachineDetailComponent {
  protected readonly i18n = inject(I18nService);
  private readonly machines = inject(MachineService);
  private readonly content = inject(ContentService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  protected readonly machine = signal<Machine | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);

  /** Index into `images()` currently shown in the main frame. */
  protected readonly activeIndex = signal(0);

  protected readonly images = computed<MachineImage[]>(() => this.machine()?.images ?? []);
  protected readonly activeImage = computed(() => this.images()[this.activeIndex()] ?? null);

  protected readonly name = computed(() => this.i18n.localize(this.machine(), 'name'));
  protected readonly summary = computed(() => this.i18n.localize(this.machine(), 'shortDescription'));
  protected readonly description = computed(() => this.i18n.localize(this.machine(), 'description'));
  protected readonly technical = computed(() => this.i18n.localize(this.machine(), 'technicalInfo'));

  /** Description split into paragraphs on blank lines. */
  protected readonly paragraphs = computed(() =>
    this.description()
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
  );

  protected readonly categoryName = computed(() => {
    const category = this.machine()?.category;
    return category ? this.i18n.localize(category, 'name') : '';
  });

  /** Commercial facts, skipping anything the admin left empty. */
  protected readonly metaRows = computed<MetaRow[]>(() => {
    const machine = this.machine();
    if (!machine) return [];

    const dictionary = this.i18n.dict().machine;
    const rows: MetaRow[] = [];

    if (this.categoryName()) rows.push({ label: dictionary.category, value: this.categoryName() });
    if (machine.brand) rows.push({ label: dictionary.brand, value: machine.brand });
    if (machine.modelNumber) rows.push({ label: dictionary.model, value: machine.modelNumber });
    if (machine.manufactureYear) {
      rows.push({ label: dictionary.year, value: this.i18n.formatYear(machine.manufactureYear) });
    }
    if (machine.countryOfOrigin) {
      rows.push({ label: dictionary.origin, value: machine.countryOfOrigin });
    }
    if (machine.condition) rows.push({ label: dictionary.condition, value: machine.condition });

    return rows;
  });

  /**
   * Specifications bucketed by their group label, preserving the admin's
   * ordering. Ungrouped rows collect under a single unnamed section so a
   * machine entered without groups still renders as one clean table.
   */
  protected readonly specGroups = computed<SpecGroup[]>(() => {
    const specs = this.machine()?.specifications ?? [];
    const groups = new Map<string, SpecGroup>();

    for (const spec of specs) {
      const title = this.i18n.localize(spec, 'group');
      const key = title || '__ungrouped';
      if (!groups.has(key)) groups.set(key, { title, rows: [] });
      groups.get(key)?.rows.push(spec);
    }

    return [...groups.values()];
  });

  protected readonly documents = computed(() => this.machine()?.documents ?? []);
  protected readonly related = computed(() => this.machine()?.related ?? []);

  protected readonly contact = this.content.contact;

  /** Pre-fills the contact form with this machine's name. */

  protected readonly enquiryParams = computed(() => ({
    machine: this.machine()?.id ?? '',
    subject: `${this.i18n.dict().machine.enquirySubject} ${this.name()}`,
  }));

  /** WhatsApp deep link with a prefilled message about this machine. */
  protected readonly whatsappLink = computed(() => {
    const number = (this.contact()?.whatsapp ?? '').replace(/[^\d]/g, '');
    if (!number) return null;

    const text = encodeURIComponent(
      `${this.i18n.dict().machine.enquirySubject}: ${this.name()} — ${location.origin}/machines/${
        this.machine()?.slug ?? ''
      }`,
    );
    return `https://wa.me/${number}?text=${text}`;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.loading.set(true);
          this.notFound.set(false);
          this.activeIndex.set(0);
          return this.machines.get(params.get('slug') ?? '');
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (machine) => {
          this.machine.set(machine);
          this.loading.set(false);
        },
        error: () => {
          this.machine.set(null);
          this.notFound.set(true);
          this.loading.set(false);
        },
      });

    effect(() => {
      const machine = this.machine();
      if (!machine) return;

      const metaTitle = this.i18n.localize(machine, 'metaTitle') || this.name();
      const metaDescription =
        this.i18n.localize(machine, 'metaDescription') || this.summary() || this.description();
      const image = MachineService.mainImage(machine);

      this.seo.apply({
        title: metaTitle,
        description: SeoService.truncate(metaDescription),
        image: image?.url,
        path: `/machines/${machine.slug}`,
        type: 'product',
        structuredData: this.seo.machineSchema({
          name: this.name(),
          description: SeoService.truncate(metaDescription, 400),
          image: image?.url,
          brand: machine.brand,
          sku: machine.modelNumber ?? undefined,
          available: machine.status !== 'SOLD',
          path: `/machines/${machine.slug}`,
        }),
      });
    });
  }

  protected selectImage(index: number): void {
    this.activeIndex.set(index);
  }

  protected step(delta: number): void {
    const count = this.images().length;
    if (count < 2) return;
    this.activeIndex.update((current) => (current + delta + count) % count);
  }


  /** Bytes → a short human label for the document list. */
  protected formatSize(bytes: number | null): string {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${this.i18n.formatNumber(Math.round(mb * 10) / 10)} MB`;
    return `${this.i18n.formatNumber(Math.round(bytes / 1024))} KB`;
  }
}
