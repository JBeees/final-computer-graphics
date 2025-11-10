import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// === Scene setup ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(4, 3, 5);

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
const segments = 40;

// === Materials ===
const baseMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
});

const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 2,
    transparent: true,
    opacity: 1,
});

// === Groups ===
const cylinderGroup = new THREE.Group();
const unfoldedGroup = new THREE.Group();
scene.add(cylinderGroup, unfoldedGroup);

// === Variables ===
let lateralPanels = [];
let topCap = null;
let bottomCap = null;
let showInfo = false;

// === Info Labels ===
const infoLabels = [];

function createInfoLabel(text) {
    const label = document.createElement("div");
    label.className = "info-label";
    label.textContent = text;
    label.style.position = "absolute";
    label.style.background = "rgba(0, 0, 0, 0.85)";
    label.style.color = "white";
    label.style.padding = "8px 12px";
    label.style.borderRadius = "6px";
    label.style.fontFamily = "Arial, sans-serif";
    label.style.fontSize = "14px";
    label.style.pointerEvents = "none";
    label.style.display = "none";
    label.style.zIndex = "1000";
    label.style.whiteSpace = "nowrap";
    label.style.border = "2px solid white";
    label.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";

    const dot = document.createElement("div");
    dot.style.position = "absolute";
    dot.style.width = "10px";
    dot.style.height = "10px";
    dot.style.background = "white";
    dot.style.borderRadius = "50%";
    dot.style.left = "-15px";
    dot.style.top = "50%";
    dot.style.transform = "translateY(-50%)";
    dot.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.3)";
    label.appendChild(dot);

    document.body.appendChild(label);
    return label;
}

// Buat label sekali
const heightLabel = createInfoLabel("Height (h)");
const radiusLabel = createInfoLabel("Radius (r)");
const topBaseLabel = createInfoLabel("Top Base (circular)");
const bottomBaseLabel = createInfoLabel("Bottom Base (circular)");

infoLabels.push(
    { element: heightLabel, offset: { x: 10, y: 0 } },
    { element: radiusLabel, offset: { x: 10, y: 10 } },
    { element: topBaseLabel, offset: { x: 10, y: -10 } },
    { element: bottomBaseLabel, offset: { x: 10, y: 10 } }
);

// === Update Info Label Position ===
function updateInfoLabels() {
    if (
        !showInfo ||
        unfolding ||
        folding ||
        (!cylinderGroup.visible && !unfoldedGroup.visible)
    ) {
        infoLabels.forEach((label) => (label.element.style.display = "none"));
        return;
    }

    const targetGroup = unfoldedState ? unfoldedGroup : cylinderGroup;
    const halfHeight = height / 2;
    const circumference = 2 * Math.PI * radius;

    infoLabels.forEach((label) => {
        let position = null;

        if (unfoldedState) {
        if (label.element === heightLabel)
            position = new THREE.Vector3(circumference / 2, 0, 0.01);
        else if (label.element === radiusLabel)
            position = new THREE.Vector3(radius, halfHeight + radius, 0.01);
        else if (label.element === topBaseLabel)
            position = new THREE.Vector3(0, halfHeight + radius, 0.01);
        else if (label.element === bottomBaseLabel)
            position = new THREE.Vector3(0, -(halfHeight + radius), 0.01);
        } else {
        if (label.element === heightLabel)
            position = new THREE.Vector3(radius, 0, 0);
        else if (label.element === radiusLabel)
            position = new THREE.Vector3(radius * 0.5, -halfHeight, radius * 0.5);
        else if (label.element === topBaseLabel)
            position = new THREE.Vector3(0, halfHeight, 0);
        else if (label.element === bottomBaseLabel)
            position = new THREE.Vector3(0, -halfHeight, 0);
        }

        if (position) {
        position.applyMatrix4(targetGroup.matrixWorld);
        const vector = position.project(camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
        label.element.style.left = `${x + label.offset.x}px`;
        label.element.style.top = `${y + label.offset.y}px`;
        label.element.style.display = "block";
        } else {
        label.element.style.display = "none";
        }
    });
}

// === Create Cylinder ===
function createCylinder() {
    while (cylinderGroup.children.length > 0) {
        const child = cylinderGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        cylinderGroup.remove(child);
}

    lateralPanels = [];
    const angleStep = (2 * Math.PI) / segments;
    const halfHeight = height / 2;

    // Panel samping
    for (let i = 0; i < segments; i++) {
        const theta1 = i * angleStep;
        const theta2 = (i + 1) * angleStep;

        const geom = new THREE.BufferGeometry();
        const vertices = new Float32Array([
        Math.cos(theta1) * radius, -halfHeight, Math.sin(theta1) * radius,
        Math.cos(theta2) * radius, -halfHeight, Math.sin(theta2) * radius,
        Math.cos(theta2) * radius, halfHeight, Math.sin(theta2) * radius,
        Math.cos(theta1) * radius, halfHeight, Math.sin(theta1) * radius,
        ]);
        geom.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
        geom.setIndex([0, 1, 2, 0, 2, 3]);
        geom.computeVertexNormals();

        const mesh = new THREE.Mesh(geom, baseMaterial.clone());
        const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geom),
        edgeMaterial.clone()
        );

        const panelGroup = new THREE.Group();
        panelGroup.add(mesh, edges);
        cylinderGroup.add(panelGroup);
        lateralPanels.push(panelGroup);
    }

    // Tutup atas & bawah
    const circleGeom = new THREE.CircleGeometry(radius, segments);
    circleGeom.rotateX(Math.PI / 2);

    topCap = new THREE.Group();
    const topMesh = new THREE.Mesh(circleGeom, baseMaterial.clone());
    const topEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(circleGeom),
        edgeMaterial.clone()
    );
    topCap.add(topMesh, topEdges);
    topCap.position.y = halfHeight;
    cylinderGroup.add(topCap);

    bottomCap = new THREE.Group();
    const bottomMesh = new THREE.Mesh(circleGeom, baseMaterial.clone());
    const bottomEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(circleGeom),
        edgeMaterial.clone()
    );
    bottomCap.add(bottomMesh, bottomEdges);
    bottomCap.position.y = -halfHeight;
    cylinderGroup.add(bottomCap);
}

// === Update Formulas ===
function updateFormulas() {
  const r = radius * 10;
  const h = height * 10;
  const l = 2 * Math.PI * r * h;
  const v = Math.PI * r ** 2 * h;
  const a = 2 * Math.PI * r * (r + h);

    document.getElementById(
        "cylinderParams"
    ).textContent = `r = ${r.toFixed(0)} cm, h = ${h.toFixed(0)} cm`;
    document.getElementById(
        "cylinderLateral"
    ).textContent = `L = ${l.toFixed(2)} cm²`;
    document.getElementById(
        "cylinderVolume"
    ).textContent = `V = ${v.toFixed(2)} cm³`;
    document.getElementById(
        "cylinderSurface"
    ).textContent = `A = ${a.toFixed(2)} cm²`;
}

// === Initialization ===
createCylinder();
updateFormulas();

// === Animation Control ===
let unfolding = false;
let folding = false;
let progress = 0;
let unfoldedState = false;

const unfoldBtn = document.getElementById("unfoldBtn");
const foldBtn = document.getElementById("foldBtn");

function updateButtonStyles() {
    if (unfoldedState) {
        unfoldBtn.style.background = "white";
        unfoldBtn.style.color = "#000";
        foldBtn.style.background = "#000";
        foldBtn.style.color = "white";
    } else {
        unfoldBtn.style.background = "#000";
        unfoldBtn.style.color = "white";
        foldBtn.style.background = "white";
        foldBtn.style.color = "#000";
    }
}
updateButtonStyles();

// === Tombol utama ===
document.getElementById("unfoldBtn").addEventListener("click", () => {
    if (unfolding || unfoldedState) return;
    unfolding = true;
    folding = false;
    progress = 0;
    if (showInfo) {
        infoLabels.forEach((l) => (l.element.style.display = "none"));
        showInfo = false;
        document.getElementById("showInfoBtn").textContent = "Show Info";
    }
});

document.getElementById("foldBtn").addEventListener("click", () => {
    if (folding || !unfoldedState) return;
    folding = true;
    unfolding = false;
    progress = 1;
});

document.getElementById("resetBtn").addEventListener("click", () => {
    camera.position.set(4, 3, 5);
    controls.target.set(0, 0, 0);
    controls.update();
});

document.getElementById("showInfoBtn").addEventListener("click", () => {
    if (unfolding || folding) return;
    showInfo = !showInfo;
    const btn = document.getElementById("showInfoBtn");
    btn.textContent = showInfo ? "Hide Info" : "Show Info";
    updateInfoLabels();
});

// === Zoom controls ===
document.getElementById("zoomInBtn").addEventListener("click", () => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, 0.5);
    controls.update();
});

document.getElementById("zoomOutBtn").addEventListener("click", () => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir, -0.5);
    controls.update();
});

// === Reset transform helper ===
function resetTransforms() {
    lateralPanels.forEach((panel) => {
        panel.position.set(0, 0, 0);
        panel.rotation.set(0, 0, 0);
        panel.children.forEach((child) => {
        if (child.material) child.material.opacity = 1;
        });
    });

    if (topCap) {
        topCap.position.y = height / 2;
        topCap.rotation.set(0, 0, 0);
        topCap.children.forEach((c) => (c.material.opacity = 1));
    }

    if (bottomCap) {
        bottomCap.position.y = -height / 2;
        bottomCap.rotation.set(0, 0, 0);
        bottomCap.children.forEach((c) => (c.material.opacity = 1));
    }

    unfoldedGroup.children.forEach((child) => {
        if (child.material) child.material.opacity = 0;
    });
}

// === Size Controls ===
document.getElementById("addSizeBtn").addEventListener("click", () => {
    if (radius <= 2.5) {
        radius += 0.1;
        height += 0.2;
        createCylinder();
        createUnfoldedNetGeometry();
        updateFormulas();
        unfoldedState = false;
        updateButtonStyles();
        cylinderGroup.visible = true;
        unfoldedGroup.visible = false;
        resetTransforms();
    }
});

document.getElementById("redSizeBtn").addEventListener("click", () => {
    if (radius > 0.3) {
        radius -= 0.1;
        height -= 0.2;
        createCylinder();
        createUnfoldedNetGeometry();
        updateFormulas();
        unfoldedState = false;
        updateButtonStyles();
        cylinderGroup.visible = true;
        unfoldedGroup.visible = false;
        resetTransforms();
    }
});

// === Navigation ===
document.getElementById("prevShapeBtn").onclick = () => {
    window.location.href = "cone.html";
};

document.getElementById("nextShapeBtn").onclick = () => {
    window.location.href = "pyramid.html";
};

function easeInOutCubic(t) {
    return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// === Create Unfolded Net Geometry ===
let unfoldedRect = null;
let unfoldedTopCircle = null;
let unfoldedBottomCircle = null;

function createUnfoldedNetGeometry() {
    while (unfoldedGroup.children.length > 0) {
    const child = unfoldedGroup.children[0];
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
    unfoldedGroup.remove(child);
    }

    const circumference = 2 * Math.PI * radius;
    const halfHeight = height / 2;

    const rectGeom = new THREE.PlaneGeometry(circumference, height, 1, 1);
    unfoldedRect = new THREE.Mesh(rectGeom, baseMaterial.clone());
    unfoldedRect.add(
        new THREE.LineSegments(new THREE.EdgesGeometry(rectGeom), edgeMaterial.clone())
    );
    unfoldedRect.position.z = 0.01;
    unfoldedRect.material.opacity = 0;
    unfoldedGroup.add(unfoldedRect);

    const circleGeom = new THREE.CircleGeometry(radius, segments);
    unfoldedTopCircle = new THREE.Mesh(circleGeom, baseMaterial.clone());
    unfoldedTopCircle.add(
        new THREE.LineSegments(new THREE.EdgesGeometry(circleGeom), edgeMaterial.clone())
    );
    unfoldedTopCircle.position.set(0, halfHeight + radius, 0.01);
    unfoldedTopCircle.material.opacity = 0;
    unfoldedGroup.add(unfoldedTopCircle);

    unfoldedBottomCircle = new THREE.Mesh(circleGeom, baseMaterial.clone());
    unfoldedBottomCircle.add(
        new THREE.LineSegments(new THREE.EdgesGeometry(circleGeom), edgeMaterial.clone())
    );
    unfoldedBottomCircle.position.set(0, -(halfHeight + radius), 0.01);
    unfoldedBottomCircle.material.opacity = 0;
    unfoldedGroup.add(unfoldedBottomCircle);

    unfoldedGroup.visible = false;
}
createUnfoldedNetGeometry();

// === Animation ===
function applyUnfoldTransform(easedProgress) {
    const angleStep = (2 * Math.PI) / segments;
    const halfHeight = height / 2;
    const circumference = 2 * Math.PI * radius;

    // Panel
    for (let i = 0; i < lateralPanels.length; i++) {
        const panel = lateralPanels[i];
        const centerAngle = i * angleStep + angleStep / 2;

        const startX = Math.cos(centerAngle) * radius;
        const startZ = Math.sin(centerAngle) * radius;
        const endX =
        i * (circumference / segments) -
        circumference / 2 +
        circumference / segments / 2;

        panel.position.x = THREE.MathUtils.lerp(startX, endX, easedProgress);
        panel.position.z = THREE.MathUtils.lerp(startZ, 0, easedProgress);
        panel.rotation.y = THREE.MathUtils.lerp(-centerAngle, 0, easedProgress);

        panel.children.forEach((c) => {
        if (c.material) c.material.opacity = 1 - easedProgress;
        });
    }

    if (topCap) {
        const startY = halfHeight;
        const endY = halfHeight + radius;
        topCap.position.y = THREE.MathUtils.lerp(startY, endY, easedProgress);
        topCap.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2, easedProgress);
        topCap.children.forEach((c) => (c.material.opacity = 1 - easedProgress));
    }

    if (bottomCap) {
        const startY = -halfHeight;
        const endY = -(halfHeight + radius);
        bottomCap.position.y = THREE.MathUtils.lerp(startY, endY, easedProgress);
        bottomCap.rotation.x = THREE.MathUtils.lerp(0, Math.PI / 2, easedProgress);
        bottomCap.children.forEach((c) => (c.material.opacity = 1 - easedProgress));
    }

    unfoldedGroup.traverse((child) => {
        if (child.material) child.material.opacity = easedProgress;
    });
}

// === Animate Loop ===
let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    const speed = 0.8;

    if (unfolding) {
        progress += dt * speed;
        if (progress >= 1) {
        progress = 1;
        unfolding = false;
        unfoldedState = true;
        updateButtonStyles();
        cylinderGroup.visible = false;
        unfoldedGroup.visible = true;
        unfoldedGroup.traverse((c) => (c.material.opacity = 1));
        }
    } else if (folding) {
        progress -= dt * speed;
        if (progress <= 0) {
        progress = 0;
        folding = false;
        unfoldedState = false;
        updateButtonStyles();
        cylinderGroup.visible = true;
        unfoldedGroup.visible = false;
        resetTransforms();
        }
    }

    if (unfolding || folding) {
        cylinderGroup.visible = true;
        unfoldedGroup.visible = true;
        const eased = easeInOutCubic(progress);
        applyUnfoldTransform(eased);
    }

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
