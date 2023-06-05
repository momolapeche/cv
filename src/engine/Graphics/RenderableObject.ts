import { mat4 } from "gl-matrix";
import { Transform } from "../Transform";

export abstract class RenderableObject {
    abstract render(transform: Transform, cameraMatrix: mat4): void
    abstract compile(): void
}