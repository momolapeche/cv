import { EngineClass } from "@/engine/lib";
import MainScene from "./Scenes/MainScene";

export class AppEngine extends EngineClass {
    constructor() {
        super(
            {
                Main: MainScene,
            },
            {
                sceneName: "Main",
                data: undefined,
            }
        )
    }
}