// room.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { NavigationController } from '../controller/navigation-controller';

RectAreaLightUniformsLib.init();

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

export function addRoom(scene, camera, renderer) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.85));
        composer.addPass(new OutputPass());

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredArt = null;
        let artDetails = {};

        fetch('/art_details.json')
            .then(res => res.json())
            .then(data => artDetails = data);

        window.addEventListener('mousemove', (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });

        window.addEventListener('keydown', (event) => {
            console.log(event.code);
            console.log('Hovered Art:', hoveredArt);
            console.log('artDetails:', artDetails);
            if (event.code === 'KeyE' && hoveredArt && artDetails[hoveredArt]) {
                console.log(event.code);
                const art = artDetails[hoveredArt];
                showArtDetailPopup(art);
                document.exitPointerLock();
            }

        });

        const showHoverPrompt = (visible) => {
            const prompt = document.getElementById("hoverPrompt");
            if (prompt) prompt.style.display = visible ? "block" : "none";
        };

        const showArtDetailPopup = (art) => {
            document.getElementById("popupTitle").textContent = art.title;
            document.getElementById("popupImage").src = art.image;
            document.getElementById("popupDescription").textContent = art.description;
            document.getElementById("artDetailPopup").style.display = 'block';
        };

        loader.load(
            '/3d-art-gallery.glb',
            (gltf) => {
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
                        addLightSource(child, scene);
                    }
                });

                scene.add(model);
                const navigationController = new NavigationController(camera, scene);
                navigationController.setPosition(0, 0, 5);

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

                resolve({ composer, updateHelpers, navigationController, detectArtHover });
            },
            (progress) => console.log('Loading progress:', progress),
            (error) => {
                console.error('Error loading model:', error);
                reject(error);
            }
        );
    });
}
