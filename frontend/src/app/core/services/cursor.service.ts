import { DOCUMENT } from '@angular/common';
import { Injectable, NgZone, inject } from '@angular/core';

/** Tuning knobs for {@link CursorService.init}. */
export interface CursorOptions {
  /** Elements the cursor reacts to. Matched with `closest()`, so children count. */
  interactiveSelector?: string;
  /** Zones that hide the cursor outright — surfaces with their own hover art. */
  suppressSelector?: string;
  /** 0..1 — the fraction of the remaining distance the dot covers each frame. */
  speed?: number;
  /** Same, for the reticle. Lower than `speed`, or the two bodies never separate. */
  ringSpeed?: number;
  /** Milliseconds of stillness before the cursor fades out. */
  idleDelay?: number;
  /** Replace the native pointer instead of trailing behind it. */
  hideNativeCursor?: boolean;
}

const DEFAULTS: Required<CursorOptions> = {
  interactiveSelector: 'a, button, [role="button"], input, textarea, select',
  // The footer's social row animates its own icons, and the admin area (both
  // the shell and the sign-in screen) is a work tool — neither wants a second
  // thing moving under the pointer. `[data-cursor="none"]` opts anything else out.
  suppressSelector: '.footer__social, .admin, .login, [data-cursor="none"]',
  speed: 0.15,
  ringSpeed: 0.085,
  idleDelay: 1000,
  hideNativeCursor: false,
};

const VISIBLE = 'cursor-visible';
const HOVER = 'cursor-hover';
const SUPPRESSED = 'cursor-suppressed';
const PRESS = 'cursor-press';

/** Furthest the reticle may drift off the pointer when it locks onto a control. */
const MAGNET_MAX = 14;
/** Pixels-per-frame of travel → how much the dot stretches along its path. */
const STRETCH_GAIN = 0.016;
const STRETCH_MAX = 0.4;
/** Under this much travel the direction is noise, so the last angle is held. */
const ANGLE_FLOOR = 0.4;

/**
 * The trailing cursor.
 *
 * Two bodies chase the pointer at different rates: a soft dot at 0.15 and a
 * surveyor's reticle at 0.085. Because the reticle is lazier it strings out
 * behind the dot on a fast move and closes back over it when the pointer
 * settles, which is what gives the pair its weight — a single element easing
 * toward the mouse only ever reads as lag.
 *
 * Three things happen on top of that chase:
 *
 *   - Over a control the reticle stops tracking the pointer and is pulled
 *     toward the control's centre (capped at MAGNET_MAX, so a wide nav bar
 *     nudges rather than yanks). It opens its tick marks and picks up the brand
 *     blue — the same corner-bracket motif the catalogue cards use.
 *   - The dot squashes along its direction of travel in proportion to speed, so
 *     a flick across the page reads as a streak and a slow drift as a disc.
 *   - Both fade out a second after the pointer stops.
 *
 * Position is written from this loop; scale, colour and opacity are left to CSS
 * transitions. Mixing the two — transitioning `left`/`top` — would put an ease
 * on top of an ease and feel like the cursor is dragging through syrup.
 *
 * The native pointer stays visible: this is an accent trailing the real cursor,
 * not a replacement for it. Pass `hideNativeCursor` for the other variant.
 *
 * Everything runs outside Angular's zone. A rAF loop plus `mousemove` inside it
 * would run change detection several hundred times a second for elements that
 * live outside the component tree entirely.
 */
@Injectable({ providedIn: 'root' })
export class CursorService {
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);

  private options = DEFAULTS;
  private view: Window | null = null;

  private dot: HTMLElement | null = null;
  private core: HTMLElement | null = null;
  private reticle: HTMLElement | null = null;

  private frame = 0;
  private idleTimer = 0;

  /** Raw pointer, written by `mousemove` and read by the loop. */
  private mouseX = 0;
  private mouseY = 0;
  /** Eased positions — what actually gets painted. */
  private dotX = 0;
  private dotY = 0;
  private ringX = 0;
  private ringY = 0;
  /** Previous dot position, for the per-frame velocity. */
  private lastX = 0;
  private lastY = 0;
  private angle = 0;

  /** The control under the pointer, if any — the reticle's magnet. */
  private target: Element | null = null;
  /** The suppression zone the pointer is inside, if any. */
  private zoneEl: Element | null = null;
  /** The first move teleports instead of easing in from the top-left corner. */
  private seeded = false;

  /**
   * Builds the elements and starts the loop. Safe to call twice — the second
   * call is a no-op, which keeps a re-created root from stacking loops.
   */
  init(options: CursorOptions = {}): void {
    if (this.dot) return;

    // No window means the server, where there is no pointer to follow.
    const view = this.document.defaultView;
    if (!view) return;

    // The trail is the whole point of the effect, so there is nothing worth
    // showing once motion is off. Touch devices never get a pointer at all, and
    // a rAF loop running forever on a phone is pure battery.
    if (view.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (view.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

    this.view = view;
    this.options = { ...DEFAULTS, ...options };

    this.build();

    if (this.options.hideNativeCursor) {
      this.document.documentElement.classList.add('has-custom-cursor');
    }

    this.zone.runOutsideAngular(() => {
      this.document.addEventListener('mousemove', this.onMouseMove, { passive: true });
      this.document.addEventListener('mouseover', this.onMouseOver, { passive: true });
      this.document.addEventListener('mouseout', this.onMouseOut, { passive: true });
      this.document.addEventListener('mousedown', this.onMouseDown, { passive: true });
      this.document.addEventListener('mouseup', this.onMouseUp, { passive: true });
      this.frame = requestAnimationFrame(this.tick);
    });
  }

  /** Stops the loop, unbinds everything and takes the elements back out. */
  destroy(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.idleTimer) this.view?.clearTimeout(this.idleTimer);

    this.document.removeEventListener('mousemove', this.onMouseMove);
    this.document.removeEventListener('mouseover', this.onMouseOver);
    this.document.removeEventListener('mouseout', this.onMouseOut);
    this.document.removeEventListener('mousedown', this.onMouseDown);
    this.document.removeEventListener('mouseup', this.onMouseUp);
    this.document.documentElement.classList.remove('has-custom-cursor');

    this.dot?.remove();
    this.reticle?.remove();

    this.frame = 0;
    this.idleTimer = 0;
    this.dot = null;
    this.core = null;
    this.reticle = null;
    this.target = null;
    this.zoneEl = null;
    this.seeded = false;
    this.view = null;
  }

  // --- DOM ------------------------------------------------------------------

  /**
   * Both bodies go straight on `<body>`, never in a template: they have to
   * outlive every routed view, and re-creating them on each navigation would
   * restart the chase from wherever the last pair died.
   */
  private build(): void {
    const dot = this.document.createElement('div');
    dot.className = 'cursor-circle';
    dot.setAttribute('aria-hidden', 'true');

    // The dot's own transform belongs to CSS (the hover scale, transitioned).
    // The squash is rewritten every frame, so it needs a layer of its own —
    // sharing one transform would drag the velocity through a 0.3s ease.
    const core = this.document.createElement('span');
    core.className = 'cursor-circle__core';
    dot.appendChild(core);

    const reticle = this.document.createElement('div');
    reticle.className = 'cursor-reticle';
    reticle.setAttribute('aria-hidden', 'true');

    // Rotation is a keyframe animation and the lock-on scale is a transition;
    // one element cannot own both, so the spinning parts sit a level in.
    const spin = this.document.createElement('span');
    spin.className = 'cursor-reticle__spin';

    const ring = this.document.createElement('span');
    ring.className = 'cursor-reticle__ring';
    spin.appendChild(ring);

    for (let i = 0; i < 4; i++) {
      const tick = this.document.createElement('i');
      tick.className = 'cursor-reticle__tick';
      tick.style.setProperty('--tick-i', String(i));
      spin.appendChild(tick);
    }

    reticle.appendChild(spin);

    // Reticle first, so the dot wins the overlap while the two are stacked.
    this.document.body.append(reticle, dot);

    this.dot = dot;
    this.core = core;
    this.reticle = reticle;
  }

  private setState(name: string, on: boolean): void {
    this.dot?.classList.toggle(name, on);
    this.reticle?.classList.toggle(name, on);
  }

  // --- Listeners ------------------------------------------------------------

  private readonly onMouseMove = (event: MouseEvent): void => {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;

    if (!this.seeded) {
      this.dotX = this.lastX = this.ringX = this.mouseX;
      this.dotY = this.lastY = this.ringY = this.mouseY;
      this.seeded = true;
    }

    this.setState(VISIBLE, true);

    this.view?.clearTimeout(this.idleTimer);
    this.idleTimer = this.view?.setTimeout(this.onIdle, this.options.idleDelay) ?? 0;
  };

  /** A still pointer is one nobody is using — fade out until it moves again. */
  private readonly onIdle = (): void => {
    this.setState(VISIBLE, false);
  };

  /*
   * Delegated from `document` rather than bound per element: the catalogue, the
   * filters and every admin table render after this runs, and none of them
   * should have to announce themselves to the cursor.
   */
  private readonly onMouseOver = (event: MouseEvent): void => {
    const from = event.target;
    if (!(from instanceof Element)) return;

    const { interactiveSelector, suppressSelector } = this.options;

    if (suppressSelector) {
      const zoneEl = from.closest(suppressSelector);
      if (zoneEl) {
        this.zoneEl = zoneEl;
        this.setState(SUPPRESSED, true);
      }
    }

    if (interactiveSelector) {
      const target = from.closest(interactiveSelector);
      if (target) {
        this.target = target;
        this.setState(HOVER, true);
      }
    }
  };

  /*
   * `mouseout` fires on every hop between children, including the ones inside
   * the element being hovered. Dropping the state on each of those strobes the
   * cursor, so it is only released once the pointer is genuinely outside —
   * `relatedTarget` is where the pointer went, and a null one means it left the
   * window altogether.
   */
  private readonly onMouseOut = (event: MouseEvent): void => {
    const to = event.relatedTarget instanceof Node ? event.relatedTarget : null;

    if (this.zoneEl && !this.zoneEl.contains(to)) {
      this.zoneEl = null;
      this.setState(SUPPRESSED, false);
    }

    if (this.target && !this.target.contains(to)) {
      this.target = null;
      this.setState(HOVER, false);
    }
  };

  private readonly onMouseDown = (): void => this.setState(PRESS, true);
  private readonly onMouseUp = (): void => this.setState(PRESS, false);

  // --- The loop -------------------------------------------------------------

  private readonly tick = (): void => {
    this.frame = requestAnimationFrame(this.tick);

    const { speed, ringSpeed } = this.options;

    /*
     * Measured before anything is written this frame. The writes below dirty
     * layout, so reading afterwards would force a synchronous reflow on every
     * frame the pointer rests on a control.
     */
    let ringToX = this.mouseX;
    let ringToY = this.mouseY;

    if (this.target) {
      const box = this.target.getBoundingClientRect();
      ringToX += clamp(box.left + box.width / 2 - this.mouseX, MAGNET_MAX);
      ringToY += clamp(box.top + box.height / 2 - this.mouseY, MAGNET_MAX);
    }

    // The chase. Each body closes a fixed fraction of the gap per frame, which
    // is what decelerates it into the target instead of arriving flat.
    this.dotX += (this.mouseX - this.dotX) * speed;
    this.dotY += (this.mouseY - this.dotY) * speed;
    this.ringX += (ringToX - this.ringX) * ringSpeed;
    this.ringY += (ringToY - this.ringY) * ringSpeed;

    const dx = this.dotX - this.lastX;
    const dy = this.dotY - this.lastY;
    this.lastX = this.dotX;
    this.lastY = this.dotY;

    const travel = Math.hypot(dx, dy);
    if (travel > ANGLE_FLOOR) this.angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Stretch along the path, squash across it — the area stays roughly
    // constant, so the dot reads as one object being pulled, not as one growing.
    const stretch = 1 + Math.min(travel * STRETCH_GAIN, STRETCH_MAX);

    if (!this.dot || !this.core || !this.reticle) return;

    this.dot.style.left = `${this.dotX}px`;
    this.dot.style.top = `${this.dotY}px`;
    this.reticle.style.left = `${this.ringX}px`;
    this.reticle.style.top = `${this.ringY}px`;
    this.core.style.transform = `rotate(${this.angle}deg) scale(${stretch}, ${1 / stretch})`;
  };
}

/** Symmetric clamp — keeps the magnet a nudge instead of a jump. */
function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}
