/*import { Component, GameObject } from "./GameObject";
import { Manager, Managers } from "./Manager";
import * as Graphics from './Graphics/Renderer';
import { Camera } from "./Graphics/Camera";

export class MeshComponent extends Component {
    mesh: Graphics.RenderableObject

    constructor(parent: GameObject, mesh: Graphics.RenderableObject) {
        super(parent)

        this.mesh = mesh
        this.mesh.compile()
    }

    Init(): void {
        Managers.get(GraphicsManager).scene.addObject(this)
    }

    Destroy(): void {
        this.mesh = <Graphics.RenderableObject><unknown>null
    }
}

export class GraphicsManager extends Manager {
    #renderer: Graphics.Renderer
    #rendererPromise: Promise<void>
    scene = <Graphics.Scene><unknown>null

    #gltfModels: Map<string, Graphics.RenderableObject> = new Map()

    mainCamera: Camera | null = null

    constructor() {
        super()

        const customCanvas = document.querySelector('#CCanvas') as HTMLCanvasElement
        customCanvas.width = 800
        customCanvas.height = 600
        this.#renderer = new Graphics.Renderer(customCanvas)
        this.#rendererPromise = this.#renderer.loadShaderSources()
    }

    async Setup(): Promise<void> {
        await this.#rendererPromise
        this.scene = new Graphics.Scene()
    }

    Render(): void {
        if (this.mainCamera) {
            this.#renderer.render(this.scene, this.mainCamera)
        }
    }

    async loadGLTFModel(id: string, url: string): Promise<void> {
        const model = await this.#renderer.loadModel(url)
        this.#gltfModels.set(id, model)
    }

    getGLTFModel(id: string): Graphics.GLTF {
        return this.#gltfModels.get(id) as Graphics.GLTF
    }
}*/