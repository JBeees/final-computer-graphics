import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// === SCENE SETUP ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// Kamera sedikit didekatkan agar objek terlihat pas
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5, 4, 10); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// === ADJUSTMENT LANTAI ===
// Ukuran diperkecil (12, 12) dan posisi dinaikkan (-2.5) agar pas dengan jaring
const gridHelper = new THREE.GridHelper(12, 12, 0x444444, 0x222222);
gridHelper.position.y = -2.5; 
scene.add(gridHelper);

// === VARIABLES ===
let radius = 1.5;
let height = 3;
const segments = 72; 
let panels = [];
let topCap, bottomCap;
let cylinderGroup;

// State Animation
let state = {
    progress: 0,
    target: 0,
    animating: false,
    showInfo: false
};

const elParams = document.getElementById('cylParams');
const elVol = document.getElementById('cylVol');
const elArea = document.getElementById('cylArea');
const labels = [];

// === FUNCTIONS ===

function createGeometry() {
    if (cylinderGroup) scene.remove(cylinderGroup);
    cylinderGroup = new THREE.Group();
    
    // === ADJUSTMENT POSISI TABUNG ===
    // Diturunkan ke 0.5. 
    // Hitungan: 0.5 (center) - 1.5 (setengah tinggi) - 1.5 (radius tutup bawah) = -2.5 (pas lantai)
    cylinderGroup.position.y = 0.5; 
    scene.add(cylinderGroup);
    panels = [];

    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1, 
        polygonOffsetUnits: 1
    });
    const borderMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const faintLineMat = new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.4 });

    const segmentWidth = (2 * Math.PI * radius) / segments;
    
    // 1. SELIMUT
    for(let i=0; i<segments; i++) {
        const geom = new THREE.PlaneGeometry(segmentWidth, height);
        const mesh = new THREE.Mesh(geom, material);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), faintLineMat);
        mesh.add(edges);

        // Border atas bawah
        const borderGeom = new THREE.BufferGeometry();
        const hw = segmentWidth/2; 
        const hh = height/2;
        const vertices = new Float32Array([-hw, hh, 0, hw, hh, 0, -hw, -hh, 0, hw, -hh, 0]);
        borderGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        const borderLines = new THREE.LineSegments(borderGeom, borderMat);
        mesh.add(borderLines);

        const group = new THREE.Group();
        group.add(mesh);

        const centeredIndex = i - segments/2; 
        const angle = (centeredIndex * 2 * Math.PI) / segments;
        group.userData = { angle: angle, index: centeredIndex, width: segmentWidth };
        panels.push(group);
        cylinderGroup.add(group);
    }

    // 2. CAPS
    const circleGeom = new THREE.CircleGeometry(radius, 64);
    const circleBorder = new THREE.EdgesGeometry(circleGeom);

    topCap = new THREE.Group();
    const topMesh = new THREE.Mesh(circleGeom, material);
    const topLine = new THREE.LineSegments(circleBorder, borderMat);
    topCap.add(topMesh, topLine);
    topMesh.position.y = radius; 
    topLine.position.y = radius;
    cylinderGroup.add(topCap);

    bottomCap = new THREE.Group();
    const botMesh = new THREE.Mesh(circleGeom, material);
    const botLine = new THREE.LineSegments(circleBorder, borderMat);
    bottomCap.add(botMesh, botLine);
    botMesh.position.y = -radius;
    botLine.position.y = -radius;
    cylinderGroup.add(bottomCap);
    
    updateMeshPositions(0);
    updateLabelsPositions(); 
}

function updateMeshPositions(t) {
    panels.forEach(p => {
        const angle = p.userData.angle;
        const flatX = p.userData.index * p.userData.width;
        
        const cylX = Math.sin(angle) * radius;
        const cylZ = Math.cos(angle) * radius;
        const cylRot = angle;

        p.position.x = THREE.MathUtils.lerp(cylX, flatX, t);
        p.position.z = THREE.MathUtils.lerp(cylZ, 0, t);
        p.rotation.y = THREE.MathUtils.lerp(cylRot, 0, t);
    });

    const centerPanel = panels.find(p => p.userData.index === 0);
    if(centerPanel) {
        const hingeX = centerPanel.position.x;
        const hingeZ = centerPanel.position.z;

        topCap.position.set(hingeX, height/2, hingeZ);
        topCap.rotation.y = centerPanel.rotation.y;
        topCap.rotation.x = THREE.MathUtils.lerp(-Math.PI/2, 0, t);

        bottomCap.position.set(hingeX, -height/2, hingeZ);
        bottomCap.rotation.y = centerPanel.rotation.y;
        bottomCap.rotation.x = THREE.MathUtils.lerp(Math.PI/2, 0, t);
    }
}

function updateFormulas() {
    const rReal = radius * 10;
    const hReal = height * 10;
    
    const V = Math.PI * rReal * rReal * hReal;
    const A = 2 * Math.PI * rReal * (rReal + hReal);

    elParams.textContent = `r = ${rReal.toFixed(0)} cm, h = ${hReal.toFixed(0)} cm`;
    elVol.textContent = `V = ${V.toFixed(0)} cm³`;
    elArea.textContent = `A = ${A.toFixed(0)} cm²`;
}

// === LABELS ===
function createInfoLabel(text) {
    const label = document.createElement('div');
    label.className = 'info-label';
    label.textContent = text;
    label.style.display = 'none';
    document.body.appendChild(label);
    return label;
}

const lblR = createInfoLabel('Jari-jari (r)');
const lblH = createInfoLabel('Tinggi (t)');
const lblTop = createInfoLabel('Tutup');
labels.push({ el: lblR, id: 'r' }, { el: lblH, id: 'h' }, { el: lblTop, id: 'top' });

function updateLabelsPositions() {
    if(!state.showInfo) {
        labels.forEach(l => l.el.style.display = 'none');
        return;
    }

    const isUnfolded = state.progress > 0.5;
    let posR, posH, posTop;

    if(isUnfolded) {
        // Mode Jaring
        posH = new THREE.Vector3(radius * Math.PI, 0, 0); 
        posR = new THREE.Vector3(0, height/2 + radius, 0); 
        posTop = new THREE.Vector3(0, height/2 + 2*radius, 0);
    } else {
        // Mode Tabung
        posH = new THREE.Vector3(radius, 0, 0);
        posR = new THREE.Vector3(radius/2, height/2, 0);
        posTop = new THREE.Vector3(0, height/2, 0);
    }

    const positions = { 'r': posR, 'h': posH, 'top': posTop };

    labels.forEach(l => {
        let localPos = positions[l.id];
        
        if(localPos) {
            let worldPos = localPos.clone();
            worldPos.applyMatrix4(cylinderGroup.matrixWorld);

            const vector = worldPos.project(camera);
            
            if(vector.z > 1) {
                l.el.style.display = 'none';
            } else {
                const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
                
                let offsetX = 15; 
                let offsetY = -15; 

                l.el.style.left = (x + offsetX) + 'px';
                l.el.style.top = (y + offsetY) + 'px';
                l.el.style.display = 'block';
            }
        }
    });
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// === ANIMATION LOOP ===
function animate() {
    requestAnimationFrame(animate);

    if (state.animating) {
        if (Math.abs(state.progress - state.target) > 0.001) {
            state.progress += (state.target - state.progress) * 0.03;
        } else {
            state.progress = state.target;
            state.animating = false;
        }

        const t = easeInOutCubic(state.progress);
        updateMeshPositions(t);
    }

    controls.update();
    updateLabelsPositions(); 
    renderer.render(scene, camera);
}

// === EVENTS ===
document.getElementById('prevBtn').onclick = () => window.location.href = "cone.html";
document.getElementById('nextBtn').onclick = () => window.location.href = "pyramid.html";

document.getElementById('unfoldBtn').addEventListener('click', () => {
    state.target = 1;
    state.animating = true;
});

document.getElementById('foldBtn').addEventListener('click', () => {
    state.target = 0;
    state.animating = true;
});

document.getElementById('showInfoBtn').addEventListener('click', (e) => {
    state.showInfo = !state.showInfo;
    e.target.textContent = state.showInfo ? 'Sembunyikan Info' : 'Tampilkan Info';
});

document.getElementById('resetBtn').addEventListener('click', () => {
    camera.position.set(5, 4, 10);
    controls.target.set(0, 0, 0);
});

// Zoom
document.getElementById('zoomInBtn').addEventListener('click', () => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, 1);
});
document.getElementById('zoomOutBtn').addEventListener('click', () => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, -1);
});

// Size
document.getElementById('addSizeBtn').addEventListener('click', () => {
    if (radius < 2.5) {
        radius += 0.2; height += 0.4;
        createGeometry(); 
        updateFormulas();
        updateMeshPositions(state.progress);
    }
});
document.getElementById('reduceSizeBtn').addEventListener('click', () => {
    if (radius > 0.5) {
        radius -= 0.2; height -= 0.4;
        createGeometry(); 
        updateFormulas();
        updateMeshPositions(state.progress);
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// INIT
createGeometry();
updateFormulas();
animate();

