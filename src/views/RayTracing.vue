<template>
    <div class="about">
        <h1>RT</h1>
        <canvas id="RTCanvas"></canvas>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

function checkFramebuffer(gl: WebGL2RenderingContext): void {
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


function createTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
    const tex = gl.createTexture()

    if (tex === null) {
        throw "Could not create glTexture"
    }

    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, new Float32Array(Array(width*height*4).fill(0)))

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    return tex
}
function createIntTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
    const tex = gl.createTexture()

    if (tex === null) {
        throw "Could not create glTexture"
    }

    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32UI, width, height, 0, gl.RGBA, gl.UNSIGNED_INT, new Uint32Array(Array(width*height*4).fill(0)))

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    return tex
}

function createFramebuffer(gl: WebGL2RenderingContext): WebGLFramebuffer {
    const framebuffer = gl.createFramebuffer()

    if (framebuffer === null) {
        throw "Could not create glFramebuffer"
    }

    return framebuffer
}

async function createShaderFromFile(gl: WebGL2RenderingContext, url: string, type: number) {
    const text = await fetch(url).then(f => f.text())

    const shader = gl.createShader(type)
    if (shader === null) {
        throw "Could not create Shader"
    }

    gl.shaderSource(shader, text)
    gl.compileShader(shader)

    return shader
}

async function createProgram(gl: WebGL2RenderingContext, vSrcUrl: string, fSrcUrl: string) {
    const vShader = await createShaderFromFile(gl, vSrcUrl, gl.VERTEX_SHADER)
    const fShader = await createShaderFromFile(gl, fSrcUrl, gl.FRAGMENT_SHADER)

    const program = gl.createProgram()
    if (program === null) {
        throw "Could not create Program"
    }

    gl.attachShader(program, vShader)
    gl.attachShader(program, fShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error: Could not compile program')
    }

    return program
}

function drawGrid(gl: WebGL2RenderingContext, program: WebGLProgram, positionBuffer: WebGLBuffer) {
    const aPositionLocation = gl.getAttribLocation(program, "aPosition")

    const uSeedLocation = gl.getUniformLocation(program, "uSeed")
    // const uTransformLocation = gl.getUniformLocation(program, "uTransform")
    // const uPatternOriginLocation = gl.getUniformLocation(program, "uPatternOrigin")
    // const uPatternTextureLocation = gl.getUniformLocation(program, "uPatternTexture")

    // console.log(program)
    gl.useProgram(program)

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(aPositionLocation)
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0)

    gl.uniform1ui(uSeedLocation, Math.floor(Math.random() * 10000000))

    // gl.uniformMatrix3fv(uTransformLocation, false, transformMat)
    // gl.uniform2iv(uPatternOriginLocation, patternOrigin)

    // gl.activeTexture(gl.TEXTURE0)
    // gl.bindTexture(gl.TEXTURE_2D, gridTexture)
    // gl.uniform1i(uTextureLocation, 0)

    // gl.activeTexture(gl.TEXTURE1)
    // gl.bindTexture(gl.TEXTURE_2D, pattern.texture)
    // gl.uniform1i(uPatternTextureLocation, 1)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

function drawTex(gl: WebGL2RenderingContext, program: WebGLProgram, positionBuffer: WebGLBuffer, texture: WebGLTexture, nFrame: number) {
    const aPositionLocation = gl.getAttribLocation(program, "aPosition")
    const uTexture = gl.getUniformLocation(program, 'uTexture')
    const uScale = gl.getUniformLocation(program, 'uScale')

    gl.useProgram(program)

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(aPositionLocation)
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(uTexture, 0)

    gl.uniform1f(uScale, nFrame)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

export default defineComponent({
    async mounted() {
        const canvas = document.querySelector("#RTCanvas") as HTMLCanvasElement
        canvas.width = 512
        canvas.height = 512
        const gl = canvas.getContext("webgl2") as WebGL2RenderingContext

        const ext0 = gl.getExtension("EXT_color_buffer_float")
        const ext1 = gl.getExtension("EXT_float_blend")
        
        // const framebuffer = createFramebuffer(gl)

        const positionBuffer = gl.createBuffer() as WebGLBuffer

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ]), gl.STATIC_DRAW)


        const drawGridProgram = await createProgram(gl, "ray_tracing/defaultVS.glsl", "ray_tracing/defaultFS.glsl")
        const drawTexProgram  = await createProgram(gl, "ray_tracing/defaultVS.glsl", "ray_tracing/texFS.glsl")

        gl.clearColor(0,0,0,1)
        gl.clear(gl.COLOR_BUFFER_BIT)

        const framebuffer = createFramebuffer(gl)
        console.log(framebuffer)

        const tex = createTexture(gl, 512, 512)
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
        gl.drawBuffers([gl.COLOR_ATTACHMENT0])
        checkFramebuffer(gl)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)


        const UBObjectsIndex = gl.getUniformBlockIndex(drawGridProgram, "UBObjects")
        if (UBObjectsIndex === gl.INVALID_INDEX) {
            console.error("Error: Uniform Block invalid index")
        }

        const ubSize = gl.getActiveUniformBlockParameter(drawGridProgram, UBObjectsIndex, gl.UNIFORM_BLOCK_DATA_SIZE)
        // const activeIndices = gl.getActiveUniformBlockParameter(drawGridProgram, UBObjectsIndex, gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES)
        // console.log(gl.getActiveUniformBlockParameter(drawGridProgram, UBObjectsIndex, gl.UNIFORM_BLOCK_ACTIVE_UNIFORMS))
        // console.log(gl.getActiveUniformBlockParameter(drawGridProgram, UBObjectsIndex, gl.UNIFORM_BLOCK_BINDING))

        const dataBuffer = new ArrayBuffer(ubSize)

        interface Material {
            color: Float32Array,
            reflectivity: Float32Array,
            emission: Float32Array,
            specularity: Float32Array,
        }

        interface Triangle {
            v0: Float32Array,
            v1: Float32Array,
            v2: Float32Array,
            material: Int32Array,
        }

        interface Sphere {
            position: Float32Array,
            radius: Float32Array,
            material: Int32Array,
        }


        const numsIndices = gl.getUniformIndices(drawGridProgram, [
            "UBObjects.trianglesNum",
            "UBObjects.spheresNum",
        ]) as number[]
        const numsOffsets = gl.getActiveUniforms(drawGridProgram, numsIndices, gl.UNIFORM_OFFSET) as number[]
        const trianglesNum = new Int32Array(dataBuffer, numsOffsets[0], 1)
        const spheresNum = new Int32Array(dataBuffer, numsOffsets[1], 1)

        const triangles = Array<Triangle>()
        for (let i = 0; i < 10000; i++) {
            let triangleArray = gl.getUniformIndices(drawGridProgram, [
                `UBObjects.triangles[${i}].v0`,
                `UBObjects.triangles[${i}].v1`,
                `UBObjects.triangles[${i}].v2`,
                `UBObjects.triangles[${i}].material`,
            ]) as number[] | null
            
            if (triangleArray === null || triangleArray[0] === gl.INVALID_INDEX) {
                break
            }

            const offsets = gl.getActiveUniforms(drawGridProgram, triangleArray, gl.UNIFORM_OFFSET) as number[]

            triangles.push({
                v0: new Float32Array(dataBuffer, offsets[0], 3),
                v1: new Float32Array(dataBuffer, offsets[1], 3),
                v2: new Float32Array(dataBuffer, offsets[2], 3),
                material: new Int32Array(dataBuffer, offsets[3], 1)
            })
        }

        const spheres = Array<Sphere>()
        for (let i = 0; i < 10000; i++) {
            let triangleArray = gl.getUniformIndices(drawGridProgram, [
                `UBObjects.spheres[${i}].position`,
                `UBObjects.spheres[${i}].radius`,
                `UBObjects.spheres[${i}].material`,
            ]) as number[] | null
            
            if (triangleArray === null || triangleArray[0] === gl.INVALID_INDEX) {
                break
            }

            const offsets = gl.getActiveUniforms(drawGridProgram, triangleArray, gl.UNIFORM_OFFSET) as number[]

            spheres.push({
                position: new Float32Array(dataBuffer, offsets[0], 3),
                radius: new Float32Array(dataBuffer, offsets[1], 3),
                material: new Int32Array(dataBuffer, offsets[2], 1)
            })
        }

        const materials = Array<Material>()
        for (let i = 0; i < 10000; i++) {
            let triangleArray = gl.getUniformIndices(drawGridProgram, [
                `UBObjects.materials[${i}].color`,
                `UBObjects.materials[${i}].reflectivity`,
                `UBObjects.materials[${i}].emission`,
                `UBObjects.materials[${i}].specularity`,
            ]) as number[] | null
            
            if (triangleArray === null || triangleArray[0] === gl.INVALID_INDEX) {
                break
            }

            const offsets = gl.getActiveUniforms(drawGridProgram, triangleArray, gl.UNIFORM_OFFSET) as number[]

            materials.push({
                color: new Float32Array(dataBuffer, offsets[0], 3),
                reflectivity: new Float32Array(dataBuffer, offsets[1], 1),
                emission: new Float32Array(dataBuffer, offsets[2], 3),
                specularity: new Float32Array(dataBuffer, offsets[3], 1),
            })
        }

        function editTriangle(index: number, v0: [number,number,number], v1: [number,number,number], v2: [number,number,number], material: number) {
            const offset = [1.25,-1.5,-4]
            const scale = 0.5
            triangles[index].v0.set(v0.map((x, i) => x*scale + offset[i]))
            triangles[index].v1.set(v1.map((x, i) => x*scale + offset[i]))
            triangles[index].v2.set(v2.map((x, i) => x*scale + offset[i]))
            triangles[index].material.set([material])
        }

        materials[0].color.set([1,1,0.5])
        materials[0].reflectivity.set([0])
        materials[0].emission.set([0,0,0])
        materials[0].specularity.set([1])

        materials[1].color.set([0,0,0])
        materials[1].reflectivity.set([0.9])
        materials[1].emission.set([1,1,1])
        materials[1].specularity.set([1])

        materials[2].color.set([1,1,1])
        materials[2].reflectivity.set([0.2])
        materials[2].emission.set([0,0,0])
        materials[2].specularity.set([0])

        materials[3].color.set([1,0.2,0.2])
        materials[3].reflectivity.set([0.3])
        materials[3].emission.set([0,0,0])
        materials[3].specularity.set([0.5])

        materials[4].color.set([0.1, 0.1, 0.1])
        materials[4].reflectivity.set([0.5])
        materials[4].emission.set([0,0,0])
        materials[4].specularity.set([0.6])

        materials[5].color.set([0., 0., 0.])
        materials[5].reflectivity.set([0.5])
        materials[5].emission.set([1,0.5,0.2])
        materials[5].specularity.set([0.1])

        materials[6].color.set([1., 1., 1.])
        materials[6].reflectivity.set([0.])
        materials[6].emission.set([0,0,0])
        materials[6].specularity.set([0.1])

        materials[7].color.set([1., 1., 1.])
        materials[7].reflectivity.set([0.])
        materials[7].emission.set([0,0,0])
        materials[7].specularity.set([0.1])

        materials[8].color.set([0.3, 0.3, 0.3])
        materials[8].reflectivity.set([0.])
        materials[8].emission.set([0,0,0])
        materials[8].specularity.set([0.1])

        materials[9].color.set([1.0, 1.0, 1.0])
        materials[9].reflectivity.set([0.])
        materials[9].emission.set([0,0,0])
        materials[9].specularity.set([0.1])

        materials[10].color.set([0.1, 1.0, 0.1])
        materials[10].reflectivity.set([0.])
        materials[10].emission.set([0,0,0])
        materials[10].specularity.set([0.1])

        materials[11].color.set([0.1, 0.1, 1.0])
        materials[11].reflectivity.set([0.])
        materials[11].emission.set([0,0,0])
        materials[11].specularity.set([0.5])

        materials[12].color.set([1,1,1])
        materials[12].reflectivity.set([0.])
        materials[12].emission.set([0,0,0])
        materials[12].specularity.set([0])


        triangles[0].v0.set([2,0,-7])
        triangles[0].v1.set([2,2,-5])
        triangles[0].v2.set([0,2,-7])
        triangles[0].material.set([0])

        let o = 1
        /// FRONT
        editTriangle(o++, [-1, 1, 1], [-1,-1, 1], [ 1, 1, 1], 12)
        editTriangle(o++, [ 1, 1, 1], [-1,-1, 1], [ 1,-1, 1], 12)
        // BACK
        editTriangle(o++, [-1,-1,-1], [-1, 1,-1], [ 1, 1,-1], 12)
        editTriangle(o++, [-1,-1,-1], [ 1, 1,-1], [ 1,-1,-1], 12)
        // TOP
        editTriangle(o++, [-1, 1,-1], [-1, 1, 1], [ 1, 1,-1], 12)
        editTriangle(o++, [ 1, 1,-1], [-1, 1, 1], [ 1, 1, 1], 12)
        // BOTTOM
        editTriangle(o++, [-1,-1, 1], [-1,-1,-1], [ 1,-1,-1], 12)
        editTriangle(o++, [-1,-1, 1], [ 1,-1,-1], [ 1,-1, 1], 12)
        // RIGHT
        editTriangle(o++, [ 1, 1, 1], [ 1,-1, 1], [ 1, 1,-1], 12)
        editTriangle(o++, [ 1, 1,-1], [ 1,-1, 1], [ 1,-1,-1], 12)
        // LEFT
        editTriangle(o++, [-1, 1, 1], [-1, 1,-1], [-1,-1, 1], 12)
        editTriangle(o++, [-1, 1,-1], [-1,-1,-1], [-1,-1, 1], 12)

        trianglesNum[0] = o+1


        spheres[0].position.set([0, -0.25, -5])
        spheres[0].radius.set([0.5])
        spheres[0].material.set([1])

        spheres[1].position.set([0, -1.5, -5])
        spheres[1].radius.set([0.5])
        spheres[1].material.set([2])

        spheres[2].position.set([2, -2, -7])
        spheres[2].radius.set([1])
        spheres[2].material.set([3])

        spheres[3].position.set([0, 2 + 4.8, -5])
        spheres[3].radius.set([5])
        spheres[3].material.set([4])

        spheres[4].position.set([-1.5, -2, -5])
        spheres[4].radius.set([0.2])
        spheres[4].material.set([5])

        spheres[5].position.set([0, 0, -5 - 1000 - 2])
        spheres[5].radius.set([1000])
        spheres[5].material.set([6])

        spheres[6].position.set([0, 0, 1000 + 2])
        spheres[6].radius.set([1000])
        spheres[6].material.set([7])

        spheres[7].position.set([0, -1000 - 2, -5])
        spheres[7].radius.set([1000])
        spheres[7].material.set([8])

        spheres[8].position.set([0, 1000 + 2, -5])
        spheres[8].radius.set([1000])
        spheres[8].material.set([9])

        spheres[9].position.set([-1000 - 2, 0, -5])
        spheres[9].radius.set([1000])
        spheres[9].material.set([10])

        spheres[10].position.set([1000 + 2, 0, -5])
        spheres[10].radius.set([1000])
        spheres[10].material.set([11])

        spheresNum[0] = 11

        const ubBuffer = gl.createBuffer() as WebGLBuffer
        gl.uniformBlockBinding(drawGridProgram, UBObjectsIndex, 0)
        gl.bindBuffer(gl.UNIFORM_BUFFER, ubBuffer)
        gl.bufferData(gl.UNIFORM_BUFFER, dataBuffer, gl.STATIC_DRAW)
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ubBuffer)


        gl.enable(gl.BLEND)
        gl.blendEquation(gl.FUNC_ADD)
        gl.blendFunc(gl.ONE, gl.ONE)

        let nFrame = 0
        let then = 0
        function render(now: number) {
            now /= 1000
            const deltaTime = Math.min(1/12, now - then)
            then = now

            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)

            for (let i = 0; i < 1; i++) {
                drawGrid(gl, drawGridProgram, positionBuffer)
                nFrame++
            }
            
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)

            drawTex(gl, drawTexProgram, positionBuffer, tex, nFrame / 5)

            requestAnimationFrame(render)
        }
        requestAnimationFrame(render)
    }
})
</script>
