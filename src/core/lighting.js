import * as THREE from 'three';

export function addLightSource(glowObject, scene, lightList = []) {
    const name = glowObject.name.toLowerCase();
    const worldPosition = new THREE.Vector3();
    glowObject.getWorldPosition(worldPosition);

    if (name.includes('spot')) {
        const spotLight = new THREE.SpotLight(0xffffff, 20, 50, Math.PI / 6, 0.3, 2);
        spotLight.position.copy(worldPosition);

        const target = new THREE.Object3D();
        let targetOffset = { x: 0, y: -5, z: 0 };

        if (name.includes('front')) targetOffset = { x: 0, y: -4, z: 5 };
        else if (name.includes('back')) targetOffset = { x: 0, y: -4, z: -5 };
        else if (name.includes('left')) targetOffset = { x: -5, y: -4, z: 0 };
        else if (name.includes('right')) targetOffset = { x: 5, y: -4, z: 0 };

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
        lightList.push(spotLight);
    } else if (name.includes('ceiling')) {
        const rectLight = new THREE.RectAreaLight(0xffffff, 80, 1.0, 1.0);
        rectLight.position.copy(worldPosition);
        rectLight.rotation.x = -Math.PI / 2;
        scene.add(rectLight);
        lightList.push(rectLight);
    } else {
        const fallbackLight = new THREE.PointLight(0xffffff, 1, 20);
        fallbackLight.position.copy(worldPosition);
        scene.add(fallbackLight);
        lightList.push(fallbackLight);
    }
}
