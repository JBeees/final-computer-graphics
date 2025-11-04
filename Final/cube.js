import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(4, 4, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
gridHelper.position.y = -2;
scene.add(gridHelper);

let faceSize = 1;
let halfSize = faceSize / 2;

const materials = {
  front: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  back: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  top: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  bottom: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  right: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  left: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
};

const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });

function createFace(material, name) {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(faceSize, faceSize);
  const mesh = new THREE.Mesh(geometry, material);
  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  group.add(mesh);
  group.add(edges);
  group.userData.name = name;
  return group;
}

const frontPivot = new THREE.Group();
scene.add(frontPivot);
const frontFace = createFace(materials.front, 'front');
frontFace.position.set(0, 0, halfSize);
frontPivot.add(frontFace);
frontPivot.userData.target = { rotation: new THREE.Euler(0, Math.PI, 0), position: new THREE.Vector3(faceSize * 2, 0, 0) };

const leftPivot = new THREE.Group();
scene.add(leftPivot);
const leftFace = createFace(materials.left, 'left');
leftFace.rotation.y = -Math.PI / 2;
leftFace.position.set(-halfSize, 0, 0);
leftPivot.add(leftFace);
leftPivot.userData.target = { rotation: new THREE.Euler(0, -Math.PI / 2, 0), position: new THREE.Vector3(-faceSize, 0, 0) };

const rightPivot = new THREE.Group();
scene.add(rightPivot);
const rightFace = createFace(materials.right, 'right');
rightFace.rotation.y = Math.PI / 2;
rightFace.position.set(halfSize, 0, 0);
rightPivot.add(rightFace);
rightPivot.userData.target = { rotation: new THREE.Euler(0, Math.PI / 2, 0), position: new THREE.Vector3(faceSize, 0, 0) };

const topPivot = new THREE.Group();
scene.add(topPivot);
const topFace = createFace(materials.top, 'top');
topFace.rotation.x = -Math.PI / 2;
topFace.position.set(0, halfSize, 0);
topPivot.add(topFace);
topPivot.userData.target = { rotation: new THREE.Euler(-Math.PI / 2, 0, 0), position: new THREE.Vector3(0, faceSize, 0) };

const bottomPivot = new THREE.Group();
scene.add(bottomPivot);
const bottomFace = createFace(materials.bottom, 'bottom');
bottomFace.rotation.x = Math.PI / 2;
bottomFace.position.set(0, -halfSize, 0);
bottomPivot.add(bottomFace);
bottomPivot.userData.target = { rotation: new THREE.Euler(Math.PI / 2, 0, 0), position: new THREE.Vector3(0, -faceSize, 0) };

const backFace = createFace(materials.back, 'back');
backFace.position.set(0, 0, -halfSize);
scene.add(backFace);

const pivots = [frontPivot, leftPivot, rightPivot, topPivot, bottomPivot];
const allFaces = [frontFace, leftFace, rightFace, topFace, bottomFace, backFace];

let animating = false;
let progress = 0;
const animationSpeed = 0.01;
let targetProgress = 0;
let showInfo = false;
const infoLabels = [];

const edge = document.getElementById("cubeEdge");
const volume = document.getElementById("cubeVolume");
const surface = document.getElementById("cubeSurface");

function createInfoLabel(text) {
  const label = document.createElement('div');
  label.className = 'info-label';
  label.textContent = text;
  label.style.display = 'none';
  document.body.appendChild(label);
  return label;
}

const vertexLabel = createInfoLabel('Vertex (8 total)');
const edgeLabel = createInfoLabel('Edge (12 total)');
const faceLabel = createInfoLabel('Face (6 total)');

infoLabels.push(
  { element: vertexLabel, position: new THREE.Vector3(halfSize, halfSize, halfSize), offset: { x: 10, y: -10 } },
  { element: edgeLabel, position: new THREE.Vector3(halfSize, halfSize, 0), offset: { x: 10, y: 0 } },
  { element: faceLabel, position: new THREE.Vector3(0, 0, halfSize + 0.01), offset: { x: 10, y: 10 } }
);

function updateInfoLabels() {
  if (!showInfo) {
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

function updateCubeSize() {
  halfSize = faceSize / 2;
  const a = faceSize * 10;
  const v = a ** 3;
  const area = 6 * a ** 2;
  edge.textContent = `Let a = ${a.toFixed(0)} cm`;
  volume.textContent = `V = ${a.toFixed(0)}³ = ${v.toFixed(0)} cm³`;
  surface.textContent = `A = 6 x ${a.toFixed(0)}² = ${area.toFixed(0)} cm²`;

  allFaces.forEach(face => {
    const mesh = face.children[0];
    const edges = face.children[1];

    mesh.geometry.dispose();
    edges.geometry.dispose();

    const newGeometry = new THREE.PlaneGeometry(faceSize, faceSize);
    const newEdgeGeometry = new THREE.EdgesGeometry(newGeometry);

    mesh.geometry = newGeometry;
    edges.geometry = newEdgeGeometry;
  });

  frontFace.position.set(0, 0, halfSize);
  leftFace.position.set(-halfSize, 0, 0);
  rightFace.position.set(halfSize, 0, 0);
  topFace.position.set(0, halfSize, 0);
  bottomFace.position.set(0, -halfSize, 0);
  backFace.position.set(0, 0, -halfSize);

  infoLabels[0].position = new THREE.Vector3(halfSize, halfSize, halfSize);
  infoLabels[1].position = new THREE.Vector3(halfSize, halfSize, 0);
  infoLabels[2].position = new THREE.Vector3(0, 0, halfSize + 0.01);

  frontPivot.userData.target.position = new THREE.Vector3(faceSize * 2, 0, 0);
  leftPivot.userData.target.position = new THREE.Vector3(-faceSize, 0, 0);
  rightPivot.userData.target.position = new THREE.Vector3(faceSize, 0, 0);
  topPivot.userData.target.position = new THREE.Vector3(0, faceSize, 0);
  bottomPivot.userData.target.position = new THREE.Vector3(0, -faceSize, 0);

  const easedProgress = easeInOutCubic(progress);
  pivots.forEach(pivot => {
    const target = pivot.userData.target;
    pivot.rotation.x = THREE.MathUtils.lerp(0, target.rotation.x, easedProgress);
    pivot.rotation.y = THREE.MathUtils.lerp(0, target.rotation.y, easedProgress);
    pivot.rotation.z = THREE.MathUtils.lerp(0, target.rotation.z, easedProgress);
    pivot.position.x = THREE.MathUtils.lerp(0, target.position.x, easedProgress);
    pivot.position.y = THREE.MathUtils.lerp(0, target.position.y, easedProgress);
    pivot.position.z = THREE.MathUtils.lerp(0, target.position.z, easedProgress);
  });
}

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
  if (faceSize <= 2.5) {
    faceSize += 0.1;
    updateCubeSize();
  }
});

document.getElementById('redSizeBtn').addEventListener('click', () => {
  if (faceSize > 0.3) {
    faceSize -= 0.1;
    updateCubeSize();
  }
});
let unfold = false;
document.getElementById('unfoldBtn').addEventListener('click', () => {
  targetProgress = 1;
  unfold = true;
  if (showInfo) {
    infoLabels.forEach(label => label.element.style.display = 'none');
    showInfo = !showInfo;
    const tempBtn = document.getElementById("showInfoBtn");
    tempBtn.textContent = "Show Info";
  }
  animating = true;
});

document.getElementById('foldBtn').addEventListener('click', () => {
  targetProgress = 0;
  unfold = false;
  animating = true;
});

document.getElementById('resetBtn').addEventListener('click', () => {
  camera.position.set(4, 4, 6);
  controls.target.set(0, 0, 0);
  controls.update();
});

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animate() {
  requestAnimationFrame(animate);

  if (animating) {
    if (Math.abs(progress - targetProgress) > 0.001) {
      progress += (targetProgress - progress) * animationSpeed * 3;
    } else {
      progress = targetProgress;
      animating = false;
    }

    const easedProgress = easeInOutCubic(progress);

    pivots.forEach(pivot => {
      const target = pivot.userData.target;

      pivot.rotation.x = THREE.MathUtils.lerp(0, target.rotation.x, easedProgress);
      pivot.rotation.y = THREE.MathUtils.lerp(0, target.rotation.y, easedProgress);
      pivot.rotation.z = THREE.MathUtils.lerp(0, target.rotation.z, easedProgress);

      pivot.position.x = THREE.MathUtils.lerp(0, target.position.x, easedProgress);
      pivot.position.y = THREE.MathUtils.lerp(0, target.position.y, easedProgress);
      pivot.position.z = THREE.MathUtils.lerp(0, target.position.z, easedProgress);
    });
  }

  controls.update();
  renderer.render(scene, camera);
  updateInfoLabels();
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});