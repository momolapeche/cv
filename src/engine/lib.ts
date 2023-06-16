/* eslint-disable @typescript-eslint/no-empty-function */

import { triggerEvent, resetEvents, deleteEvents } from './Events';
import { InstanceManager } from './Instance';
import { ManagerConstructor, Managers } from './Manager';
import { InputsManager } from './Inputs';
import { Scene } from './Scene';
import { TimeManager } from './Time';
import { HUDManager } from './HUD';
import { Events } from './EventList';
import { TransformManager } from './Transform';
import { GraphicsManager } from './Graphics';

const DEFAULT_MANAGERS: ManagerConstructor = [
  InstanceManager,
  GraphicsManager,
  InputsManager,
  TimeManager,
  HUDManager,
  TransformManager,
]

for (const managerCtor of DEFAULT_MANAGERS) {
  Managers.add(managerCtor)
}

type SceneConstructor = new (...args: unknown[]) => Scene

export class EngineClass {
  scenes: Record<string, SceneConstructor> = {}
  currentScene: Scene | null = null
  _sceneChanged = false
  _setupData: {sceneName: string, data: unknown} = {sceneName: '', data: null}

  stopped = false
  

  constructor(scenes: Record<string, SceneConstructor>, initialScene: { sceneName: string, data: unknown }) {
    this.scenes = scenes
    for (const k in this.scenes) {
      for (const manager of (<typeof Scene><unknown>this.scenes[k]).Managers) {
        Managers.add(manager)
      }
    }
    Managers.engineStart()

    this.setup(initialScene).then(() => {
      this.start()
    })
  }
  
  async setup({sceneName, data}: {sceneName: string, data: unknown}): Promise<void> {
    const sceneCtor = this.scenes[sceneName]
    const scene = new sceneCtor()

    Managers.reset()

    const managerList = new Set([ ...DEFAULT_MANAGERS, ...(<typeof Scene><unknown>sceneCtor).Managers ])

    for (const manager of managerList) {
      Managers.setup(manager)
    }
    for (const manager of managerList) {
      await Managers.get(manager).Setup?.();
    }

    await scene.Setup?.(data)
    this.currentScene = scene
  }
  exitScene(): void {
    triggerEvent('Exit')
    resetEvents()
    Managers.reset()
    this.currentScene?.Exit?.()
  }
  changeScene(sceneName: string, data?: unknown): void {
    this._setupData = {sceneName, data}
    this._sceneChanged = true
  }
  frame(now: number): void {
    now = now / 1000;

    triggerEvent('SysUpdate', { time: now });
    triggerEvent('GameObjectInit');
    triggerEvent('PreUpdate');
    triggerEvent('Update');
    triggerEvent('PostUpdate');
    triggerEvent('Render');

    if (this._sceneChanged) {
      this.exitScene()
      this.setup(this._setupData)
      this._setupData = {sceneName: '', data: {}}
      this._sceneChanged = false
    }

    if (this.stopped === false)
      requestAnimationFrame(this.frame.bind(this));
  }
  triggerEvent<K extends keyof Events>(name: K, data?: Events[K]): void {
    triggerEvent(name, data)
  }
  async start(): Promise<void> {
    requestAnimationFrame(this.frame.bind(this));
  }
  destroy(): void {
    console.log('ENGINE STOPPED')
    this.stopped = true
    this.exitScene()
    Managers.engineDestroyed()
    deleteEvents()
  }
}
