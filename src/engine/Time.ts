import { Manager } from './Manager';
import { SysUpdateData } from './Types';

export class TimeManager extends Manager {
  #deltaTime = 0;
  #time = 0;
  #then = 0;
  async Setup(): Promise<void> {
    this.#time = 0;
    this.#then = 0;
    this.#deltaTime = 0;
  }
  SysUpdate({ time }: SysUpdateData): void {
    this.#deltaTime = time - this.#then;
    this.#time += this.#deltaTime;
    this.#then = time;
  }
  get time(): number {
    return this.#time;
  }
  get deltaTime(): number {
    return this.#deltaTime;
  }
}