import { triggerEvent } from './Events';
import { GraphicsManager } from './Graphics';
import { Manager, Managers } from './Manager';

export class InputsManager extends Manager {
  keyboardState = new Set();
  keyboardPressed = new Set();

  domElement: HTMLCanvasElement = <HTMLCanvasElement><unknown>null
  domElementRect: DOMRect = <DOMRect><unknown>null

  #clickCallback = ((event: MouseEvent) => {
    const x = event.clientX - this.domElementRect.left
    const y = event.clientY - this.domElementRect.top

    const nx = x / this.domElementRect.width
    const ny = y / this.domElementRect.height

    triggerEvent('OnClick', { x, y, nx, ny })
  }).bind(this)

  #keydownCallback = ((event: KeyboardEvent) => {
    if (!this.keyboardState.has(event.key)) {
      this.keyboardPressed.add(event.key)
      this.keyboardState.add(event.key)
      triggerEvent('OnKeyPressed', { event })
    }
  }).bind(this)
  #keyupCallback = ((event: KeyboardEvent) => {
    this.keyboardPressed.delete(event.key)
    this.keyboardState.delete(event.key)
  }).bind(this)

  constructor() {
    super()
    document.addEventListener('keydown', this.#keydownCallback)
    document.addEventListener('keyup', this.#keyupCallback)
    document.addEventListener('click', this.#clickCallback)
  }

  async Setup(): Promise<void> {
    this.domElement = Managers.get(GraphicsManager).renderer.domElement
    this.domElementRect = this.domElement.getBoundingClientRect()
  }

  Destructor(): void {
    document.removeEventListener('keydown', this.#keydownCallback)
    document.removeEventListener('keyup', this.#keyupCallback)
    document.removeEventListener('click', this.#clickCallback)
  }

  PostUpdate(): void {
    this.keyboardPressed.clear();
  }

  get(k: string): boolean {
    return this.keyboardState.has(k);
  }
  getPressed(k: string): boolean {
    return this.keyboardPressed.has(k);
  }
}