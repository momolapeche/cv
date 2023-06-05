import { GameObject } from "@/engine/GameObject"
import { GraphicsManager, MeshComponent } from "@/engine/Graphics"
import { Managers } from "@/engine/Manager"
import { PhysicsManager, RigidBodyComponent } from "@/engine/Physics"
import { Mesh, Object3D } from "three"

export class Terrain extends GameObject {
    constructor(pos: [number, number, number]) {
        super()

        this.threeObject.position.set(...pos)

        const collection = Managers.get(GraphicsManager).gltfModels['terrain'].scene
        console.log(collection)

        const model = (collection.getObjectByName('Model') as Object3D).clone()
        model.traverse(obj => {
            obj.receiveShadow = true
            obj.castShadow = true
        })
        this.addComponent(new MeshComponent(this,
            model
        ))
        const lights = Managers.get(GraphicsManager).gltfModels['terrain_lights'].scene
        console.log(lights)
        this.threeObject.add(lights)
        
        const geometry = ((collection.getObjectByName('Collider') as Object3D).clone() as Mesh).geometry

        const positionAttribute = geometry.attributes.position
        const indices = geometry.getIndex() as THREE.BufferAttribute

        this.addComponent(new RigidBodyComponent(this,
            RigidBodyComponent.TriangleMeshShape(new Float32Array(positionAttribute.array), new Uint32Array(indices.array)),
            Managers.get(PhysicsManager).Rapier.RigidBodyDesc.fixed()
        ))
    }
}
