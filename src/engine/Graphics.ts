import { Manager, Managers } from './Manager';
import * as THREE from 'three'
import { Component, GameObject } from './GameObject';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { TimeManager } from './Time';

export class GraphicsManager extends Manager {
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.Camera = <THREE.Camera><unknown>null

    gltfModels: Record<string, GLTF> = {}
    fbxModels: Record<string, THREE.Group> = {}

    shaderSrcs: Record<string, string> = {}

    constructor() {
        super()

        const canvas = document.querySelector('#ECanvas') as HTMLCanvasElement
        canvas.width = 800
        canvas.height = 600
        this.renderer = new THREE.WebGLRenderer({
            canvas,
        })

        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

        this.scene = new THREE.Scene()
    }

    add(obj: THREE.Object3D): void {
        this.scene.add(obj)
    }
    remove(obj: THREE.Object3D): void {
        this.scene.remove(obj)
    }

    async loadShaderSrc(id: string, url: string): Promise<void> {
        await fetch(url).then(f => f.text().then(text => this.shaderSrcs[id] = text))
    }

    async Setup(): Promise<void> {
        this.scene.clear()
        this.scene = new THREE.Scene()
    }

    Render(): void {
        this.renderer.render(this.scene, this.camera)
    }

    get rendererAspectRatio(): number {
        return this.renderer.domElement.width / this.renderer.domElement.height
    }

    loadGLTF(id: string, url: string): Promise<void> {
        return new Promise((resolve: () => void, reject: () => void) => {
            const loader = new GLTFLoader()

            loader.load(url, (gltf: GLTF) => {
                this.gltfModels[id] = gltf
                resolve()
            }, _ => _, (err: ErrorEvent) => {
                console.error('Error:', err.message)
                reject()
            })
        })
    }
    loadFBX(id: string, url: string): Promise<void> {
        return new Promise((resolve: () => void, reject: () => void) => {
            const loader = new FBXLoader()

            loader.load(url, (fbx: THREE.Group) => {
                this.fbxModels[id] = fbx
                resolve()
            }, _ => _, (err: ErrorEvent) => {
                console.error('Error:', err.message)
                reject()
            })
        })
    }

    static EnableCastAndReceiveShadow(m: THREE.Object3D): void {
        m.traverse(o => {
            o.receiveShadow = true
            o.castShadow = true
        })
    }
}

export class MeshComponent extends Component {
    mesh: THREE.Mesh | THREE.Group | THREE.Object3D

    constructor(parent: GameObject, mesh: THREE.Mesh | THREE.Group | THREE.Object3D) {
        super(parent)

        this.mesh = mesh
        this.parent.threeObject.add(this.mesh)
    }
    Destroy(): void {
        this.parent.threeObject.remove(this.mesh)
    }
}

export class LightGO extends GameObject {
    light: THREE.Light

    constructor(light: THREE.Light) {
        super()
        this.light = light
        this.threeObject = this.light
    }
}

export class CameraGameObject extends GameObject {
    #camera: THREE.Camera

    constructor(camera: THREE.Camera) {
        super()

        this.#camera = camera
        this.threeObject = this.#camera
    }

    setAsMainCamera(): void {
        Managers.get(GraphicsManager).camera = this.#camera
    }

    get camera(): THREE.Camera {
        return this.#camera
    }
}

export class AnimationMixerComponent extends Component {
    mixer: THREE.AnimationMixer
    #actions: Record<string, THREE.AnimationAction> = {}
    #currentAction: THREE.AnimationAction | null = null

    constructor(parent: GameObject, mesh: THREE.Object3D) {
        super(parent)

        this.mixer = new THREE.AnimationMixer(mesh)
    }

    addAction(name: string, clip: THREE.AnimationClip): void {
        this.#actions[name] = this.mixer.clipAction(clip)
    }

    play(name: string): void {
        const action = this.#actions[name]

        this.#currentAction?.fadeOut(0.2)

        action.reset()
        action.play().fadeIn(0.2)
        this.#currentAction = action
    }
    playOnce(name: string, callback?: THREE.EventListener<THREE.Event, 'finished', THREE.AnimationMixer>): void {
        const action = this.#actions[name]

        this.#currentAction?.fadeOut(0.2)

        action.stop().setLoop(THREE.LoopOnce, 0).play().fadeIn(0.2)
        this.#currentAction = action
        if (callback) {
            this.mixer.addEventListener('finished', callback)
        }
    }

    PostUpdate(): void {
        this.mixer.update(Managers.get(TimeManager).deltaTime)
    }
}
