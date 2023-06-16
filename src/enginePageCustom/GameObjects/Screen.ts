import * as THREE from 'three'
import { GameObject } from "@/engine/GameObject";
import { MeshComponent } from '@/engine/Graphics';

export class Screen extends GameObject {
    material: THREE.MeshBasicMaterial

    constructor(x: number, y: number, z: number) {
        super()

        this.threeObject.position.set(x, y, z)

        const geometry = new THREE.PlaneGeometry(1, 1)

        this.material = new THREE.MeshBasicMaterial({
            map: null,
        })
        this.addComponent(new MeshComponent(this, new THREE.Mesh(geometry, this.material)))
    }

    setTexture(texture: THREE.Texture): void {
        this.material.map = texture
    }
}
