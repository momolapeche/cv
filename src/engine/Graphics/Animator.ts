/*import { Component, GameObject } from "../GameObject"
import { MeshComponent } from "../GraphicsManager"
import { Managers } from "../Manager"
import { TimeManager } from "../Time"
import { GLTF, GLTFAnimation } from "./GLTFLoader"

let TM: TimeManager

export class AnimationMixerComponent extends Component {
    #mixer: Animator
    #animations: Record<string, GLTFAnimation> = {}

    constructor(parent: GameObject) {
        super(parent)

        const meshComponent = parent.getComponent(MeshComponent)
        if (!(meshComponent.mesh instanceof GLTF)) {
            throw new Error("AnimationMixer only works with GLTF Meshes")
        }

        meshComponent.mesh.useSkin = true
        meshComponent.mesh.compile()

        this.#mixer = new Animator(meshComponent.mesh)

        TM = Managers.get(TimeManager)
    }

    addAnimation(id: string, animation: GLTFAnimation): void {
        this.#mixer.addAnimation(id, animation)
        this.#animations[id] = animation
    }

    play(id: string): void {
        this.#mixer.play(id, this.#animations[id])
    }

    Update(): void {
        this.#mixer.update(TM.deltaTime)
    }
}

class Animator {
    gltf: GLTF

    currentAnimationId = ""
    currentAnimation = <GLTFAnimation><unknown>null
    time = 0

    constructor(gltf: GLTF) {
        this.gltf = gltf
    }
    
    addAnimation(id: string, animation: GLTFAnimation): void {
        for (const skin of this.gltf.skins) {
            skin.addAnimation(id, animation)
        }
    }

    _applyAnimation(frame: number): void {
        for (const skinNode of this.gltf.skinNodes) {
            // skinNode.mesh!.applyAnimation(skinNode.skin!.animations[this.currentAnimationId][frame])
        }
    }

    play(id: string, animation: GLTFAnimation): void {
        this.currentAnimation = animation
        this.currentAnimationId = id
        this._applyAnimation(0)
        this.time = 0
    }

    update(dt: number): void {
        this.time = (this.time + dt) % this.currentAnimation.duration

        const frame = Math.max(0, this.currentAnimation.input.findIndex(t => t > this.time) - 1)

        this._applyAnimation(frame)
    }
}
*/