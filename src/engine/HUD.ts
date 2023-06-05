/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { bindEvents } from './Events';
import { Manager } from './Manager';

export class HUDManager extends Manager {
  container: HUDParent;
  constructor() {
    super();
    // USELESS BUT NECESSARY
    this.container = new HUDParent();
  }
  addChild(component: HUDComponent): void {
    this.container.addChild(component);
  }
  // async Setup(data: Record<string, unknown>): Promise<void> {
  async Setup(): Promise<void> {
    this.container = new HUDParent();
  }
  Exit(): void {
    for (const child of this.container.children) {
      child.parent = null;
    }
    this.container.children.clear();
    while (this.container.domElement.firstChild) {
      this.container.domElement.removeChild(
        this.container.domElement.firstChild
      );
    }
  }
}

class HUDComponent {
  domElement: HTMLElement;
  children: Set<HUDComponent> = new Set();
  parent: HUDComponent | null = null;
  constructor(element: HTMLElement) {
    this.domElement = element;
    bindEvents(this, this);
  }

  addChild(component: HUDComponent): void {
    // console.log(this.domElement, component);
    this.children.add(component);
    component.parent = this;
    // console.log(component.domElement);
    this.domElement.appendChild(component.domElement);
  }
  removeChild(component: HUDComponent): void {
    if (component.parent !== this) {
      return;
    }
    this.children.delete(component);
    component.parent = null;
    this.domElement.removeChild(component.domElement);
  }
}

class HUDParent extends HUDComponent {
  constructor() {
    const container = (document.querySelector('.hud-container') ??
      document.createElement('div')) as HTMLElement;
    super(container);
  }
}

export class HUDText extends HUDComponent {
  constructor(text: string) {
    const element = document.createElement('span');
    element.innerText = text;
    super(element);
  }
}

type HUDPanelSettings = {
  backgroundColor: number;
  borderWidth?: number;
  borderColor?: number;
  width: number | string;
  height: number | string;
};
export class HUDPanel extends HUDComponent {
  constructor(settings: HUDPanelSettings) {
    const element = document.createElement('div') as HTMLDivElement;
    // console.log(element);
    super(element);
    this.domElement.classList.add('hud-panel');
    this.domElement.style.width = typeof(settings.width) === 'number' ? `${settings.width}px` : settings.width;
    this.domElement.style.height = typeof(settings.height) === 'number' ? `${settings.height}px` : settings.height;
    const backgroundColor = settings.backgroundColor.toString(16);
    const cssBgColor = `#${
      '000000'.slice(0, 6 - backgroundColor.length) + backgroundColor
    }`;
    this.domElement.style.setProperty('--background-color', cssBgColor);
  }
}