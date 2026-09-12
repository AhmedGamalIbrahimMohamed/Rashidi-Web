import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { CategoryService } from './core/services/category.service';
import { ContentService } from './core/services/content.service';
import { I18nService } from './core/services/i18n.service';
import { MotionService } from './core/services/motion.service';
import { FooterComponent } from './layout/footer/footer.component';
import { HeaderComponent } from './layout/header/header.component';
import { IntroComponent } from './layout/intro/intro.component';

const INTRO_SEEN_KEY = 'rashidi.intro_seen';

/**
 * Application shell.
 *
 * Holds the intro overlay, the public chrome, and the two bootstrap fetches
 * (site copy and categories) that almost every page needs. The admin area
 * renders without this chrome — it swaps in its own shell at /admin.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, IntroComponent],
  template: `
    @if (showIntro()) {
      <app-intro (finished)="onIntroFinished()" />
    }

    <a class="skip-link" href="#main">Skip to content</a>

    @if (!isAdminRoute()) {
      <app-header />
    }

    <main id="main" class="main" [class.main--admin]="isAdminRoute()">
      <router-outlet />
    </main>

    @if (!isAdminRoute()) {
      <app-footer />
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      min-height: 100dvh;
    }

    .main {
      flex: 1;
      /* The header is fixed, so public pages need the offset. Each page's first
         section can cancel it with a negative margin when it is full-bleed. */
      padding-top: var(--header-h);
    }

    .main--admin {
      padding-top: 0;
    }
  `,
})
export class App {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly content = inject(ContentService);
  private readonly categories = inject(CategoryService);
  private readonly motion = inject(MotionService);
  protected readonly i18n = inject(I18nService);

  protected readonly showIntro = signal(this.shouldShowIntro());
  protected readonly isAdminRoute = signal(this.document.location?.pathname.startsWith('/admin') ?? false);

  constructor() {
    // Clear the pre-Angular boot overlay from index.html as soon as the shell
    // has painted. This belongs to the shell, not to the intro screen: the
    // intro only runs on the home page, so leaving the removal there would
    // strand every deep link behind a permanent spinner.
    afterNextRender(() => this.document.getElementById('boot')?.remove());

    // Bootstrap data. Both are cached in their services, fail soft, and are
    // needed by the header, footer and home page alike.
    this.content.load().subscribe({ error: () => undefined });
    this.categories.load().subscribe({ error: () => undefined });

    // Released on NavigationStart, before the incoming page's components exist —
    // killing on NavigationEnd risks destroying triggers the new page has
    // already registered. ScrollTrigger caches element positions, so leaving
    // the old page's triggers alive would have them measuring the new layout.
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => this.motion.killAll());

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.isAdminRoute.set((event as NavigationEnd).urlAfterRedirects.startsWith('/admin'));
    });

    // A language switch re-flows everything (different script, different
    // metrics), so measured scroll positions have to be recomputed.
    effect(() => {
      this.i18n.locale();
      queueMicrotask(() => this.motion.refresh());
    });
  }

  protected onIntroFinished(): void {
    this.showIntro.set(false);
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // Storage blocked — the intro simply plays again next navigation-less load.
    }
  }

  /**
   * Once per session, and never in front of the admin area or a deep link
   * someone was sent — a visitor opening a specific machine should land on it.
   */
  private shouldShowIntro(): boolean {
    const path = this.document.location?.pathname ?? '/';
    if (path.startsWith('/admin')) return false;
    if (path !== '/' && path !== '') return false;

    try {
      return sessionStorage.getItem(INTRO_SEEN_KEY) !== '1';
    } catch {
      return true;
    }
  }
}
