import * as PIXI from "pixi.js";

import { RoomObject } from "../RoomObject";
import { getFloorMatrix, getLeftMatrix, getRightMatrix } from "./matrixes";
import { getTileColors } from "./util/getTileColors";
import { getZOrder } from "../../util/getZOrder";
import { getTilePositionForTile } from "./util/getTilePositionForTile";
import { IRoomGeometry } from "../../interfaces/IRoomGeometry";
import { ITexturable } from "../../interfaces/ITextureable";

interface Props {
  geometry: IRoomGeometry;
  roomX: number;
  roomY: number;
  roomZ: number;
  edge?: boolean;
  tileHeight: number;
  color: string;
  texture?: PIXI.Texture;
  door?: boolean;
}

export class Tile extends RoomObject implements ITexturable {
  private _container: PIXI.Container | undefined;
  private _sprites: PIXI.DisplayObject[] = [];

  private _texture: PIXI.Texture | undefined;
  private _color: string | undefined;

  private _tileHeight: number;

  private _door: boolean;

  public get tileHeight() {
    return this._tileHeight;
  }

  public set tileHeight(value) {
    this._tileHeight = value;
    this._updateSprites();
  }

  constructor(private props: Props) {
    super();

    this._texture = props.texture;
    this._color = props.color;
    this._tileHeight = props.tileHeight;
    this._door = props.door ?? false;
  }

  get texture() {
    return this._texture;
  }

  set texture(value) {
    this._texture = value;
    this._updateSprites();
  }

  get color() {
    return this._color;
  }

  set color(value) {
    this._color = value;
    this._updateSprites();
  }

  destroyed(): void {
    this._destroySprites();
  }

  registered(): void {
    this._updateSprites();
  }

  private _destroySprites() {
    this._sprites.forEach((sprite) => sprite.destroy());
    this._sprites = [];
  }

  private _updateSprites() {
    if (!this.mounted) return;

    this._container?.destroy();
    this._container = new PIXI.Container();

    this._destroySprites();

    const { geometry, roomX, roomY, roomZ } = this.props;

    const { x, y } = geometry.getPosition(roomX, roomY, roomZ);
    this._container.zIndex = getZOrder(roomX, roomY, roomZ);

    const { borderLeftTint, borderRightTint, tileTint } = getTileColors(
      this._color ?? this.props.color
    );

    const tileMatrix = getFloorMatrix(x, y);

    const tilePositions = getTilePositionForTile(roomX, roomY);

    const tile = new PIXI.TilingSprite(this.texture ?? PIXI.Texture.WHITE);
    tile.tilePosition = tilePositions.top;

    tile.transform.setFromMatrix(tileMatrix);
    tile.width = 32;
    tile.height = 32;
    tile.tint = tileTint;

    const borderLeftMatrix = getLeftMatrix(x, y, {
      width: 32,
      height: this.tileHeight,
    });

    const borderRightMatrix = getRightMatrix(x, y, {
      width: 32,
      height: this.tileHeight,
    });

    const borderLeft = new PIXI.TilingSprite(
      this.texture ?? PIXI.Texture.WHITE
    );
    borderLeft.transform.setFromMatrix(borderLeftMatrix);
    borderLeft.width = 32;
    borderLeft.height = this.tileHeight;
    borderLeft.tilePosition = tilePositions.left;
    borderLeft.tint = borderLeftTint;

    const borderRight = new PIXI.TilingSprite(
      this.texture ?? PIXI.Texture.WHITE
    );
    borderRight.transform.setFromMatrix(borderRightMatrix);
    borderRight.width = 32;
    borderRight.height = this.tileHeight;
    borderRight.tilePosition = tilePositions.right;
    borderRight.tint = borderRightTint;

    this._sprites.push(this._container);

    this._container.addChild(borderLeft);
    this._container.addChild(borderRight);
    this._container.addChild(tile);

    if (!this._door) {
      this.roomVisualization.floorContainer.addChild(this._container);
    } else {
      this.roomVisualization.behindWallContainer.addChild(this._container);
      this._container.zIndex = -1;
    }
  }
}
