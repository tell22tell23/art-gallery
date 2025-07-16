// room.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { NavigationController } from '../controller/navigation-controller';

import { RenderPass, EffectComposer, OutputPass, UnrealBloomPass, ShaderPass } from 'three/examples/jsm/Addons.js';

RectAreaLightUniformsLib.init();

const params = {
    threshold: 0,
    strength: 0.5,
    radius: 0.6,
    exposure: 1.2
};

function addLightSource(glowObject, scene) {
    const name = glowObject.name.toLowerCase();
    const worldPosition = new THREE.Vector3();
    glowObject.getWorldPosition(worldPosition);

    if (name.includes('spot')) {
        const spotLight = new THREE.SpotLight(0xffffff, 10, 50, Math.PI / 6, 0.3, 2);
        spotLight.position.copy(worldPosition);

        const target = new THREE.Object3D();
        let targetOffset = { x: 0, y: -5, z: 0 };

        if (name.includes('front')) targetOffset = { x: 0, y: -6, z: -5 };
        else if (name.includes('back')) targetOffset = { x: 0, y: -6, z: 5 };
        else if (name.includes('left')) targetOffset = { x: 5, y: -6, z: 0 };
        else if (name.includes('right')) targetOffset = { x: -5, y: -3, z: 0 };

        target.position.set(
            worldPosition.x + targetOffset.x,
            worldPosition.y + targetOffset.y,
            worldPosition.z + targetOffset.z
        );
        scene.add(target);
        spotLight.target = target;

        spotLight.castShadow = true;
        spotLight.shadow.mapSize.set(1024, 1024);
        spotLight.shadow.bias = -0.005;

        scene.add(spotLight);
    } else if (name.includes('ceiling')) {
        const rectLight = new THREE.RectAreaLight(0xffffff, 50, 1.0, 1.0);
        rectLight.position.copy(worldPosition);
        rectLight.rotation.x = -Math.PI / 2;
        scene.add(rectLight);
    } else {
        const fallbackLight = new THREE.PointLight(0xffffff, 1, 20);
        fallbackLight.position.copy(worldPosition);
        scene.add(fallbackLight);
    }
}

export function addRoom(scene, camera, renderer, BLOOM_SCENE) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        scene.add(ambientLight);

        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, // bloom strength
            0.4,
            0.85
        );
        bloomPass.threshold = params.threshold;
        bloomPass.strength = params.strength;
        bloomPass.radius = params.radius;

        const bloomComposer = new EffectComposer(renderer);
        bloomComposer.renderToScreen = false;
        bloomComposer.addPass(renderScene);
        bloomComposer.addPass(bloomPass);

        const mixPass = new ShaderPass(
            new THREE.ShaderMaterial({
                uniforms: {
                    baseTexture: { value: null },
                    bloomTexture: { value: bloomComposer.renderTarget2.texture }
                },
                vertexShader: document.getElementById('vertexshader').textContent,
                fragmentShader: document.getElementById('fragmentshader').textContent,
                defines: {}
            }), 'baseTexture'
        );
        mixPass.needsSwap = true;

        const finalComposer = new EffectComposer(renderer);
        finalComposer.addPass(renderScene);
        finalComposer.addPass(mixPass);

        finalComposer.addPass(new OutputPass());

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredArt = null;
        let artDetails = {};

        fetch('/art_details.json')
            .then(res => res.json())
            .then(data => artDetails = data)
            .catch(err => console.error('Fetch error:', err));

        window.addEventListener('mousemove', (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });

        window.addEventListener('keydown', (event) => {
            if (event.code === 'KeyE' && hoveredArt && artDetails[hoveredArt]) {
                const art = artDetails[hoveredArt];
                showArtDetailPopup(art);
                document.exitPointerLock();
            }

            if (event.code === 'Escape') {
                closePopup();
            }
        });

        window.addEventListener('mousedown', (event) => {
            const popup = document.getElementById("artDetailPopup");
            if (popup && popup.style.display === 'block') {
                const popupContent = document.getElementById('popupContent') || popup;

                if (!popupContent.contains(event.target)) {
                    closePopup();
                }
            }
        });

        const showHoverPrompt = (visible) => {
            const prompt = document.getElementById("hoverPrompt");
            if (prompt) prompt.style.display = visible ? "block" : "none";
        };

        const showArtDetailPopup = (art) => {
            document.getElementById("popupTitle").textContent = art.title;
            document.getElementById("popupArtist").textContent = art.artist;
            document.getElementById("popupDate").textContent = art.date;
            document.getElementById("popupImage").src = art.image;
            document.getElementById("popupDescription").textContent = art.description;

            const linksList = document.getElementById("popupLinks");
            linksList.innerHTML = ""; // Clear previous links if any

            if (art.links && Array.isArray(art.links) && art.links.length > 0) {
                art.links.forEach(link => {
                    const li = document.createElement("li");
                    const a = document.createElement("a");
                    a.href = link;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    a.title = link;
                    a.textContent = link;
                    li.appendChild(a);
                    linksList.appendChild(li);
                });
            }

            document.getElementById("artDetailPopup").style.display = 'block';
        };

        function closePopup() {
            const popup = document.getElementById("artDetailPopup");
            if (popup) popup.style.display = 'none';
            showHoverPrompt(false);
            document.body.requestPointerLock();
        }

        loader.load(
            '/gal.glb',
            // '3d-art-gallery.glb',
            (gltf) => {
                document.getElementById('loadingScreen').style.display = 'none'; // Hide loading screen
                const model = gltf.scene;
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                    if (child.name && child.name.startsWith('glow_light')) {
                        if (child.material) {
                            child.material = child.material.clone();
                            if (child.material.emissive) {
                                child.material.emissive.setHex(0xffffff);
                                child.material.emissiveIntensity = 2.0;
                            }
                            child.material.transparent = true;
                            child.material.opacity = 0.8;
                        } else if (child.isMesh) {
                            child.material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
                        }
                        child.layers.enable(BLOOM_SCENE);
                        addLightSource(child, scene);
                    }
                });

                scene.add(model);
                const navigationController = new NavigationController(camera, scene);
                navigationController.setPosition(1, 0, 3);

                if (gltf.scene.background) {
                    scene.background = gltf.scene.background;
                }

                // Optional: Use environment map
                const envMap = gltf.scene.environment;
                if (envMap) {
                    scene.environment = envMap;
                }

                const updateHelpers = () => {
                    scene.traverse((child) => {
                        if (child.isSpotLightHelper || child.isDirectionalLightHelper || child.isPointLightHelper) {
                            child.update();
                        }
                    });
                };

                const detectArtHover = () => {
                    raycaster.setFromCamera(mouse, camera);
                    const intersects = raycaster.intersectObjects(model.children, true);

                    if (intersects.length > 0) {
                        const hit = intersects[0].object;
                        const root = hit.userData.rootArtPiece || hit;

                        if (root.name.startsWith('art_piece')) {
                            hoveredArt = root.name;
                            showHoverPrompt(true);
                        } else {
                            hoveredArt = null;
                            showHoverPrompt(false);
                        }
                    } else {
                        hoveredArt = null;
                        showHoverPrompt(false);
                    }
                };

                resolve({ bloomComposer, finalComposer, updateHelpers, navigationController, detectArtHover });
            },
            (progress) => {
                if (progress.lengthComputable) {
                    const loadingScreen = document.getElementById('loadingScreen');
                    if (loadingScreen) {
                        loadingScreen.textContent = `Loading 3D Gallery...`;
                    }
                } else {
                    // fallback if length not computable
                    const loadingScreen = document.getElementById('loadingScreen');
                    if (loadingScreen) {
                        loadingScreen.textContent = `Loading 3D Gallery...`;
                    }
                }
            },
            (error) => {
                console.error('Error loading model:', error);
                const loadingScreen = document.getElementById('loadingScreen');
                if (loadingScreen) {
                    loadingScreen.textContent = `Failed to load 3D Gallery.`;
                }
                reject(error);
            }
        );
    });
}
