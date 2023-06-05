import { mat3, mat4, quat, vec3 } from "gl-matrix"
import { Manager, Managers } from "./Manager"
import { Component, GameObject } from "./GameObject"

export class TransformManager extends Manager {
    #transforms = new Set<Transform>()

    Update(): void {
        for (const t of this.#transforms) {
            t.update()
        }
    }
    add(transform: Transform): void {
        this.#transforms.add(transform)
    }
    delete(transform: Transform): void {
        this.#transforms.delete(transform)
    }
}

export class Transform {
    position: vec3
    rotation: quat
    scale: vec3

    up: vec3

    matrix: mat4
    normalMatrix: mat3

    constructor() {
        this.position = vec3.create()
        this.rotation = quat.create()
        this.scale = vec3.fromValues(1,1,1)

        this.up = vec3.fromValues(0,1,0)

        this.matrix = mat4.fromRotationTranslationScale(mat4.create(), this.rotation, this.position, this.scale)
        this.normalMatrix = mat3.fromQuat(mat3.create(), this.rotation)
    }
    
    update(): void {
        mat4.fromRotationTranslationScale(this.matrix, this.rotation, this.position, this.scale)
        mat3.fromQuat(this.normalMatrix, this.rotation)
    }

    lookAt(v: vec3): void {
        mat4.targetTo(this.matrix, this.position, v, this.up)
    }
}

// export class CameraTransform extends Transform {
//     lookAt(v: vec3): void {
//         mat4.lookAt(this.matrix, this.position, v, this.up)
//     }
// }
