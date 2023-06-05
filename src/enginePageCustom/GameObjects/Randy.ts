import { GameObject } from "@/engine/GameObject";
import { GraphicsManager, MeshComponent } from "@/engine/Graphics";
import { Managers } from "@/engine/Manager";
import { PhysicsManager, RigidBodyComponent } from "@/engine/Physics";

import * as THREE from 'three'

export class Randy extends GameObject {
    constructor(size: [number, number, number], pos: [number, number, number], color: number, shaderSrc: string) {
        super()

        this.threeObject.position.set(...pos)

        const uniforms = THREE.UniformsUtils.merge([
            THREE.UniformsLib[ "lights" ],
        ]);
        console.log(uniforms)

        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.5,
            roughness: 0.1,
        })
        material.onBeforeCompile = (shader) => {
            // shader.fragmentShader = shader.fragmentShader.replace('<output_fragment>', '<custom>')
            // console.log(shader.fragmentShader)
            shader.fragmentShader = shaderSrc
        }

        this.addComponent(new MeshComponent(this, new THREE.Mesh(
            new THREE.BoxGeometry(...size),
            material,
        )))
        this.getComponent(MeshComponent).mesh.castShadow = true
        this.getComponent(MeshComponent).mesh.receiveShadow = true
        this.addComponent(new RigidBodyComponent(this,
            RigidBodyComponent.BoxShape(...size),
            Managers.get(PhysicsManager).Rapier.RigidBodyDesc.fixed()
        ))
    }
}

