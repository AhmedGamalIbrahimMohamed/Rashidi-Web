import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';
import { environment } from '../../../../environments/environment';
import { MotionService } from '../../../core/services/motion.service';
import { ThemeService } from '../../../core/services/theme.service';

/** Gradient stops for the equirectangular environment, as [offset, colour]. */
type EnvironmentRamp = ReadonlyArray<readonly [number, string]>;

/**
 * Every value that differs between the two themes, in one place.
 *
 * Both `build()` and `retheme()` read from here, so a scene constructed in dark
 * mode and one switched into dark mode are guaranteed to be identical — which
 * is the property that makes retheming-in-place safe to prefer over a rebuild.
 */
interface ScenePalette {
  environment: EnvironmentRamp;
  /** Opacity of the workshop-light patch in the reflections. */
  spot: number;
  ambient: number;
  key: number;
  rim: number;
  fill: number;
  steel: { color: number; roughness: number; envMapIntensity: number };
  darkSteel: { color: number; envMapIntensity: number };
  /** The accent band glows on dark; on white it only needs to read as blue. */
  accentEmissive: number;
  cage: { color: number; opacity: number };
  particles: { color: number; opacity: number };
}

const PALETTE: Record<'light' | 'dark', ScenePalette> = {
  dark: {
    environment: [
      [0, '#0b1320'], // sky: deep charcoal
      [0.42, '#2a3a52'],
      [0.52, '#8fb8e8'], // horizon: cool highlight
      [0.62, '#16202e'],
      [1, '#05070b'], // ground
    ],
    spot: 0.9,
    ambient: 0.45,
    key: 2.4,
    rim: 90,
    fill: 32,
    steel: { color: 0x9aa6b8, roughness: 0.28, envMapIntensity: 1.25 },
    darkSteel: { color: 0x2b3644, envMapIntensity: 0.9 },
    accentEmissive: 1.5,
    cage: { color: 0x1e6fd0, opacity: 0.28 },
    particles: { color: 0x6da8f0, opacity: 0.55 },
  },
  light: {
    environment: [
      [0, '#ffffff'], // sky: bright studio
      [0.44, '#dbe6f5'],
      [0.52, '#ffffff'], // horizon: specular band
      [0.62, '#aebfd6'],
      [1, '#5d6b80'], // ground: mid grey, keeps form
    ],
    spot: 1,
    ambient: 1.1,
    key: 3.1,
    rim: 34,
    fill: 14,
    steel: { color: 0xc3ccd9, roughness: 0.22, envMapIntensity: 1.5 },
    darkSteel: { color: 0x64748b, envMapIntensity: 1.2 },
    accentEmissive: 0.55,
    cage: { color: 0x94a3b8, opacity: 0.4 },
    particles: { color: 0x7e93ad, opacity: 0.4 },
  },
};

/**
 * Hero 3D object — an abstract machined assembly.
 *
 * Deliberately not a gear: the shape is a turned shaft (stacked cylinders of
 * varying radii, the profile a lathe produces), a canted precision ring and a
 * wireframe tolerance cage. It reads as "engineered component" rather than as
 * an icon of industry.
 *
 * Cost control, in order of importance:
 *   - the whole scene is under ~9k triangles and uses no post-processing;
 *   - rendering stops when the canvas leaves the viewport or the tab is hidden;
 *   - device pixel ratio is capped, harder on small screens;
 *   - below `threeMinViewportWidth`, and under prefers-reduced-motion, the 3D
 *     never initialises at all.
 *
 * A CSS/SVG fallback sits behind the canvas, so a WebGL failure, a small screen
 * or a reduced-motion preference all degrade to a composed visual rather than
 * an empty rectangle. It is a substitute for the model, not a backdrop to it:
 * once the canvas is drawing, the fallback is fully hidden.
 */
@Component({
  selector: 'app-hero-scene',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scene" #host>
      <!-- Present but invisible while the canvas is drawing; it takes over
           only where WebGL does not run. -->
      <div class="fallback" [class.fallback--only]="!active()" aria-hidden="true">
        <svg class="fallback__rings" viewBox="0 0 400 400">
          <defs>
            <linearGradient id="hs-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#3d9bff" stop-opacity="0.9" />
              <stop offset="55%" stop-color="#007bff" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#007bff" stop-opacity="0" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#hs-ring)">
            <circle cx="200" cy="200" r="168" stroke-width="1" />
            <circle cx="200" cy="200" r="132" stroke-width="1.5" stroke-dasharray="6 10" />
            <circle cx="200" cy="200" r="96" stroke-width="1" />
            <circle cx="200" cy="200" r="58" stroke-width="2.5" />
            <circle cx="200" cy="200" r="26" stroke-width="1" />
            <path d="M200 12v48M200 340v48M12 200h48M340 200h48" stroke-width="1" />
          </g>
        </svg>
        <div class="fallback__core"></div>
      </div>

      <canvas class="canvas" #canvas [class.is-visible]="active()"></canvas>
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
    }

    .scene {
      position: relative;
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
    }

    .canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 900ms var(--ease);
    }

    .canvas.is-visible {
      opacity: 1;
    }

    /* --- Fallback visual ---------------------------------------------------- */

    /* Hidden once the 3D is up: the rings are a stand-in for the model, not a
       backdrop for it. They only ever show where WebGL does not run — phones,
       reduced motion, no context — which is the --only state below. */
    .fallback {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      opacity: 0;
      transition: opacity 700ms var(--ease);
    }

    .fallback--only {
      opacity: 1;
    }

    .fallback__rings {
      width: min(92%, 460px);
      aspect-ratio: 1;
      animation: hs-spin 46s linear infinite;
    }

    .fallback__core {
      position: absolute;
      width: 32%;
      aspect-ratio: 1;
      border-radius: 50%;
      background: radial-gradient(
        circle at 38% 34%,
        rgba(61, 155, 255, 0.55),
        rgba(0, 123, 255, 0.12) 45%,
        transparent 70%
      );
      filter: blur(14px);
    }

    @keyframes hs-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .fallback__rings {
        animation: none;
      }
    }
  `,
})
export class HeroSceneComponent implements AfterViewInit, OnDestroy {
  private readonly motion = inject(MotionService);
  private readonly theme = inject(ThemeService);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly hostRef = viewChild.required<ElementRef<HTMLElement>>('host');

  /** True once WebGL is up and the first frame has been drawn. */
  protected readonly active = signal(false);

  /** The theme the live scene was built for, so a switch can be detected. */
  private builtFor: 'light' | 'dark' | null = null;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private assembly?: THREE.Group;
  private ring?: THREE.Mesh;
  private cage?: THREE.LineSegments;
  private particles?: THREE.Points;

  /* Held so a theme switch can retint them in place. Without these references
     the only way back to a light or a material is a full scene traversal. */
  private lights?: {
    ambient: THREE.AmbientLight;
    key: THREE.DirectionalLight;
    rim: THREE.PointLight;
    fill: THREE.PointLight;
  };
  private materials?: {
    steel: THREE.MeshStandardMaterial;
    darkSteel: THREE.MeshStandardMaterial;
    accent: THREE.MeshStandardMaterial;
    cage: THREE.LineBasicMaterial;
    particles: THREE.PointsMaterial;
  };

  /** Reused across themes: constructing one recompiles its blur shaders. */
  private pmrem?: THREE.PMREMGenerator;

  private frameId = 0;
  private running = false;
  private clock = new THREE.Clock();

  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;

  /** Target and eased pointer offsets, in normalised device coordinates. */
  private pointer = { x: 0, y: 0 };
  private eased = { x: 0, y: 0 };

  private readonly onPointerMove = (event: PointerEvent) => {
    const view = this.hostRef().nativeElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - view.left) / view.width) * 2 - 1;
    this.pointer.y = ((event.clientY - view.top) / view.height) * 2 - 1;
  };

  private readonly onVisibility = () => {
    if (document.hidden) this.pause();
    else this.resume();
  };

  constructor() {
    /*
     * Lighting, the environment map and the material colours all differ by
     * theme. This used to tear the scene down and rebuild it, which measured at
     * ~1.3s of blocked main thread per toggle on a throttled machine: a new
     * WebGLRenderer means recompiling every shader program, and a new
     * PMREMGenerator recompiles its own on top of that.
     *
     * Nothing structural actually differs between the themes — same geometry,
     * same object graph, only colours and intensities — so the scene is
     * retinted in place instead. Does nothing until a scene exists.
     */
    effect(() => {
      const next = this.theme.isDark() ? 'dark' : 'light';
      if (!this.renderer || this.builtFor === next) return;
      this.retheme(next);
    });
  }

  /**
   * Move the live scene to the other theme without reconstructing it.
   *
   * Only uniforms change — light intensities, material colours, the
   * environment texture — none of which alter a program cache key, so the
   * compiled shaders are kept and the switch costs a few milliseconds.
   */
  private retheme(theme: 'light' | 'dark'): void {
    const { scene, renderer, camera, lights, materials } = this;
    if (!scene || !renderer || !camera || !lights || !materials) return;

    const palette = PALETTE[theme];

    lights.ambient.intensity = palette.ambient;
    lights.key.intensity = palette.key;
    lights.rim.intensity = palette.rim;
    lights.fill.intensity = palette.fill;

    materials.steel.color.setHex(palette.steel.color);
    materials.steel.roughness = palette.steel.roughness;
    materials.steel.envMapIntensity = palette.steel.envMapIntensity;

    materials.darkSteel.color.setHex(palette.darkSteel.color);
    materials.darkSteel.envMapIntensity = palette.darkSteel.envMapIntensity;

    materials.accent.emissiveIntensity = palette.accentEmissive;

    materials.cage.color.setHex(palette.cage.color);
    materials.cage.opacity = palette.cage.opacity;

    materials.particles.color.setHex(palette.particles.color);
    materials.particles.opacity = palette.particles.opacity;

    // The environment is what actually decides whether the metal reads as dark
    // steel or bright chrome, so it has to be regenerated — but against the
    // existing renderer and a reused generator, which is the cheap path.
    const previous = scene.environment;
    scene.environment = this.buildEnvironment(renderer, palette);
    previous?.dispose();

    this.builtFor = theme;

    // The render loop is stopped whenever the hero is off screen or the tab is
    // hidden. Paint once so a switch made in that state is not left stale.
    if (!this.running) renderer.render(scene, camera);
  }

  ngAfterViewInit(): void {
    if (!this.shouldRender()) return;
    // One frame's grace so the hero's own entrance animation is not competing
    // with WebGL context creation on the same tick.
    requestAnimationFrame(() => this.init());
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  // --- setup ----------------------------------------------------------------

  private shouldRender(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.motion.prefersReducedMotion) return false;
    if (window.innerWidth < environment.ui.threeMinViewportWidth) return false;

    // A cheap capability probe — cheaper than constructing a renderer and
    // catching the throw.
    try {
      const probe = document.createElement('canvas');
      return Boolean(
        probe.getContext('webgl2') ||
          probe.getContext('webgl') ||
          probe.getContext('experimental-webgl'),
      );
    } catch {
      return false;
    }
  }

  private init(): void {
    const canvas = this.canvasRef().nativeElement;
    const host = this.hostRef().nativeElement;

    try {
      this.motion.run(() => this.build(canvas, host));
    } catch {
      // Any failure leaves the fallback visual in place; nothing to report.
      this.teardown();
      return;
    }

    this.builtFor = this.theme.isDark() ? 'dark' : 'light';
    this.active.set(true);
  }

  private build(canvas: HTMLCanvasElement, host: HTMLElement): void {
    const width = host.clientWidth || 600;
    const height = host.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: window.devicePixelRatio < 2,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 900 ? 1.4 : 1.8));
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 8.4);
    camera.lookAt(0, 0, 0);
    this.camera = camera;

    const palette = PALETTE[this.theme.isDark() ? 'dark' : 'light'];
    scene.environment = this.buildEnvironment(renderer, palette);

    this.addLights(scene, palette);
    const surfaces = this.addAssembly(scene, palette);
    const particles = this.addParticles(scene, palette);
    this.materials = { ...surfaces, particles };

    this.observe(host);
    host.addEventListener('pointermove', this.onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);

    this.resume();
  }

  /**
   * Metal needs something to reflect. Rather than shipping an HDR file, a small
   * vertical gradient is baked into an equirectangular texture and pre-filtered
   * — a few kilobytes of GPU memory instead of a network request, and enough
   * for the brushed-steel read we want.
   */
  private buildEnvironment(renderer: THREE.WebGLRenderer, palette: ScenePalette): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    // Metal is mostly reflection, so the environment — not the material — is
    // what decides whether the object reads as dark steel or bright chrome.
    // On a white page a dark environment makes the object look like a hole.
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createLinearGradient(0, 0, 0, size);
      for (const [offset, color] of palette.environment) gradient.addColorStop(offset, color);
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);

      // A single bright patch reads as a workshop light in the reflections.
      const spot = context.createRadialGradient(size * 0.72, size * 0.3, 0, size * 0.72, size * 0.3, size * 0.3);
      spot.addColorStop(0, `rgba(255,255,255,${palette.spot})`);
      spot.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = spot;
      context.fillRect(0, 0, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;

    this.pmrem ??= new THREE.PMREMGenerator(renderer);
    const environmentMap = this.pmrem.fromEquirectangular(texture).texture;
    texture.dispose();

    return environmentMap;
  }

  private addLights(scene: THREE.Scene, palette: ScenePalette): void {
    const ambient = new THREE.AmbientLight(0x8fb8e8, palette.ambient);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, palette.key);
    key.position.set(4, 5, 6);
    scene.add(key);

    // Electric-blue rim from behind-left, the accent that ties the object to
    // the brand without colouring the whole material. A rim glow only reads
    // against a dark ground, so light mode dials it right back and leans on
    // the environment reflection instead.
    const rim = new THREE.PointLight(0x007bff, palette.rim, 26, 2);
    rim.position.set(-5, 1.5, -4);
    scene.add(rim);

    const fill = new THREE.PointLight(0x3d9bff, palette.fill, 22, 2);
    fill.position.set(3.5, -3, 2.5);
    scene.add(fill);

    this.lights = { ambient, key, rim, fill };
  }

  /** Returns the retintable materials; the geometry itself is theme-agnostic. */
  private addAssembly(
    scene: THREE.Scene,
    palette: ScenePalette,
  ): Omit<NonNullable<typeof this.materials>, 'particles'> {
    const group = new THREE.Group();

    const steel = new THREE.MeshStandardMaterial({
      color: palette.steel.color,
      metalness: 0.98,
      roughness: palette.steel.roughness,
      envMapIntensity: palette.steel.envMapIntensity,
    });

    const darkSteel = new THREE.MeshStandardMaterial({
      color: palette.darkSteel.color,
      metalness: 0.9,
      roughness: 0.42,
      envMapIntensity: palette.darkSteel.envMapIntensity,
    });

    const accent = new THREE.MeshStandardMaterial({
      color: 0x007bff,
      metalness: 0.35,
      roughness: 0.22,
      emissive: 0x0a5fd0,
      emissiveIntensity: palette.accentEmissive,
    });

    // Turned shaft: the radii step the way a lathe would cut them.
    const profile: Array<[radius: number, height: number, material: THREE.Material]> = [
      [0.95, 0.32, darkSteel],
      [1.28, 0.22, steel],
      [0.62, 0.9, steel],
      [1.55, 0.34, darkSteel],
      [0.62, 0.9, steel],
      [1.28, 0.22, steel],
      [0.95, 0.32, darkSteel],
    ];

    let offset = -profile.reduce((sum, [, height]) => sum + height, 0) / 2;
    for (const [radius, height, material] of profile) {
      const section = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 44, 1), material);
      section.position.y = offset + height / 2;
      offset += height;
      group.add(section);
    }

    // Emissive index band around the middle collar.
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.035, 8, 72), accent);
    band.rotation.x = Math.PI / 2;
    group.add(band);

    // Canted precision ring.
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.11, 12, 96), steel);
    ring.rotation.set(Math.PI / 2.5, 0, Math.PI / 9);
    group.add(ring);
    this.ring = ring;

    // Bolts spaced around the ring — the detail that sells it as a flange.
    const boltGeometry = new THREE.CylinderGeometry(0.11, 0.11, 0.28, 6);
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const bolt = new THREE.Mesh(boltGeometry, darkSteel);
      bolt.position.set(Math.cos(angle) * 1.9, 0, Math.sin(angle) * 1.9);
      bolt.rotation.x = Math.PI / 2;
      bolt.rotation.z = angle;
      group.add(bolt);
    }

    // Wireframe tolerance cage.
    const cageMaterial = new THREE.LineBasicMaterial({
      color: palette.cage.color,
      transparent: true,
      opacity: palette.cage.opacity,
    });
    const cage = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(3.5, 1)),
      cageMaterial,
    );
    group.add(cage);
    this.cage = cage;

    group.rotation.set(0.42, 0.5, 0.12);
    scene.add(group);
    this.assembly = group;

    return { steel, darkSteel, accent, cage: cageMaterial };
  }

  /** Slow drifting motes — depth cue, 140 points, negligible cost. */
  private addParticles(scene: THREE.Scene, palette: ScenePalette): THREE.PointsMaterial {
    const count = 140;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 9 - 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: palette.particles.color,
      size: 0.035,
      transparent: true,
      opacity: palette.particles.opacity,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);

    scene.add(points);
    this.particles = points;

    return material;
  }

  // --- lifecycle ------------------------------------------------------------

  private observe(host: HTMLElement): void {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? this.resume() : this.pause()),
      { threshold: 0.01 },
    );
    this.intersectionObserver.observe(host);
  }

  private resize(): void {
    const host = this.hostRef().nativeElement;
    if (!this.renderer || !this.camera || !host.clientWidth) return;

    this.camera.aspect = host.clientWidth / host.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(host.clientWidth, host.clientHeight, false);
  }

  private resume(): void {
    if (this.running || !this.renderer) return;
    this.running = true;
    this.clock.start();
    this.motion.run(() => this.tick());
  }

  private pause(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  private tick = (): void => {
    if (!this.running || !this.renderer || !this.scene || !this.camera) return;

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    if (this.assembly) {
      this.assembly.rotation.y += delta * 0.22;
      // Gentle breathing so a paused-looking object still feels alive.
      this.assembly.position.y = Math.sin(elapsed * 0.55) * 0.11;
    }

    if (this.ring) this.ring.rotation.z += delta * 0.1;
    if (this.cage) this.cage.rotation.y -= delta * 0.08;
    if (this.particles) this.particles.rotation.y += delta * 0.012;

    // Eased pointer parallax on the camera rather than the object, so the
    // lighting stays put and only the viewpoint shifts.
    this.eased.x += (this.pointer.x - this.eased.x) * 0.045;
    this.eased.y += (this.pointer.y - this.eased.y) * 0.045;
    this.camera.position.x = this.eased.x * 0.85;
    this.camera.position.y = 0.6 - this.eased.y * 0.6;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.tick);
  };

  private teardown(): void {
    this.pause();

    this.hostRef()?.nativeElement?.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();

    // Three does not free GPU memory on garbage collection — every geometry,
    // material and texture has to be released explicitly.
    this.scene?.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose?.();
    });

    if (this.scene?.environment) this.scene.environment.dispose();

    this.pmrem?.dispose();
    this.pmrem = undefined;
    this.renderer?.dispose();
    this.renderer = undefined;
    this.scene = undefined;
    this.camera = undefined;
    this.lights = undefined;
    this.materials = undefined;
    this.builtFor = null;
    this.active.set(false);
  }
}
