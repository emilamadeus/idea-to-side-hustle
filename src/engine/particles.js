import * as THREE from 'three';
import gsap from 'gsap';

/*
  One persistent particle system shared by every slide.
  Slides never create their own particles for "big" moments; they ask this
  field to morph into a new target, so content flows from slide to slide.

  Each particle stores a `from` and `to` position. uMix runs 0 -> 1 and every
  particle travels on its own delayed schedule (aDelay), with curl-like
  turbulence that peaks mid-flight and vanishes at rest.
*/

const vert = /* glsl */ `
uniform float uTime, uMix, uStagger, uTurb, uSize, uPR, uDrift;
attribute vec3 aFrom;
attribute vec3 aTo;
attribute float aAFrom;
attribute float aATo;
attribute float aDelay;
attribute float aSeed;
varying float vAlpha;
varying float vSeed;

float ease(float t) { return t < .5 ? 4. * t * t * t : 1. - pow(-2. * t + 2., 3.) / 2.; }

void main() {
  float p = clamp(uMix * (1. + uStagger) - aDelay * uStagger, 0., 1.);
  float e = ease(p);
  vec3 pos = mix(aFrom, aTo, e);

  float s = sin(p * 3.14159265);
  vec3 q = pos * .35 + aSeed * 10.;
  vec3 n = vec3(
    sin(q.y * 1.7 + uTime * .6) + sin(q.z * 2.3 + uTime * .4),
    sin(q.z * 1.9 + uTime * .5) + sin(q.x * 2.1 - uTime * .3),
    sin(q.x * 1.6 - uTime * .45) + sin(q.y * 2.7 + uTime * .35)
  );
  pos += n * s * uTurb;
  pos += vec3(sin(uTime * .7 + aSeed * 61.), cos(uTime * .6 + aSeed * 37.), sin(uTime * .5 + aSeed * 17.)) * uDrift;

  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPR * (.6 + aSeed * .8) * (10. / -mv.z);
  vAlpha = mix(aAFrom, aATo, e);
  vSeed = aSeed;
}`;

const frag = /* glsl */ `
uniform vec3 uColorA, uColorB;
uniform float uOpacity;
uniform vec4 uFrame; // 16:9 frame in drawing-buffer pixels: x0, y0, x1, y1
varying float vAlpha;
varying float vSeed;
void main() {
  // Particles live only outside the frame; the frame is reserved for content.
  if (gl_FragCoord.x > uFrame.x && gl_FragCoord.x < uFrame.z && gl_FragCoord.y > uFrame.y && gl_FragCoord.y < uFrame.w) discard;
  vec2 c = gl_PointCoord - .5;
  float d = length(c);
  float a = smoothstep(.5, 0., d);
  a *= a;
  float core = smoothstep(.16, 0., d);
  vec3 col = mix(uColorA, uColorB, vSeed) + core * .5;
  gl_FragColor = vec4(col, a * vAlpha * uOpacity);
}`;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class ParticleField {
  constructor(count, pixelRatio) {
    this.count = count;
    const g = new THREE.BufferGeometry();
    const n = count;
    this.from = new Float32Array(n * 3);
    this.to = new Float32Array(n * 3);
    this.aFrom = new Float32Array(n).fill(0);
    this.aTo = new Float32Array(n).fill(0);
    this.delay = new Float32Array(n);
    this.seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.seed[i] = Math.random();
      this.delay[i] = Math.random();
    }
    const attr = (name, arr, size) => {
      const a = new THREE.BufferAttribute(arr, size);
      a.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute(name, a);
      return a;
    };
    // `position` is required by three for bounds; we drive real positions from aFrom/aTo.
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.attrs = {
      from: attr('aFrom', this.from, 3),
      to: attr('aTo', this.to, 3),
      aFrom: attr('aAFrom', this.aFrom, 1),
      aTo: attr('aATo', this.aTo, 1),
      delay: attr('aDelay', this.delay, 1),
      seed: attr('aSeed', this.seed, 1),
    };

    this.uniforms = {
      uTime: { value: 0 },
      uMix: { value: 1 },
      uStagger: { value: 0.5 },
      uTurb: { value: 0 },
      uSize: { value: 4.2 },
      uPR: { value: pixelRatio },
      uDrift: { value: 0.012 },
      uOpacity: { value: 1 },
      uFrame: { value: new THREE.Vector4(0, 0, 0, 0) },
      uColorA: { value: new THREE.Color('#8fd8ff') },
      uColorB: { value: new THREE.Color('#a99bff') },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.add(this.points);
    this.tween = null;
  }

  /** Freeze the current in-flight positions into `from`, so a new morph can start mid-flight. */
  snapshot() {
    const m = this.uniforms.uMix.value;
    const st = this.uniforms.uStagger.value;
    const { from, to, aFrom, aTo, delay } = this;
    for (let i = 0; i < this.count; i++) {
      const p = Math.min(1, Math.max(0, m * (1 + st) - delay[i] * st));
      const e = ease(p);
      const k = i * 3;
      from[k] += (to[k] - from[k]) * e;
      from[k + 1] += (to[k + 1] - from[k + 1]) * e;
      from[k + 2] += (to[k + 2] - from[k + 2]) * e;
      aFrom[i] += (aTo[i] - aFrom[i]) * e;
    }
  }

  /** Jump straight to a shape without animation. */
  set(shape) {
    this.from.set(shape.positions);
    this.to.set(shape.positions);
    this.aFrom.set(shape.alphas);
    this.aTo.set(shape.alphas);
    this.uniforms.uMix.value = 1;
    this.flag();
  }

  /**
   * Morph into a shape from shapes.js.
   * order: 'random' | 'x' | '-x' | 'y' | '-y' | 'radial' | '-radial'  (who moves first)
   */
  morphTo(shape, {
    duration = 2.6, stagger = 0.55, turbulence = 0.7, order = 'random', delay = 0,
    rotation = [0, 0, 0], rotate = true,
  } = {}) {
    this.tween?.kill();
    this.snapshot();
    this.to.set(shape.positions);
    this.aTo.set(shape.alphas);
    this.setOrder(order);
    this.flag();

    const u = this.uniforms;
    u.uMix.value = 0;
    u.uStagger.value = stagger;
    u.uTurb.value = turbulence;
    this.tween = gsap.to(u.uMix, { value: 1, duration, delay, ease: 'none' });

    if (rotate) this.rotateTo(rotation, duration * 0.8);
    return this.tween;
  }

  /** Tween group rotation, unwinding accumulated spins to the nearest equivalent angle. */
  rotateTo([x, y, z], duration = 2) {
    const r = this.group.rotation;
    const TAU = Math.PI * 2;
    const wrap = (cur, target) => {
      let d = (((cur - target) % TAU) + TAU) % TAU;
      if (d > Math.PI) d -= TAU;
      return target + d;
    };
    r.x = wrap(r.x, x);
    r.y = wrap(r.y, y);
    r.z = wrap(r.z, z);
    return gsap.to(r, { x, y, z, duration, ease: 'power3.inOut', overwrite: true });
  }

  setOrder(order) {
    const { to, delay, count } = this;
    if (order === 'random') {
      for (let i = 0; i < count; i++) delay[i] = Math.random();
      return;
    }
    let min = Infinity, max = -Infinity;
    const key = (i) => {
      const x = to[i * 3], y = to[i * 3 + 1], z = to[i * 3 + 2];
      switch (order) {
        case 'x': return x;
        case '-x': return -x;
        case 'y': return y;
        case '-y': return -y;
        case 'radial': return Math.hypot(x, y, z);
        case '-radial': return -Math.hypot(x, y, z);
        default: return Math.random();
      }
    };
    for (let i = 0; i < count; i++) {
      const v = key(i);
      delay[i] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const span = max - min || 1;
    for (let i = 0; i < count; i++) delay[i] = (delay[i] - min) / span * 0.85 + Math.random() * 0.15;
  }

  flag() {
    for (const a of Object.values(this.attrs)) a.needsUpdate = true;
  }

  /** Fade the whole field. Content slides hide it; it shows only when it is the content. */
  fade(to, duration = 1) {
    return gsap.to(this.uniforms.uOpacity, { value: to, duration, ease: 'power2.inOut', overwrite: true });
  }

  colors(a, b, duration = 1.5) {
    const tw = (u, hex) => {
      const c = new THREE.Color(hex);
      return gsap.to(u.value, { r: c.r, g: c.g, b: c.b, duration, ease: 'power2.inOut' });
    };
    tw(this.uniforms.uColorA, a);
    tw(this.uniforms.uColorB, b);
  }

  update(t) {
    this.uniforms.uTime.value = t;
  }
}
