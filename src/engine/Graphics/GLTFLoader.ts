import { mat3, mat4, quat, vec3 } from "gl-matrix"
import { base64DecToArr } from "./Base64Dec"
import { Material, Mesh, Transform } from "./Renderer"
import { RenderableObject } from "./RenderableObject"
import { BufferBinder, createBinder } from "./Tools"

interface GLTFMaterial {
    pbrMetallicRoughness: {
        baseColorFactor: [number, number, number, number]
        roughnessFactor: number
        metallicFactor: number
    }
}
interface GLTFBuffer {
    uri?: string
}
interface GLTFBufferView {
    buffer: number
    byteOffset: number
    byteStride: number
    byteLength: number
    target: number
}
interface GLTFAccessor {
    bufferView: number
    byteOffset: number
    componentType: number
    count: number
    type: string
}
interface GLTFPrimitiveData {
    indices: number
    material: number
    attributes: Record<string, number>
}
interface GLTFMeshData {
    primitives: GLTFPrimitiveData[]
}
interface GLTFSkinData {
    name?: string
    inverseBindMatrices: number
    joints: number[]
    skeleton?: number
}
interface GLTFNodeData {
    name?: string
    mesh?: number
    skin?: number
    children?: number[]
    rotation?: [number, number, number, number]
    translation?: [number, number, number]
    scale?: [number, number, number]
}
interface GLTFScene {
    name: string
    nodes: number[]
}
interface GLTFAnimationDataChannelTarget {
    node: number
    path: "translation" | "rotation" | "scale"
}
interface GLTFAnimationDataChannel {
    sampler: number
    target: GLTFAnimationDataChannelTarget
}
interface GLTFAnimationDataSampler {
    input: number
    interpolation: "LINEAR" | "STEP" | "CUBICSPLINE"
    output: number
}
interface GLTFAnimationData {
    channels: GLTFAnimationDataChannel[]
    samplers: GLTFAnimationDataSampler[]
    name?: string
}
interface GLTFObject {
    animations: GLTFAnimationData[]
    buffers: GLTFBuffer[]
    accessors: GLTFAccessor[]
    bufferViews: GLTFBufferView[]
    meshes: GLTFMeshData[]
    materials: GLTFMaterial[]
    nodes: GLTFNodeData[]
    skins: GLTFSkinData[]

    scenes: GLTFScene[]
    scene: number
}

interface GLTFAnimationNode {
    translation?: Float32Array[]
    rotation?: Float32Array[]
    scale?: Float32Array[]
}

export class GLTFAnimation {
    name: string
    input: Float32Array
    outputs: Map<string, GLTFAnimationNode>
    duration: number

    constructor(name: string, input: Float32Array, outputs: Map<string, GLTFAnimationNode>) {
        this.name = name
        this.input = input
        this.outputs = outputs
        this.duration = input[input.length - 1]
    }
}

class GLTFMesh {
    primitives: Mesh[]

    constructor(primitives: Mesh[]) {
        this.primitives = primitives
    }

    clone() {
        return new GLTFMesh(this.primitives.map(p => p.clone()))
    }

    render(cameraMatrix: mat4, transformMat: mat4, transformNormalMat: mat3): void {
        for (const primitive of this.primitives) {
            primitive.render(cameraMatrix, transformMat, transformNormalMat)
        }
    }

    compile(useSkin: boolean): void {
        for (const primitive of this.primitives) {
            primitive.compile(useSkin)
        }
    }

    applyAnimation(animation: mat4[]) {
        for (const primitive of this.primitives) {
            for (let i = 0; i < animation.length; i++) {
                primitive.updateJoint(i, animation[i])
            }
        }
    }
}

class GLTFSkin {
    inverseBindMatrices: mat4[]
    nodes: GLTFNode[]
    matrices = <mat4[]><unknown>null

    animations: Record<string, mat4[][]> = {}

    constructor(inverseBindMatrices: mat4[], nodes: GLTFNode[]) {
        this.inverseBindMatrices = inverseBindMatrices
        this.nodes = nodes
        this.matrices = this.nodes.map(() => mat4.create())
    }

    clone() {
        const skin = new GLTFSkin(this.inverseBindMatrices, this.nodes)
        skin.animations = this.animations

        return skin
    }

    addAnimation(id: string, animation: GLTFAnimation) {
        const anim: mat4[][] = []
        animation.input.forEach((_, frameIndex) => {
            for (const [i, node] of this.nodes.entries()) {
                const animNode = animation.outputs.get(node.name) ?? {}

                mat4.fromRotationTranslationScale(
                    this.matrices[i],
                    animNode.rotation?.[frameIndex] ?? node.rotation ?? quat.create(),
                    animNode.translation?.[frameIndex] ?? node.translation ?? vec3.create(),
                    animNode.scale?.[frameIndex] ?? node.scale ?? vec3.fromValues(1,1,1)
                )
            }

            anim.push(this.nodes.map((currentNode, i): mat4 => {
                for (const child of currentNode.children) {
                    const childId = this.nodes.indexOf(child)
                    mat4.mul(this.matrices[childId], this.matrices[i], this.matrices[childId])
                }
                return mat4.mul(mat4.create(), this.matrices[i], this.inverseBindMatrices[i])
            }))
        })
        this.animations[id] = anim
    }
}

class GLTFNode {
    id: number
    name: string

    children: GLTFNode[] = []
    renderChildren: GLTFNode[] = []

    rotation?: quat
    translation?: vec3
    scale?: vec3

    mesh?: number
    skin?: GLTFSkin

    constructor(id: number, node: GLTFNodeData) {
        this.id = id
        this.name = node.name ?? ''

        if (node.translation) {
            this.translation = vec3.fromValues(...node.translation)
        }
        if (node.rotation) {
            this.rotation = quat.fromValues(...node.rotation)
        }
        if (node.scale) {
            this.scale = vec3.fromValues(...node.scale)
        }
    }

    render(cameraMatrix: mat4, transformMat: mat4, transformNormalMat: mat3): void {
        this.mesh?.render(cameraMatrix, transformMat, transformNormalMat)
    }

    findNode(name: string): GLTFNode | null {
        if (this.name === name) {
            return this
        }
        else {
            for (const c of this.children) {
                const ret = c.findNode(name)
                if (ret !== null) {
                    return ret
                }
            }
        }
        return null
    }
}

export class GLTF extends RenderableObject {
    firstNode: GLTFNode
    nodes: GLTFNode[]
    meshNodes: GLTFNode[]
    skinNodes: GLTFNode[]

    meshes: GLTFMesh[]
    skins: GLTFSkin[]

    animations: GLTFAnimation[]

    useSkin = false

    constructor(firstNode: GLTFNode, nodes: GLTFNode[], meshes: GLTFMesh[], skins?: GLTFSkin[], animations?: GLTFAnimation[]) {
        super()

        this.firstNode = firstNode

        this.nodes = nodes

        this.skins = skins ?? []
        this.meshes = meshes ?? []

        this.meshNodes = []
        this.skinNodes = []
        const nodeList = [ this.firstNode ]
        while (nodeList.length > 0) {
            const node = nodeList.shift() as GLTFNode
            if (node.children.length > 0) {
                nodeList.push(...node.children)
            }
            if (node.mesh) {
                this.meshNodes.push(node)
                if (node.skin) {
                    this.skinNodes.push(node)
                }
            }
        }

        this.animations = animations ?? []
    }

    render(transform: Transform, cameraMatrix: mat4): void {
        for (const node of this.meshNodes) {
            node.render(cameraMatrix, transform.matrix, transform.normalMatrix)
        }
    }
    compile(): void {
        for (const node of this.meshNodes) {
            node.compile(this.useSkin)
        }
    }
    clone(): GLTF {
        return new GLTF(this.firstNode, this.nodes, this.meshes.map(m => m.clone()), this.skins.map(s => s.clone()), this.animations)
    }

    subModel(nodeName: string): GLTF {
        const node = this.firstNode.findNode(nodeName)

        if (node) {
            // DANGER
            return new GLTF(node, this.nodes, this.meshes)
        }
        else {
            throw new Error(`Couldn't find node with name: ${nodeName}`)
        }
    }
}

function parseBuffers(gl: WebGL2RenderingContext, data: GLTFObject) {
    const buffers: WebGLBuffer[] = []
    const buffersRawData: ArrayBuffer[] = []
    for (const buffer of data.buffers) {
        if (buffer.uri) {
            const m = buffer.uri.match(/^data:application\/octet-stream;base64,(.*)/)
            if (m) {
                const bufferData = base64DecToArr(m[1]).buffer
                const glBuffer = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer)
                gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW)
                if (glBuffer === null) {
                    throw new Error('Could not create glBuffer')
                }
                buffers.push(glBuffer)
                buffersRawData.push(bufferData)
            }
            else {
                throw new Error('Buffer data not handled')
            }
        }
        else {
            throw new Error('Buffer data not handled')
        }
    }
    return {
        buffers, buffersRawData
    }
}

function parseMaterials(data: GLTFObject) {
    const materials: Material[] = []

    if (data.materials === undefined) {
        console.error('NO MATERIAL')
        return materials
    }

    for (const material of data.materials) {
        if (material.pbrMetallicRoughness) {
            materials.push(new Material(
                new Float32Array(material.pbrMetallicRoughness.baseColorFactor.slice(0, 3)),
                material.pbrMetallicRoughness.roughnessFactor,
                material.pbrMetallicRoughness.metallicFactor
            ))
        }
        else {
            throw new Error('Material type not recognized')
        }
    }
    return materials
}

const sizeMap: Record<string, number> = {
    SCALAR: 1,
    
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,

    MAT2: 4,
    MAT3: 9,
    MAT4: 16,
}

function createBufferAndBinder(gl: WebGL2RenderingContext, data: GLTFObject, buffers: WebGLBuffer[], accessorIdx: number) {
    const accessor = data.accessors[accessorIdx]
    const bufferView = data.bufferViews[accessor.bufferView]

    const buffer = buffers[bufferView.buffer]
    const size = sizeMap[accessor.type]
    const type = accessor.componentType
    const byteStride = bufferView.byteStride ?? 0
    const byteOffset = (accessor.byteOffset ?? 0) + (bufferView.byteOffset ?? 0)

    return createBinder(gl, buffer, size, type, byteStride, byteOffset)
}

function parseMeshes(gl: WebGL2RenderingContext, data: GLTFObject, buffersRawData: ArrayBuffer[], buffers: WebGLBuffer[], materials: Material[]) {
    const meshes: GLTFMesh[] = []

    if (data.meshes === undefined) {
        console.error('NO MESH')
        return meshes
    }

    for (const mesh of data.meshes) {
        const primitives: Mesh[] = []
        for (const primitive of mesh.primitives) {
            const primitiveVAO = gl.createVertexArray() as WebGLVertexArrayObject
            gl.bindVertexArray(primitiveVAO)

            let drawCount = 0
            let indicesType = 0
            {
                const accessorIdx = primitive.indices
                const accessor = data.accessors[accessorIdx]
                const bufferView = data.bufferViews[accessor.bufferView]

                drawCount = accessor.count
                indicesType = accessor.componentType

                const buffer = gl.createBuffer()
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer)
                const byteOffset = (accessor.byteOffset ?? 0) + (bufferView.byteOffset ?? 0)
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(buffersRawData[bufferView.buffer]), gl.STATIC_DRAW, byteOffset, bufferView.byteLength)
            }

            const material = materials[primitive.material ?? 0]

            if (primitive.attributes.POSITION === undefined) {
                throw new Error('Primitive has no POSITION attribute')
            }
            if (primitive.attributes.NORMAL === undefined) {
                throw new Error('Primitive has no NORMAL attribute')
            }

            const binders: Record<string, BufferBinder> = {}

            binders.POSITION = createBufferAndBinder(gl, data, buffers, primitive.attributes.POSITION)
            binders.NORMAL = createBufferAndBinder(gl, data, buffers, primitive.attributes.NORMAL)

            if (primitive.attributes.JOINTS_0 !== undefined && primitive.attributes.WEIGHTS_0 !== undefined) {
                binders.JOINTS_0 = createBufferAndBinder(gl, data, buffers, primitive.attributes.JOINTS_0)
                binders.WEIGHTS_0 = createBufferAndBinder(gl, data, buffers, primitive.attributes.WEIGHTS_0)
            }

            const attribMap: Set<string> = new Set([
                'POSITION',
                'NORMAL',
                'JOINTS_0',
                'WEIGHTS_0',
            ])
            for (const k in primitive.attributes) {
                if (!(attribMap.has(k))) {
                    console.error(`attrib [${k}] not supported`)
                    continue
                }
            }
            
            const primitiveMesh = new Mesh({
                vao: primitiveVAO,
                bufferBinds: binders,
                drawCount,
                hasIndices: true,
                indicesType,
                material,
            })
            primitives.push(primitiveMesh)
        }
        meshes.push(new GLTFMesh(primitives))
    }

    return meshes
}

function parseSkins(gl: WebGL2RenderingContext, data: GLTFObject, nodes: GLTFNode[], buffersRawData: ArrayBuffer[]) {
    const skins: GLTFSkin[] = []

    if (data.skins === undefined) {
        console.error('NO SKIN')
        return skins
    }

    for (const skin of data.skins) {
        console.log(skin)
        const inverseBindMatricesAcc = data.accessors[skin.inverseBindMatrices]
        const inverseBindMatricesBV = data.bufferViews[inverseBindMatricesAcc.bufferView]

        if (inverseBindMatricesBV.byteStride) {
            throw new Error('byteStride should not be defined')
        }

        if (inverseBindMatricesAcc.componentType !== gl.FLOAT) {
            throw new Error('inverseBindMatrices should be FLOAT')
        }

        if (inverseBindMatricesAcc.type !== 'MAT4') {
            throw new Error('inverseBindMatrices should be MAT4')
        }

        const start = (inverseBindMatricesAcc.byteOffset ?? 0) + (inverseBindMatricesBV.byteOffset ?? 0)
        const length = inverseBindMatricesAcc.count * 16 * 4
        const inverseBindMatricesData = new Float32Array(buffersRawData[inverseBindMatricesBV.buffer].slice(start, start + length))

        const inverseBindMatrices = Array(inverseBindMatricesAcc.count)
            .fill(null)
            .map((_, i) => new Float32Array(inverseBindMatricesData.buffer, 4*16*i, 16))
        const skinNodes = skin.joints.map(joint => nodes[joint])

        skins.push(new GLTFSkin(inverseBindMatrices, skinNodes))
    }

    return skins
}

function parseAnimations(data: GLTFObject, buffersRawData: ArrayBuffer[]): GLTFAnimation[] | undefined {
    console.log('Animations:', data.animations)

    if (data.animations === undefined) {
        return
    }

    const inbuffers = new Map<number, Float32Array>()
    const outbuffers = new Map<number, Float32Array[]>()

    const animations: GLTFAnimation[] = data.animations.map((animation) => {
        let samplerInput = -1

        const nodes = new Map<string, GLTFAnimationNode>()

        for (const channel of animation.channels) {
            const sampler = animation.samplers[channel.sampler]

            if (samplerInput === -1) {
                samplerInput = sampler.input
            }
            if (samplerInput !== sampler.input) {
                throw new Error('Different inputs not supported')
            }

            let input = inbuffers.get(sampler.input)
            if (input === undefined) {
                const inputAccessor = data.accessors[sampler.input]
                const inputBufferView = data.bufferViews[inputAccessor.bufferView]

                if (inputBufferView.byteStride) {
                    throw new Error('input bufferView has byteStride')
                }
                input = new Float32Array(
                    buffersRawData[inputBufferView.buffer],
                    (inputBufferView.byteOffset ?? 0) + (inputAccessor.byteOffset ?? 0),
                    inputAccessor.count
                )
                inbuffers.set(sampler.input, input)
            }

            let output = outbuffers.get(sampler.output)
            if (output === undefined) {
                const outputAccessor = data.accessors[sampler.output]
                const outputBufferView = data.bufferViews[outputAccessor.bufferView]

                if (outputBufferView.byteStride) {
                    throw new Error('output bufferView has byteStride')
                }
                if (outputAccessor.type !== 'VEC3' && outputAccessor.type !== 'VEC4') {
                    throw new Error(`output type[${outputAccessor.type}] should be VEC3 or VEC4`)
                }

                const size = (outputAccessor.type === 'VEC3' ? 3 : 4)
                const offset = (outputBufferView.byteOffset ?? 0) + (outputAccessor.byteOffset ?? 0)
                const buffer = buffersRawData[outputBufferView.buffer]

                output = Array(input.length).fill(null).map((_, i) => new Float32Array(buffer, offset + 4 * size * i, size))
                outbuffers.set(sampler.output, output)
            }

            const id = data.nodes[channel.target.node].name
            if (id === undefined) {
                throw new Error('Every animation node should have a name')
            }
            const node = nodes.get(id)
            if (node) {
                node[channel.target.path] = output
            }
            else {
                const node = nodes.set(id, {}).get(id)
                if (node)
                    node[channel.target.path] = output
            }

        }

        return new GLTFAnimation(
            animation.name ?? '',
            inbuffers.get(samplerInput) as Float32Array,
            nodes
        )
    })

    console.log(animations)
    return animations
}

export async function loadModel(gl: WebGL2RenderingContext, url: string): Promise<GLTF> {
    const text = await fetch(url).then(f => f.text())
    const data = JSON.parse(text) as GLTFObject

    console.log('data:', data)

    const {buffers, buffersRawData} = parseBuffers(gl, data)

    const materials = parseMaterials(data)

    // Children are copied later
    const nodes: GLTFNode[] = data.nodes.map((node, i) => new GLTFNode(i, node))

    const meshes = parseMeshes(gl, data, buffersRawData, buffers, materials)

    const skins = parseSkins(gl, data, nodes, buffersRawData)

    const animations: GLTFAnimation[] | undefined = parseAnimations(data, buffersRawData)

    const scene = data.scenes[data.scene]

    for (const [i, node] of data.nodes.entries()) {
        if (node.children) {
            nodes[i].children = node.children.map(c => nodes[c])
        }
        if (node.mesh !== undefined) {
            nodes[i].mesh = meshes[node.mesh]
        }
        if (node.skin !== undefined) {
            nodes[i].skin = skins[node.skin]
        }
    }

    const sceneNode = scene.nodes.length === 1 ? nodes[scene.nodes[0]] : new GLTFNode(-1, {name: scene.name})
    if (sceneNode.id === -1) {
        sceneNode.children = scene.nodes.map(n => nodes[n])
    }

    return new GLTF(sceneNode, nodes, meshes, skins, animations)
}

