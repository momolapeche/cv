import { bindEvents } from './Events';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ManagerConstructor = (new (...args: any[]) => Manager)[];

export abstract class Manager {
    Setup?(): Promise<void>;
    Exit?(): void;

    Destructor?(): void;

    static BindManagerEvents(manager: new (...args: unknown[]) => Manager): void {
        const instance = Managers.get(manager)
        bindEvents(instance, instance);
    }
}

class ManagerManager {
    #constructors = new Set<new () => Manager>()
    #managers = new Map<new () => Manager, Manager>()
    #setupManagers = new Map<new () => Manager, Manager>()

    engineStart() {
        console.log('STARTTTTT')
        for (const ctor of this.#constructors) {
            this.#managers.set(ctor, new ctor())
        }
    }
    engineDestroyed() {
        for (const manager of this.#managers.values()) {
            manager.Destructor?.()
        }
        this.#constructors.clear()
        this.#managers.clear()
        this.#setupManagers.clear()
    }

    add(ctor: new () => Manager) {
        this.#constructors.add(ctor)
    }
    setup<T extends Manager>(ctor: new (...args: unknown[]) => T) {
        this.#setupManagers.set(ctor, this.#managers.get(ctor) as T)
        Manager.BindManagerEvents(ctor)
    }
    reset() {
        this.#setupManagers.clear()
    }
    get<T extends Manager>(m: new (...args: unknown[]) => T): T {
        const manager = this.#setupManagers.get(m)

        if (manager === undefined) {
            console.error(`Error: ${m.name} was not set up`)
            return this.#managers.get(m) as T
        }
        return manager as T
    }
}

export const Managers = new ManagerManager()

export function InstantiateManager<T extends Manager>(manager: T): T {
    return manager;
}

