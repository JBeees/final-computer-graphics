import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeffffff);

// // Pencahayaan
const ambient = new THREE.AmbientLight(0xffffff, 3.33);
scene.add(ambient);

// Posisi kamera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(6.5, 5.5, 6.5);  

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
const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
gridHelper.position.y = -2;
scene.add(gridHelper);

// Deklarasi panjang rusuk dan tinggi
let panjangRusuk = 1;
let tinggi = 2

const rusuk = document.getElementById("pyramidDeclare");
const volume = document.getElementById("pyramidVolume");
const surface = document.getElementById("pyramidSurface");

// Variabel buat limas
let Limas = new THREE.Group;
const rotationAxes = [];    
const sideData = [];

// Atur variabel global untuk mengontrol status animasi
let isUnfolding = false;
let animationTime = 0;
const animationSpeed = 0.015; // Kecepatan animasi

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

let showInfo = false;
let infoLabels = [];
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
  { element: labelTitikSudut, position: new THREE.Vector3(0, tinggi, 0), offset: { x: 10, y: -10 } },
  { element: labelRusuk, position: new THREE.Vector3(0, -1, panjangRusuk), offset: { x: 10, y: 0 } },
  { element: labelSisi, position: new THREE.Vector3(panjangRusuk*0.8, tinggi / 3, 0), offset: { x: 10, y: 10 } }
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

// Fungsi buat limas dan Bangun ulang limas kalau mau di resize
function bangunLimas(size, height) {
    // 1. Bersihkan Geometri Lama
    scene.remove(Limas);
    // Hapus dan dispose material/geometri untuk mencegah memory leak
    Limas.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
             if (Array.isArray(object.material)) {
                 object.material.forEach(m => m.dispose());
             } else {
                 object.material.dispose();
             }
        }
    });
    
    // Reset Grup dan data
    Limas = new THREE.Group();
    rotationAxes.length = 0; 
    sideData.length = 0; 

    // 2. Tentukan Titik sudut baru menggunakan nilai 'size' dan 'height' yang diperbarui
    const s = size; 
    const h = height; 

    const v0 = [s, 0, s]; // kuadran 1
    const v1 = [s, 0, -s]; // kuadran 2
    const v2 = [-s, 0, -s]; // kuadran 3
    const v3 = [-s, 0, s]; // kuadran 4
    const v4 = [0, h, 0]; // Pucuk

    let a = s*2*5;
    let b = h*5;
    let vol = a**2*b/3;
    let sur = a**2 + 4*(a*b/2);

    rusuk.innerHTML = `$$ \\text{anggap } s = ${a.toFixed(0)} \\text{ dan } t = ${b.toFixed(0)} $$`;
    volume.innerHTML = `$$ V = \\frac{1}{3} \\times ${a.toFixed(0)}^2 \\times ${b.toFixed(0)} = ${vol.toFixed(0)} $$`;
    surface.innerHTML = `$$ A = ${a.toFixed(0)}^2 + 4\\left( \\frac{1}{2} \\times ${a.toFixed(0)} \\times ${b.toFixed(0)} \\right) = ${sur.toFixed(0)} $$`;

    if (window.MathJax) {
        // Memberi tahu MathJax untuk memproses ulang elemen tertentu
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, rusuk]);
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, volume]);
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, surface]);
    }

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
    Limas.add(alas);

    // Sisi limas
    const sisi1Group = gaweSisiLimas(v0, v1, v4); 
    const sisi2Group = gaweSisiLimas(v1, v2, v4); 
    const sisi3Group = gaweSisiLimas(v2, v3, v4); 
    const sisi4Group = gaweSisiLimas(v3, v0, v4); 

    Limas.add(sisi1Group, sisi2Group, sisi3Group, sisi4Group);
    scene.add(Limas);
    
    // Isi sideData baru
    sideData.push(
        { group: sisi1Group, axisIndex: 0, dir: 1 },
        { group: sisi2Group, axisIndex: 1, dir: 1 },
        { group: sisi3Group, axisIndex: 2, dir: 1 },
        { group: sisi4Group, axisIndex: 3, dir: 1 }
    );

    // Update posisi informasi
    infoLabels[0].position = new THREE.Vector3(...v4);
    infoLabels[1].position = new THREE.Vector3(0, 0, s);
    infoLabels[2].position = new THREE.Vector3(0.7 * s, h/2, 0);
}

bangunLimas(panjangRusuk, tinggi);

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

    const maxAngle = Math.PI / 1.69 ; // karena puncaknya di tengah jadi jaring-jaringnya harus buka kurleb 100 derajat
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
        if (showInfo) {
            showInfo = !showInfo;
            const btn = document.getElementById('showInfoButton');
            btn.textContent = showInfo ? 'Sembunyikan info' : 'Tampilkan info';
        }
});

document.getElementById('foldButton').addEventListener('click', () => {
    if (isUnfolding)
        isUnfolding = !isUnfolding;
});

document.getElementById('showInfoButton').addEventListener('click', () => {
  if (isUnfolding) {
    return;
  }
  showInfo = !showInfo;
  const btn = document.getElementById('showInfoButton');
  btn.textContent = showInfo ? 'Sembunyikan info' : 'Tampilkan info';
  updateInfoLabels();
});

document.getElementById('resetButton').addEventListener('click', () => {
    controls.reset();
    camera.position.set(6.5, 5.5, 6.5); 
    controls.update();
});

document.getElementById('zoomInButton').addEventListener('click', () => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, 0.5);
    controls.update();
});

document.getElementById('zoomOutButton').addEventListener('click', () => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, -0.5);
    controls.update();
});

document.getElementById('addSizeButton').addEventListener('click', () => {
    if (panjangRusuk < 2) {
        panjangRusuk += 0.1;
        tinggi += 0.2
        bangunLimas(panjangRusuk, tinggi);
    }
});

document.getElementById('reduceSizeButton').addEventListener('click', () => {
    if (panjangRusuk > 0.51) {
        panjangRusuk -= 0.1;
        tinggi -= 0.2
        bangunLimas(panjangRusuk, tinggi);
    }
});

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});