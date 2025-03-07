import { IFurnitureData } from "../../interfaces/IFurnitureData";
import {
  FurnitureFetch,
  IFurnitureLoader,
} from "../../interfaces/IFurnitureLoader";
import { FurnitureIndexData } from "./data/FurnitureIndexData";
import { loadFurni, LoadFurniResult } from "./util/loadFurni";

export class FurnitureLoader implements IFurnitureLoader {
  private _furnitureCache: Map<string, Promise<LoadFurniResult>> = new Map();
  private _artificalDelay: number | undefined;

  public get delay() {
    return this._artificalDelay;
  }

  public set delay(value) {
    this._artificalDelay = value;
  }

  constructor(private _options: Options) {}

  static create(furnitureData: IFurnitureData, resourcePath = "") {
    const normalizePath = (revision: number | undefined, type: string) => {
      if (revision == null) return type;

      return `${revision}/${type}`;
    };

    return new FurnitureLoader({
      furnitureData,
      getAssets: (type, revision) =>
        fetch(
          `${resourcePath}/hof_furni/${normalizePath(
            revision,
            type
          )}/${type}_assets.bin`
        ).then((response) => response.text()),
      getVisualization: (type, revision) =>
        fetch(
          `${resourcePath}/hof_furni/${normalizePath(
            revision,
            type
          )}/${type}_visualization.bin`
        ).then((response) => response.text()),
      getAsset: async (type, name, revision) =>
        `${resourcePath}/hof_furni/${normalizePath(
          revision,
          type
        )}/${name}.png`,
      getIndex: async (type, revision) => {
        const result = await FurnitureIndexData.fromUrl(
          `${resourcePath}/hof_furni/${normalizePath(revision, type)}/index.bin`
        );

        return result?.toObject();
      },
    });
  }

  async loadFurni(fetch: FurnitureFetch): Promise<LoadFurniResult> {
    if (this.delay != null) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }

    let typeWithColor: string;

    if (fetch.kind === "id") {
      const type = await this._options.furnitureData.getTypeById(
        fetch.id,
        fetch.placementType
      );
      if (type == null)
        throw new Error("Couldn't determine type for furniture.");

      typeWithColor = type;
    } else {
      typeWithColor = fetch.type;
    }

    const typeSplitted = typeWithColor.split("*");
    const type = typeSplitted[0];

    const revision = await this._options.furnitureData.getRevisionForType(
      typeWithColor
    );

    let furniture = this._furnitureCache.get(typeWithColor);
    if (furniture != null) {
      return furniture;
    }

    furniture = loadFurni(typeWithColor, revision, {
      getAssets: this._options.getAssets,
      getVisualization: this._options.getVisualization,
      getAsset: this._options.getAsset,
      getIndex: this._options.getIndex,
    });
    this._furnitureCache.set(type, furniture);

    return furniture;
  }
}

interface Options {
  furnitureData: IFurnitureData;
  getAssets: (type: string, revision?: number) => Promise<string>;
  getVisualization: (type: string, revision?: number) => Promise<string>;
  getAsset: (type: string, name: string, revision?: number) => Promise<string>;
  getIndex: (
    type: string,
    revision?: number
  ) => Promise<{ logic?: string; visualization?: string }>;
}
