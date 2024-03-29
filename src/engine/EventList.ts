const EventNamesI: Record<keyof Events, null> = {
  /// DEFAULT
  SysUpdate: null,
  GameObjectInit: null,
  PreUpdate: null,
  Update: null,
  PostUpdate: null,
  Render: null,
  OnKeyPressed: null,
  OnClick: null,
  Exit: null,

  /// CUSTOM
  Debug: null,
}

export const EventNames = Object.keys(EventNamesI) as Array<keyof Events>

export interface Events {
  SysUpdate: { time: number }
  GameObjectInit: undefined
  PreUpdate: undefined
  Update: undefined
  PostUpdate: undefined
  Render: undefined
  Exit: undefined
  OnKeyPressed: { event: KeyboardEvent }
  OnClick: { x: number, y: number, nx: number, ny: number }

  // CUSTOM EVENTS
  Debug: { position: number[] }
}



const GameObjectEventNamesI: Record<keyof GameObjectEvents, null> = {
  Init: null,
  Destroy: null,

  // CUSTOM
}

export const GameObjectEventNames = Object.keys(GameObjectEventNamesI) as Array<keyof GameObjectEvents>;

export interface GameObjectEvents {
  // DEFAULT
  Init: undefined
  Destroy: undefined

  // CUSTOM
}


