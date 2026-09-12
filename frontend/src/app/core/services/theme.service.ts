import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'rashidi.theme';
/** Must match the value written by the inline boot script in index.html. */
const ATTRIBUTE = 'data-theme';

const THEME_COLOR: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#0b1220',
};

/**
 * Light/dark theme state.
 *
 * Light is the default: the site is a sales catalogue first, and machinery
 * photographs read better on a white ground. The visitor's choice is
 * remembered; system preference is deliberately *not* consulted, so a first
 * visit always looks the way the brand sheet specifies.
 *
 * The same decision is duplicated in a tiny inline script in index.html, which
 * sets `data-theme` before the first paint. Without it a returning dark-mode
 * visitor gets a white flash while Angular boots.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly _theme = signal<Theme>(this.readInitial());

  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this._theme() === 'dark');
  /** The theme the toggle would move to — there are exactly two. */
  readonly alternate = computed<Theme>(() => (this._theme() === 'dark' ? 'light' : 'dark'));

  constructor() {
    // The boot script has usually done this already; re-applying keeps the
    // service authoritative if it was blocked or the app is embedded.
    this.apply(this._theme(), false);
  }

  set(theme: Theme): void {
    if (theme === this._theme()) return;
    this._theme.set(theme);
    this.persist(theme);
    this.apply(theme, true);
  }

  toggle(): void {
    this.set(this.alternate());
  }

  // --- internals ------------------------------------------------------------

  private apply(theme: Theme, animate: boolean): void {
    const root = this.document.documentElement;
    const view = this.document.defaultView;

    if (animate && view) {
      root.classList.add('theme-switching');
      view.setTimeout(() => root.classList.remove('theme-switching'), 320);
    }

    root.setAttribute(ATTRIBUTE, theme);

    // Colours the browser chrome on mobile — without it the address bar keeps
    // the old theme and the page looks like it is in a frame.
    this.document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLOR[theme]);
  }

  private readInitial(): Theme {
    const stored = this.safeRead();
    if (stored === 'light' || stored === 'dark') return stored;

    // Whatever the boot script decided, so the service and the DOM agree.
    const attribute = this.document.documentElement.getAttribute(ATTRIBUTE);
    return attribute === 'dark' ? 'dark' : 'light';
  }

  private safeRead(): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private persist(theme: Theme): void {
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private mode — the choice simply does not survive a reload.
    }
  }
}
