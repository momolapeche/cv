import { Manager, Managers } from "./Manager";
import * as THREE from 'three'

// import { TimeManager } from "./Time";
import { Component, GameObject } from "./GameObject";
import { World } from "@dimforge/rapier3d/pipeline";
import { Collider, ColliderDesc } from "@dimforge/rapier3d/geometry";
import { RigidBody, RigidBodyDesc } from "@dimforge/rapier3d/dynamics";
import { KinematicCharacterController } from "@dimforge/rapier3d/control";
import { Vector3 } from "@dimforge/rapier3d/math";
import { quat, vec3 } from "gl-matrix";

let Rapier: typeof import('@dimforge/rapier3d')

const RapierPromise = new Promise((resolve: (v: unknown) => void, reject: (v: unknown) => void) => {
    import('@dimforge/rapier3d').then(R => {
        Rapier = R
        resolve(R)
    }).catch(err => {
        console.error(err)
        reject(err)
    })
})

let physicsManager: PhysicsManager

// let Time: TimeManager

export class PhysicsManager extends Manager {
    world: World = <World><unknown>null

    #rigidBodies = new Set<RigidBodyComponent>()

    constructor() {
        super()
        physicsManager = this
    }
    async Setup(): Promise<void> {
        await RapierPromise
        // Time = Managers.get(TimeManager)

        this.world = new Rapier.World({
            x: 0, y: -10, z: 0
        })
    }
    Exit(): void {
        //
    }

    addRigidBody(rb: RigidBodyComponent): void {
        this.#rigidBodies.add(rb)
        console.log('...............')
    }
    // removeRigidBody(rb: RigidBodyComponent): void {
    //     this.rigidBodies.delete(rb)
    //     this.activeRigidBodies.delete(rb)
    //     this.physicsWorld.removeRigidBody(rb.btBody)
    // }

    PreUpdate(): void {
        // this.world.timestep = Time.deltaTime
        this.world.step()

        for (const rb of this.#rigidBodies) {
            const pos = rb.rigidBody.translation()
            const rot = rb.rigidBody.rotation()
            rb.targetPosition.set(pos.x, pos.y, pos.z)
            rb.targetRotation.setFromQuaternion(new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w))
        }
    }

    get Rapier(): typeof Rapier {
        return Rapier
    }
}


export class RigidBodyComponent extends Component {
    targetPosition: THREE.Vector3
    targetRotation: THREE.Euler

    colliderDesc: ColliderDesc
    collider: Collider = <Collider><unknown>null
    rigidBodyDesc: RigidBodyDesc
    rigidBody: RigidBody = <RigidBody><unknown>null

    constructor(parent: GameObject, colliderDesc: ColliderDesc, rigidBodyDesc: RigidBodyDesc) {
        super(parent)

        this.colliderDesc = colliderDesc
        this.rigidBodyDesc = rigidBodyDesc

        this.targetPosition = this.parent.threeObject.position
        this.targetRotation = this.parent.threeObject.rotation
    }

    Init(): void {
        this.rigidBodyDesc.setTranslation(
            this.targetPosition.x,
            this.targetPosition.y,
            this.targetPosition.z
        )
        this.rigidBody = physicsManager.world.createRigidBody(this.rigidBodyDesc)

        this.collider = physicsManager.world.createCollider(this.colliderDesc, this.rigidBody)
        physicsManager.addRigidBody(this)
    }
    Destroy(): void {
        // TODO: REMOVE COLLIDER
    }

    static BoxShape(sx: number, sy: number, sz: number): ColliderDesc {
        return Rapier.ColliderDesc.cuboid(
            sx/2, sy/2, sz/2
        )
    }
    static CapsuleShape(radius: number, halfHeight: number): ColliderDesc {
        return Rapier.ColliderDesc.capsule(halfHeight, radius)
    }
    static TriangleMeshShape(vertices: Float32Array, indices: Uint32Array): ColliderDesc {
        return Rapier.ColliderDesc.trimesh(vertices, indices)
    }
}

export class DynamicCharacterController extends Component {
    controller: KinematicCharacterController
    rigidBodyComponent: RigidBodyComponent

    constructor(parent: GameObject) {
        super(parent)
        this.controller = Managers.get(PhysicsManager).world.createCharacterController(0.01)
        this.rigidBodyComponent = this.parent.getComponent(RigidBodyComponent)
    }
    Move(translation: Vector3): void {
        this.controller.computeColliderMovement(this.rigidBodyComponent.collider, translation)
        const correctedMovement = this.controller.computedMovement()
        correctedMovement.x += this.parent.threeObject.position.x
        correctedMovement.y += this.parent.threeObject.position.y
        correctedMovement.z += this.parent.threeObject.position.z
        this.rigidBodyComponent.rigidBody.setNextKinematicTranslation(correctedMovement)
    }
    Destroy(): void {
        Managers.get(PhysicsManager).world.removeCharacterController(this.controller)
    }
}