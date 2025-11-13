import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeffffff);

// // Pencahayaan
// const light = new THREE.DirectionalLight(0xffffff, 1);
// light.position.set(0, 10, 0);
// scene.add(light);
const ambient = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambient);

// Posisi kamera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(6, 6, 8);

// Anti aliasing
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Camera orbit contro;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 1.8;

// Grid Helper
const gridHelper = new THREE.GridHelper(30, 30);
gridHelper.position.y = -2.5;
scene.add(gridHelper);

// Titik sudut
const v0 = [1, 0, 1];  // kuadran 1
const v1 = [1, 0, -1]; // kuadran 2
const v2 = [-1, 0, -1]; // kuadran 3
const v3 = [-1, 0, 1];  // kuadran 4
const v4 = [0, 3, 0];       // vucuk


// Alas Limas
const alasLimas = new THREE.BufferGeometry();
const alasVertices = new Float32Array([...v0, ...v1, ...v2, ...v3]); 
alasLimas.setAttribute('position', new THREE.BufferAttribute(alasVertices, 3));
alasLimas.setIndex([0, 1, 2, 2, 3, 0]);
alasLimas.computeVertexNormals();
const matAlas = new THREE.MeshStandardMaterial({
    color: 0xffffff ,
    metalness: 0.1,
    roughness: 0.6,
    side: THREE.DoubleSide,
});
const alas = new THREE.Mesh(alasLimas, matAlas);

// Deklarasi sumbu rotasi
const rotationAxes = [];    

// Fungsi buat sisi limas
function gaweSisiLimas(t1, t2, vucuk) { 
    const segitiga = new THREE.BufferGeometry();
    
    // Konversi t1 dan t2 ke Vector3 untuk perhitungan vektor
    const p1 = new THREE.Vector3(t1[0], t1[1], t1[2]);
    const p2 = new THREE.Vector3(t2[0], t2[1], t2[2]);
    
    // 💡 Kunci 1: Hitung Vektor Sumbu Rotasi (Vektor dari P1 ke P2)
    const axis = new THREE.Vector3().subVectors(p2, p1).normalize();
    rotationAxes.push(axis); // Simpan untuk digunakan di animate()
    
    // (Perhitungan centerX, centerY, centerZ tetap sama)
    const centerX = (t1[0] + t2[0]) / 2;
    const centerZ = (t1[2] + t2[2]) / 2;
    const centerY = t1[1];
    
    // (Kunci 2: Geser Vertices relatif terhadap engsel tetap sama)
    const v1_rel = [t1[0] - centerX, t1[1] - centerY, t1[2] - centerZ];
    const v2_rel = [t2[0] - centerX, t2[1] - centerY, t2[2] - centerZ];
    const v4_rel = [vucuk[0] - centerX, vucuk[1] - centerY, vucuk[2] - centerZ];
    
    // Bikin sisi
    const vertices = new Float32Array([...v1_rel, ...v2_rel, ...v4_rel]);
    
    segitiga.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    segitiga.setIndex([0, 1, 2]);
    segitiga.computeVertexNormals();
    
    const meshObjek = new THREE.MeshStandardMaterial({
        color: 0xffffff ,
        metalness: 0.1,
        roughness: 0.6,
        side: THREE.DoubleSide,
    });

    const meshGaris = new THREE.MeshStandardMaterial({
        color: 0x000000 ,
        // metalness: 0.1,
        // roughness: 0.6,
        wireframe: true
    });

    const sisi = new THREE.Mesh(segitiga, meshObjek);
    const garis = new THREE.Mesh(segitiga, meshGaris)
    
    // 💡 KUNCI 3: Membuat Grup/Engsel
    const engselGroup = new THREE.Group();

    // Atur posisi Group di World Space (di tengah engsel)
    engselGroup.position.set(centerX, centerY, centerZ); 
    engselGroup.add(sisi);
    engselGroup.add(garis);
    return engselGroup; // Mengembalikan Grup (Engsel)
}

// -Buat sisi limas
const sisi1Group = gaweSisiLimas(v0, v1, v4); 
const sisi2Group = gaweSisiLimas(v1, v2, v4); 
const sisi3Group = gaweSisiLimas(v2, v3, v4); 
const sisi4Group = gaweSisiLimas(v3, v0, v4); 

scene.add(alas, sisi1Group, sisi2Group, sisi3Group, sisi4Group); // Tambahkan semua sisi ke scene

// Buat array yang mengelompokkan Group dan Sumbu Rotasi:
const sideData = [
    { group: sisi1Group, axisIndex: 0, dir: 1 },
    { group: sisi2Group, axisIndex: 1, dir: 1 },
    { group: sisi3Group, axisIndex: 2, dir: 1 },
    { group: sisi4Group, axisIndex: 3, dir: 1 },
];

// Atur variabel global untuk mengontrol status animasi
let isUnfolding = false;
let animationTime = 0;
const animationSpeed = 0.015; // Kecepatan animasi

function animate() {
    requestAnimationFrame(animate);

    // Kontrol Waktu Animasi
    if (isUnfolding) {
        animationTime += animationSpeed;
        if (animationTime > 1.0) {
            animationTime = 1.0;
        }
    } else {
        animationTime -= animationSpeed;
        if (animationTime < 0) {
            animationTime = 0;
        }
    }

    const maxAngle = Math.PI / 1.73; // karena puncaknya di tengah jadi jaring-jaringnya harus buka kurleb 100 derajat
    const targetAngle = animationTime * maxAngle;

    sideData.forEach((side, index) => {
        side.group.rotation.set(0, 0, 0); 
        const axis = rotationAxes[side.axisIndex];
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(axis, targetAngle * side.dir); 
        side.group.setRotationFromQuaternion(quaternion);
    });
    
    controls.update();
    updateInfoLabels();
    renderer.render(scene, camera);
}

// Prev Geometri
document.getElementById("prevButton").onclick = () => {
  window.location.href = "cylinder.html";
};

// Next Geomteri
document.getElementById("nextButton").onclick = () => {
  window.location.href = "cuboid.html";
};

document.getElementById('unfoldButton').addEventListener('click', () => {
    if (!isUnfolding)
        isUnfolding = !isUnfolding;
});

document.getElementById('foldButton').addEventListener('click', () => {
    if (isUnfolding)
        isUnfolding = !isUnfolding;
});



let showInfo = false;
const infoLabels = [];
const labelTitikSudut = createInfoLabel('Titik sudut (5 total)');
const labelRusuk = createInfoLabel('Rusuk (8 total)');
const labelSisi = createInfoLabel('Sisi (5 total)');

function createInfoLabel(text) {
    const label = document.createElement('div');
    label.className = 'info-label';
    label.textContent = text;
    label.style.display = 'none';
    document.body.appendChild(label);
    return label;
}

infoLabels.push(
  { element: labelTitikSudut, position: new THREE.Vector3(0, 3, 0), offset: { x: 10, y: -10 } },
  { element: labelRusuk, position: new THREE.Vector3(0, 0, 1), offset: { x: 10, y: 0 } },
  { element: labelSisi, position: new THREE.Vector3(0.7, 1, 0), offset: { x: 10, y: 10 } }
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

document.getElementById('showInfoButton').addEventListener('click', () => {
  if (isUnfolding) {
    return;
  }
  showInfo = !showInfo;
  const btn = document.getElementById('showInfoButton');
  btn.textContent = showInfo ? 'Sembunyikan info' : 'Tampilkan info';
  updateInfoLabels();
});

// Tombol Reset Kamera
document.getElementById('resetButton').addEventListener('click', () => {
    controls.reset();
    controls.target.set(0, 1.5, 0);
    camera.position.set(4, 6, 8);
    controls.update();
});

document.getElementById('zoomInButton').addEventListener('click', () => {
    camera.fov = Math.max(camera.fov - 5, 20);
    camera.updateProjectionMatrix();
})

document.getElementById('zoomOutButton').addEventListener('click', () => {
    camera.fov = Math.min(camera.fov + 5, 80);
    camera.updateProjectionMatrix();
})

document.getElementById('addSizeButton').addEventListener('click', () => {
    sizeFactor = Math.min(sizeFactor + 0.5, 4.0); // Maksimum 4.0
    pyramidHeight = Math.min(pyramidHeight + 0.5, 8.0); // Maksimum 8.0
    buildPyramid(sizeFactor, pyramidHeight);
});

document.getElementById('reduceSizeButton').addEventListener('click', () => {

});

// function animate() {
//     requestAnimationFrame(animate);
//     controls.update();
//     renderer.render(scene, camera);
// }
animate();


window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

