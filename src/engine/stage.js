import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { ParticleField } from './particles.js';

/*
  The persistent 3D world behind every slide: renderer, camera rig,
  post-processing, the shared particle field, and a tick loop slides can hook into.
*/

// Vignette + 2-LSB dither. The dither breaks up gradient banding that
// AirPlay's encoder would otherwise turn into visible steps.
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.55 },
    uFrame: { value: new THREE.Vector4(0, 0, 1, 1) },   // 16:9 frame in uv: x0, y0, x1, y1
    uBg: { value: new THREE.Vector3(0, 0, 0) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uVignette; uniform vec4 uFrame; uniform vec3 uBg; varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float v = smoothstep(1.05, .2, length((vUv - .5) * vec2(1.25, 1.)));
      c.rgb *= mix(1. - uVignette, 1., v);
      c.rgb += (rand(vUv * 1000. + fract(uTime)) - .5) * (2. / 255.);
      gl_FragColor = c;
    }`,
};

export function createStage(canvas, { preview = false, theme } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const pr = Math.min(window.devicePixelRatio || 1, preview ? 1 : 2);
  renderer.setPixelRatio(pr);
  renderer.setClearColor(new THREE.Color(theme.clear), 1);

  const scene = new THREE.Scene();
  // Background via scene.background, not the clear colour: with the composer, the clear
  // colour lands in the render target unconverted and comes out double-encoded (washed out).
  scene.background = new THREE.Color(theme.clear);
  const BASE_FOV = 35; // vertical fov across the 16:9 frame
  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 400);
  camera.position.set(0, 0, 14);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), theme.bloom.strength, 0.25, theme.bloom.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FinishShader);
  // uBg is compared after OutputPass, so it is the sRGB value as written.
  { const h = theme.clear; finish.uniforms.uBg.value.set(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)); }
  composer.addPass(finish);

  const particles = new ParticleField(preview ? 9000 : 26000, pr);
  particles.uniforms.uColorA.value.set(theme.particles[0]);
  particles.uniforms.uColorB.value.set(theme.particles[1]);
  scene.add(particles.group);

  // Camera rig: slides animate `rig`; pointer parallax is layered on top.
  const rig = { pos: new THREE.Vector3(0, 0, 14), look: new THREE.Vector3(0, 0, 0), parallax: 1 };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  const ticks = new Set();
  const clock = new THREE.Clock();

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    const fw = Math.min(w, h * 16 / 9), fh = fw * 9 / 16;
    // Keep 3D content sized to the 16:9 frame, not the window: widen the fov when the window is taller.
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * (h / fh)));
    camera.updateProjectionMatrix();
    const x0 = (w - fw) / 2 / w, y0 = (h - fh) / 2 / h;
    finish.uniforms.uFrame.value.set(x0, y0, 1 - x0, 1 - y0);
    const dpr = renderer.getPixelRatio();
    particles.uniforms.uFrame.value.set(x0 * w * dpr, y0 * h * dpr, (1 - x0) * w * dpr, (1 - y0) * h * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    pointer.sx += (pointer.x - pointer.sx) * 0.04;
    pointer.sy += (pointer.y - pointer.sy) * 0.04;
    camera.position.set(
      rig.pos.x + pointer.sx * 0.6 * rig.parallax,
      rig.pos.y - pointer.sy * 0.35 * rig.parallax,
      rig.pos.z,
    );
    camera.lookAt(rig.look);
    particles.update(t);
    finish.uniforms.uTime.value = t;
    for (const fn of ticks) fn(t, dt);
    composer.render(dt);
  }
  renderer.setAnimationLoop(frame);

  const stage = {
    THREE, theme, renderer, scene, camera, composer, bloom, particles, rig, pointer, pixelRatio: pr,

    /** Register a per-frame callback. Returns an unsubscribe function. */
    tick(fn) { ticks.add(fn); return () => ticks.delete(fn); },

    /** Fly the camera. pos/look are [x,y,z]. */
    fly({ pos, look, duration = 2.4, ease = 'power3.inOut', delay = 0 } = {}) {
      const tl = gsap.timeline({ delay });
      if (pos) tl.to(rig.pos, { x: pos[0], y: pos[1], z: pos[2], duration, ease }, 0);
      if (look) tl.to(rig.look, { x: look[0], y: look[1], z: look[2], duration, ease }, 0);
      return tl;
    },

    /** World-space width/height visible at a given depth from the default camera distance. */
    viewSize(dist = 14) {
      // World-space size of the 16:9 frame at this distance (independent of window shape).
      const h = 2 * Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * dist;
      return { w: h * (16 / 9), h };
    },

    setBloom({ strength, radius, threshold, duration = 1.2 } = {}) {
      return gsap.to(bloom, {
        ...(strength != null && { strength }),
        ...(radius != null && { radius }),
        ...(threshold != null && { threshold }),
        duration, ease: 'power2.inOut',
      });
    },
  };
  return stage;
}
