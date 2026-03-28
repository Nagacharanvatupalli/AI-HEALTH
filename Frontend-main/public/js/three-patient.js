window.patientScene = null;
window.patientCamera = null;
window.patientRenderer = null;
window.patientControls = null;
window.patientModel = null;
window.heartModel = null; // Added beating heart model
window.patientRaycaster = new THREE.Raycaster();
window.patientMouse = new THREE.Vector2();

let patientAnimationId;
let hoveredPart = null;
const highlightMaterial = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x0066ff,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.8
});

let patientTooltip = null;

// Holographic UI elements
let scanPlatform, scanRings = [], volumetricBeam, particles, particleSystem;
let clock = new THREE.Clock();

const BODY_LABELS = [
    // ===== FRONT — HEAD & NECK =====
    { name: "Head", dir: [0.00, 0.97, 0.18], te: "తల" },
    { name: "Forehead", dir: [0.00, 0.95, 0.30], te: "నుదురు" },
    { name: "Eyes", dir: [0.00, 0.92, 0.42], te: "కళ్ళు" },
    { name: "Nose", dir: [0.00, 0.89, 0.52], te: "ముక్కు" },
    { name: "Cheeks (L)", dir: [-0.14, 0.90, 0.40], te: "బుగ్గ (ఎడమ)" },
    { name: "Cheeks (R)", dir: [0.14, 0.90, 0.40], te: "బుగ్గ (కుడి)" },
    { name: "Mouth / Lips", dir: [0.00, 0.85, 0.54], te: "నోరు / పెదవులు" },
    { name: "Chin", dir: [0.00, 0.81, 0.48], te: "గడ్డం" },
    { name: "Ears (L)", dir: [-0.30, 0.92, 0.10], te: "చెవులు (ఎడమ)" },
    { name: "Ears (R)", dir: [0.30, 0.92, 0.10], te: "చెవులు (కుడి)" },
    { name: "Neck", dir: [0.00, 0.74, 0.24], te: "మెడ" },

    // ===== FRONT — CHEST & CORE =====
    { name: "Collarbone Area", dir: [0.00, 0.66, 0.32], te: "కాలర్ బోన్ ప్రాంతం" },
    { name: "Chest", dir: [0.00, 0.58, 0.48], te: "ఛాతి" },
    { name: "Nipple (L)", dir: [-0.22, 0.56, 0.52], te: "స్తనాగ్రం (ఎడమ)" },
    { name: "Nipple (R)", dir: [0.22, 0.56, 0.52], te: "స్తనాగ్రం (కుడి)" },
    { name: "Upper Abdomen", dir: [0.00, 0.46, 0.46], te: "ఎగువ పొత్తికడుపు" },
    { name: "Lower Abdomen", dir: [0.00, 0.36, 0.44], te: "దిగువ పొత్తికడుపు" },
    { name: "Navel", dir: [0.00, 0.34, 0.50], te: "బొడ్డు" },
    { name: "Waist", dir: [0.00, 0.26, 0.36], te: "నడుము" },
    { name: "Hips (L)", dir: [-0.24, 0.22, 0.32], te: "నడుము భాగం (ఎడమ)" },
    { name: "Hips (R)", dir: [0.24, 0.22, 0.32], te: "నడుము భాగం (కుడి)" },
    { name: "Groin", dir: [0.00, 0.16, 0.38], te: "గజ్జలు" },

    // ===== FRONT — ARMS =====
    { name: "Shoulder (L)", dir: [-0.58, 0.64, 0.06], te: "భుజం (ఎడమ)" },
    { name: "Shoulder (R)", dir: [0.58, 0.64, 0.06], te: "భుజం (కుడి)" },
    { name: "Upper Arm (L)", dir: [-0.84, 0.48, 0.06], te: "ఎగువ చేయి (ఎడమ)" },
    { name: "Upper Arm (R)", dir: [0.84, 0.48, 0.06], te: "ఎగువ చేయి (కుడి)" },
    { name: "Elbow (L)", dir: [-1.02, 0.26, 0.06], te: "మోచేయి (ఎడమ)" },
    { name: "Elbow (R)", dir: [1.02, 0.26, 0.06], te: "మోచేయి (కుడి)" },
    { name: "Forearm (L)", dir: [-1.10, 0.10, 0.18], te: "ముంజేయి (ఎడమ)" },
    { name: "Forearm (R)", dir: [1.10, 0.10, 0.18], te: "ముంజేయి (కుడి)" },
    { name: "Wrist (L)", dir: [-1.18, -0.04, 0.28], te: "మణికట్టు (ఎడమ)" },
    { name: "Wrist (R)", dir: [1.18, -0.04, 0.28], te: "మణికట్టు (కుడి)" },
    { name: "Palm (L)", dir: [-1.24, -0.10, 0.48], te: "అరచేయి (ఎడమ)" },
    { name: "Palm (R)", dir: [1.24, -0.10, 0.48], te: "అరచేయి (కుడి)" },
    { name: "Fingers (L)", dir: [-1.28, -0.14, 0.68], te: "వేళ్లు (ఎడమ)" },
    { name: "Fingers (R)", dir: [1.28, -0.14, 0.68], te: "వేళ్లు (కుడి)" },

    // ===== FRONT — LEGS =====
    { name: "Thigh (L)", dir: [-0.22, 0.04, 0.34], te: "తొడ (ఎడమ)" },
    { name: "Thigh (R)", dir: [0.22, 0.04, 0.34], te: "తొడ (కుడి)" },
    { name: "Knee (L)", dir: [-0.22, -0.30, 0.46], te: "మోకాలు (ఎడమ)" },
    { name: "Knee (R)", dir: [0.22, -0.30, 0.46], te: "మోకాలు (కుడి)" },
    { name: "Shin (L)", dir: [-0.22, -0.58, 0.48], te: "పిక్క (ఎడమ)" },
    { name: "Shin (R)", dir: [0.22, -0.58, 0.48], te: "పిక్క (కుడి)" },
    { name: "Ankle (L)", dir: [-0.22, -0.84, 0.50], te: "మడమ (ఎడమ)" },
    { name: "Ankle (R)", dir: [0.22, -0.84, 0.50], te: "మడమ (కుడి)" },
    { name: "Instep (L)", dir: [-0.22, -0.96, 0.70], te: "పాదం పైభాగం (ఎడమ)" },
    { name: "Instep (R)", dir: [0.22, -0.96, 0.70], te: "పాదం పైభాగం (కుడి)" },
    { name: "Toes (L)", dir: [-0.22, -1.00, 0.92], te: "కాలి వేళ్లు (ఎడమ)" },
    { name: "Toes (R)", dir: [0.22, -1.00, 0.92], te: "కాలి వేళ్లు (కుడి)" },

    // ===== BACK — HEAD & BACK =====
    { name: "Back of Head", dir: [0.00, 0.96, -0.24], te: "తలను వెనుక భాగం" },
    { name: "Occipital Region", dir: [0.00, 0.92, -0.38], te: "మెడ వెనుక భాగం" },
    { name: "Nape", dir: [0.00, 0.78, -0.28], te: "మెడ వెనుక" },

    // ===== BACK — TORSO =====
    { name: "Shoulder Blade (L)", dir: [-0.34, 0.62, -0.42], te: "భుజం బ్లేడ్ (ఎడమ)" },
    { name: "Shoulder Blade (R)", dir: [0.34, 0.62, -0.42], te: "భుజం బ్లేడ్ (కుడి)" },
    { name: "Upper Back", dir: [0.00, 0.56, -0.48], te: "ఎగువ వీపు" },
    { name: "Spine", dir: [0.00, 0.42, -0.54], te: "వెన్నెముక" },
    { name: "Middle Back", dir: [0.00, 0.34, -0.50], te: "మధ్య వీపు" },
    { name: "Lower Back", dir: [0.00, 0.22, -0.48], te: "దిగువ వీపు" },
    { name: "Sacrum", dir: [0.00, 0.10, -0.36], te: "త్రికము" },

    // ===== BACK — GLUTES & LEGS =====
    { name: "Buttock (L)", dir: [-0.20, 0.00, -0.44], te: "పిరుదులు (ఎడమ)" },
    { name: "Buttock (R)", dir: [0.20, 0.00, -0.44], te: "పిరుదులు (కుడి)" },
    { name: "Back Thigh (L)", dir: [-0.22, -0.24, -0.42], te: "తొడ వెనుక భాగం (ఎడమ)" },
    { name: "Back Thigh (R)", dir: [0.22, -0.24, -0.42], te: "తొడ వెనుక భాగం (కుడి)" },
    { name: "Back Knee (L)", dir: [-0.22, -0.48, -0.46], te: "మోకాలు వెనుక భాగం (ఎడమ)" },
    { name: "Back Knee (R)", dir: [0.22, -0.48, -0.46], te: "మోకాలు వెనుక భాగం (కుడి)" },
    { name: "Calf (L)", dir: [-0.22, -0.72, -0.48], te: "పిక్క (ఎడమ)" },
    { name: "Calf (R)", dir: [0.22, -0.72, -0.48], te: "పిక్క (కుడి)" },
    { name: "Heel (L)", dir: [-0.22, -0.94, -0.36], te: "మడమ (ఎడమ)" },
    { name: "Heel (R)", dir: [0.22, -0.94, -0.36], te: "మడమ (కుడి)" },
    { name: "Sole (L)", dir: [-0.22, -1.00, -0.12], te: "అరికాలు (ఎడమ)" },
    { name: "Sole (R)", dir: [0.22, -1.00, -0.12], te: "అరికాలు (కుడి)" }
];

let patientCurrentLanguage = 'en';
function updatePatient3DLabels(lang) {
    patientCurrentLanguage = lang;
}


function getBodyPartByCoordinates(point) {
    if (!window.patientModel) return "Unknown";

    // Ensure we are working with coordinates directly mapped to the mesh scale
    window.patientModel.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(window.patientModel);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Normalize hit point from true Box3 bounding box bounds into [-1, 1] generic direction vectors
    const nx = (point.x - center.x) / (size.x / 2);
    const ny = (point.y - center.y) / (size.y / 2);
    const nz = (point.z - center.z) / (size.z / 2);

    let closestName = "Unknown";
    let minDistanceSq = Infinity;

    // Use standard nearest-neighbor map search
    for (const label of BODY_LABELS) {
        const dx = nx - label.dir[0];
        const dy = ny - label.dir[1];
        const dz = nz - label.dir[2];

        // Favor Y-axis alignment slightly heavily to stop crossing horizontal bounds (waist vs hips)
        const distSq = (dx * dx) + (dy * dy * 1.5) + (dz * dz * 0.5);

        if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            closestName = (patientCurrentLanguage === 'te' && label.te) ? label.te : label.name;
        }
    }

    return closestName;
}

let currentPatientGender = null;

function initPatient3D() {
    const container = document.getElementById('patient-canvas-container');
    const selectedGender = (app.state && app.state.patient && app.state.patient.gender) || 'Male';

    if (window.patientRenderer) {
        window.patientControls.enabled = true;

        // If gender changed, reload the model but keep the scene
        if (currentPatientGender !== selectedGender) {
            loadPatientModel(selectedGender);
        }
        return; // Already initialized
    }

    currentPatientGender = selectedGender;

    // Create Tooltip
    patientTooltip = document.createElement('div');
    patientTooltip.className = 'body-tooltip';
    document.body.appendChild(patientTooltip);

    // Scene setup
    window.patientScene = new THREE.Scene();

    // Camera setup
    window.patientCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    window.patientCamera.position.set(0, 0, 5); // Centers the body vertically

    // Renderer setup
    window.patientRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    window.patientRenderer.setClearColor(0x000000, 1); // Force pure black background
    window.patientRenderer.setSize(window.innerWidth, window.innerHeight);
    window.patientRenderer.setPixelRatio(window.devicePixelRatio);
    window.patientScene.background = new THREE.Color(0x000000);
    container.appendChild(window.patientRenderer.domElement);

    // Controls
    window.patientControls = new THREE.OrbitControls(window.patientCamera, window.patientRenderer.domElement);
    window.patientControls.enableDamping = true;
    window.patientControls.enablePan = true; // Allow panning to view specific parts when zoomed in
    window.patientControls.enableZoom = true;
    window.patientControls.minDistance = 1.0; // Allow much closer zoom for clear view
    window.patientControls.maxDistance = 8;
    window.patientControls.target.set(0, -1.7, 0); // Focus lower on the lowered scene


    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Softer ambient
    window.patientScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 5, 5);
    window.patientScene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x00f0ff, 0.5); // Cyan fill
    fillLight.position.set(-5, 0, -5);
    window.patientScene.add(fillLight);

    // Bottom Rim Light (Platform Glow)
    const rimLight = new THREE.PointLight(0xff4444, 1, 10);
    rimLight.position.set(0, -1.4, 0);
    window.patientScene.add(rimLight);

    // Holographic Platform
    const platformGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.1, 32);
    const platformMat = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    scanPlatform = new THREE.Mesh(platformGeo, platformMat);
    scanPlatform.position.y = -3.0; // Moved down
    window.patientScene.add(scanPlatform);

    // Inner glowing core of the platform
    const coreGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.11, 32);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });
    const platformCore = new THREE.Mesh(coreGeo, coreMat);
    platformCore.position.y = -3.0; // Moved down
    window.patientScene.add(platformCore);

    // Energy Scanning Rings
    for (let i = 0; i < 3; i++) {
        const ringGeo = new THREE.RingGeometry(1.3, 1.4, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -2.95; // Moved down
        // Store initial offset for animation staggering
        ring.userData = { offset: i * 2, active: true };
        scanRings.push(ring);
        window.patientScene.add(ring);
    }

    // Volumetric Light Beam (Faint upward cylinder)
    const beamGeo = new THREE.CylinderGeometry(1.3, 1.5, 8, 32, 1, true); // Increased height to reach the lowered platform
    const beamMat = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.05, // Faint glow
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    volumetricBeam = new THREE.Mesh(beamGeo, beamMat);
    volumetricBeam.position.y = 1; // Center height (1.0 - 4.0 = -3.0 bottom edge)
    window.patientScene.add(volumetricBeam);

    // Floating Medical Particles
    const particleCount = 150;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    const pVel = [];

    for (let i = 0; i < particleCount; i++) {
        // Random distribution in a cylinder around the body
        const radius = 1 + Math.random() * 1.5;
        const theta = Math.random() * Math.PI * 2;

        pPos[i * 3] = radius * Math.cos(theta);
        pPos[i * 3 + 1] = -3.0 + Math.random() * 4; // Moved starting height down
        pPos[i * 3 + 2] = radius * Math.sin(theta);

        // Slow upward velocity + slight drift
        pVel.push({
            y: 0.005 + Math.random() * 0.01,
            x: (Math.random() - 0.5) * 0.002,
            z: (Math.random() - 0.5) * 0.002
        });
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

    // Create a simple "+" texture using canvas for particles
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(16, 4); ctx.lineTo(16, 28);
    ctx.moveTo(4, 16); ctx.lineTo(28, 16);
    ctx.stroke();
    const particleTex = new THREE.CanvasTexture(canvas);

    const pMat = new THREE.PointsMaterial({
        color: 0x00f0ff,
        size: 0.1,
        map: particleTex,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particleSystem = new THREE.Points(pGeo, pMat);
    particleSystem.userData = { velocities: pVel };
    window.patientScene.add(particleSystem);

    // Load GLB based on Gender
    loadPatientModel(currentPatientGender);

    // Load the 3D Beating Heart Model on the left
    loadHeartModel();

    // Event Listeners for Interaction
    window.addEventListener('resize', onPatientWindowResize);
    window.addEventListener('mousemove', onPatientMouseMove);
    window.addEventListener('click', onPatientMouseClick);

    // Animation Loop
    animatePatient();
}

function loadPatientModel(gender) {
    const loader = new THREE.GLTFLoader();
    currentPatientGender = gender;

    // Check gender
    let modelPath = '/models/male_base_muscular_anatomy.glb'; // Default Male
    if (gender === 'Female') {
        modelPath = '/models/female_base_mesh.glb';
    }

    loader.load(modelPath, (gltf) => {
        // Remove existing model if any
        if (window.patientModel) {
            window.patientScene.remove(window.patientModel);
            window.patientModel = null;
        }

        window.patientModel = gltf.scene;

        if (gender === 'Male') {
            window.patientModel.scale.set(15, 15, 15);
            window.patientModel.position.set(0, -0.3, 0); // Kept male model on the lowered platform
        } else {
            window.patientModel.position.set(0, -2.5, 0); // Lowered female height
        }

        // Save original materials
        window.patientModel.traverse((child) => {
            if (child.isMesh) {
                child.userData.originalMaterial = child.material;
                // Apply solid opacity
                child.material.transparent = false;
                child.material.opacity = 1;
                child.material.depthWrite = true; // Set to true to maintain shape, might need tweaking if artifacts show
            }
        });

        window.patientScene.add(window.patientModel);
    }, undefined, (error) => {
        console.error('Error loading patient model:', error);
    });
}

function loadHeartModel() {
    const loader = new THREE.GLTFLoader();

    loader.load('/models/dummyheart.glb', (gltf) => {
        // Remove existing heart model if any
        if (window.heartModel) {
            if (window.heartModel.parent) {
                window.heartModel.parent.remove(window.heartModel);
            } else {
                window.patientScene.remove(window.heartModel);
            }
        }

        window.heartModel = gltf.scene;

        // Add heart to the camera so it remains static on the screen during rotation
        window.patientCamera.add(window.heartModel);
        window.patientScene.add(window.patientCamera);

        window.heartModel.position.set(-3.5, -1.2, -5); // Position relative to camera

        // Initial setup - Enlarge the heart even more
        window.heartModel.scale.set(4.5, 4.5, 4.5);

        // Rotate the heart 180 degrees to show the other side (back side)
        window.heartModel.rotation.set(0, Math.PI, 0);

        // Save base scale so the pulse animation can pivot off it
        window.heartModel.userData.baseScale = 4.5;

        // Save original materials and set them to solid
        window.heartModel.traverse((child) => {
            if (child.isMesh) {
                child.userData.originalMaterial = child.material;
                if (child.material) {
                    child.material.transparent = false;
                    child.material.opacity = 1;
                    child.material.depthWrite = true;
                }
            }
        });
    }, undefined, (error) => {
        console.error('Error loading heart model:', error);
    });
}

function onPatientWindowResize() {
    if (!window.patientCamera || !window.patientRenderer) return;
    window.patientCamera.aspect = window.innerWidth / window.innerHeight;
    window.patientCamera.updateProjectionMatrix();
    window.patientRenderer.setSize(window.innerWidth, window.innerHeight);
}

function onPatientMouseMove(event) {
    if (document.getElementById('patient-anatomy').classList.contains('hidden')) return;
    if (!document.getElementById('pain-modal').classList.contains('hidden')) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    window.patientMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    window.patientMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycast
    window.patientRaycaster.setFromCamera(window.patientMouse, window.patientCamera);

    if (window.patientModel) {
        const intersects = window.patientRaycaster.intersectObject(window.patientModel, true);

        // Reset previous hover
        if (hoveredPart) {
            // Material restore disabled as we no longer change it
            hoveredPart = null;
        }

        if (intersects.length > 0) {
            const intersect = intersects[0];
            const object = intersect.object;
            // Only highlight skin surface / identifiable parts
            if (object.name && object.name !== 'Scene') {
                hoveredPart = object;

                // Determine specific body part
                const specificPart = getBodyPartByCoordinates(intersect.point);
                hoveredPart.userData.specificName = specificPart;

                // Material change on hover disabled, but keep pointer cursor
                document.body.style.cursor = 'pointer';

                // Ensure tooltip shows
                if (patientTooltip) {
                    patientTooltip.innerText = specificPart.toUpperCase();
                    patientTooltip.classList.add('visible');
                    patientTooltip.style.left = `${event.clientX}px`;
                    patientTooltip.style.top = `${event.clientY}px`;
                }
            } else {
                document.body.style.cursor = 'default';
                if (patientTooltip) patientTooltip.classList.remove('visible');
            }

            // Particle Repulsion Effect on Hover
            if (particleSystem) {
                const positions = particleSystem.geometry.attributes.position.array;
                const vels = particleSystem.userData.velocities;
                for (let i = 0; i < positions.length; i += 3) {
                    const px = positions[i];
                    const py = positions[i + 1];
                    const pz = positions[i + 2];

                    // Simple distance check from intersect point
                    const dx = px - intersect.point.x;
                    const dy = py - intersect.point.y;
                    const dz = pz - intersect.point.z;
                    const distSq = dx * dx + dy * dy + dz * dz;

                    if (distSq < 0.5) {
                        // Push away slightly
                        vels[i / 3].x += dx * 0.01;
                        vels[i / 3].z += dz * 0.01;
                    }
                }
            }
        } else {
            document.body.style.cursor = 'default';
            if (patientTooltip) patientTooltip.classList.remove('visible');
        }
    }
}

function onPatientMouseClick(event) {
    if (event.target !== window.patientRenderer.domElement) return; // Prevent bubbling from UI elements
    if (document.getElementById('patient-anatomy').classList.contains('hidden')) return;
    if (document.getElementById('pain-modal').classList.contains('hidden') === false) return; // Modal open

    if (hoveredPart) {
        // Trigger pulse on click
        scanRings.forEach(ring => {
            ring.scale.set(1, 1, 1);
            ring.material.opacity = 0.8;
            ring.userData.offset = 0; // Reset animation
        });

        const partName = hoveredPart.userData.specificName || hoveredPart.name;
        const cleanName = hoveredPart.name.replace(/_/g, ' '); // Always use the internal name for API state
        app.openPainModal(cleanName, partName);
        if (patientTooltip) patientTooltip.classList.remove('visible');
    }
}

function animatePatient() {
    patientAnimationId = requestAnimationFrame(animatePatient);

    const time = clock.getElapsedTime();

    if (window.patientControls && window.patientControls.enabled) {
        window.patientControls.update();
    }

    // Dynamic Lighting (Breathing effect)
    if (window.patientScene) {
        window.patientScene.traverse((child) => {
            if (child.isDirectionalLight && child.color.getHex() === 0xffffff) {
                child.intensity = 0.6 + Math.sin(time * 2) * 0.2;
            }
        });
    }

    // Animate Platform
    if (scanPlatform) {
        scanPlatform.rotation.y = time * 0.2;
    }

    // Animate Rings
    if (scanRings.length > 0) {
        scanRings.forEach((ring) => {
            const cycle = (time + ring.userData.offset) % 4; // 4 second loop
            if (cycle < 3) {
                // Expanding phase
                const scale = 1 + (cycle * 0.5);
                ring.scale.set(scale, scale, 1);
                ring.material.opacity = Math.max(0, 0.6 - (cycle * 0.2));
            } else {
                // Resetting phase
                ring.scale.set(1, 1, 1);
                ring.material.opacity = 0;
            }
        });
    }

    // Animate Particles
    if (particleSystem) {
        const positions = particleSystem.geometry.attributes.position.array;
        const vels = particleSystem.userData.velocities;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += vels[i / 3].y; // Move up
            positions[i] += vels[i / 3].x;   // Drift X
            positions[i + 2] += vels[i / 3].z; // Drift Z

            // Return towards center slowly (gravity)
            vels[i / 3].x *= 0.98;
            vels[i / 3].z *= 0.98;

            // Reset at bottom
            if (positions[i + 1] > 1.0) { // Adjusted particle kill height
                positions[i + 1] = -3.0; // Adjusted particle spawn height
                positions[i] = (Math.random() - 0.5) * 3;
                positions[i + 2] = (Math.random() - 0.5) * 3;
            }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
        particleSystem.rotation.y = time * 0.05; // Slow global rotation
    }

    // Animate Beating Heart Model
    if (window.heartModel) {
        let hrPulse = 1;
        const hrStr = app.state.patient.hr;

        // Rotation removed as requested

        if (hrStr && hrStr.trim() !== '') {
            const hrVal = parseInt(hrStr, 10);
            if (!isNaN(hrVal) && hrVal > 0) {
                // Determine beats per second from given heart rate
                const bps = hrVal / 60;

                // Sharp heartbeat shape using a power sine wave
                const pulseAmount = Math.pow(Math.abs(Math.sin(time * Math.PI * bps)), 8);
                hrPulse = 1 + pulseAmount * 0.15; // 15% scale jump on beat
            }
        }

        const finalScale = window.heartModel.userData.baseScale * hrPulse;
        window.heartModel.scale.set(finalScale, finalScale, finalScale);
    }

    if (window.patientRenderer && window.patientScene && window.patientCamera) {
        window.patientRenderer.render(window.patientScene, window.patientCamera);
    }
}
