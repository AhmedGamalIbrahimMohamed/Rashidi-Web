import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'rashidi.theme';
/** Must match the value written by the inline boot script in index.html. */
const ATTRIBUTE = 'data-theme';

/**
 * How long the cross-theme colour transition runs. Shared so that expensive
 * work — rebuilding the WebGL hero, decoding a swapped image — can be kept
 * out of the window where the browser is busy repainting every surface.
 * Must match the duration in the `.theme-switching` rule in styles.scss.
 */
export const THEME_TRANSITION_MS = 320;

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
  private readonly _switching = signal(false);
  private settleTimer = 0;

  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this._theme() === 'dark');
  /** True while the colour transition is still repainting. */
  readonly switching = this._switching.asReadonly();
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

    const commit = () => {
      root.setAttribute(ATTRIBUTE, theme);

      // Colours the browser chrome on mobile — without it the address bar keeps
      // the old theme and the page looks like it is in a frame.
      this.document
        .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute('content', THEME_COLOR[theme]);
    };

    /*
     * The cross-fade is done by the compositor, not by property transitions.
     *
     * The old approach put a `transition` on every element via `*`, which meant
     * the browser interpolating five colour properties across the whole DOM on
     * every frame — measured at ~1.2s of blocked main thread on a 432-element
     * page. A view transition instead snapshots the page as a texture and fades
     * between the two, which costs the same regardless of how many elements
     * there are.
     */
    const startViewTransition = (
      this.document as Document & {
        startViewTransition?: (callback: () => void) => { finished: Promise<void> };
      }
    ).startViewTransition;

    if (!animate || !view || typeof startViewTransition !== 'function' || this.reducedMotion()) {
      commit();
      return;
    }

    this._switching.set(true);
    startViewTransition
      .call(this.document, commit)
      .finished.finally(() => this._switching.set(false));
  }

  private reducedMotion(): boolean {
    return this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
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
