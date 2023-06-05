import { mat4, vec3 } from "gl-matrix"
import { GameObject } from "../GameObject"

export class Camera extends GameObject {
    projection: mat4
    matrix: mat4
    
    constructor(projection: mat4) {
        super()

        this.projection = projection
        this.matrix = mat4.create()
    }

    getMatrix(): mat4 {
        mat4.invert(this.matrix, this.transform.matrix)
        return mat4.mul(this.matrix, this.projection, this.matrix)
    }
}
