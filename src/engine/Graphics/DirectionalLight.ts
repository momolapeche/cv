import { vec3 } from "gl-matrix"
import { GameObject } from "../GameObject"
import { Managers } from "../Manager"
import { GraphicsManager } from "../GraphicsManager"

export class DirectionalLight extends GameObject {
    direction: vec3

    constructor(direction: vec3) {
        super()

        this.direction = vec3.normalize(vec3.create(), direction)
    }

    Init(): void {
        Managers.get(GraphicsManager).scene.addDirectionalLight(this)
    }
}
