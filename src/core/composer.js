import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';

const BLOOM_LAYER = 1;

const darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
const materials = {};
const params = {
    threshold: 0,
    strength: 1.5,
    radius: 0.6,
    exposure: 1.2
};

export function setupComposers(scene, camera, renderer) {
    // Setup post-processing
    const renderScene = new RenderPass(scene, camera);

    const bloomLayer = new THREE.Layers();
    bloomLayer.set(BLOOM_LAYER);

    // Bloom pass for the sun
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85
    );
    bloomPass.threshold = params.threshold;
    bloomPass.strength = params.strength;
    bloomPass.radius = params.radius;

    // Create bloom composer
    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    // Create final composer
    const finalComposer = new EffectComposer(renderer);
    finalComposer.addPass(renderScene);

    // Shader for combining bloom and scene
    const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `;

    const fragmentShader = `
    uniform sampler2D baseTexture;
    uniform sampler2D bloomTexture;
    varying vec2 vUv;
    void main() {
        vec4 base = texture2D(baseTexture, vUv);
        vec4 bloom = texture2D(bloomTexture, vUv);
        gl_FragColor = vec4(base.rgb + bloom.rgb, base.a);
    }
    `;

    // Mix pass for combining bloom and regular rendering
    const mixPass = new ShaderPass(
        new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            defines: {}
        }), 'baseTexture'
    );
    mixPass.needsSwap = true;
    finalComposer.addPass(mixPass);
    finalComposer.addPass(new OutputPass());

    // Helper functions for bloom effect
    const darkenNonBloomed = (obj) => {
        if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
            materials[obj.uuid] = obj.material;
            obj.material = darkMaterial;
        }
    };

    const restoreMaterial = (obj) => {
        if (materials[obj.uuid]) {
            obj.material = materials[obj.uuid];
            delete materials[obj.uuid];
        }
    };

    const renderSelectiveBloom = (scene, camera, bloomComposer, finalComposer) => {
        scene.traverse(darkenNonBloomed);
        camera.layers.set(BLOOM_LAYER);
        bloomComposer.render();
        camera.layers.set(0);
        scene.traverse(restoreMaterial);

        finalComposer.render();
    }

    return { bloomComposer, finalComposer, renderSelectiveBloom  };
}

