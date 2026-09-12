import {
  AfterViewInit,
  Directive,
  ElementRef,
  OnDestroy,
  inject,
  input,
} from '@angular/core';
import { MotionService, RevealPreset } from '../../core/services/motion.service';

/**
 * Scroll-triggered entrance animation.
 *
 *   <div appReveal>…</div>
 *   <div appReveal="left" [revealDelay]="0.15">…</div>
 *   <div appReveal revealChildren=".card" [revealStagger]="0.08">…</div>
 *
 * The element is hidden inline before the first frame so it never flashes in
 * its final position, and is shown unconditionally when the visitor prefers
 * reduced motion.
 */
@Directive({
  selector: '[appReveal]',
  host: { '[attr.data-reveal]': 'true' },
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly motion = inject(MotionService);

  readonly appReveal = input<RevealPreset | ''>('');
  readonly revealDelay = input(0);
  readonly revealDuration = input(0.85);
  readonly revealDistance = input(34);
  readonly revealStagger = input(0);
  readonly revealStart = input('top 85%');
  /** Selector for children to animate instead of the host itself. */
  readonly revealChildren = input('');

  private teardown: (() => void) | null = null;

  ngAfterViewInit(): void {
    const element = this.host.nativeElement as HTMLElement;

    const targets = this.revealChildren()
      ? Array.from(element.querySelectorAll<HTMLElement>(this.revealChildren()))
      : element;

    if (Array.isArray(targets) && targets.length === 0) return;

    this.teardown = this.motion.reveal(targets, {
      preset: this.appReveal() || 'up',
      delay: this.revealDelay(),
      duration: this.revealDuration(),
      distance: this.revealDistance(),
      stagger: this.revealStagger(),
      start: this.revealStart(),
    });
  }

  ngOnDestroy(): void {
    this.teardown?.();
  }
}
