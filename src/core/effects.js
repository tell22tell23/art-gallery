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
        amount: { value: 1.0 },
        intensity: { value: 1.2 },     // Controls sepia strength
        warmth: { value: 0.1 },        // Adds warmth/coolness
        contrast: { value: 1.05 },     // Subtle contrast boost
        vignette: { value: 0.0 },      // Vignette effect strength
        noise: { value: 0.0 }          // Film grain amount
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
        uniform float intensity;
        uniform float warmth;
        uniform float contrast;
        uniform float vignette;
        uniform float noise;
        varying vec2 vUv;

        // Pseudo-random function for noise
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec3 c = color.rgb;

            // Enhanced sepia transformation with better color science
            vec3 sepia = vec3(
                dot(c, vec3(0.393, 0.769, 0.189)),
                dot(c, vec3(0.349, 0.686, 0.168)),
                dot(c, vec3(0.272, 0.534, 0.131))
            ) * intensity;

            // Apply warmth adjustment
            sepia.r += warmth * 0.1;
            sepia.g += warmth * 0.05;
            sepia.b -= warmth * 0.05;

            // Contrast adjustment
            sepia = ((sepia - 0.5) * contrast) + 0.5;

            // Mix original and sepia
            vec3 result = mix(c, sepia, amount);

            // Optional vignette effect
            if (vignette > 0.0) {
                vec2 center = vUv - 0.5;
                float dist = length(center);
                float vignetteAmount = smoothstep(0.3, 0.8, dist) * vignette;
                result = mix(result, result * 0.3, vignetteAmount);
            }

            // Optional film grain noise
            if (noise > 0.0) {
                float grain = random(vUv) * noise * 0.1;
                result += vec3(grain);
            }

            // Clamp to valid range
            result = clamp(result, 0.0, 1.0);

            gl_FragColor = vec4(result, color.a);
        }
    `
};

// Create the enhanced pass with better default settings
export const sepiaPass = new ShaderPass(new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(SepiaShader.uniforms),
    vertexShader: SepiaShader.vertexShader,
    fragmentShader: SepiaShader.fragmentShader
}));

// Set some nice defaults
sepiaPass.uniforms.intensity.value = 1.1;
sepiaPass.uniforms.warmth.value = 0.05;
sepiaPass.uniforms.contrast.value = 1.02;
sepiaPass.enabled = false;
