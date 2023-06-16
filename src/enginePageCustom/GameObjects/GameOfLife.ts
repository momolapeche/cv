import { GameObject } from "@/engine/GameObject";
import { GraphicsManager, MeshComponent } from "@/engine/Graphics";
import { InstanceManager } from "@/engine/Instance";
import { Managers } from "@/engine/Manager";
import { TimeManager } from "@/engine/Time";
import * as THREE from 'three'
import { RaycastColliderComponent } from "../Managers/ButtonManagers";
import { Screen } from "./Screen";
import { patterns } from "./GameOfLifePatterns";

const vertex = /* glsl */`
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

void main() {

	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>

	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )

		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>

	#endif

	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>

}
`;

const fragment = /* glsl */`
uniform sampler2D uTexture;
uniform sampler2D uPattern;
uniform ivec2 uPatternDimensions;
uniform ivec2 uPatternPosition;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec3 col = vec3(texelFetch(uTexture, coord, 0).r);

    ivec2 patternCoord = coord - uPatternPosition + uPatternDimensions / 2;
    if (
        patternCoord.x < uPatternDimensions.x &&
        patternCoord.y < uPatternDimensions.y &&
        patternCoord.x >= 0 &&
        patternCoord.y >= 0
    ) {
        col *= 0.5;
        col.g += ceil(texelFetch(uPattern, patternCoord, 0).r);
    }

    gl_FragColor = vec4(col,1.0);
}
`;
const applyPatternFragment = /* glsl */`
uniform sampler2D uTexture;
uniform sampler2D uPattern;
uniform ivec2 uPatternDimensions;
uniform ivec2 uPatternPosition;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    float test = ceil(texelFetch(uTexture, coord, 0).r);

    ivec2 patternCoord = coord - uPatternPosition + uPatternDimensions / 2;
    if (
        patternCoord.x < uPatternDimensions.x &&
        patternCoord.y < uPatternDimensions.y &&
        patternCoord.x >= 0 &&
        patternCoord.y >= 0
    ) {
        test = test + ceil(texelFetch(uPattern, patternCoord, 0).r);
    }

    vec3 col = vec3(test, 0, 0);

    gl_FragColor = vec4(col,1.0);
}
`;

const displayPatternFragment = `
uniform sampler2D uPattern;
uniform ivec2 uPatternDimensions;
uniform ivec2 uDimensions;
uniform int uCursorIndex;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);
    ivec2 c = coord / 4;
    if ((uDimensions.y / 4 - c.y) * uDimensions.x / 4 + c.x >= uCursorIndex) {
        discard;
    }
    vec3 col = vec3(0);

    int size = max(uPatternDimensions.x, uPatternDimensions.y);
    ivec2 patternCoord = (coord * size / uDimensions) - (size - uPatternDimensions) / 2;
    if (
        patternCoord.x >= 0 &&
        patternCoord.y >= 0 &&
        patternCoord.x < uPatternDimensions.x &&
        patternCoord.y < uPatternDimensions.y
    ) {
        col = vec3(ceil(texelFetch(uPattern, patternCoord, 0).r));
    }

    gl_FragColor = vec4(col,1.0);
}
`;

const patternFragment = `
uniform sampler2D uPattern;
uniform ivec2 uPatternDimensions;
uniform ivec2 uDimensions;
uniform int uPatternRotation;
uniform int uPatternFlip;

void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);

    vec3 col = vec3(0);

    if ((uPatternFlip & 0x1) == 1) {
        coord.x = uDimensions.x - coord.x - 1;
    }
    if ((uPatternFlip & 0x2) == 2) {
        coord.y = uDimensions.y - coord.y - 1;
    }

    if (uPatternRotation == 1) {
        coord = ivec2(uDimensions.x - coord.y - 1, coord.x);
    }
    else if (uPatternRotation == 2) {
        coord = ivec2(uDimensions.x - coord.x - 1, uDimensions.y - coord.y - 1);
    }
    else if (uPatternRotation == 3) {
        coord = ivec2(coord.y, uDimensions.y - coord.x - 1);
    }

    int size = max(uPatternDimensions.x, uPatternDimensions.y);
    ivec2 patternCoord = coord - (uDimensions - uPatternDimensions) / 2;
    if (
        patternCoord.x >= 0 &&
        patternCoord.y >= 0 &&
        patternCoord.x < uPatternDimensions.x &&
        patternCoord.y < uPatternDimensions.y
    ) {
        col = vec3(ceil(texelFetch(uPattern, patternCoord, 0).r));
    }

    gl_FragColor = vec4(col,1.0);
}
`;

const initFragment = /* glsl */`
void main() {
    ivec2 coord = ivec2(gl_FragCoord.xy);

    gl_FragColor = vec4(0, 0, 0, 1);
}
`;



const updateFragment = `
uniform sampler2D uPrevState;

void main() {
    ivec2 coords = ivec2(gl_FragCoord.xy);

    int neighborCount = 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2( 0,-1), 0).r > 0. ? 1 : 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2( 0, 1), 0).r > 0. ? 1 : 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2( 1, 0), 0).r > 0. ? 1 : 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2(-1, 0), 0).r > 0. ? 1 : 0;

    neighborCount += texelFetch(uPrevState, coords + ivec2(-1,-1), 0).r > 0. ? 1 : 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2( 1,-1), 0).r > 0. ? 1 : 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2(-1, 1), 0).r > 0. ? 1 : 0;
    neighborCount += texelFetch(uPrevState, coords + ivec2( 1, 1), 0).r > 0. ? 1 : 0;

    int cellState = texelFetch(uPrevState, coords, 0).r > 0. ? 1 : 0;

    int nextState = 0;

    if (cellState == 0 && neighborCount == 3) {
        nextState = 1;
    }
    else if (cellState == 1 && (neighborCount == 2 || neighborCount == 3)) {
        nextState = 1;
    }

    gl_FragColor = vec4(nextState, 0, 0, 1);
}
`
const patternKeys = Object.keys(patterns)

class Button extends GameObject {
    constructor(mesh: THREE.Mesh, callback: () => void) {
        super()

        this.addComponent(new RaycastColliderComponent(this, mesh, callback))
    }
    Init(): void {
        console.log(this.threeObject.parent)
    }
}

class TextureRenderer {
    #scene: THREE.Scene
    #mesh: THREE.Mesh
    #renderer: THREE.WebGLRenderer
    #camera: THREE.Camera

    constructor() {
        this.#scene = new THREE.Scene
        this.#mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial())
        this.#mesh.position.z = -1
        this.#scene.add(this.#mesh)
        this.#renderer = Managers.get(GraphicsManager).renderer
        this.#camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10)
    }

    render(target: THREE.WebGLRenderTarget, material: THREE.ShaderMaterial): void {
        this.#mesh.material = material

        this.#renderer.setRenderTarget(target)

        this.#renderer.render(this.#scene, this.#camera)
    }
}

function createGridTarget(size: number) {
    return new THREE.WebGLRenderTarget(size, size, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
    })
}
function createRenderTarget(width: number, height: number) {
    return new THREE.WebGLRenderTarget(width, height, {
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
    })
}

export class GameOfLife extends GameObject {
    renderer: THREE.WebGLRenderer

    gridSize = 32

    textureRenderer: TextureRenderer

    target: THREE.WebGLRenderTarget
    gridTargets: THREE.WebGLRenderTarget[]

    material: THREE.ShaderMaterial
    gridInitMaterial: THREE.ShaderMaterial
    updateMaterial: THREE.ShaderMaterial
    applyPatternMaterial: THREE.ShaderMaterial

    raycaster: THREE.Raycaster

    state: number

    #paused = true
    t = 0
    frame = 0

    screen: THREE.Mesh

    patternIndex = 0
    currentPattern: THREE.Texture
    patterns: Record<string, THREE.Texture[]> = {}
    patternRotation = 0
    patternTarget: THREE.WebGLRenderTarget
    patternFlip = 0
    patternMaterial: THREE.ShaderMaterial

    patternDisplayTarget: THREE.WebGLRenderTarget
    patternDisplayMaterial: THREE.ShaderMaterial

    constructor(screen: GameObject) {
        super()

        for (const pattern of patternKeys) {
            this.loadPattern(pattern, 0)
        }

        this.textureRenderer = new TextureRenderer()

        this.renderer = Managers.get(GraphicsManager).renderer

        this.gridTargets = [
            createGridTarget(this.gridSize),
            createGridTarget(this.gridSize),
        ]

        this.currentPattern = this.patterns[patternKeys[this.patternIndex]][0]

        this.target = createRenderTarget(this.gridSize, this.gridSize)

        this.patternTarget = createRenderTarget(32, 32)
        this.patternDisplayTarget = createRenderTarget(32, 32)

        this.material = this.createMaterial()

        this.gridInitMaterial = new THREE.ShaderMaterial({vertexShader: vertex, fragmentShader: initFragment})

        this.updateMaterial = this.createUpdateMaterial()

        this.applyPatternMaterial = this.createApplyPatternMaterial()
        this.patternDisplayMaterial = new THREE.ShaderMaterial({
            vertexShader: vertex,
            fragmentShader: displayPatternFragment,
            uniforms: {
                uPattern: { value:  this.patternTarget.texture},
                uPatternDimensions: { value: [0,0]},
                uDimensions: { value: [this.patternDisplayTarget.width, this.patternDisplayTarget.height]},
                uCursorIndex: { value: 0 },
            }
        })

        this.patternMaterial = new THREE.ShaderMaterial({
            vertexShader: vertex,
            fragmentShader: patternFragment,
            uniforms: {
                uPattern: { value:  this.currentPattern},
                uPatternDimensions: { value: [0,0]},
                uDimensions: { value: [0,0]},
                uPatternRotation: { value: 0 },
                uPatternFlip: { value: 0 },
            }
        })

        this.textureRenderer.render(this.gridTargets[0], this.gridInitMaterial)

        this.raycaster = new THREE.Raycaster()


        this.threeObject.position.copy(screen.threeObject.position)


        const model = Managers.get(GraphicsManager).gltfModels['gameOfLife'].scene.clone()
        const monitorScreen = model.getObjectByName('MonitorScreen') as THREE.Mesh
        const patternMonitorScreen = model.getObjectByName('PatternMonitorScreen') as THREE.Mesh
        const button0 = model.getObjectByName('Button_0') as THREE.Mesh
        const button1 = model.getObjectByName('Button_1') as THREE.Mesh
        const button2 = model.getObjectByName('Button_2') as THREE.Mesh
        const button3 = model.getObjectByName('Button_3') as THREE.Mesh
        const patternButton0 = model.getObjectByName('PB_0') as THREE.Mesh
        const patternButton1 = model.getObjectByName('PB_1') as THREE.Mesh
        const patternButton2 = model.getObjectByName('PB_2') as THREE.Mesh
        const patternButton3 = model.getObjectByName('PB_3') as THREE.Mesh
        monitorScreen.material = new THREE.MeshBasicMaterial({ map: this.target.texture })
        patternMonitorScreen.material = new THREE.MeshBasicMaterial({ map: this.patternDisplayTarget.texture })
        this.addComponent(new MeshComponent(this, model))
        this.screen = monitorScreen


        this.textureRenderer.render(this.patternDisplayTarget, this.patternDisplayMaterial)

        const nextButton = new Button(button3, () => {
            this.changeCurrentPattern((this.patternIndex + 1) % patternKeys.length)
        })
        this.addChild(nextButton)

        const prevButton = new Button(button2, () => {
            this.changeCurrentPattern((this.patternIndex + patternKeys.length - 1) % patternKeys.length)
        })
        this.addChild(prevButton)

        const pauseButton = new Button(button0, () => {
            this.#paused = true
        })
        this.addChild(pauseButton)

        const resumeButton = new Button(button1, () => {
            this.#paused = false
        })
        this.addChild(resumeButton)

        this.addChild(new Button(patternButton0, () => {
            this.rotatePattern(3)
        }))
        this.addChild(new Button(patternButton1, () => {
            this.rotatePattern(1)
        }))
        this.addChild(new Button(patternButton2, () => {
            this.flipPattern(1)
        }))
        this.addChild(new Button(patternButton3, () => {
            this.flipPattern(2)
        }))

        this.state = 0

        this.changeCurrentPattern(0)
    }

    rotatePattern(rot: number): void {
        this.patternRotation = (this.patternRotation + rot) % 4
        this.patternMaterial.uniforms.uPatternRotation.value = this.patternRotation

        this.patternFlip = ((this.patternFlip & 1) << 1) | ((this.patternFlip & 2) >> 1)
        this.patternMaterial.uniforms.uPatternFlip.value = this.patternFlip

        this.textureRenderer.render(this.patternTarget, this.patternMaterial)

        this.patternDisplayMaterial.uniforms.uCursorIndex.value = 0
    }

    flipPattern(flip: number): void {
        this.patternFlip ^= flip
        this.patternMaterial.uniforms.uPatternFlip.value = this.patternFlip
        this.patternDisplayMaterial.uniforms.uCursorIndex.value = 0

        this.textureRenderer.render(this.patternTarget, this.patternMaterial)
    }

    changeCurrentPattern(index: number): void {
        this.patternIndex = index
        this.currentPattern = this.patterns[patternKeys[this.patternIndex]][0]
        // this.patternScreen.setTexture(this.currentPattern)

        const patternSize = Math.max(
            this.currentPattern.image.width,
            this.currentPattern.image.height
        )

        this.material.uniforms.uPatternDimensions.value = [patternSize, patternSize]


        this.patternDisplayMaterial.uniforms.uPatternDimensions.value = [
            patternSize, patternSize
        ]

        this.patternMaterial.uniforms.uPattern.value = this.currentPattern
        this.patternMaterial.uniforms.uPatternDimensions.value = [
            this.currentPattern.image.width,
            this.currentPattern.image.height
        ]
        this.patternMaterial.uniforms.uDimensions.value = [patternSize, patternSize]

        this.textureRenderer.render(this.patternTarget, this.patternMaterial)


        this.patternDisplayMaterial.uniforms.uCursorIndex.value = 0
        this.textureRenderer.render(this.patternDisplayTarget, this.patternDisplayMaterial)
    }

    loadPattern(id: string, frame: number): void {
        if (this.patterns[id] === undefined) {
            this.patterns[id] = []
        }
        const pattern = patterns[id].frames[frame]
        const data = new Uint8Array(pattern.data.map(x => {
            const n = x * 255
            const t = [n,n,n, 0xff]
            return t
        }).flat())
        const texture = new THREE.DataTexture(data, pattern.width, pattern.height, THREE.RGBAFormat)
        texture.needsUpdate = true
        this.patterns[id][frame] = texture
    }

    mouseMove(e: MouseEvent): void {
        const rect = this.renderer.domElement.getBoundingClientRect()
        const mx = (e.clientX - rect.left) / rect.width * 2 - 1
        const my = 1 - (e.clientY - rect.top) / rect.height * 2

        this.raycaster.setFromCamera({x: mx, y: my}, Managers.get(GraphicsManager).camera)
        const intersects = this.raycaster.intersectObject(this.screen)
        if (intersects.length === 1) {
            const uniform = this.material.uniforms.uPatternPosition
            uniform.value[0] = Math.min(this.gridSize, Math.max(0, Math.floor((intersects[0].uv?.x ?? 0) * this.gridSize)))
            uniform.value[1] = Math.min(this.gridSize, Math.max(0, Math.floor((intersects[0].uv?.y ?? 0) * this.gridSize)))
        }
        else {
            const uniform = this.material.uniforms.uPatternPosition
            uniform.value[0] = 10000
            uniform.value[1] = 10000
        }
    }

    OnClick(): void {
        const baseU = this.material.uniforms
        const appU = this.applyPatternMaterial.uniforms
        appU.uPatternPosition.value[0] = baseU.uPatternPosition.value[0]
        appU.uPatternPosition.value[1] = baseU.uPatternPosition.value[1]
        appU.uPatternDimensions.value[0] = baseU.uPatternDimensions.value[0]
        appU.uPatternDimensions.value[1] = baseU.uPatternDimensions.value[1]
        appU.uPattern.value = baseU.uPattern.value

        appU.uTexture.value = this.gridTargets[this.state].texture

        this.textureRenderer.render(this.gridTargets[this.state ^ 1], this.applyPatternMaterial)
        this.state = this.state ^ 1
    }

    Init(): void {
        this.t = Managers.get(TimeManager).time

        const canvas = Managers.get(GraphicsManager).renderer.domElement
        canvas.addEventListener('mousemove', this.mouseMove.bind(this))
    }

    Destroy(): void {
        this.renderer.domElement.removeEventListener('mousemove', this.mouseMove)
    }

    updateGrid(): void {
        this.updateMaterial.uniforms['uPrevState'].value = this.gridTargets[this.state].texture
        this.textureRenderer.render(this.gridTargets[this.state ^ 1], this.updateMaterial)

        this.state = this.state ^ 1
    }

    Update(): void {
        if (!this.#paused) {
            this.t += Managers.get(TimeManager).deltaTime * 10
        }

        while (Math.floor(this.t) > this.frame) {
            this.updateGrid()
            this.frame++
        }

        this.patternDisplayMaterial.uniforms.uCursorIndex.value = Math.min(
            this.patternDisplayMaterial.uniforms.uCursorIndex.value + 1,
            this.patternDisplayTarget.width * this.patternDisplayTarget.height
        )
        this.textureRenderer.render(this.patternDisplayTarget, this.patternDisplayMaterial)

        this.material.uniforms['uTexture'].value = this.gridTargets[this.state].texture

        this.textureRenderer.render(this.target, this.material)
    }

    createMaterial(): THREE.ShaderMaterial {
        return new THREE.ShaderMaterial({
            vertexShader: vertex,
            fragmentShader: fragment,

            uniforms: {
                uTexture: { value: this.gridTargets[0].texture },
                uPattern: { value:  this.patternTarget.texture },
                uPatternDimensions: { value: [
                    0,0
                ]},
                uPatternPosition: { value: [
                    10000, 10000,
                ]}
            }
        })
    }

    createUpdateMaterial(): THREE.ShaderMaterial {
        return new THREE.ShaderMaterial({
            vertexShader: vertex,
            fragmentShader: updateFragment,
            uniforms: {
                uPrevState: { value: this.gridTargets[0].texture }
            }
        })
    }

    createApplyPatternMaterial(): THREE.ShaderMaterial {
        return new THREE.ShaderMaterial({
            vertexShader: vertex,
            fragmentShader: applyPatternFragment,
            uniforms: {
                uTexture: { value: this.gridTargets[0].texture },
                uPattern: { value:  this.currentPattern},
                uPatternDimensions: { value: [
                    this.currentPattern.image.width,
                    this.currentPattern.image.height,
                ]},
                uPatternPosition: { value: [
                    10000, 10000,
                ]}
            }
        })
    }
}

