import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { I18nService } from '../../core/services/i18n.service';
import { Machine } from '../../core/models/machine.model';
import { MachineService } from '../../core/services/machine.service';
import { MotionService } from '../../core/services/motion.service';
import { SeoService } from '../../core/services/seo.service';
import { HeroSceneComponent } from '../../shared/components/hero-scene/hero-scene.component';
import { MachineCardComponent } from '../../shared/components/machine-card/machine-card.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HeroSceneComponent, MachineCardComponent, RevealDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly machines = inject(MachineService);
  private readonly motion = inject(MotionService);
  private readonly seo = inject(SeoService);

  private readonly heroRef = viewChild.required<ElementRef<HTMLElement>>('heroRoot');

  protected readonly hero = this.content.hero;
  protected readonly stats = this.content.stats;
  protected readonly capabilities = this.content.capabilities;

  protected readonly featured = signal<Machine[]>([]);
  protected readonly loadingFeatured = signal(true);

  protected readonly headlineOne = computed(
    () => this.hero()?.headlineLine1 ?? 'Industrial Machinery.',
  );
  protected readonly headlineTwo = computed(
    () => this.hero()?.headlineLine2 ?? 'Global Solutions.',
  );

  /**
   * Arabic is cursive: every letter's shape depends on its neighbours, so
   * wrapping each character in its own element breaks the joins and renders
   * the word as disconnected glyphs. The per-letter animation is therefore
   * Latin-only — Arabic reveals the line as a single block instead.
   */
  protected readonly splitHeadline = computed(() => !this.i18n.isRtl());

  /** Characters of line one, only when splitting is safe. */
  protected readonly headlineChars = computed(() =>
    this.splitHeadline() ? Array.from(this.headlineOne()) : [],
  );

  private timeline?: gsap.core.Timeline;

  constructor() {
    this.loadFeatured();

    // Title and description come from editable content, so they have to be
    // reapplied when either the content or the language resolves.
    effect(() => {
      const meta = this.content.siteMeta();
      const contact = this.content.contact();
      const social = this.content.social();

      this.seo.apply({
        title: meta?.defaultTitle ?? 'Rashidi Import & Export — Industrial & Plastic Machinery',
        description: SeoService.truncate(
          meta?.defaultDescription ?? this.hero()?.description ?? '',
        ),
        path: '/',
        type: 'website',
        structuredData: this.seo.organisationSchema({
          phone: contact?.phone,
          email: contact?.email,
          address: [contact?.addressLine1, contact?.addressLine2].filter(Boolean).join(', '),
          sameAs: social.map((item) => item.url ?? '').filter(Boolean),
        }),
      });
    });
  }

  ngAfterViewInit(): void {
    this.playHeroEntrance();
  }

  ngOnDestroy(): void {
    this.timeline?.kill();
  }

  private loadFeatured(): void {
    this.machines.list({ featured: true, pageSize: 6, sort: 'manual' }).subscribe({
      next: (page) => {
        // Fall back to the newest machines if nothing has been flagged as
        // featured yet — the section must never render empty on a live site.
        if (page.items.length) {
          this.featured.set(page.items);
          this.loadingFeatured.set(false);
          return;
        }
        this.machines.list({ pageSize: 6, sort: 'newest' }).subscribe({
          next: (fallback) => {
            this.featured.set(fallback.items);
            this.loadingFeatured.set(false);
          },
          error: () => this.loadingFeatured.set(false),
        });
      },
      error: () => this.loadingFeatured.set(false),
    });
  }

  /**
   * Hero entrance. Characters rise in two overlapping waves, then the
   * supporting copy and CTAs follow. Skipped entirely under reduced motion —
   * the elements are visible by default and the timeline only animates *from*
   * a hidden state, so nothing is left stranded.
   */
  private playHeroEntrance(): void {
    if (this.motion.prefersReducedMotion) return;

    const root = this.heroRef().nativeElement;
    const chars = root.querySelectorAll('.hero__char');
    const blocks = root.querySelectorAll('.hero__block');
    const rest = root.querySelectorAll('[data-hero-stagger]');

    this.timeline = this.motion.timeline({ delay: 0.15 });

    this.timeline.from(root.querySelectorAll('.hero__eyebrow'), {
      opacity: 0,
      y: 14,
      duration: 0.6,
    });

    // Latin line one rises letter by letter…
    if (chars.length) {
      this.timeline.from(
        chars,
        {
          opacity: 0,
          yPercent: 110,
          rotateX: -45,
          duration: 0.85,
          stagger: { each: 0.018, from: 'start' },
          ease: 'power4.out',
        },
        '-=0.35',
      );
    }

    // …and whole lines wipe up behind their overflow-hidden parent.
    this.timeline.from(
      blocks,
      { yPercent: 115, opacity: 0, duration: 0.9, stagger: 0.1, ease: 'power4.out' },
      chars.length ? '-=0.62' : '-=0.35',
    );

    this.timeline
      .from(rest, { opacity: 0, y: 20, duration: 0.7, stagger: 0.09 }, '-=0.55')
      .from(
        root.querySelector('.hero__visual'),
        { opacity: 0, scale: 0.92, duration: 1.2, ease: 'power2.out' },
        '-=1.0',
      );
  }
}
