import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// === Scene setup ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(3, 2.5, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
gridHelper.position.y = -2;
scene.add(gridHelper);

// === Parameters ===
let radius = 1;
let height = 2;
const segments = 25;

// === Materials ===
const baseMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  side: THREE.DoubleSide,
  transparent: true
});

const edgeMaterial = new THREE.LineBasicMaterial({ 
  color: 0x000000, 
  linewidth: 2,
  transparent: true
});

// === Groups ===
const coneGroup = new THREE.Group();
const sectorGroup = new THREE.Group();
scene.add(coneGroup, sectorGroup);
sectorGroup.visible = false;

// === Variables ===
let slices = [];
let baseCap = null;
let sectorMesh = null;
let sectorWire = null;
let sectorBase = null;
let sectorBaseWire = null;
let showInfo = false;
const infoLabels = [];

// === Info labels ===
function createInfoLabel(text) {
  const label = document.createElement('div');
  label.className = 'info-label';
  label.textContent = text;
  label.style.display = 'none';
  document.body.appendChild(label);
  return label;
}

const apexLabel = createInfoLabel('Apex (1 vertex)');
const slantLabel = createInfoLabel('Slant height (s)');
const baseLabel = createInfoLabel('Base (circular)');

function updateInfoLabels() {
  if (!showInfo || unfolding || folding) {
    infoLabels.forEach(label => label.element.style.display = 'none');
    return;
  }

  infoLabels.forEach(label => {
    const position = label.position.clone();
    const vector = position.project(camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vector.y * -0.5 + 0.5) * window.innerHeight;

    label.element.style.left = (x + label.offset.x) + 'px';
    label.element.style.top = (y + label.offset.y) + 'px';
    label.element.style.display = 'block';
  });
}

// === Create cone function ===
function createCone() {
  // Clear existing
  while (coneGroup.children.length > 0) {
    const child = coneGroup.children[0];
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
    coneGroup.remove(child);
  }
  slices = [];

  const slantHeight = Math.sqrt(radius ** 2 + height ** 2);
  const unfoldAngle = (2 * Math.PI * radius) / slantHeight;
  const angleStep = (2 * Math.PI) / segments;

  // Create cone slices
  for (let i = 0; i < segments; i++) {
    const theta1 = i * angleStep;
    const theta2 = (i + 1) * angleStep;

    const geom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, height / 2, 0,
      Math.cos(theta1) * radius, -height / 2, Math.sin(theta1) * radius,
      Math.cos(theta2) * radius, -height / 2, Math.sin(theta2) * radius
    ]);
    geom.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geom.setIndex([0, 1, 2]);
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, baseMaterial.clone());
    const edgeGeometry = new THREE.EdgesGeometry(geom);
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial.clone());

    const pivot = new THREE.Group();
    pivot.position.set(0, height / 2, 0);
    mesh.position.sub(pivot.position);
    edges.position.copy(mesh.position);
    pivot.add(mesh);
    pivot.add(edges);
    coneGroup.add(pivot);
    
    pivot.userData.unfoldAngle = unfoldAngle;
    pivot.userData.sliceIndex = i;
    slices.push(pivot);
  }

  // Create base cap (alas cone)
  const baseCircleGeom = new THREE.CircleGeometry(radius, segments);
  
  baseCap = new THREE.Group();
  const baseMesh = new THREE.Mesh(baseCircleGeom, baseMaterial.clone());
  baseMesh.material.transparent = true;
  baseMesh.material.opacity = 1;
  baseMesh.rotation.x = -Math.PI / 2;
  
  const baseEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(baseCircleGeom),
    edgeMaterial.clone()
  );
  baseEdges.material.transparent = true;
  baseEdges.material.opacity = 1;
  baseEdges.rotation.x = -Math.PI / 2;
  
  baseCap.add(baseMesh, baseEdges);
  baseCap.position.y = -height / 2;
  coneGroup.add(baseCap);

  // Create sector (unfolded shape)
  if (sectorMesh) {
    sectorGroup.remove(sectorMesh);
    sectorGroup.remove(sectorWire);
    if (sectorBase) sectorGroup.remove(sectorBase);
    if (sectorBaseWire) sectorGroup.remove(sectorBaseWire);
    sectorMesh.geometry.dispose();
    sectorWire.geometry.dispose();
    if (sectorBase) sectorBase.geometry.dispose();
    if (sectorBaseWire) sectorBaseWire.geometry.dispose();
  }

  const sectorGeometry = new THREE.BufferGeometry();
  const vertices = [0, 0, 0];
  for (let i = 0; i <= segments; i++) {
    const theta = i * angleStep * (unfoldAngle / (2 * Math.PI));
    const x = Math.cos(theta) * slantHeight;
    const z = Math.sin(theta) * slantHeight;
    vertices.push(x, 0, z);
  }
  const indices = [];
  for (let i = 0; i < segments; i++) indices.push(0, i + 1, i + 2);

  sectorGeometry.setIndex(indices);
  sectorGeometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  sectorGeometry.computeVertexNormals();

  const sectorMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
  });
  sectorMesh = new THREE.Mesh(sectorGeometry, sectorMaterial);
  sectorGroup.add(sectorMesh);

  sectorWire = new THREE.LineSegments(
    new THREE.WireframeGeometry(sectorGeometry),
    edgeMaterial.clone()
  );
  sectorWire.material.transparent = true;
  sectorWire.material.opacity = 0;
  sectorGroup.add(sectorWire);

  // Create base circle for sector (tetap horizontal juga)
  const sectorBaseGeom = new THREE.CircleGeometry(radius, segments);
  sectorBase = new THREE.Mesh(sectorBaseGeom, baseMaterial.clone());
  sectorBase.material.transparent = true;
  sectorBase.material.opacity = 0;
  sectorBase.rotation.x = -Math.PI / 2; // Horizontal seperti base cap
  sectorBase.position.set(0, 0, slantHeight * -0.5); // X=0 (tengah), Z ke belakang
  sectorGroup.add(sectorBase);

  sectorBaseWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(sectorBaseGeom),
    edgeMaterial.clone()
  );
  sectorBaseWire.material.transparent = true;
  sectorBaseWire.material.opacity = 0;
  sectorBaseWire.rotation.x = -Math.PI / 2; // Horizontal
  sectorBaseWire.position.copy(sectorBase.position);
  sectorGroup.add(sectorBaseWire);

  // Update info labels positions
  infoLabels.length = 0;
  infoLabels.push(
    { element: apexLabel, position: new THREE.Vector3(0, height / 2, 0), offset: { x: 10, y: -10 } },
    { element: slantLabel, position: new THREE.Vector3(radius / 2, 0, 0), offset: { x: 10, y: 0 } },
    { element: baseLabel, position: new THREE.Vector3(0, -height / 2, 0), offset: { x: 10, y: 10 } }
  );
}

// === Update formulas ===
function updateFormulas() {
  const r = radius * 10;
  const h = height * 10;
  const s = Math.sqrt(r ** 2 + h ** 2);
  const v = (1 / 3) * Math.PI * r ** 2 * h;
  const a = Math.PI * r * (r + s);

  document.getElementById('coneParams').textContent = `r = ${r.toFixed(0)} cm, h = ${h.toFixed(0)} cm`;
  document.getElementById('coneSlant').textContent = `s = ${s.toFixed(2)} cm`;
  document.getElementById('coneVolume').textContent = `V = ${v.toFixed(2)} cm³`;
  document.getElementById('coneSurface').textContent = `A = ${a.toFixed(2)} cm²`;
}

// Initialize
createCone();
updateFormulas();

// === Animation control ===
let unfolding = false, folding = false, progress = 0;
let unfold = false;

document.getElementById("unfoldBtn").addEventListener('click', () => {
  unfolding = true;
  folding = false;
  progress = 0;
  unfold = true;
  coneGroup.visible = true;
  sectorGroup.visible = false;
  if (showInfo) {
    infoLabels.forEach(label => label.element.style.display = 'none');
    showInfo = false;
    document.getElementById("showInfoBtn").textContent = "Show Info";
  }
});

document.getElementById("foldBtn").addEventListener('click', () => {
  folding = true;
  unfolding = false;
  progress = 1;
  unfold = false;
  coneGroup.visible = true;
  sectorGroup.visible = false;
});

document.getElementById("resetBtn").addEventListener('click', () => {
  camera.position.set(3, 2.5, 4);
  controls.target.set(0, 0, 0);
  controls.update();
});

document.getElementById('showInfoBtn').addEventListener('click', () => {
  if (unfold) {
    return;
  }
  showInfo = !showInfo;
  const btn = document.getElementById('showInfoBtn');
  btn.textContent = showInfo ? 'Hide Info' : 'Show Info';
  updateInfoLabels();
});

document.getElementById('zoomInBtn').addEventListener('click', () => {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  camera.position.addScaledVector(direction, 0.5);
  controls.update();
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  camera.position.addScaledVector(direction, -0.5);
  controls.update();
});

document.getElementById('addSizeBtn').addEventListener('click', () => {
  if (radius <= 2.5) {
    radius += 0.1;
    height += 0.2;
    createCone();
    updateFormulas();
    const easedProgress = easeInOutCubic(progress);
    applyUnfoldTransform(easedProgress);
  }
});

document.getElementById('redSizeBtn').addEventListener('click', () => {
  if (radius > 0.3) {
    radius -= 0.1;
    height -= 0.2;
    createCone();
    updateFormulas();
    const easedProgress = easeInOutCubic(progress);
    applyUnfoldTransform(easedProgress);
  }
});

// Navigation buttons
document.getElementById("prevShapeBtn").onclick = () => {
  window.location.href = "cube.html";
};
document.getElementById("nextShapeBtn").onclick = () => {
  window.location.href = "cylinder.html";
};

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function applyUnfoldTransform(easedProgress) {
  const slantHeight = Math.sqrt(radius ** 2 + height ** 2);
  const unfoldAngle = (2 * Math.PI * radius) / slantHeight;
  const angleStep = (2 * Math.PI) / segments;

  // Animate cone slices with staggered delay
  for (let i = 0; i < slices.length; i++) {
    const t = i / segments;
    const delay = i * 0.015;
    const duration = 0.6;
    const local = (easedProgress - delay) / duration;
    const localP = THREE.MathUtils.clamp(local, 0, 1);
    const eased = easeInOutCubic(localP);
    const rotY = (unfoldAngle / 2 - t * unfoldAngle) * eased;
    const rotX = -Math.PI / 2 * eased * 0.95;
    slices[i].rotation.set(rotX, rotY, 0);
    
    // Opacity crossfade for slices
    slices[i].children.forEach((child) => {
      if (child.material) {
        child.material.opacity = 1 - easedProgress;
      }
    });
  }

  // Animate base cap
  if (baseCap) {
    const startY = -height / 2;
    const endY = 0; // Naik ke level yang sama dengan sector
    const startX = 0;
    const endX = slantHeight * 0; // Tetap di tengah (X = 0)
    const endZ = slantHeight * -0.5; // Geser ke belakang agar tidak tabrakan
    
    baseCap.position.y = THREE.MathUtils.lerp(startY, endY, easedProgress);
    baseCap.position.x = THREE.MathUtils.lerp(startX, endX, easedProgress);
    baseCap.position.z = THREE.MathUtils.lerp(0, endZ, easedProgress);
    
    // Tetap horizontal (tidak berubah rotasi)
    baseCap.children.forEach((c) => {
      // Rotasi tetap -π/2 (horizontal) dari awal sampai akhir
      c.rotation.x = -Math.PI / 2;
      if (c.material) c.material.opacity = 1 - easedProgress;
    });
  }

  // Fade in sector and its base
  if (sectorMesh) sectorMesh.material.opacity = easedProgress;
  if (sectorWire) sectorWire.material.opacity = easedProgress;
  if (sectorBase) sectorBase.material.opacity = easedProgress;
  if (sectorBaseWire) sectorBaseWire.material.opacity = easedProgress;
}

// === Animation loop ===
let lastTime = 0;
function animate(time) {
  requestAnimationFrame(animate);
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  if (unfolding) {
    progress += dt * 0.4;
    if (progress >= 1) {
      progress = 1;
      unfolding = false;
      coneGroup.visible = false;
      sectorGroup.visible = true;
      // Set final opacity
      if (sectorMesh) sectorMesh.material.opacity = 1;
      if (sectorWire) sectorWire.material.opacity = 1;
      if (sectorBase) sectorBase.material.opacity = 1;
      if (sectorBaseWire) sectorBaseWire.material.opacity = 1;
    }
   } else if (folding) {
    progress -= dt * 0.4;
    if (progress <= 0) {
      progress = 0;
      folding = false;
      // Reset slices rotation and opacity
      slices.forEach((slice) => {
        slice.rotation.set(0, 0, 0); // ✅ Reset rotation ke 0
        slice.children.forEach((child) => {
          if (child.material) child.material.opacity = 1;
        });
      });
      if (baseCap) {
        // Reset position
        baseCap.position.set(0, -height / 2, 0);
        // Reset opacity
        baseCap.children.forEach((c) => {
          c.rotation.x = -Math.PI / 2;
          if (c.material) c.material.opacity = 1;
        });
      }
      // Reset sector opacity ke 0 (PENTING!)
      if (sectorMesh) sectorMesh.material.opacity = 0;
      if (sectorWire) sectorWire.material.opacity = 0;
      if (sectorBase) sectorBase.material.opacity = 0;
      if (sectorBaseWire) sectorBaseWire.material.opacity = 0;
      
      // Sembunyikan sector group
      sectorGroup.visible = false;
    }
  }

  if (unfolding || folding) {
    coneGroup.visible = true;
    sectorGroup.visible = true;
  }

  const easedProgress = easeInOutCubic(progress);
  applyUnfoldTransform(easedProgress);

  controls.update();
  renderer.render(scene, camera);
  updateInfoLabels();
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});