import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { I18nService } from '../../core/services/i18n.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';

/**
 * Site header.
 *
 * Sticky and translucent; it gains a solid ground and a hairline once the page
 * scrolls, so the logo never sits on top of a bright machine photograph.
 *
 * The mobile menu is a full-screen panel driven by CSS transitions rather than
 * GSAP — it opens and closes far more often than anything else on the site, and
 * a transition the compositor can run on its own stays smooth on low-end phones.
 */
@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, LogoComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnDestroy {
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  protected readonly links = computed(() => {
    const dictionary = this.i18n.dict();
    return [
      { path: '/', label: dictionary.nav.home, exact: true },
      { path: '/machines', label: dictionary.nav.machinery, exact: false },
      { path: '/about', label: dictionary.nav.about, exact: false },
    ];
  });

  private readonly routerSub: Subscription;

  constructor() {
    // Close the mobile panel on navigation, including back/forward.
    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.closeMenu());

    // Scroll lock belongs to the menu's open state, not to the click handler —
    // this way it is released however the menu closes.
    effect(() => {
      this.document.body.classList.toggle('is-locked', this.menuOpen());
    });
  }

  ngOnDestroy(): void {
    this.routerSub.unsubscribe();
    this.document.body.classList.remove('is-locked');
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeMenu();
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected switchLanguage(): void {
    this.i18n.toggle();
    this.closeMenu();
  }
}
