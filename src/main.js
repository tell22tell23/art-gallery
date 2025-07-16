import * as THREE from 'three';
import { scene } from "./core/scene";
import { camera } from "./core/camera";
import { renderer } from "./core/renderer";
import { addRoom } from './objects/room';

const clock = new THREE.Clock();

let bloomComposer, finalComposer, navigationController, updateHelpers, detectArtHover = null;

const BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);
const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const materials = {}

function nonBloomed(obj) {
    if(obj.isMesh && bloomLayer.test(obj.layers) === false) {
        materials[obj.uuid] = obj.material;
        obj.material = darkMaterial;
    }
}

function restoreMaterials(obj) {
    if(materials[obj.uuid]) {
        obj.material = materials[obj.uuid];
        delete materials[obj.uuid];
    }
}

function init() {
    addRoom(scene, camera, renderer, BLOOM_SCENE)
        .then(({ bloomComposer: bc, finalComposer: fc, updateHelpers: uh, navigationController: nc, detectArtHover: dh }) => {
            bloomComposer = bc;
            finalComposer = fc;
            updateHelpers = uh;
            navigationController = nc;
            detectArtHover = dh;

            console.log('Room loaded successfully with navigation');

            // Start animation loop AFTER everything is loaded
            function animate() {
                requestAnimationFrame(animate);

                const deltaTime = clock.getDelta();

                if (navigationController) {
                    navigationController.update(deltaTime);
                }

                if (updateHelpers) { updateHelpers(); }
                if (detectArtHover) { detectArtHover(); }

                scene.traverse(nonBloomed);
                bloomComposer.render();
                scene.traverse(restoreMaterials);
                finalComposer.render();
            }

            animate(); // Start the animation loop here
        })
        .catch((error) => {
            console.error('Failed to load room:', error);
        });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

        bloomComposer.setSize(window.innerWidth, window.innerHeight);
        finalComposer.setSize(window.innerWidth, window.innerHeight);
    });
}

init();
