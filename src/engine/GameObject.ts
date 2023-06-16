import * as THREE from 'three'
import { GameObjectEventNames, GameObjectEvents } from './EventList';
import { Managers } from './Manager';
import { GraphicsManager } from './Graphics';

export abstract class Component {
  [key: string]: unknown;
  #parent: GameObject | null = null;

  constructor(parent: GameObject) {
    this.#parent = parent
  }

  get parent(): GameObject {
    return this.#parent as GameObject;
  }
  addListener<K extends keyof GameObjectEvents>(eventId: K, callback: (data?: GameObjectEvents[K]) => void): void {
    this.#parent?.addListener(eventId, callback);
  }
  emit<K extends keyof GameObjectEvents>(eventId: K, data?: GameObjectEvents[K]): void {
    this.#parent?.emit(eventId, data);
  }
}

export class GameObject {
  [key: string]: unknown;
  initialized = false;
  instantiated = false;
  destroyed = false;
  events: Record<string, Array<(data: unknown) => void>> = {};
  children: Set<GameObject> = new Set();
  components: Array<Component> = [];

  threeObject: THREE.Object3D = new THREE.Object3D()

  #listeners: Set<{target: GameObject, eventId: string, callback: (data: unknown) => void}> = new Set()
  #parent: GameObject | null = null;

  _init(): void {
    this.initialized = true;
    if (this.#parent === null) {
      Managers.get(GraphicsManager).add(this.threeObject)
    }
    this._bindEvents(this);
  }
  _destroy(): void {
    this.destroyed = true;
    for (const listener of this.#listeners) {
      if (!listener.target.destroyed) {
        listener.target.removeListener(listener.eventId, listener.callback)
      }
    }
    this.events = {};

    if (this.#parent === null) {
      Managers.get(GraphicsManager).remove(this.threeObject)
    }
  }

  _bindEvents(obj: GameObject | Component): void {
    for (const eventId of GameObjectEventNames) {
      if (obj.constructor.prototype[eventId]) {
        this.addListener(eventId, (obj[eventId] as () => void).bind(obj));
      }
    }
  }
  
  addComponent<T extends Component>(component: T): T {
    this.components.push(component);
    this._bindEvents(component);
    return component
  }

  addChild(obj: GameObject): void {
    obj.parent = this
    this.children.add(obj)
    this.threeObject.add(obj.threeObject)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getComponent<T extends Component>(type: new (...args: any[]) => T): T {
    return this.components.find((c) => c instanceof type) as T;
  }

  addListener<K extends keyof GameObjectEvents>(eventId: K, callback: (data?: GameObjectEvents[K]) => void): void {
    if (this.events[eventId] === undefined) {
      this.events[eventId] = [];
    }
    this.events[eventId].push(callback as (data: unknown) => void);
  }

  removeListener(eventId: string, callback: (data: unknown) => void): void {
    const index = this.events[eventId].indexOf(callback)
    if (index !== -1)
      this.events[eventId].splice(index, 1)
  }

  listenTo<K extends keyof GameObjectEvents>(gameObject: GameObject, eventId: K, callback: (data?: GameObjectEvents[K]) => void): void {
    gameObject.addListener(eventId, callback)
    this.#listeners.add({target: gameObject, eventId, callback: callback as (data: unknown) => void})
  }

  emit<K extends keyof GameObjectEvents>(eventId: K, data?: GameObjectEvents[K]): void {
    // TODO: Remove at some point
    if (this.destroyed || (this.instantiated && !this.initialized)) {
      if (this.destroyed)
        console.error('Error: An event was emited on an already destroyed GameObject')
      else
        console.error('Error: An event was emited on an uninitialized GameObject')
      return
    }
    this.events[eventId]?.forEach(c => c(data));
  }

  get parent(): GameObject | null {
    return this.#parent
  }
  set parent(parent: GameObject | null) {
    if (this.parent) {
      this.parent.threeObject.remove(this.threeObject)
    }
    this.#parent = parent
  }
}
