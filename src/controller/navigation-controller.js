// NavigationController.js
import * as THREE from 'three';

export class NavigationController {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;

        this.moveSpeed = 7.0;
        this.lookSpeed = 0.003;
        this.jumpHeight = 1.5;
        this.gravity = -9.8;
        this.playerHeight = 5;
        this.playerRadius = 1.2;

        this.velocity = new THREE.Vector3();
        this.isOnGround = false;
        this.keys = {};
        this.mouseMovement = { x: 0, y: 0 };
        this.isPointerLocked = false;

        this.collisionObjects = [];
        this.floorObjects = [];

        this.pitch = 0;
        this.yaw = 0;

        this.downRaycaster = new THREE.Raycaster();

        this.setupEventListeners();
        this.findCollisionObjects();
        this.initializeCamera();
    }

    initializeCamera() {
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.set(0, 0, 0);
        this.camera.up.set(0, 1, 0);
    }

    findCollisionObjects() {
        this.collisionObjects = [];
        this.floorObjects = [];

        this.scene.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();

                if (name.includes('floor')) {
                    this.floorObjects.push(child);
                } else if (name.includes('wall') || name.includes('obstacle') || name.includes('flower')) {
                    this.collisionObjects.push(child);
                }
            }
        });
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;

            if (event.code === 'Space' && this.isOnGround) {
                this.velocity.y = Math.sqrt(-2 * this.gravity * this.jumpHeight);
                this.isOnGround = false;
                event.preventDefault();
            }

            if (event.code === 'Escape') {
                if (document.pointerLockElement === document.body) {
                    document.exitPointerLock();
                }
            }
        });

        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });

        document.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === document.body;
        });

        document.addEventListener('mousemove', (event) => {
            if (this.isPointerLocked) {
                this.mouseMovement.x = event.movementX;
                this.mouseMovement.y = event.movementY;
            }
        });

        this.createInstructions();
    }

    createInstructions() {
        const instructions = document.createElement('div');
        instructions.innerHTML = `
            <div style="position: fixed; top: 10px; left: 10px; color: white; font-family: Arial; font-size: 14px; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px; z-index: 1000;">
                <strong>Navigation Controls:</strong><br>
                • Click to lock mouse cursor<br>
                • WASD - Move around<br>
                • Mouse - Look around<br>
                • Space - Jump<br>
                • ESC - Release mouse cursor
            </div>
        `;
        document.body.appendChild(instructions);
    }

    checkGroundCollision() {
        const cameraPosition = this.camera.position.clone();
        this.downRaycaster.set(cameraPosition, new THREE.Vector3(0, -1, 0));

        const intersects = this.downRaycaster.intersectObjects(this.floorObjects, true);

        if (intersects.length > 0) {
            const groundY = intersects[0].point.y;
            const desiredY = groundY + this.playerHeight;

            if (this.camera.position.y <= desiredY + 0.1 && this.velocity.y <= 0) {
                this.camera.position.y = desiredY;
                this.velocity.y = 0;
                this.isOnGround = true;
                return true;
            }
        }

        return false;
    }

    checkBoundingSphereCollision(targetPos) {
        const playerSphere = new THREE.Sphere(targetPos, this.playerRadius);

        for (const obj of this.collisionObjects) {
            const box = new THREE.Box3().setFromObject(obj);

            if (box.intersectsSphere(playerSphere)) {
                return true; // collision detected
            }
        }
        return false;
    }

    update(deltaTime) {
        if (this.isPointerLocked) {
            this.yaw -= this.mouseMovement.x * this.lookSpeed;
            this.pitch -= this.mouseMovement.y * this.lookSpeed;
            this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));

            this.camera.rotation.y = this.yaw;
            this.camera.rotation.x = this.pitch;

            this.mouseMovement.x = 0;
            this.mouseMovement.y = 0;
        }

        const input = new THREE.Vector3();
        if (this.keys['KeyW']) input.z -= 1;
        if (this.keys['KeyS']) input.z += 1;
        if (this.keys['KeyA']) input.x -= 1;
        if (this.keys['KeyD']) input.x += 1;

        let horizontalMove = new THREE.Vector3();
        if (input.length() > 0) {
            input.normalize();
            input.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
            horizontalMove = input.multiplyScalar(this.moveSpeed * deltaTime);
        }

        if (!this.isOnGround) {
            this.velocity.y += this.gravity * deltaTime;
        }

        const proposedPosition = this.camera.position.clone();
        proposedPosition.add(new THREE.Vector3(horizontalMove.x, 0, horizontalMove.z));

        if (!this.checkBoundingSphereCollision(proposedPosition)) {
            this.camera.position.x += horizontalMove.x;
            this.camera.position.z += horizontalMove.z;
        }

        const verticalMove = this.velocity.y * deltaTime;
        this.camera.position.y += verticalMove;

        if (!this.checkGroundCollision()) {
            this.isOnGround = false;
        }

        if (this.camera.position.y < -10) {
            this.camera.position.y = this.playerHeight;
            this.velocity.y = 0;
            this.isOnGround = true;
        }
    }

    setPosition(x, y, z) {
        this.camera.position.set(x, y + this.playerHeight, z);
        this.velocity.set(0, 0, 0);
        this.isOnGround = false;
    }

    refreshCollisionObjects() {
        this.findCollisionObjects();
    }

    unstuckPlayer() {
        const testDirections = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(0, 1, 0)
        ];

        for (const direction of testDirections) {
            const testMovement = direction.clone().multiplyScalar(this.playerRadius * 2);
            const testPos = this.camera.position.clone().add(testMovement);
            if (!this.checkBoundingSphereCollision(testPos)) {
                this.camera.position.copy(testPos);
                break;
            }
        }
    }
}
