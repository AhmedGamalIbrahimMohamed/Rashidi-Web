import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../core/services/i18n.service';
import { MotionService } from '../../core/services/motion.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';

/**
 * Intro / loading screen.
 *
 * Roughly 1.6 seconds, then it clips away upward. Three rules shaped it:
 *
 *   - it must never gate the site — the timeline is fire-and-forget and the
 *     home page is already mounted behind it;
 *   - it runs once per browser session, so moving between pages never replays
 *     it and a returning visitor is not made to wait again;
 *   - under prefers-reduced-motion it resolves almost immediately.
 */
@Component({
  selector: 'app-intro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogoComponent],
  template: `
    <div class="intro" #root dir="ltr" role="status" [attr.aria-label]="copy().loading">
      <div class="intro__grid" aria-hidden="true"></div>
      <div class="intro__glow" aria-hidden="true"></div>

      <div class="intro__stack">
        <div class="intro__logo" #logo>
          <app-logo variant="mark" [eager]="true" locale="en" />
        </div>

        <p class="intro__tagline" #tagline>{{ copy().tagline }}</p>

        <div class="intro__bar" #bar>
          <span class="intro__fill" #fill></span>
        </div>
      </div>

      <span class="intro__corner intro__corner--tl" aria-hidden="true"></span>
      <span class="intro__corner intro__corner--br" aria-hidden="true"></span>
    </div>
  `,
  styles: `
    .intro {
      position: fixed;
      inset: 0;
      z-index: 9000;
      display: grid;
      place-items: center;
      background: var(--ink-1000);
      overflow: hidden;
      /* Animated by GSAP; declared here so the first paint is already correct. */
      clip-path: inset(0 0 0 0);
    }

    .intro__grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(var(--line) 1px, transparent 1px),
        linear-gradient(90deg, var(--line) 1px, transparent 1px);
      background-size: 64px 64px;
      mask-image: radial-gradient(circle at 50% 50%, #000 5%, transparent 62%);
      -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 5%, transparent 62%);
    }

    .intro__glow {
      position: absolute;
      width: min(70vw, 620px);
      aspect-ratio: 1;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0, 123, 255, 0.22), transparent 66%);
      filter: blur(50px);
    }

    .intro__stack {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.6rem;
      padding-inline: var(--gutter);
      text-align: center;
    }

    /* The same mark + wordmark the header, footer and admin use, only scaled up
       for the splash. Sizes stay in the footer's proportion (name ~ half the
       mark's height, sub ~ a quarter) so the lockup keeps its balance, and the
       wordmark is forced on at mobile widths where the chrome hides it. */
    .intro__logo {
      --logo-h: clamp(58px, 10vw, 96px);
      --logo-name-size: clamp(1.75rem, 5.4vw, 3rem);
      --logo-sub-size: clamp(0.6875rem, 1.9vw, 1rem);
      --logo-gap: clamp(0.85rem, 2vw, 1.35rem);
      --logo-text-mobile: flex;
    }

    .intro__tagline {
      font-family: var(--font-mono);
      font-size: clamp(0.625rem, 1.6vw, 0.75rem);
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: var(--text-mute);
      margin: 0;
    }

    .intro__bar {
      position: relative;
      width: min(240px, 54vw);
      height: 2px;
      background: var(--line-strong);
      overflow: hidden;
    }

    .intro__fill {
      position: absolute;
      inset-block: 0;
      inset-inline-start: 0;
      width: 100%;
      transform-origin: calc((1 - var(--flip)) * 50%) 50%;
      transform: scaleX(0);
      background: linear-gradient(to right, var(--blue), var(--blue-bright));
      box-shadow: 0 0 12px var(--blue-glow);
    }

    /* Corner ticks — the technical frame device used across the site. */
    .intro__corner {
      position: absolute;
      width: 26px;
      height: 26px;
      border: 1px solid rgba(0, 123, 255, 0.55);
      opacity: 0;
    }

    .intro__corner--tl {
      top: 28px;
      inset-inline-start: 28px;
      border-inline-end: 0;
      border-bottom: 0;
    }

    .intro__corner--br {
      bottom: 28px;
      inset-inline-end: 28px;
      border-inline-start: 0;
      border-top: 0;
    }
  `,
})
export class IntroComponent implements AfterViewInit, OnDestroy {
  private readonly i18n = inject(I18nService);
  private readonly motion = inject(MotionService);
  private readonly document = inject(DOCUMENT);

  /**
   * The splash is always English, whatever language the site is in: it paints
   * before the visitor has made any choice, and the wordmark reads as the
   * brand's Latin lockup. The panel is an LTR island (dir="ltr" on the root)
   * so the progress bar still fills left-to-right inside an RTL document.
   */
  protected readonly copy = computed(() => this.i18n.dictFor('en').intro);

  /** Emitted when the overlay has finished clearing. */
  readonly finished = output<void>();

  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');
  private readonly logo = viewChild.required<ElementRef<HTMLElement>>('logo');
  private readonly tagline = viewChild.required<ElementRef<HTMLElement>>('tagline');
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly fill = viewChild.required<ElementRef<HTMLElement>>('fill');

  private timeline?: gsap.core.Timeline;

  ngAfterViewInit(): void {
    this.document.body.classList.add('is-locked');


    if (this.motion.prefersReducedMotion) {
      window.setTimeout(() => this.done(), 260);
      return;
    }

    const total = environment.ui.introDurationMs / 1000;

    this.timeline = this.motion.timeline({ onComplete: () => this.done() });

    this.timeline
      .from(this.logo().nativeElement, {
        opacity: 0,
        scale: 0.88,
        filter: 'blur(10px)',
        duration: total * 0.42,
        ease: 'power3.out',
      })
      .from(
        this.tagline().nativeElement,
        { opacity: 0, y: 12, duration: total * 0.3 },
        `-=${total * 0.24}`,
      )
      .from(
        this.root().nativeElement.querySelectorAll('.intro__corner'),
        { opacity: 0, scale: 0.4, duration: total * 0.3, stagger: 0.06 },
        '<',
      )
      .to(this.root().nativeElement.querySelectorAll('.intro__corner'), { opacity: 1, duration: 0.01 }, '<')
      .to(
        this.fill().nativeElement,
        { scaleX: 1, duration: total * 0.62, ease: 'power2.inOut' },
        `-=${total * 0.38}`,
      )
      // The whole panel lifts away rather than fading, so the home page is
      // revealed by a wipe instead of a cross-dissolve.
      .to(
        [this.logo().nativeElement, this.tagline().nativeElement, this.bar().nativeElement],
        { opacity: 0, y: -18, duration: total * 0.26, ease: 'power2.in' },
        `+=${total * 0.06}`,
      )
      .to(
        this.root().nativeElement,
        { clipPath: 'inset(0 0 100% 0)', duration: total * 0.4, ease: 'power3.inOut' },
        `-=${total * 0.14}`,
      );
  }

  ngOnDestroy(): void {
    this.timeline?.kill();
    this.document.body.classList.remove('is-locked');
  }

  private done(): void {
    this.document.body.classList.remove('is-locked');
    this.finished.emit();
  }
}
