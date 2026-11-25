import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

/*
  Crisp 3D line drawings with real pixel widths (WebGL's built-in lines are 1px,
  which AirPlay smears away). Segments draw on in order via draw(progress).
*/
export function lineModel(stage, segs, { color = '#fff3e3', width = 3.5 } = {}) {
  const pos = [];
  segs.forEach(([a, b]) => pos.push(...a, ...b));
  const geo = new LineSegmentsGeometry();
  geo.setPositions(pos);
  const mat = new LineMaterial({ color: new THREE.Color(color), linewidth: width, transparent: true, opacity: 1 });
  const size = new THREE.Vector2();
  const syncRes = () => { stage.renderer.getSize(size); mat.resolution.set(size.x, size.y); };
  syncRes();
  window.addEventListener('resize', syncRes);
  const obj = new LineSegments2(geo, mat);
  const total = segs.length;
  geo.instanceCount = 0;
  const group = new THREE.Group();
  group.add(obj);
  stage.scene.add(group);
  const state = { p: 0 };
  return {
    group, state,
    draw(p) { state.p = p; geo.instanceCount = Math.max(0, Math.min(total, Math.round(total * p))); },
    dispose() {
      window.removeEventListener('resize', syncRes);
      stage.scene.remove(group);
      geo.dispose(); mat.dispose();
    },
  };
}
