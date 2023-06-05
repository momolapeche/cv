import { bindEvents, removeOwnerListeners } from './Events';
import { GameObject } from './GameObject';
import { Manager } from './Manager';

export class InstanceManager extends Manager {
  #nonInitializedGameObjects: Array<GameObject> = []
  #instantiatedGameObjects = new Set<GameObject>()

  GameObjectInit(): void {
    for (const gameObject of this.#nonInitializedGameObjects) {
      bindEvents(gameObject, gameObject);
      for (const component of gameObject.components) {
        bindEvents(component, gameObject);
      }
      gameObject._init();

      this.#instantiatedGameObjects.add(gameObject);

      gameObject.emit('Init');
    }
    this.#nonInitializedGameObjects = [];
  }

  async Setup(): Promise<void> {
    this.#instantiatedGameObjects.clear();
    this.#nonInitializedGameObjects = [];
  }

  Instantiate<T extends GameObject>(gameObject: T): T {
    if (gameObject.instantiated) {
      console.error(
        `Error: GameObject[${gameObject.constructor.name}] already instantiated`
      );
    }
    this.#nonInitializedGameObjects.push(gameObject);
    gameObject.instantiated = true;
  
    for (const child of gameObject.children) {
      this.Instantiate(child);
    }
  
    return gameObject;
  }

  Destroy<T extends GameObject>(gameObject: T): void {
    if (gameObject.destroyed === true) {
      console.error('Error: Destroy called twice on same object');
    }
    for (const child of gameObject.children) {
      this.Destroy(child);
    }
    if (gameObject.instantiated === true && gameObject.initialized === false) {
      this.#nonInitializedGameObjects = this.#nonInitializedGameObjects.filter(go => go !== gameObject)
    }
    gameObject.emit('Destroy');
    gameObject._destroy();
    removeOwnerListeners(gameObject);
  
    this.#instantiatedGameObjects.delete(gameObject);
  }

  GetGameObjectByType(type: string): GameObject | undefined {
    for (const go of this.#instantiatedGameObjects) {
      if (go._type === type) {
        return go;
      }
    }
    console.error('Error: GameObject not found');
  }

  Exit(): void {
    this.#nonInitializedGameObjects.forEach((gameObject) => this.#instantiatedGameObjects.delete(gameObject));
    this.#nonInitializedGameObjects = [];
    for (const gameObject of this.#instantiatedGameObjects) {
      this.Destroy(gameObject);
    }
    this.#instantiatedGameObjects.clear();
  }
}