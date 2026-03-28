window.doctorScene = null;
window.doctorCamera = null;
window.doctorRenderer = null;
window.doctorControls = null;
window.doctorModel = null;
window.doctorRaycaster = new THREE.Raycaster();
window.doctorMouse = new THREE.Vector2();

let doctorAnimationId;
let doctorHoveredPart = null;
let currentLoadedTheme = null;
let nerveLabels = [];

let doctorScanPlatform, doctorScanRings = [];
let nsPlatformGroup, nsOuterRing, nsInnerCircle, nsCenterGlow;
let doctorClock = new THREE.Clock();

const doctorHighlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0055,
    emissive: 0xaa0033,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9
});

let doctorCurrentLanguage = 'en';
function updateDoctor3DLabels(lang) {
    doctorCurrentLanguage = lang;
}


function initDoctor3D() {
    const container = document.getElementById('doctor-canvas-container');
    const theme = app.state.doctor.theme;

    if (window.doctorRenderer) {
        window.doctorControls.enabled = true;
        // Check if theme changed
        if (currentLoadedTheme !== theme) {
            loadDoctorThemeModel(theme);
        }
        return;
    }

    // Scene setup
    window.doctorScene = new THREE.Scene();

    // Camera setup
    window.doctorCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    window.doctorCamera.position.set(0, 0, 5); // Centers the body vertically

    // Renderer setup
    window.doctorRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    window.doctorRenderer.setClearColor(0x000000, 1);
    window.doctorRenderer.setSize(window.innerWidth, window.innerHeight);
    window.doctorRenderer.setPixelRatio(window.devicePixelRatio);
    window.doctorScene.background = new THREE.Color(0x000000);
    container.appendChild(window.doctorRenderer.domElement);

    // Controls
    window.doctorControls = new THREE.OrbitControls(window.doctorCamera, window.doctorRenderer.domElement);
    window.doctorControls.enableDamping = true;
    window.doctorControls.enablePan = true;
    window.doctorControls.enableZoom = true;
    window.doctorControls.minDistance = 1.0; // Allow closer zoom to inspect nerves clearly
    window.doctorControls.maxDistance = 8;
    window.doctorControls.target.set(0, -0.2, 0); // Focus slightly lower so head/feet fill properly

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    window.doctorScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 5);
    window.doctorScene.add(dirLight);

    // Theme-based rim lighting
    const rimLight = new THREE.DirectionalLight(0x00f0ff, 0.4);
    rimLight.position.set(-5, 5, -5);
    window.doctorScene.add(rimLight);

    // Bottom Rim Light (Platform Glow)
    const platLight = new THREE.PointLight(0x00f0ff, 1.5, 10);
    platLight.position.set(0, -1.4, 0);
    window.doctorScene.add(platLight);

    // Holographic Platform
    const platformGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.1, 32);
    const platformMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    doctorScanPlatform = new THREE.Mesh(platformGeo, platformMat);
    doctorScanPlatform.position.y = -1.5;
    window.doctorScene.add(doctorScanPlatform);

    // Inner glowing core of the platform
    const coreGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.11, 32);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0x0066ff,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });
    const platformCore = new THREE.Mesh(coreGeo, coreMat);
    platformCore.position.y = -1.5;
    window.doctorScene.add(platformCore);

    // Energy Scanning Rings
    for (let i = 0; i < 3; i++) {
        const ringGeo = new THREE.RingGeometry(1.3, 1.4, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -1.45;
        // Store initial offset for animation staggering
        ring.userData = { offset: i * 2, active: true };
        doctorScanRings.push(ring);
        window.doctorScene.add(ring);
    }

    // -- Futuristic Nervous System Twin-Ring Platform --
    nsPlatformGroup = new THREE.Group();
    nsPlatformGroup.position.y = -1.45;

    // Outer ring: Segmented, glowing red neon edge
    const outerGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.05, 64, 1, true);
    const edgesGeo = new THREE.EdgesGeometry(outerGeo);
    const dashedMat = new THREE.LineDashedMaterial({
        color: 0xff3333,
        linewidth: 2,
        scale: 1,
        dashSize: 0.1,
        gapSize: 0.05,
        transparent: true,
        opacity: 0.9
    });
    nsOuterRing = new THREE.LineSegments(edgesGeo, dashedMat);
    nsOuterRing.computeLineDistances();

    // Add a solid glowing ring to the outer edge
    const thinRingGeo = new THREE.RingGeometry(1.48, 1.52, 64);
    const thinRingMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const thinRing = new THREE.Mesh(thinRingGeo, thinRingMat);
    thinRing.rotation.x = -Math.PI / 2;
    nsOuterRing.add(thinRing);
    nsPlatformGroup.add(nsOuterRing);

    // Inner circle: Radial laser-like lines (CircleGeometry wireframe)
    const innerGeo = new THREE.CircleGeometry(1.35, 48);
    const innerMat = new THREE.MeshBasicMaterial({
        color: 0xff2222,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    nsInnerCircle = new THREE.Mesh(innerGeo, innerMat);
    nsInnerCircle.rotation.x = -Math.PI / 2;
    nsPlatformGroup.add(nsInnerCircle);

    // Dark semi-transparent background for inner circle
    const innerSolidMat = new THREE.MeshBasicMaterial({
        color: 0x1a0000, // Very dark red
        transparent: true,
        opacity: 0.8, // Enhanced opacity to hide any background artifacts
        side: THREE.DoubleSide
    });
    const innerSolid = new THREE.Mesh(innerGeo, innerSolidMat);
    innerSolid.rotation.x = -Math.PI / 2;
    innerSolid.position.y = -0.01;
    nsPlatformGroup.add(innerSolid);

    // Center soft pulsing light
    const centerTorus = new THREE.TorusGeometry(0.2, 0.02, 16, 32);
    const centerMat = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });
    nsCenterGlow = new THREE.Mesh(centerTorus, centerMat);
    nsCenterGlow.rotation.x = -Math.PI / 2;

    // Core filled light
    const centerLightGeometry = new THREE.CircleGeometry(0.18, 32);
    const centerLightMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const centerLight = new THREE.Mesh(centerLightGeometry, centerLightMaterial);
    nsCenterGlow.add(centerLight);

    nsPlatformGroup.add(nsCenterGlow);

    // PointLight in the center for volumetric glow effect
    const nsPointLight = new THREE.PointLight(0xff1111, 1.5, 3);
    nsPointLight.position.y = 0.5;
    nsPlatformGroup.add(nsPointLight);

    nsPlatformGroup.visible = false;
    window.doctorScene.add(nsPlatformGroup);
    // --------------------------------------------------

    // Load based on theme
    loadDoctorThemeModel(theme);

    // Event Listeners
    window.addEventListener('resize', onDoctorWindowResize);
    window.addEventListener('mousemove', onDoctorMouseMove);
    window.addEventListener('click', onDoctorMouseClick);

    // Animation Loop
    animateDoctor();
}

function loadDoctorThemeModel(theme) {
    if (window.doctorModel) {
        window.doctorScene.remove(window.doctorModel);
        window.doctorModel = null;
    }

    currentLoadedTheme = theme;

    // Determine GLB based on theme (using the /models alias mapped to desktop in Express)
    let modelUrl = '';
    if (theme === 'Nervous System') {
        modelUrl = '/models/nervousSystem.glb';
    } else if (theme === 'Circulatory System') {
        modelUrl = '/models/circulatorySystem.glb';
    } else if (theme === 'Respiratory System') {
        modelUrl = '/models/respiratory_system.glb';
    } else if (theme === 'Skeletal System') {
        modelUrl = '/models/male_skeleton (1).glb';
    } else if (theme === 'Heart') {
        modelUrl = '/models/Human heart.glb';
    } else if (theme === 'Kidneys') {
        modelUrl = '/models/human_kidney_model.glb';
    } else if (theme === 'Lungs') {
        modelUrl = '/models/realistic_human_lungs.glb';
    } else {
        // Fallback or handle error
        console.warn("Unknown theme, attempting generic load");
        return;
    }

    const loader = new THREE.GLTFLoader();

    // --- Dynamic Platform Visibility ---
    const isNS = theme === 'Nervous System';
    if (typeof nsPlatformGroup !== 'undefined') {
        nsPlatformGroup.visible = isNS;
    }
    // Update Platform Core
    window.doctorScene.children.forEach(child => {
        // Toggle Platform Core visibility and position
        if (child.isMesh && child.geometry && child.geometry.type === 'CylinderGeometry' && child !== doctorScanPlatform) {
            child.visible = !isNS;
            if (!isNS) {
                child.position.y = theme === 'Skeletal System' ? -2.0 : -1.5;
            }
        }
        // Toggle original Bottom Rim Light visibility and position
        if (child.isPointLight && child.color.getHex() !== 0xff1111) { // ignore the new NS light
            child.visible = !isNS;
            if (!isNS) {
                child.position.y = theme === 'Skeletal System' ? -1.9 : -1.4;
            }
        }
    });

    if (doctorScanPlatform) {
        doctorScanPlatform.visible = !isNS;
        if (!isNS) {
            doctorScanPlatform.position.y = theme === 'Skeletal System' ? -2.0 : -1.5;
        }
    }

    doctorScanRings.forEach(ring => {
        ring.visible = !isNS;
        if (!isNS) {
            // Keep original offset relative to standard platform
            ring.position.y = theme === 'Skeletal System' ? -1.95 : -1.45;
        }
    });
    // ------------------------------------------------------------

    loader.load(modelUrl, (gltf) => {
        window.doctorModel = gltf.scene;

        if (theme === 'Skeletal System' || theme === 'Heart' || theme === 'Kidneys' || theme === 'Lungs') {
            // Compute true mathematical bounds of the model and auto-scale it
            const box = new THREE.Box3().setFromObject(window.doctorModel);
            const size = box.getSize(new THREE.Vector3());

            // Adjust TargetHeight based on the geometry
            let targetHeight = 4.2; // Perfect height for full bodies
            if (theme === 'Heart') targetHeight = 2.0; // Heart should fill the inner circle
            if (theme === 'Kidneys') targetHeight = 2.0;
            if (theme === 'Lungs') targetHeight = 2.5; // Lungs are slightly wider/taller realistically

            const scaleFactor = targetHeight / size.y;
            window.doctorModel.scale.set(scaleFactor, scaleFactor, scaleFactor);

            // Re-center X, Y, Z position so it floats perfectly in the platform center
            const newBox = new THREE.Box3().setFromObject(window.doctorModel);
            const newCenter = newBox.getCenter(new THREE.Vector3());
            const newSize = newBox.getSize(new THREE.Vector3());

            if (theme === 'Skeletal System') {
                window.doctorModel.position.set(0, -2.0, 0); // Raised slightly so legs are visible (-2.0)
            } else if (theme === 'Kidneys') {
                // Kidneys need to be lower and exactly centered
                window.doctorModel.position.set(-newCenter.x, -newCenter.y + (newSize.y / 2) - 1.5, -newCenter.z);
            } else if (theme === 'Lungs') {
                // Lungs can sit nicely above the rings
                window.doctorModel.position.set(-newCenter.x, -newCenter.y + (newSize.y / 2) - 1.2, -newCenter.z);
            } else {
                window.doctorModel.position.set(-newCenter.x, -newCenter.y + (newSize.y / 2) - 0.8, -newCenter.z); // Hovering above platform
            }
        } else {
            window.doctorModel.position.set(0, -1, 0); // Center adjustment for others
        }

        nerveLabels = []; // Reset on new load
        if (theme === 'Nervous System') {
            const targetGroups = ['LabelGroup2_1', 'LabelGroup2_2', 'LabelGroup2_3'];
            targetGroups.forEach((groupName) => {
                const group = window.doctorModel.getObjectByName(groupName);
                if (group) {
                    nerveLabels.push(group);
                }
            });
        }

        // Setup Animation Mixer for built-in GLTF animations (like the beating heart)
        if (gltf.animations && gltf.animations.length > 0) {
            window.doctorMixer = new THREE.AnimationMixer(window.doctorModel);
            gltf.animations.forEach((clip) => {
                window.doctorMixer.clipAction(clip).play();
            });
        } else {
            window.doctorMixer = null;
        }

        window.doctorHeartNode = null;

        // Save original materials and identify the heart node
        window.doctorModel.traverse((child) => {
            if (child.isMesh) {
                child.userData.originalMaterial = child.material;
            }
            if (child.name && child.name.toLowerCase().includes('heart')) {
                window.doctorHeartNode = child;
                child.userData.baseScale = child.scale.clone();
            }
        });

        // Automatically convert the dark outer body shell into a clear blue hologram for Respiratory System
        if (theme === 'Respiratory System') {
            let maxVolume = 0;
            let bodyMesh = null;
            window.doctorModel.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    child.geometry.computeBoundingBox();
                    const bbox = child.geometry.boundingBox;
                    const volume = (bbox.max.x - bbox.min.x) * (bbox.max.y - bbox.min.y) * (bbox.max.z - bbox.min.z);
                    if (volume > maxVolume) {
                        maxVolume = volume;
                        bodyMesh = child;
                    }
                }
            });
            if (bodyMesh) {
                bodyMesh.material = new THREE.MeshStandardMaterial({
                    color: 0x00f0ff,
                    emissive: 0x004488,
                    transparent: true,
                    opacity: 0.15,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    side: THREE.FrontSide
                });
            }
        }

        window.doctorScene.add(window.doctorModel);
    }, undefined, (error) => {
        console.error(`Error loading theme model (${theme}):`, error);
    });
}

function onDoctorWindowResize() {
    if (!window.doctorCamera || !window.doctorRenderer) return;
    window.doctorCamera.aspect = window.innerWidth / window.innerHeight;
    window.doctorCamera.updateProjectionMatrix();
    window.doctorRenderer.setSize(window.innerWidth, window.innerHeight);
}

function onDoctorMouseMove(event) {
    if (document.getElementById('doctor-anatomy').classList.contains('hidden')) return;
    if (!document.getElementById('doctor-modal').classList.contains('hidden')) return;

    window.doctorMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    window.doctorMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    window.doctorRaycaster.setFromCamera(window.doctorMouse, window.doctorCamera);

    if (window.doctorModel) {
        let intersects;
        if (currentLoadedTheme === 'Nervous System') {
            intersects = window.doctorRaycaster.intersectObjects(nerveLabels, true);
        } else {
            intersects = window.doctorRaycaster.intersectObject(window.doctorModel, true);
        }

        if (doctorHoveredPart) {
            doctorHoveredPart = null;
        }

        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (currentLoadedTheme === 'Nervous System') {
                doctorHoveredPart = object;
                document.body.style.cursor = 'pointer';
            } else {
                if (object.name && object.name !== 'Scene') {
                    doctorHoveredPart = object;
                    document.body.style.cursor = 'pointer';
                } else {
                    document.body.style.cursor = 'default';
                }
            }
        } else {
            document.body.style.cursor = 'default';
        }
    }
}

function onDoctorMouseClick(event) {
    if (event.target !== window.doctorRenderer.domElement) return; // Prevent bubbling from UI elements
    if (document.getElementById('doctor-anatomy').classList.contains('hidden')) return;
    if (document.getElementById('doctor-modal').classList.contains('hidden') === false) return; // Modal open

    window.doctorRaycaster.setFromCamera(window.doctorMouse, window.doctorCamera);

    if (currentLoadedTheme === 'Nervous System') {
        const intersects = window.doctorRaycaster.intersectObjects(nerveLabels, true);

        if (intersects.length > 0) {
            // Using user-provided 3D vector coordinates for absolute label point-mapping
            const NERVE_LABELS = [
                { name: "Brain", dir: [0.00, 0.98, 0.12], te: "మెదడు" },
                { name: "Spinal Cord", dir: [0.00, 0.70, 0.00], te: "వెన్నుపాము" },
                { name: "Intercostal Nerves", dir: [-0.32, 0.55, 0.10], te: "ఇంటర్కోస్టల్ నరాలు" },
                { name: "Median Nerve", dir: [0.88, 0.22, 0.14], te: "మీడియన్ నరాల" },
                { name: "Femoral Nerve", dir: [0.20, 0.02, 0.22], te: "స్త్రీ తొడ ఎముక నరాల" },
                { name: "Sciatic Nerve", dir: [-0.60, 0.10, -0.12], te: "సయాటిక్ నరాల" },
                { name: "Tibial Nerve", dir: [0.18, -0.70, 0.10], te: "టిబయల్ నరాల" }
            ];

            // Convert intersection world point back into un-scaled model coordinate space to match the provided dir dictionary
            // Ensure bounding boxes are aligned natively
            window.doctorModel.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(window.doctorModel);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            // Normalize hit point from true Box3 bounding box bounds into [-1, 1] generic direction vectors to match 'dir' dictionary
            const hitPoint = intersects[0].point;
            const nx = (hitPoint.x - center.x) / (size.x / 2);
            const ny = (hitPoint.y - center.y) / (size.y / 2);
            const nz = (hitPoint.z - center.z) / (size.z / 2);

            let closestLabel = "Brain";
            let minDistanceSq = Infinity;

            NERVE_LABELS.forEach(label => {
                const dx = nx - label.dir[0];
                const dy = ny - label.dir[1];
                const dz = nz - label.dir[2];
                // Favor Y-axis alignment slightly heavily
                const distSq = (dx * dx) + (dy * dy * 1.5) + (dz * dz * 0.5);

                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    closestLabel = (doctorCurrentLanguage === 'te' && label.te) ? label.te : label.name;
                }
            });

            validLabel = closestLabel;

            app.openDoctorModal(validLabel);

            // Trigger Neural Signal Monitor Activity
            const neuralNodes = document.querySelectorAll('.neural-node');
            if (neuralNodes.length > 0) {
                // Determine node to highlight based on label
                let activeNode = null;
                if (validLabel === 'Brain') {
                    activeNode = document.querySelector('.brain-node');
                    document.getElementById('ns-speed').innerText = '80–120 m/s';
                    document.getElementById('ns-response').innerText = '0.08–0.15 s';
                } else if (validLabel === 'Spinal Cord') {
                    activeNode = document.querySelector('.spine-node');
                    document.getElementById('ns-speed').innerText = '60–100 m/s';
                    document.getElementById('ns-response').innerText = '0.10–0.20 s';
                } else if (validLabel.includes('Intercostal')) {
                    activeNode = document.querySelector('.spine-node');
                    document.getElementById('ns-speed').innerText = '30–70 m/s';
                    document.getElementById('ns-response').innerText = '0.20–0.30 s';
                } else if (validLabel.includes('Median')) {
                    activeNode = document.querySelector('.limb-node');
                    document.getElementById('ns-speed').innerText = '50–65 m/s';
                    document.getElementById('ns-response').innerText = '0.15–0.25 s';
                } else if (validLabel.includes('Femoral')) {
                    activeNode = document.querySelector('.limb-node');
                    document.getElementById('ns-speed').innerText = '55–75 m/s';
                    document.getElementById('ns-response').innerText = '0.15–0.30 s';
                } else if (validLabel.includes('Sciatic')) {
                    activeNode = document.querySelector('.limb-node');
                    document.getElementById('ns-speed').innerText = '60–120 m/s';
                    document.getElementById('ns-response').innerText = '0.10–0.25 s';
                } else if (validLabel.includes('Tibial')) {
                    activeNode = document.querySelector('.limb-node');
                    document.getElementById('ns-speed').innerText = '40–60 m/s';
                    document.getElementById('ns-response').innerText = '0.20–0.35 s';
                } else {
                    activeNode = document.querySelector('.spine-node');
                    document.getElementById('ns-speed').innerText = '120 m/s';
                    document.getElementById('ns-response').innerText = '0.11 s';
                }

                // Reset all
                neuralNodes.forEach(node => node.classList.remove('active'));
                const impulses = document.querySelectorAll('.neural-impulse');
                impulses.forEach(imp => imp.style.animationDuration = '2s');

                // Activate specific
                if (activeNode) {
                    activeNode.classList.add('active');
                    // Speed up impulse flow
                    impulses.forEach(imp => imp.style.animationDuration = '0.8s');

                    document.getElementById('ns-status').innerText = 'SENSORY SPIKE';
                    document.getElementById('ns-status').style.color = '#fff';

                    // The values will now stay active until the next click.
                }
            }
        }
    } else if (currentLoadedTheme === 'Circulatory System') {
        const intersects = window.doctorRaycaster.intersectObject(window.doctorModel, true);

        if (intersects.length > 0) {
            const CIRCULATORY_LABELS = [
                { name: "Superior Vena Cava", dir: [-0.10, 0.72, 0.10], te: "సుపీరియర్ వెనా కావా" },
                { name: "Inferior Vena Cava", dir: [-0.05, -0.40, 0.08], te: "ఇన్‌ఫీరియర్ వెనా కావా" },
                { name: "Aorta", dir: [0.06, 0.60, 0.18], te: "మహాధమని" },
                { name: "Heart", dir: [0.08, 0.56, 0.22], te: "గుండె" },
                { name: "Femoral Vein", dir: [-0.22, 0.02, 0.18], te: "స్త్రీ తొడ ఎముక సిర" },
                { name: "Femoral Artery", dir: [0.22, 0.02, 0.18], te: "స్త్రీ తొడ ఎముక ధమని" }
            ];

            window.doctorModel.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(window.doctorModel);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            const hitPoint = intersects[0].point;
            const nx = (hitPoint.x - center.x) / (size.x / 2);
            const ny = (hitPoint.y - center.y) / (size.y / 2);
            const nz = (hitPoint.z - center.z) / (size.z / 2);

            let closestLabel = "Heart";
            let minDistanceSq = Infinity;

            CIRCULATORY_LABELS.forEach(label => {
                const dx = nx - label.dir[0];
                const dy = ny - label.dir[1];
                const dz = nz - label.dir[2];
                const distSq = (dx * dx) + (dy * dy * 1.5) + (dz * dz * 0.5);

                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    closestLabel = (doctorCurrentLanguage === 'te' && label.te) ? label.te : label.name;
                }
            });

            // Prevent opening a form if they click an unlabeled part of the Circulatory System (like the arms)
            // Relaxed the threshold from 0.05 to 0.3 because 0.05 was too strict for clicks to register.
            if (minDistanceSq < 0.3) {
                app.openDoctorModal(closestLabel);
            }
        }
    } else {
        const intersects = window.doctorRaycaster.intersectObject(window.doctorModel, true);
        if (intersects.length > 0 && doctorHoveredPart) {
            const partName = doctorHoveredPart.name;
            const cleanName = partName.replace(/_/g, ' ');
            app.openDoctorModal(cleanName);
        }
    }
}

function animateDoctor() {
    doctorAnimationId = requestAnimationFrame(animateDoctor);

    const delta = doctorClock.getDelta();
    const time = doctorClock.elapsedTime;

    if (window.doctorControls && window.doctorControls.enabled) {
        window.doctorControls.update();
    }

    // Play native GLB animations (e.g., beating heart)
    if (window.doctorMixer) {
        window.doctorMixer.update(delta);
    } else if (window.doctorHeartNode) {
        // Fallback synthetic heartbeat if no animation exists
        const bps = 80 / 60; // 80 beats per minute
        const pulseAmount = Math.pow(Math.abs(Math.sin(time * Math.PI * bps)), 8);
        const hrPulse = 1 + pulseAmount * 0.15;

        window.doctorHeartNode.scale.set(
            window.doctorHeartNode.userData.baseScale.x * hrPulse,
            window.doctorHeartNode.userData.baseScale.y * hrPulse,
            window.doctorHeartNode.userData.baseScale.z * hrPulse
        );
    }

    // Dynamic Lighting (Breathing effect)
    if (window.doctorScene) {
        window.doctorScene.traverse((child) => {
            if (child.isDirectionalLight && child.color.getHex() === 0xffffff) {
                child.intensity = 0.8 + Math.sin(time * 2) * 0.2;
            }
        });
    }

    // Animate Original Platform
    if (doctorScanPlatform && doctorScanPlatform.visible) {
        doctorScanPlatform.rotation.y = time * 0.2;
    }

    // Animate New Nervous System Platform
    if (typeof nsPlatformGroup !== 'undefined' && nsPlatformGroup.visible) {
        if (typeof nsOuterRing !== 'undefined') nsOuterRing.rotation.y -= delta * 0.2; // Clockwise
        if (typeof nsInnerCircle !== 'undefined') nsInnerCircle.rotation.z += delta * 0.4; // Counter-clockwise
        if (typeof nsCenterGlow !== 'undefined') {
            const pulse = (Math.sin(time * 4) + 1) * 0.5; // Heartbeat/pulse
            nsCenterGlow.scale.set(1 + pulse * 0.3, 1 + pulse * 0.3, 1 + pulse * 0.3);
            nsCenterGlow.material.opacity = 0.5 + pulse * 0.5;
            if (nsCenterGlow.children[0]) {
                nsCenterGlow.children[0].material.opacity = 0.4 + pulse * 0.6;
            }
        }
    }

    // Animate Rings
    if (doctorScanRings.length > 0 && doctorScanRings[0].visible) {
        doctorScanRings.forEach((ring) => {
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

    if (window.doctorRenderer && window.doctorScene && window.doctorCamera) {
        window.doctorRenderer.render(window.doctorScene, window.doctorCamera);
    }
}
