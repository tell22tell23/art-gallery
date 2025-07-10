import * as THREE from 'three';
import { scene } from "./core/scene";
import { camera } from "./core/camera";
import { renderer } from "./core/renderer";
import { addRoom } from './objects/room';

const clock = new THREE.Clock();

let composer, navigationController, updateHelpers, detectArtHover = null;

function init() {
    addRoom(scene, camera, renderer)
        .then(({ composer: c, updateHelpers: uh, navigationController: nc, detectArtHover: dh }) => {
            composer = c;
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

                if (composer) { composer.render(); }
                else { renderer.render(scene, camera); }
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

        if (composer) {
            composer.setSize(window.innerWidth, window.innerHeight);
        }
    });
}

init();
