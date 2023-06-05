/*import { mat3, mat4, quat, vec3 } from "gl-matrix"
import { GLTF, loadModel } from "./GLTFLoader"
import { RenderableObject } from "./RenderableObject"
import { Transform } from "../Transform"
import { MeshComponent } from "../GraphicsManager"
import { Camera } from "./Camera"
import { DirectionalLight } from "./DirectionalLight"
import { createBinder } from "./Tools"

let gl: WebGL2RenderingContext

async function loadFile(url: string) {
    return await fetch(url).then(f => f.text())
}

// const shaders: Record<string, WebGLShader> = {}
const shaderChunks: Record<string, string> = {}
const shaderSrcs: Record<string, string> = {}

interface ShaderSrcOptions {
    defines?: string[]
}
function createShaderSrc(base: string, options?: ShaderSrcOptions) {
    const defines = options?.defines?.reduce((acc, str) => acc + '#define ' + str + '\r\n', '') ?? ''

    base = '#version 300 es\r\n' + defines + base

    for (const k in shaderChunks) {
        base = base.replace(new RegExp(`#include\\s+<${k}>`), shaderChunks[k])
    }

    return base
}

interface TextureOptions {
    internalFormat?: number
    format?: number
    type?: number

    minFilter?: number
    magFilter?: number
    wrapS?: number
    wrapT?: number
}

function createTexture(width: number, height: number, options: TextureOptions = {}): WebGLTexture {
    const tex = gl.createTexture()

    if (tex === null) {
        throw new Error("Could not create glTexture")
    }

    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        options.internalFormat ?? gl.RGBA,
        width, height,
        0,
        options.format ?? gl.RGBA,
        options.type ?? gl.UNSIGNED_BYTE,
        null
    )

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, options.minFilter ?? gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, options.magFilter ?? gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrapS ?? gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrapT ?? gl.CLAMP_TO_EDGE)

    return tex
}

function createDepthTexture(width: number, height: number) {
    return createTexture(width, height, {
        internalFormat: gl.DEPTH_COMPONENT24,
        format: gl.DEPTH_COMPONENT,
        type: gl.UNSIGNED_INT,
    })
}

function createFloatTexture(width: number, height: number) {
    return createTexture(width, height, {
        internalFormat: gl.RGBA32F,
        format: gl.RGBA,
        type: gl.FLOAT,
    })
}

function checkFramebuffer(): void {
    const info = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (info) {
        switch (info) {
            case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                console.error("Error: Framebuffer: incomplete attachment")
                break
            case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                console.error("Error: Framebuffer: missing attachment")
                break
            case gl.FRAMEBUFFER_COMPLETE:
                console.log("Framebuffer Complete")
                break
            default:
                console.error("Framebuffer Incomplete")
        }
    }
}

function createFramebuffer(colorAttachments: (WebGLTexture | null)[], depthAttachment?: WebGLTexture): WebGLFramebuffer {
    const framebuffer = gl.createFramebuffer()

    if (framebuffer === null) {
        throw new Error("Could not create glFramebuffer")
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.drawBuffers([gl.COLOR_ATTACHMENT0])

    for (let i = 0; i < colorAttachments.length; i++) {
        if (colorAttachments[i] !== null) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, colorAttachments[i], 0)
        }
    }
    if (depthAttachment) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthAttachment, 0)
    }

    checkFramebuffer()

    gl.drawBuffers(colorAttachments.map((att, i) => att === null ? gl.NONE : gl.COLOR_ATTACHMENT0 + i))

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    return framebuffer
}

function createShader(text: string, type: number): WebGLShader {
    const shader = gl.createShader(type) as WebGLShader
    gl.shaderSource(shader, text)
    gl.compileShader(shader)

    return shader
}

function createProgram(vShader: WebGLShader, fShader: WebGLShader): WebGLProgram {
    const program = gl.createProgram() as WebGLProgram
    gl.attachShader(program, vShader)
    gl.attachShader(program, fShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        throw new Error(`Could not compile WebGL program. \n\n${info}`);
    }

    return program
}

class Geometry {
    buffers: Record<string, Float32Array>

    constructor(buffers: Record<string, Float32Array>) {
        this.buffers = buffers
    }

    static Box(sx: number, sy: number, sz: number): Geometry {
        const x = sx / 2
        const y = sy / 2
        const z = sz / 2

        const position = new Float32Array([
            // FRONT
            -x, -y, +z,  +x, -y, +z,  -x, +y, +z,  -x, +y, +z,  +x, -y, +z,  +x, +y, +z,
            // BACK
            +x, -y, -z,  -x, -y, -z,  -x, +y, -z,  +x, -y, -z,  -x, +y, -z,  +x, +y, -z,
            // RIGHT
            +x, -y, +z,  +x, -y, -z,  +x, +y, +z,  +x, +y, +z,  +x, -y, -z,  +x, +y, -z,
            // LEFT
            -x, -y, -z,  -x, -y, +z,  -x, +y, +z,  -x, -y, -z,  -x, +y, +z,  -x, +y, -z,
            // UP
            -x, +y, +z,  +x, +y, +z,  -x, +y, -z,  -x, +y, -z,  +x, +y, +z,  +x, +y, -z,
            // DOWN
            +x, -y, +z,  -x, -y, +z,  -x, -y, -z,  +x, -y, +z,  -x, -y, -z,  +x, -y, -z,
        ])

        const normal = new Float32Array([
            0,0,+1, 0,0,+1, 0,0,+1, 0,0,+1, 0,0,+1, 0,0,+1,
            0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
            +1,0,0, +1,0,0, +1,0,0, +1,0,0, +1,0,0, +1,0,0,
            -1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0,
            0,+1,0, 0,+1,0, 0,+1,0, 0,+1,0, 0,+1,0, 0,+1,0,
            0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
        ])

        return new Geometry({
            position,
            normal,
        })
    }

    static Sphere(radius: number, numSubdivisions = 1): Geometry {
        const phi = (1 + Math.sqrt(5)) / 2
        const len = Math.sqrt(1 + phi*phi)
        const o = 1 / len
        const p = phi / len

        const ol0p0 = new Float32Array([0, -o, -p])
        const ol0p1 = new Float32Array([0, -o, +p])
        const ol1p0 = new Float32Array([0, +o, -p])
        const ol1p1 = new Float32Array([0, +o, +p])

        const l0p0o = new Float32Array([-o, -p, 0])
        const l0p1o = new Float32Array([-o, +p, 0])
        const l1p0o = new Float32Array([+o, -p, 0])
        const l1p1o = new Float32Array([+o, +p, 0])

        const p0ol0 = new Float32Array([-p, 0, -o])
        const p1ol0 = new Float32Array([+p, 0, -o])
        const p0ol1 = new Float32Array([-p, 0, +o])
        const p1ol1 = new Float32Array([+p, 0, +o])

        const triangles = [
            [ol0p1, ol1p1, p0ol1],
            [p1ol1, ol1p1, ol0p1],
            [ol1p0, ol0p0, p0ol0],
            [ol1p0, p1ol0, ol0p0],

            [l0p1o, l1p1o, ol1p0],
            [ol1p1, l1p1o, l0p1o],
            [l1p0o, l0p0o, ol0p0],
            [l1p0o, ol0p1, l0p0o],

            [p1ol0, p1ol1, l1p0o],
            [l1p1o, p1ol1, p1ol0],
            [p0ol1, p0ol0, l0p0o],
            [p0ol1, l0p1o, p0ol0],

            [ol1p1, p1ol1, l1p1o],
            [p0ol1, ol1p1, l0p1o],
            [p1ol1, ol0p1, l1p0o],
            [ol0p1, p0ol1, l0p0o],

            [p1ol0, ol1p0, l1p1o],
            [ol1p0, p0ol0, l0p1o],
            [ol0p0, p1ol0, l1p0o],
            [p0ol0, ol0p0, l0p0o],
        ]

        const positionArr: number[] = []

        const subCoords: vec3[][] = Array(numSubdivisions + 1).fill(null).map((_, i) => Array(i + 1).fill(null).map(_ => vec3.create()))

        for (const triangle of triangles) {
            vec3.copy(subCoords[0][0], triangle[0])
            for (let i = 1; i <= numSubdivisions; i++) {
                vec3.lerp(subCoords[i][0], triangle[0], triangle[1], i / numSubdivisions)
                vec3.lerp(subCoords[i][i], triangle[0], triangle[2], i / numSubdivisions)
                for (let j = 1; j < i; j++) {
                    vec3.lerp(subCoords[i][j], subCoords[i][0], subCoords[i][i], j / i)
                    vec3.normalize(subCoords[i][j], subCoords[i][j])
                }
                vec3.normalize(subCoords[i][0], subCoords[i][0])
                vec3.normalize(subCoords[i][i], subCoords[i][i])
            }
            for (let i = 0; i < numSubdivisions; i++) {
                positionArr.push(...subCoords[i][i], ...subCoords[i+1][i], ...subCoords[i+1][i+1])
                for (let j = 0; j < i; j++) {
                    positionArr.push(...subCoords[i][j], ...subCoords[i+1][j], ...subCoords[i+1][j+1])
                    positionArr.push(...subCoords[i][j], ...subCoords[i+1][j+1], ...subCoords[i][j+1])
                }
            }
        }

        return new Geometry({
            position: new Float32Array(positionArr).map(x => x * radius),
            normal: new Float32Array(positionArr),
        })
    }
}

class Material {
    albedo: vec3
    roughness: number
    metalness: number

    constructor(albedo: vec3, roughness: number, metalness: number) {
        this.albedo = vec3.clone(albedo)
        this.roughness = roughness
        this.metalness = metalness
    }
}

interface MeshOptions {
    vao: WebGLVertexArrayObject,
    bufferBinds: Record<string, (index: number) => void>,
    drawCount: number,
    hasIndices?: boolean,
    indicesType?: number,
    material: Material,
}
class Mesh {
    #vao: WebGLVertexArrayObject
    #bufferBinds: Record<string, (index: number) => void> = {}
    #drawCount: number
    #indicesType: number
    #material: Material

    #program = <WebGLProgram><unknown>null

    #uniformLocations: Record<string, WebGLUniformLocation> = {}
    #joints: Array<WebGLUniformLocation> = []

    #hasIndices: boolean

    constructor(options: MeshOptions) {
        this.#vao = options.vao
        this.#bufferBinds = options.bufferBinds

        this.#drawCount = options.drawCount
        this.#indicesType = options.indicesType ?? 0
        this.#material = options.material
        this.#hasIndices = options.hasIndices ?? false
    }

    clone(): Mesh {
        return new Mesh({
            vao: this.#vao,
            bufferBinds: this.#bufferBinds,
            drawCount: this.#drawCount,
            indicesType: this.#indicesType,
            material: this.#material,
            hasIndices: this.#hasIndices,
        })
    }

    compile(useSkin: boolean): void {
        const vShaderOptions: ShaderSrcOptions = {
            defines: [],
        }
        const fShaderOptions: ShaderSrcOptions = {
            defines: [],
        }
        if (useSkin) {
            vShaderOptions.defines?.push('USE_SKIN')
            console.warn('/////////////////////', vShaderOptions.defines)
        }
        const vShader = createShader(createShaderSrc(shaderSrcs.defaultVS, vShaderOptions), gl.VERTEX_SHADER)
        const fShader = createShader(createShaderSrc(shaderSrcs.defaultFS, fShaderOptions), gl.FRAGMENT_SHADER)

        gl.bindVertexArray(this.#vao)
        this.#bufferBinds.POSITION(0)
        this.#bufferBinds.NORMAL(1)
        if (useSkin) {
            this.#bufferBinds.JOINTS_0(2)
            this.#bufferBinds.WEIGHTS_0(3)
        }
        gl.bindVertexArray(null)

        this.#program = createProgram(vShader, fShader)

        this.#uniformLocations.uM = gl.getUniformLocation(this.#program, 'uM') as WebGLUniformLocation
        this.#uniformLocations.uMNormal = gl.getUniformLocation(this.#program, 'uMNormal') as WebGLUniformLocation
        this.#uniformLocations.uVP = gl.getUniformLocation(this.#program, 'uVP') as WebGLUniformLocation
        this.#uniformLocations.uAlbedo = gl.getUniformLocation(this.#program, 'uAlbedo') as WebGLUniformLocation

        if (useSkin) {
            this.#joints = []
            let location = gl.getUniformLocation(this.#program, 'uJoints[0]')
            while (location) {
                this.#joints.push(location)
                location = gl.getUniformLocation(this.#program, 'uJoints[' + this.#joints.length + ']')
            }
        }
    }

    updateJoint(index: number, data: mat4): void {
        gl.useProgram(this.#program)
        if (!this.#program)
            console.error('/////////', this.#program)
        gl.uniformMatrix4fv(this.#joints[index], false, data)
    }

    render(cameraMatrix: mat4, transformMat: mat4, transformNormalMat: mat3): void {
        gl.useProgram(this.#program)

        gl.uniformMatrix4fv(this.#uniformLocations.uM, false, transformMat)
        gl.uniformMatrix3fv(this.#uniformLocations.uMNormal, false, transformNormalMat)
        gl.uniformMatrix4fv(this.#uniformLocations.uVP, false, cameraMatrix)

        gl.uniform1f(gl.getUniformLocation(this.#program, 'uRoughness'), this.#material.roughness)
        gl.uniform1f(gl.getUniformLocation(this.#program, 'uMetalness'), this.#material.metalness)

        gl.uniform3fv(this.#uniformLocations.uAlbedo, this.#material.albedo)

        gl.bindVertexArray(this.#vao)
        
        if (this.#hasIndices) {
            gl.drawElements(gl.TRIANGLES, this.#drawCount, this.#indicesType, 0)
        }
        else {
            gl.drawArrays(gl.TRIANGLES, 0, this.#drawCount)
        }
    }
}

class MeshObject extends RenderableObject {
    mesh: Mesh

    constructor(geometry: Geometry, material: Material) {
        super()
        const vao = gl.createVertexArray() as WebGLVertexArrayObject

        const buffers: Record<string, WebGLBuffer> = {}
        for (const k in geometry.buffers) {
            const buffer = gl.createBuffer() as WebGLBuffer
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.bufferData(gl.ARRAY_BUFFER, geometry.buffers[k], gl.STATIC_DRAW)

            buffers[k] = buffer
        }

        const drawCount = geometry.buffers.position.length / 3
        
        const binders = {
            POSITION: createBinder(gl, buffers['position'], 3, gl.FLOAT, 0, 0),
            NORMAL: createBinder(gl, buffers['normal'], 3, gl.FLOAT, 0, 0),
        }

        this.mesh = new Mesh({
            vao,
            bufferBinds: binders,
            drawCount,
            material,
        })
    }
    compile(): void {
        this.mesh.compile(false)
    }
    render(transform: Transform, cameraMatrix: mat4): void {
        this.mesh.render(cameraMatrix, transform.matrix, transform.normalMatrix)
    }
}

class Scene {
    meshes: Set<MeshComponent> = new Set()

    pointLights: Set<PointLight> = new Set()
    directionalLights: Set<DirectionalLight> = new Set()

    addObject(obj: MeshComponent): void {
        this.meshes.add(obj)
    }

    addPointLight(light: PointLight): void {
        this.pointLights.add(light)
    }

    addDirectionalLight(light: DirectionalLight): void {
        this.directionalLights.add(light)
    }
}

class PointLight {
    position: vec3

    constructor(position: vec3) {
        this.position = position
    }
}

class Renderer {
    #renderingTarget: HTMLCanvasElement

    #postProgram: WebGLProgram = <WebGLProgram><unknown>null

    #pointLightProgram: WebGLProgram = <WebGLProgram><unknown>null
    #directionLightProgram: WebGLProgram = <WebGLProgram><unknown>null

    #depthTexture: WebGLTexture
    #albedoTexture: WebGLTexture
    #positionTexture: WebGLTexture
    #normalTexture: WebGLTexture
    #roughnessMetalnessTexture: WebGLTexture
    #lightTexture: WebGLTexture

    #framebuffer: WebGLFramebuffer

    #lightFB: WebGLFramebuffer

    constructor(canvas: HTMLCanvasElement) {
        this.#renderingTarget = canvas
        const context = this.#renderingTarget.getContext('webgl2')
        if (context === null) {
            throw new Error('Could not create Webgl2RenderingContext')
        }
        gl = context

        const ext0 = gl.getExtension("EXT_color_buffer_float")
        const ext1 = gl.getExtension("EXT_float_blend")

        this.#albedoTexture = createFloatTexture(gl.canvas.width, gl.canvas.height)
        this.#positionTexture = createFloatTexture(gl.canvas.width, gl.canvas.height)
        this.#normalTexture = createFloatTexture(gl.canvas.width, gl.canvas.height)
        this.#roughnessMetalnessTexture = createFloatTexture(gl.canvas.width, gl.canvas.height)
        this.#lightTexture = createFloatTexture(gl.canvas.width, gl.canvas.height)

        this.#depthTexture = createDepthTexture(gl.canvas.width, gl.canvas.height)

        this.#framebuffer = createFramebuffer([
            this.#albedoTexture,
            this.#positionTexture,
            this.#normalTexture,
            this.#roughnessMetalnessTexture,
        ], this.#depthTexture)

        this.#lightFB = createFramebuffer([
            this.#lightTexture
        ])

        gl.enable(gl.BLEND)
        gl.enable(gl.CULL_FACE)
        gl.enable(gl.DEPTH_TEST)
        gl.clearColor(0,0,0,1)
    }

    async loadModel(url: string): Promise<GLTF> {
        return await loadModel(gl, url)
    }

    async loadShaderSources(): Promise<void> {
        shaderChunks.BRDF = await loadFile('/graphics/BRDF.glsl')

        async function loadShaderSrc(url: string): Promise<string> {
            const src = await loadFile(url)

            return src
        }

        shaderSrcs.defaultVS = await loadShaderSrc('/graphics/defaultVS.glsl')
        shaderSrcs.defaultFS = await loadShaderSrc('/graphics/defaultFS.glsl')
        shaderSrcs.postProcessVS = await loadShaderSrc('/graphics/postProcessVS.glsl')
        shaderSrcs.postProcessFS = await loadShaderSrc('/graphics/postProcessFS.glsl')
        shaderSrcs.pointLightFS = await loadShaderSrc('/graphics/pointLightFS.glsl')
        shaderSrcs.directionalLightFS = await loadShaderSrc('/graphics/directionalLightFS.glsl')

        const postProcessVS = createShader(createShaderSrc(shaderSrcs.postProcessVS), gl.VERTEX_SHADER)

        const pointLightFS = createShader(createShaderSrc(shaderSrcs.pointLightFS), gl.FRAGMENT_SHADER)
        this.#pointLightProgram = createProgram(postProcessVS, pointLightFS)
        gl.useProgram(this.#pointLightProgram)
        gl.uniform1i(gl.getUniformLocation(this.#pointLightProgram, 'uAlbedo'), 0)
        gl.uniform1i(gl.getUniformLocation(this.#pointLightProgram, 'uPosition'), 1)
        gl.uniform1i(gl.getUniformLocation(this.#pointLightProgram, 'uNormal'), 2)
        gl.uniform1i(gl.getUniformLocation(this.#pointLightProgram, 'uRoughnessMetalness'), 3)

        const directionalLightFS = createShader(createShaderSrc(shaderSrcs.directionalLightFS), gl.FRAGMENT_SHADER)
        this.#directionLightProgram = createProgram(postProcessVS, directionalLightFS)
        gl.useProgram(this.#directionLightProgram)
        gl.uniform1i(gl.getUniformLocation(this.#directionLightProgram, 'uAlbedo'), 0)
        gl.uniform1i(gl.getUniformLocation(this.#directionLightProgram, 'uPosition'), 1)
        gl.uniform1i(gl.getUniformLocation(this.#directionLightProgram, 'uNormal'), 2)
        gl.uniform1i(gl.getUniformLocation(this.#directionLightProgram, 'uRoughnessMetalness'), 3)

        const postProcessFS = createShader(createShaderSrc(shaderSrcs.postProcessFS), gl.FRAGMENT_SHADER)
        this.#postProgram = createProgram(postProcessVS, postProcessFS)
        gl.useProgram(this.#postProgram)
        gl.uniform1i(gl.getUniformLocation(this.#postProgram, 'uTexture'), 0)
    }

    lightPassesSetup(): void {
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE)

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.#lightFB)

        gl.clear(gl.COLOR_BUFFER_BIT)
        
        gl.activeTexture(gl.TEXTURE0 + 0)
        gl.bindTexture(gl.TEXTURE_2D, this.#albedoTexture)
        gl.activeTexture(gl.TEXTURE0 + 1)
        gl.bindTexture(gl.TEXTURE_2D, this.#positionTexture)
        gl.activeTexture(gl.TEXTURE0 + 2)
        gl.bindTexture(gl.TEXTURE_2D, this.#normalTexture)
        gl.activeTexture(gl.TEXTURE0 + 3)
        gl.bindTexture(gl.TEXTURE_2D, this.#roughnessMetalnessTexture)
    }
    lightPassesEnd(): void {
        gl.disable(gl.BLEND)
    }

    pointLightPass(scene: Scene, camera: Camera): void {
        gl.useProgram(this.#pointLightProgram)

        for (const light of scene.pointLights) {
            gl.uniform3fv(gl.getUniformLocation(this.#pointLightProgram, 'uLightPosition'), light.position)
            gl.uniform3fv(gl.getUniformLocation(this.#pointLightProgram, 'uEye'), camera.transform.position)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }
    }
    directionalLightPass(scene: Scene, camera: Camera): void {
        gl.useProgram(this.#directionLightProgram)

        for (const light of scene.directionalLights) {
            gl.uniform3fv(gl.getUniformLocation(this.#directionLightProgram, 'uLightDir'), light.direction)
            gl.uniform3fv(gl.getUniformLocation(this.#directionLightProgram, 'uEye'), camera.transform.position)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }
    }

    render(scene: Scene, camera: Camera): void {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.#framebuffer)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        // Render Meshes
        const cameraMatrix = camera.getMatrix()
        for (const component of scene.meshes) {
            component.mesh.render(component.parent.transform, cameraMatrix)
        }

        // Light Pass
        this.lightPassesSetup()
        this.pointLightPass(scene, camera)
        this.directionalLightPass(scene, camera)
        this.lightPassesEnd()

        // to screen

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        gl.useProgram(this.#postProgram)

        gl.activeTexture(gl.TEXTURE0 + 0)
        gl.bindTexture(gl.TEXTURE_2D, this.#lightTexture)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    get aspectRatio(): number {
        return this.#renderingTarget.width / this.#renderingTarget.height
    }
}

export {
    Renderer,
    Scene,

    RenderableObject,

    GLTF,

    Geometry,
    Material,
    MeshObject,
    Mesh,

    Transform,

    PointLight,
    DirectionalLight,
}*/