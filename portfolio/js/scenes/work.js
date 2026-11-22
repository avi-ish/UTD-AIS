import * as THREE from 'three';
import { glyphFloor } from '../art.js';

// Selected credentials: floating panels ride the outside of a big drum. Card 0
// is the hero frame itself, cards 1..n are credentials, and the last card is a
// live window into the next scene that grows to fill the screen.

export function createWork({ heroCanvas, cards: cardCanvases, portalTexture, anisotropy }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf1f1ef);
  scene.fog = new THREE.Fog(0xf1f1ef, 5, 16);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 60);
  const D0 = 2.75;      // distance of the centred card
  const R = 3.0;        // drum radius
  const STEP = 0.6;     // angle between cards
  const viewH = () => 2 * D0 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  // faint text floor
  const floorTex = new THREE.CanvasTexture(glyphFloor());
  floorTex.colorSpace = THREE.SRGBColorSpace;
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(6, 6);
  floorTex.anisotropy = anisotropy;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, opacity: 0.75, depthWrite: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1.35, -10);
  scene.add(floor);

  const cards = [];
  const bend = (geo, amount) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setZ(i, -amount * x * x);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  };

  // card 0: the hero frame
  const heroTex = new THREE.CanvasTexture(heroCanvas);
  heroTex.colorSpace = THREE.SRGBColorSpace;
  heroTex.generateMipmaps = false;
  heroTex.minFilter = THREE.LinearFilter;
  const heroMat = new THREE.MeshBasicMaterial({ map: heroTex, fog: false });
  const heroMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 24, 12), heroMat);
  scene.add(heroMesh);
  cards.push({ mesh: heroMesh, kind: 'hero' });

  // credential cards
  cardCanvases.forEach((cv, i) => {
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false });
    const mesh = new THREE.Mesh(bend(new THREE.PlaneGeometry(1.6, 1, 32, 16), 0.06), mat);
    mesh.userData.card = i;
    scene.add(mesh);
    cards.push({ mesh, kind: 'card', index: i });
  });

  // last card: window into the next scene
  const portalMat = new THREE.MeshBasicMaterial({ map: portalTexture, fog: false });
  const portalMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 24, 12), portalMat);
  scene.add(portalMesh);
  cards.push({ mesh: portalMesh, kind: 'portal' });

  const PORTAL_INDEX = cards.length - 1;
  let aspect = 1;
  let hovered = -1;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function resize(a) {
    aspect = a;
    camera.aspect = a;
    // on tall screens widen the lens so a whole card still fits across
    const need = 2 * Math.atan((1.6 / 0.88 / 2) / D0 / a) * 180 / Math.PI;
    camera.fov = Math.max(35, need);
    camera.updateProjectionMatrix();
  }

  function pose(mesh, u, extra = {}) {
    const a = u * STEP;
    mesh.position.set(u * 0.42, -R * Math.sin(a), -D0 - R + R * Math.cos(a));
    mesh.rotation.set(a, 0, 0.24 * Math.min(Math.abs(u), 1.5) * (u < 0 ? 1.15 : 0.85));
    mesh.visible = Math.abs(u) < 2.4;
    if (extra.scale) mesh.scale.copy(extra.scale);
  }

  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const tmp = new THREE.Vector3();

  /**
   * r: ring position (card i is centred when r === i)
   * grow: 0..1 how far the portal card has grown to fill the screen
   */
  function update(t, dt, { r, grow, pointer, barrel }) {
    const full = viewH();

    // hero card: full screen at r = 0, card-sized by r ≈ 0.6
    const hp = ease(r / 0.6);
    const hs = THREE.MathUtils.lerp(full, 0.95, hp);
    heroMesh.scale.set(hs * aspect, hs, 1);
    pose(heroMesh, 0 - r);
    if (r < 0.002) { heroMesh.position.set(0, 0, -D0); heroMesh.rotation.set(0, 0, 0); }
    if (heroMesh.visible) heroTex.needsUpdate = true;

    for (let i = 1; i < cards.length; i++) {
      const c = cards[i];
      const u = i - Math.min(r, PORTAL_INDEX);
      if (c.kind === 'portal') {
        const g = ease(grow);
        const s = THREE.MathUtils.lerp(1.0, full, g);
        c.mesh.scale.set(s * aspect, s, 1);
        pose(c.mesh, u * (1 - g));
        c.mesh.position.lerp(tmp.set(0, 0, -D0), g);
        c.mesh.visible = Math.abs(u) < 2.4;
      } else {
        const hov = i === hovered ? 1.035 : 1;
        c.mesh.scale.setScalar(THREE.MathUtils.lerp(c.mesh.scale.x, hov, 1 - Math.exp(-dt * 10)));
        pose(c.mesh, u);
        // tiny idle float
        c.mesh.position.y += Math.sin(t * 0.8 + i) * 0.01;
      }
    }

    // gentle parallax
    camera.position.x = (pointer.nx || 0) * 0.06;
    camera.position.y = -(pointer.ny || 0) * 0.04;
    camera.lookAt(camera.position.x * 0.5, camera.position.y * 0.5, -D0);
    floor.position.z = -10 + (r * 0.8) % 6.67;

    // hover: undo the post barrel so the ray hits what the eye sees
    hovered = -1;
    if (pointer.inside && grow <= 0.001) {
      let x = pointer.hx, y = pointer.hy;
      const dx = x * aspect * 0.5, dy = y * 0.5, rr = dx * dx + dy * dy;
      x *= 1 + barrel * rr; y *= 1 + barrel * rr;
      ndc.set(x, -y);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(cards.filter((c) => c.kind === 'card' && c.mesh.visible).map((c) => c.mesh), false);
      if (hits.length) hovered = hits[0].object.userData.card + 1;
    }
  }

  return {
    scene, camera, resize, update,
    get hoveredCard() { return hovered > 0 ? hovered - 1 : -1; },
    count: cards.length,
    PORTAL_INDEX,
  };
}
