import { GameObject } from "@/engine/GameObject";
// import { AnimationMixerComponent, CameraGameObject, GraphicsManager, LightGO, MeshComponent } from "@/engine/Graphics";
import { InstanceManager } from "@/engine/Instance";
import { Manager, Managers } from "@/engine/Manager";
import { Scene } from "@/engine/Scene";

import * as THREE from 'three'
import { DynamicCharacterController, PhysicsManager, RigidBodyComponent } from "@/engine/Physics";
import { InputsManager } from "@/engine/Inputs";
import { TimeManager } from "@/engine/Time";
import { Events } from "@/engine/EventList";
import { Terrain } from "../GameObjects/Terrain";
import { Randy } from "../GameObjects/Randy";
import { mat4, quat, vec3 } from "gl-matrix";
import { Camera } from "@/engine/Graphics/Camera";
import { addEventListener } from "@/engine/Events";
import { AnimationMixerComponent, CameraGameObject, GraphicsManager, LightGO, MeshComponent } from "@/engine/Graphics";

let Inputs: InputsManager

class MainManager extends Manager {
    playerRot = 0

    async Setup(): Promise<void> {
        this.playerRot = 0
    }

    Update(): void {
        const rot = <number><unknown>(Inputs.get("a") || Inputs.get("ArrowLeft")) -
            <number><unknown>(Inputs.get("e") || Inputs.get("ArrowRight"))
        if (rot !== 0) {
            this.playerRot += rot * 5 * Managers.get(TimeManager).deltaTime
        }
    }
}

class Box extends GameObject {
    constructor(pos: vec3) {
        super()

        this.threeObject.position.set(pos[0], pos[1], pos[2])
        // this.threeObject.quaternion.random()

        this.addComponent(new MeshComponent(this,
            new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.2, 0.2),
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            )
        ))
        // const rb = this.addComponent(new RigidBody(this,
        //     RigidBody.BoxShape(1, 1, 1),
        //     10
        // ))
        // rb.group = PHYSICS_MASKS.DEFAULT
        // this.getComponent(RigidBody)
    }
    Debug(data: Events['Debug']): void {
        this.threeObject.position.set(data.position[0], data.position[1], data.position[2])
    }
}

class Table extends GameObject {
    constructor(x: number, y: number, z: number) {
        super()

        this.threeObject.position.set(x, y, z)

        const scene = Managers.get(GraphicsManager).gltfModels['table'].scene.clone()
        this.addComponent(new MeshComponent(this, scene))
        this.addComponent(new RigidBodyComponent(this,
            RigidBodyComponent.BoxShape(1, 0.5, 1),
            Managers.get(PhysicsManager).Rapier.RigidBodyDesc.dynamic()
        ))
    }
}

abstract class State {
    parent: StateMachine = <StateMachine><unknown>null

    Init?(): void
    Update?(): void
    Exit?(): void
}

class StateMachine {
    #states: Record<string, State> = {}
    #currentState: State

    constructor() {
        this.#currentState = <State><unknown>null
    }

    AddState<T extends State>(id: string, state: T) {
        this.#states[id] = state
        state.parent = this
    }

    Init(firstState: string) {
        this.#currentState = this.#states[firstState]
        this.#currentState.Init?.()
    }
    
    Update() {
        this.#currentState.Update?.()
    }
    ChangeState(newState: string) {
        this.#currentState = this.#states[newState]
        this.#currentState.Init?.()
    }
}

class TMPCamera extends CameraGameObject {
    character = <Character><unknown>null

    Init() {
        Managers.get(GraphicsManager).camera = this.camera
    }
    Update(): void {
        const rot = Managers.get(MainManager).playerRot

        this.threeObject.position.set(0, 1.5, 7)
        this.threeObject.position.applyAxisAngle(new THREE.Vector3(0,1,0), rot)
        this.threeObject.position.add(this.character.threeObject.position)
        this.threeObject.lookAt(this.character.threeObject.position)
    }
}

class IdleState extends State {
    #mixer: AnimationMixerComponent
    #inputs: InputsManager

    constructor(go: GameObject) {
        super()

        this.#mixer = go.getComponent(AnimationMixerComponent)

        this.#inputs = Managers.get(InputsManager)
    }

    Init(): void {
        this.#mixer.play('idle')
    }

    Update() {
        if (
            this.#inputs.get('z') ||
            this.#inputs.get('q') ||
            this.#inputs.get('s') ||
            this.#inputs.get('d')
        ) {
            this.parent.ChangeState('walking')
        }
    }
}

class WalkingState extends State {
    #mixer: AnimationMixerComponent
    #inputs: InputsManager

    constructor(go: GameObject) {
        super()

        this.#mixer = go.getComponent(AnimationMixerComponent)

        this.#inputs = Managers.get(InputsManager)
    }

    Init(): void {
        this.#mixer.play('walking')
    }

    Update() {
        if (
            !this.#inputs.get('z') &&
            !this.#inputs.get('q') &&
            !this.#inputs.get('s') &&
            !this.#inputs.get('d')
        ) {
            this.parent.ChangeState('idle')
        }
    }
}

class Character extends GameObject {
    #mixer: AnimationMixerComponent
    #stateMachine: StateMachine

    constructor() {
        super()

        const capsuleRadius = 0.25
        const capsuleHalfHeight = 0.5

        const model = Managers.get(GraphicsManager).gltfModels['character'].scene

        model.position.set(0,- (capsuleHalfHeight + capsuleRadius),0)

        this.addComponent(new MeshComponent(this, model))
        this.#mixer = new AnimationMixerComponent(this, model)
        this.addComponent(this.#mixer)

        this.#mixer.addAction('walking', Managers.get(GraphicsManager).gltfModels['walking'].animations[0])
        this.#mixer.addAction('idle', Managers.get(GraphicsManager).gltfModels['idle'].animations[0])

        const rigidBody = this.addComponent(new RigidBodyComponent(this,
            RigidBodyComponent.CapsuleShape(capsuleRadius, capsuleHalfHeight),
            Managers.get(PhysicsManager).Rapier.RigidBodyDesc.kinematicPositionBased()
        ))
        rigidBody.targetRotation = new THREE.Euler()

        const controller = new DynamicCharacterController(this)
        controller.controller.setUp({x:0, y:1, z:0})
        controller.controller.setMaxSlopeClimbAngle(Math.PI * 1/4)
        controller.controller.enableAutostep((capsuleHalfHeight+capsuleRadius)*0.5, capsuleHalfHeight*2, true)
        controller.controller.enableSnapToGround(0.05)
        controller.controller.setApplyImpulsesToDynamicBodies(true)
        this.addComponent(controller)


        this.#stateMachine = new StateMachine()
        this.#stateMachine.AddState('idle', new IdleState(this))
        this.#stateMachine.AddState('walking', new WalkingState(this))
    }

    Init() {
        this.#mixer.play('idle')
        this.#stateMachine.Init('idle')
    }

    Update() {
        const controller = this.getComponent(DynamicCharacterController)

        const move = new THREE.Vector3()
        const Inputs = Managers.get(InputsManager)
        const Time = Managers.get(TimeManager)

        const SPEED = 2
        if (Inputs.get("d")) {
            move.x += 1
        }
        if (Inputs.get("q")) {
            move.x -= 1
        }
        if (Inputs.get("z")) {
            move.z -= 1
        }
        if (Inputs.get("s")) {
            move.z += 1
        }

        move.normalize()

        move.applyAxisAngle(new THREE.Vector3(0,1,0), Managers.get(MainManager).playerRot)

        // this.threeObject.rotation.set(0, Math.atan2(move.x, move.z), 0)

        move.multiplyScalar(Time.deltaTime * SPEED)

        controller.Move(move)

        if (controller.controller.computedGrounded() === false) {
            controller.Move(new THREE.Vector3(0,-9.8 * Managers.get(TimeManager).deltaTime,0))
        }

        const vel = controller.rigidBodyComponent.rigidBody.linvel()
        if (vel.x*vel.x + vel.z*vel.z > 0.01) {
            const rot = Math.atan2(vel.x, vel.z)
            this.threeObject.rotation.set(0, rot, 0)
        }
        
        this.#stateMachine.Update()
    }
}


let grassVSSrc: string
let grassFSSrc: string
class Grass extends GameObject {
    material: THREE.ShaderMaterial

    constructor() {
        super()

        const radius = 2

        const geometry = new THREE.BufferGeometry()
        const s = 1 / 10
        const baseVertices = [
            -s, 0, s,
             s, 0, s,
             0, 1, 0,

             s, 0, -s,
            -s, 0, -s,
             0, 1, 0,

             s, 0, s,
             s, 0, -s,
             0, 1, 0,

            -s, 0, -s,
            -s, 0, s,
             0, 1, 0,
        ]
        const baseNormal = [
            0,0,1,
            0,0,1,
            0,0,1,
            0,0,1,
            0,0,1,
            0,0,1,
            0,0,1,
            0,0,1,
            0,0,1,
            0,0,1,
            0,0,1,
            0,0,1,
        ]
        const baseUV = [
            0, 0,
            1, 0,
            0.5, 1,
            0, 0,
            1, 0,
            0.5, 1,
            0, 0,
            1, 0,
            0.5, 1,
            0, 0,
            1, 0,
            0.5, 1,
        ]
        const positions = []
        const normals = []
        const uvs = []
        const localPos = []

        const n = 100
        const scale = 10
        for (let i = 0; i < n*n; i++) {
            const x = (((i % n) + Math.random() - 0.5) - n / 2) / scale
            const z = (((Math.floor(i / n)) + Math.random() - 0.5) - n / 2) / scale

            const y = 0

            const bladeNormal = new THREE.Vector3(0,1,0)
            bladeNormal.normalize()

            positions.push(...baseVertices)
            const index = i * 12 * 3
            for (let j = 0; j < 12; j++) {
                normals[index + j*3+0] = bladeNormal.x
                normals[index + j*3+1] = bladeNormal.y
                normals[index + j*3+2] = bladeNormal.z

                localPos[index + j*3 + 0] = x
                localPos[index + j*3 + 1] = y
                localPos[index + j*3 + 2] = z
            }
            uvs.push(...baseUV)
        }

        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array(positions), 3)
        )
        geometry.setAttribute(
            'bladeNormal',
            new THREE.BufferAttribute(new Float32Array(normals), 3)
        )
        geometry.setAttribute(
            'normal',
            new THREE.BufferAttribute(new Float32Array(normals), 3)
        )
        geometry.setAttribute(
            'uv',
            new THREE.BufferAttribute(new Float32Array(uvs), 2)
        )
        geometry.setAttribute(
            'worldPosition',
            new THREE.BufferAttribute(new Float32Array(localPos), 3)
        )

        this.material = new THREE.ShaderMaterial({
            vertexShader: grassVSSrc,
            fragmentShader: grassFSSrc,

            defines: {
            },
            uniforms: {
                diffuse: { value: new THREE.Vector3(0.2,1,0.5) },
                time: { value: 0 },
                radius: { value: radius },
            }
        })

        const mesh = new THREE.Mesh(geometry, this.material)
        mesh.frustumCulled = false
        this.addComponent(new MeshComponent(this, mesh))
        // this.threeObject.add(new THREE.Mesh(new THREE.SphereGeometry(radius), new THREE.MeshStandardMaterial({color: 0x403010})))

        this.threeObject.position.set(0,0,0)
    }

    Update() {
        this.material.uniforms.time.value = Managers.get(TimeManager).time
    }
}

export default class MainScene extends Scene {
    static Managers = [
        PhysicsManager,
        MainManager,
    ]

    async Setup(): Promise<void> {
        Inputs = Managers.get(InputsManager)

        const GM = Managers.get(GraphicsManager)

        GM.scene.background = new THREE.Color(0x80a0f0)

        await GM.loadGLTF('character', '/models/mixamo/Y_Bot.gltf')
        await GM.loadGLTF('walking', '/models/mixamo/walking.gltf')
        await GM.loadGLTF('idle', '/models/mixamo/idle.gltf')
        await GM.loadGLTF('table', '/models/table.gltf')
        await GM.loadGLTF('terrain', '/models/room.gltf')

        grassVSSrc = await fetch('/engine_shaders/grassVS.glsl').then(f => f.text())
        grassFSSrc = await fetch('/engine_shaders/grassFS.glsl').then(f => f.text())

        const Instance = Managers.get(InstanceManager)

        const character = new Character()
        character.threeObject.position.set(0,5,0)
        Instance.Instantiate(character)
        
        {
            const go = new GameObject
            const model = GM.gltfModels['table'].scene.clone()
            go.addComponent(new MeshComponent(go, model))
            go.addComponent(new RigidBodyComponent(go, 
                RigidBodyComponent.BoxShape(1, 0.5, 1),
                Managers.get(PhysicsManager).Rapier.RigidBodyDesc.dynamic()
            ))

            go.threeObject.position.set(-2, 1, -3)

            Instance.Instantiate(go)
        }

        {
            const go = new GameObject

            const sx = 50
            const sy = 1
            const sz = 50

            go.addComponent(new MeshComponent(go, new THREE.Mesh(
                new THREE.BoxGeometry(sx, sy, sz),
                new THREE.MeshStandardMaterial({ color: 0x003380 })
            )))
            go.addComponent(new RigidBodyComponent(go, 
                RigidBodyComponent.BoxShape(sx, sy, sz),
                Managers.get(PhysicsManager).Rapier.RigidBodyDesc.fixed()
            ))

            go.threeObject.position.y = -0.5

            Instance.Instantiate(go)
        }

        {
            const grass = new Grass()

            Instance.Instantiate(grass)
        }


        for (let i = 0; i < 11 * 11; i++) {
            const x = i % 11
            const y = Math.floor(i / 11)
            const sphere = new GameObject()
            sphere.addComponent(new MeshComponent(sphere, new THREE.Mesh(new THREE.SphereGeometry(1),
                new THREE.MeshStandardMaterial({
                    color: 0x049ef4,
                    roughness: Math.max(0.02, x / 10),
                    metalness: y / 10,
                })
            )))
            sphere.threeObject.position.set((x - 5) * 2.5, (y - 5) * 2.5, -40)
            // vec3.set(sphere.transform.position, 0, 0, -5)
            Instance.Instantiate(sphere)
        }

        const camera = new TMPCamera(new THREE.PerspectiveCamera(40, 4/3, 0.01, 100))
        Instance.Instantiate(camera)
        camera.character = character


        const l = new LightGO(new THREE.DirectionalLight(0xffffff, 1))
        l.threeObject.position.set(1, 3, 2)
        Instance.Instantiate(l)
    }
}