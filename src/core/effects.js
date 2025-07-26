import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/Addons.js';

const GrayscaleShader = {
    uniforms: {
        tDiffuse: { value: null }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            gl_FragColor = vec4(vec3(gray), color.a);
        }
    `
};

export const grayscalePass = new ShaderPass(new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(GrayscaleShader.uniforms),
    vertexShader: GrayscaleShader.vertexShader,
    fragmentShader: GrayscaleShader.fragmentShader
}));
grayscalePass.enabled = false;

const SepiaShader = {
    uniforms: {
        tDiffuse: { value: null },
        amount:   { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        varying vec2 vUv;

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec3 c = color.rgb;

            vec3 sepia = vec3(
                dot(c, vec3(0.393, 0.769, 0.189)),
                dot(c, vec3(0.349, 0.686, 0.168)),
                dot(c, vec3(0.272, 0.534, 0.131))
            );

            gl_FragColor = vec4(mix(c, sepia, amount), color.a);
        }
    `
};

export const sepiaPass = new ShaderPass(new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(SepiaShader.uniforms),
    vertexShader: SepiaShader.vertexShader,
    fragmentShader: SepiaShader.fragmentShader
}));
sepiaPass.enabled = false;
