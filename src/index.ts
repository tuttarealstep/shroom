import * as PIXI from "pixi.js";

import { parseTileMapString } from "./util/parseTileMapString";
import { Furniture } from "./objects/furniture/Furniture";
import { AnimationTicker } from "./AnimationTicker";

import TileAsset from "./assets/tile.png";
import WallAsset from "./assets/wall.png";
import Wall2Asset from "./assets/wall2.png";
import { FurnitureLoader } from "./objects/furniture/FurnitureLoader";
import { Room } from "./objects/room/Room";
import { WallFurniture } from "./objects/furniture/WallFurniture";

const view = document.querySelector("#root") as HTMLCanvasElement | undefined;
const container = document.querySelector("#container") as
  | HTMLDivElement
  | undefined;
if (view == null || container == null) throw new Error("Invalid view");

const application = new PIXI.Application({
  view,
  antialias: false,
  resolution: window.devicePixelRatio,
  autoDensity: true,
  width: 1600,
  height: 900,
  backgroundColor: 0x000000,
});

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
PIXI.settings.ROUND_PIXELS = true;

const animationTicker = new AnimationTicker(application);
const furniLoader = new FurnitureLoader();

application.loader
  .add(TileAsset)
  .add(WallAsset)
  .add(Wall2Asset)
  .load(() => init());

function init() {
  const room = new Room(
    parseTileMapString(`
    000
    000
    000
  `),
    animationTicker,
    furniLoader
  );

  const furnis: Furniture[] = [];
  room.addRoomObject(
    new Furniture(`throne`, 2, "0", {
      roomX: 0,
      roomY: 0,
      roomZ: 0,
    })
  );

  room.addRoomObject(
    new WallFurniture(`window_nt_skyscraper`, 2, "0", {
      roomX: 0,
      roomY: 0,
      roomZ: 0,
    })
  );

  room.addRoomObject(
    new WallFurniture(`window_nt_skyscraper`, 2, "0", {
      roomX: 0,
      roomY: 1,
      roomZ: 0,
    })
  );

  room.addRoomObject(
    new WallFurniture(`window_nt_skyscraper`, 2, "0", {
      roomX: 0,
      roomY: 2,
      roomZ: 0,
    })
  );

  room.x = application.screen.width / 2 - room.roomWidth / 2;
  room.y = application.screen.height / 2 - room.roomHeight / 2;

  application.stage.addChild(room);

  /*application.stage.addChild(
    new TileTest({ x: 10, y: 10, tileHeight: 10, xEven: false, yEven: false })
  );
  application.stage.addChild(
    new TileTest({
      x: 10 + 32,
      y: 10 + 16,
      tileHeight: 10,
      xEven: true,
      yEven: false,
    })
  );
  */
}
