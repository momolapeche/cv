import * as THREE from 'three'
import { Manager, Managers } from "@/engine/Manager";
import { GraphicsManager } from '@/engine/Graphics';
import { Component, GameObject } from '@/engine/GameObject';
import { Events } from '@/engine/EventList';

export class ButtonManager extends Manager {
    #raycaster: THREE.Raycaster
    #colliders = new Set<THREE.Object3D>()

    constructor() {
        super()

        this.#raycaster = new THREE.Raycaster()
    }

    addRayCastComponent(c: RaycastColliderComponent): void {
        this.#colliders.add(c.mesh)
    }
    removeRayCastComponent(c: RaycastColliderComponent): void {
        this.#colliders.delete(c.mesh)
    }

    OnClick(data: Events['OnClick']): void {
        this.rayCast(data.nx*2-1, 1-data.ny*2)
    }

    rayCast(x: number, y: number): void {
        this.#raycaster.setFromCamera({x, y}, Managers.get(GraphicsManager).camera)
        const intersects = this.#raycaster.intersectObjects([...this.#colliders])

        if (intersects.length > 0) {
            intersects[0].object.userData.rayCastCallback()
        }
    }
}

export class RaycastColliderComponent extends Component {
    mesh: THREE.Object3D
    #callback: () => void

    constructor(parent: GameObject, mesh: THREE.Object3D, callback: () => void) {
        super(parent)

        this.mesh = mesh
        // this.mesh.visible = false
        this.#callback = callback
    }

    Init(): void {
        Managers.get(ButtonManager).addRayCastComponent(this)

        if (this.mesh.userData === undefined) {
            this.mesh.userData = {}
        }
        this.mesh.userData.rayCastCallback = () => {
            this.#callback()
        }
    }
    Destroy(): void {
        Managers.get(ButtonManager).removeRayCastComponent(this)

        this.parent.threeObject.remove(this.mesh)
    }
}