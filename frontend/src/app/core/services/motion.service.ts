import { DOCUMENT } from '@angular/common';
import { Injectable, NgZone, inject } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { I18nService } from './i18n.service';

export type RevealPreset = 'up' | 'fade' | 'left' | 'right' | 'scale' | 'clip';

export interface RevealOptions {
  preset?: RevealPreset;
  delay?: number;
  duration?: number;
  /** Distance in px for translate-based presets. */
  distance?: number;
  /** Per-item offset when revealing a group. */
  stagger?: number;
  /** Viewport position that triggers the reveal. */
  start?: string;
  /** Replay every time the element scrolls back into view. */
  repeat?: boolean;
}

/**
 * Central GSAP access.
 *
 * Two responsibilities that are easy to get wrong if every component does its
 * own thing: plugin registration happens exactly once, and every tween runs
 * outside Angular's zone so a 60fps animation does not trigger 60 change
 * detection cycles a second.
 *
 * Reduced-motion is honoured globally — when the visitor has asked for less
 * motion, elements are set to their final state immediately instead of being
 * animated, so nothing is ever left invisible.
 */
@Injectable({ providedIn: 'root' })
export class MotionService {
  private readonly zone = inject(NgZone);
  private readonly document = inject(DOCUMENT);
  private readonly i18n = inject(I18nService);

  private registered = false;

  readonly prefersReducedMotion: boolean;

  constructor() {
    const query = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.prefersReducedMotion = query?.matches ?? false;
    this.register();
  }

  private register(): void {
    if (this.registered || typeof window === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'power3.out', duration: 0.8 });
    this.registered = true;
  }

  /** Runs a callback outside Angular's zone and returns whatever it produces. */
  run<T>(work: () => T): T {
    return this.zone.runOutsideAngular(work);
  }

  get gsap(): typeof gsap {
    return gsap;
  }

  get scrollTrigger(): typeof ScrollTrigger {
    return ScrollTrigger;
  }

  /**
   * Horizontal offsets have to flip in Arabic, or a "slide in from the start
   * edge" animation slides in from the wrong side. Every x value in the app
   * goes through here.
   */
  flipX(value: number): number {
    return this.i18n.isRtl() ? -value : value;
  }

  private fromVars(options: RevealOptions): gsap.TweenVars {
    const distance = options.distance ?? 34;

    switch (options.preset ?? 'up') {
      case 'fade':
        return { opacity: 0 };
      case 'left':
        return { opacity: 0, x: this.flipX(-distance) };
      case 'right':
        return { opacity: 0, x: this.flipX(distance) };
      case 'scale':
        return { opacity: 0, scale: 0.94 };
      case 'clip':
        return { opacity: 0, clipPath: 'inset(0 0 100% 0)', y: 20 };
      case 'up':
      default:
        return { opacity: 0, y: distance };
    }
  }

  private toVars(options: RevealOptions): gsap.TweenVars {
    const base: gsap.TweenVars = {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration: options.duration ?? 0.85,
      delay: options.delay ?? 0,
      clearProps: 'clipPath,willChange',
    };
    if ((options.preset ?? 'up') === 'clip') base['clipPath'] = 'inset(0 0 0% 0)';
    return base;
  }

  /**
   * Reveals one or more elements as they enter the viewport.
   * Returns a teardown function the caller must invoke on destroy.
   */
  reveal(targets: gsap.TweenTarget, options: RevealOptions = {}): () => void {
    if (this.prefersReducedMotion) {
      gsap.set(targets, { opacity: 1, x: 0, y: 0, scale: 1, clipPath: 'none' });
      return () => undefined;
    }

    return this.run(() => {
      const trigger = Array.isArray(targets) ? targets[0] : targets;

      const tween = gsap.fromTo(targets, this.fromVars(options), {
        ...this.toVars(options),
        stagger: options.stagger ?? 0,
        scrollTrigger: {
          trigger: trigger as gsap.DOMTarget,
          start: options.start ?? 'top 85%',
          toggleActions: options.repeat
            ? 'play reverse play reverse'
            : 'play none none none',
          once: !options.repeat,
        },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });
  }

  /** Immediate timeline, e.g. the hero entrance. No scroll trigger. */
  timeline(vars?: gsap.TimelineVars): gsap.core.Timeline {
    return this.run(() => gsap.timeline(vars));
  }

  /**
   * ScrollTrigger caches element positions. After a route change or a language
   * switch (which re-flows the whole page) those positions are stale.
   */
  refresh(): void {
    if (!this.registered) return;
    this.run(() => ScrollTrigger.refresh());
  }

  /** Kills every trigger — called on route change so old pages release memory. */
  killAll(): void {
    if (!this.registered) return;
    this.run(() => ScrollTrigger.getAll().forEach((trigger) => trigger.kill()));
  }
}
