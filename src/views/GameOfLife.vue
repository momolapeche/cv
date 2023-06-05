<template>
    <div class="about">
        <h1>GAME OF LIFE</h1>
        <canvas id="GOLCanvas"></canvas>
    </div>
    <GOLPatternSelect :patterns="Object.keys(patterns)" @pattern-changed="changePattern" />
</template>

<script lang="ts">
import GOLPatternSelect from '@/components/GOLPatternSelect.vue';
import { defineComponent } from 'vue';

const patterns = {
    bloc: {
        pattern: {
            width: 2,
            height: 2,
            pixels: [
                1,1,
                1,1,
            ],
        }
    },
    clignotant: {
        pattern: {
            width: 3,
            height: 1,
            pixels: [
                1,1,1
            ],
        }
    },
    planeur: {
        pattern: {
            width: 3,
            height: 3,
            pixels: [
                0,1,0,
                0,0,1,
                1,1,1,
            ],
        }
    },
    ruche: {
        pattern: {
            width: 4,
            height: 3,
            pixels: [
                0,1,1,0,
                1,0,0,1,
                0,1,1,0,
            ],
        }
    },
}

function createGridTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
    const tex = gl.createTexture()

    if (tex === null) {
        throw "Could not create glTexture"
    }

    const pixels = new Uint8Array(
        Array(width*height*4).fill(0).map((_, i) => {
            const isAlive = Math.random() > 1 ? 255 : 0

            if (i % 4 === 0)
                return isAlive
            if (i % 4 === 3)
                return 255
            else
                return 0
        })
    )

    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    return tex
}

function changePattern(gl: WebGL2RenderingContext, pattern: {texture: WebGLTexture, width: number, height: number}, patternData: { width: number, height: number, pixels: Array<number> }) {
    gl.bindTexture(gl.TEXTURE_2D, pattern.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, patternData.width, patternData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(patternData.pixels.map(x => [x*255, 0,0, 255]).flat()))
    pattern.width = patternData.width
    pattern.height = patternData.height

    gl.generateMipmap(gl.TEXTURE_2D)
}


function createFramebuffer(gl: WebGL2RenderingContext): WebGLFramebuffer {
    const framebuffer = gl.createFramebuffer()

    if (framebuffer === null) {
        throw "Could not create glFramebuffer"
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.drawBuffers([gl.COLOR_ATTACHMENT0])

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

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

async function createProgram(gl: WebGL2RenderingContext, vSrc: string, fSrc: string) {
    const vShader = await createShaderFromFile(gl, vSrc, gl.VERTEX_SHADER)
    const fShader = await createShaderFromFile(gl, fSrc, gl.FRAGMENT_SHADER)

    const program = gl.createProgram()
    if (program === null) {
        throw "Could not create Program"
    }

    gl.attachShader(program, vShader)
    gl.attachShader(program, fShader)
    gl.linkProgram(program)

    return program
}

function drawGrid(gl: WebGL2RenderingContext, program: WebGLProgram, positionBuffer: WebGLBuffer, gridTexture: WebGLTexture, transformMat: Float32Array, hoveredCell: Int32Array, pattern: {width: number, height: number, texture: WebGLTexture}) {
    const aPositionLocation = gl.getAttribLocation(program, "aPosition")

    const uTextureLocation = gl.getUniformLocation(program, "uTexture")
    const uTransformLocation = gl.getUniformLocation(program, "uTransform")
    const uPatternOriginLocation = gl.getUniformLocation(program, "uPatternOrigin")
    const uPatternTextureLocation = gl.getUniformLocation(program, "uPatternTexture")

    const patternOrigin = new Int32Array([
        hoveredCell[0] - Math.floor(pattern.width/2),
        hoveredCell[1] - Math.floor(pattern.height/2),
    ])

    gl.clearColor(0.1,0.05,0.3,1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)

    gl.uniformMatrix3fv(uTransformLocation, false, transformMat)
    gl.uniform2iv(uPatternOriginLocation, patternOrigin)

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(aPositionLocation)
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, gridTexture)
    gl.uniform1i(uTextureLocation, 0)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, pattern.texture)
    gl.uniform1i(uPatternTextureLocation, 1)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

function applyPattern(gl: WebGL2RenderingContext, framebuffer: WebGLFramebuffer, program: WebGLProgram, positionBuffer: WebGLBuffer, gridTexture: WebGLTexture, pattern: {width: number, height: number, texture: WebGLTexture}, hoveredCell: Int32Array) {
    const aPositionLocation = gl.getAttribLocation(program, "aPosition")

    const uTextureLocation = gl.getUniformLocation(program, "uTexture")
    const uTransformLocation = gl.getUniformLocation(program, "uTransform")
    const uOriginLocation = gl.getUniformLocation(program, "uOrigin")

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gridTexture, 0)

    const position = [hoveredCell[0] - Math.floor(pattern.width / 2), hoveredCell[1] - Math.floor(pattern.height / 2)]
    gl.viewport(position[0], position[1], pattern.width, pattern.height)

    // gl.clearColor(1,0,0,1)
    // gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)

    gl.uniformMatrix3fv(uTransformLocation, false, new Float32Array([
        1,0,0,
        0,1,0,
        0,0,1,
    ]))

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(aPositionLocation)
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, pattern.texture)
    gl.uniform1i(uTextureLocation, 0)

    gl.uniform2i(uOriginLocation, position[0], position[1])

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    gl.viewport(0,0, gl.canvas.width, gl.canvas.height)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

function updateGrid(gl: WebGL2RenderingContext, framebuffer: WebGLFramebuffer, gridTex: WebGLTexture, program: WebGLProgram, positionBuffer: WebGLBuffer, gridPrevTex: WebGLTexture) {
    const aPositionLocation = gl.getAttribLocation(program, "aPosition")

    const uTextureLocation = gl.getUniformLocation(program, "uTexture")
    const uTransformLocation = gl.getUniformLocation(program, "uTransform")

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gridTex, 0)

    gl.viewport(0,0, sX, sY)

    gl.clearColor(0,0,0,1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)

    gl.uniformMatrix3fv(uTransformLocation, false, new Float32Array([
        1,0,0,
        0,1,0,
        0,0,1,
    ]))

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(aPositionLocation)
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, gridPrevTex)
    gl.uniform1i(uTextureLocation, 0)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    gl.viewport(0,0, gl.canvas.width, gl.canvas.height)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

const size = 256
const sX = size
const sY = size

export default defineComponent({
    components: { GOLPatternSelect },

    data: () => {
        return {
            patterns: patterns,
            currentPattern: patterns.planeur,
        }
    },

    methods: {
        changePattern(name: keyof typeof patterns) {
            this.currentPattern = patterns[name]
        }
    },

    async mounted() {
        const canvas = document.querySelector("#GOLCanvas") as HTMLCanvasElement
        canvas.width = 512
        canvas.height = 512
        const gl = canvas.getContext("webgl2") as WebGL2RenderingContext

        this.$watch("currentPattern", (newPattern) => {
            changePattern(gl, pattern, newPattern.pattern)
        })

        const gridTextures = [
            createGridTexture(gl, sX, sY),
            createGridTexture(gl, sX, sY),
        ]

        const framebuffer = createFramebuffer(gl)


        const positionBuffer = gl.createBuffer() as WebGLBuffer

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ]), gl.STATIC_DRAW)


        const drawGridProgram = await createProgram(gl, "game_of_life/defaultVS.glsl", "game_of_life/defaultFS.glsl")
        const updateGridProgram = await createProgram(gl, "game_of_life/defaultVS.glsl", "game_of_life/GOLFS.glsl")
        const patternProgram = await createProgram(gl, "game_of_life/defaultVS.glsl", "game_of_life/patternFS.glsl")


        const patternTexture = gl.createTexture()
        if (patternTexture === null) {
            throw "Could not create pattern texture"
        }
        const pattern = {
            width: 0,
            height: 0,
            texture: gl.createTexture() as WebGLTexture,
        }
        changePattern(gl, pattern, this.currentPattern.pattern)


        const transformMat = new Float32Array([
            1,0,0,
            0,1,0,
            0,0,1,
        ])

        const inputInterface = {
            axes: new Float32Array([0,0]),
            zoom: 1,
            _dZoom: 1,
            paused: true,

            set moveX(n: number) {
                this.axes[0] = n
            },
            set moveY(n: number) {
                this.axes[1] = n
            },
            set dZoom(n: number) {
                const tmp = this.zoom
                this.zoom = Math.max(1, this.zoom * n)
                this._dZoom = this.zoom / tmp
            },
            updateMat(mat: Float32Array, dt: number) {
                mat[6] = mat[6] * this._dZoom
                mat[7] = mat[7] * this._dZoom
                this._dZoom = 1
                mat[6] += this.axes[0] * dt
                mat[7] += this.axes[1] * dt
                mat[0] = this.zoom
                mat[4] = this.zoom

                // this.axes.set([0,0])
            }
        }
        function KeydownCallback(e: KeyboardEvent) {
            if (e.key === "d") {
                inputInterface.moveX = -1
            }
            if (e.key === "q") {
                inputInterface.moveX = 1
            }
            if (e.key === "s") {
                inputInterface.moveY = 1
            }
            if (e.key === "z") {
                inputInterface.moveY = -1
            }
            if (e.key === "+") {
                inputInterface.dZoom = 1.1
            }
            if (e.key === "-") {
                inputInterface.dZoom = 1 / 1.1
            }
        }
        function KeyupCallback(e: KeyboardEvent) {
            if (e.key === "d") {
                inputInterface.moveX = 0
            }
            if (e.key === "q") {
                inputInterface.moveX = 0
            }
            if (e.key === "s") {
                inputInterface.moveY = 0
            }
            if (e.key === "z") {
                inputInterface.moveY = 0
            }
            if (e.key === " ") {
                inputInterface.paused = !inputInterface.paused
            }
            if (e.key === "p") {
                applyPattern(gl, framebuffer, patternProgram, positionBuffer, gridTextures[flip], pattern, hoveredCell)
            }
        }
        function ClickCallback() {
            console.log("CLICK")
            applyPattern(gl, framebuffer, patternProgram, positionBuffer, gridTextures[flip], pattern, hoveredCell)
        }
        canvas.addEventListener("click", ClickCallback)
        document.addEventListener("keydown", KeydownCallback)
        document.addEventListener("keyup", KeyupCallback)
        const hoveredCell = new Int32Array([0,0])
        canvas.addEventListener("mousemove", (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            const mouseX = ((((e.clientX - rect.left) / rect.width) * 2 - 1) - transformMat[6]) / transformMat[0]
            const mouseY = ((1 - ((e.clientY - rect.top) / rect.height) * 2) - transformMat[7]) / transformMat[4]

            const cellX = Math.floor(((mouseX + 1) / 2) * sX)
            const cellY = Math.floor(((mouseY + 1) / 2) * sY)

            hoveredCell[0] = cellX
            hoveredCell[1] = cellY
        })
        


        let flip = 0
        let frame = 0
        let then = 0
        let time = 0
        function render(now: number) {
            now /= 1000
            const deltaTime = Math.min(1/12, now - then)
            then = now

            if (inputInterface.paused === false) {
                time += deltaTime
            }

            while (frame < Math.floor(time * 10)) {
                updateGrid(gl, framebuffer, gridTextures[flip ^ 1], updateGridProgram, positionBuffer, gridTextures[flip])
                flip ^= 1
                frame++
            }

            inputInterface.updateMat(transformMat, deltaTime)

            drawGrid(gl, drawGridProgram, positionBuffer as WebGLBuffer, gridTextures[flip], transformMat, hoveredCell, pattern)

            requestAnimationFrame(render)
        }
        requestAnimationFrame(render)
    }
})
</script>
