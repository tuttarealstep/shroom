import { getVariables } from "./getVariables";
import { promises as fs } from "fs";
import { tryFetchString } from "./fetching";
import * as path from "path";
import { dumpFigureLibraries } from "./dumpFigureLibraries";
import { dumpFurniFromFurniData } from "./dumpFurniFromFurniData";
import { createOffsetSnapshot } from "../objects/avatar/util";
import Bluebird from "bluebird";

export type Steps = {
  figureMap: boolean;
  figureData: boolean;
  furniData: boolean;
  figureAssets: boolean;
  furniAssets: boolean;
};

export type StepState = "pending" | "runs" | "success" | "error" | "skipped";

export type Action =
  | { type: "FIGURE_MAP_LOADING" }
  | { type: "FIGURE_MAP_SUCCESS" }
  | { type: "FIGURE_DATA_LOADING" }
  | { type: "FIGURE_DATA_SUCCESS" }
  | { type: "FURNI_DATA_LOADING" }
  | { type: "FURNI_DATA_SUCCESS" }
  | { type: "FIGURE_ASSETS_LOADING" }
  | { type: "FIGURE_ASSETS_PROGRESS_SUCCESS"; payload: string }
  | { type: "FIGURE_ASSETS_PROGRESS_ERROR"; payload: string }
  | { type: "FIGURE_ASSETS_SUCCESS" }
  | { type: "FURNI_ASSETS_LOADING" }
  | {
      type: "FURNI_ASSETS_PROGRESS_SUCCESS";
      payload: { id: string; revision?: string };
    }
  | {
      type: "FURNI_ASSETS_PROGRESS_ERROR";
      payload: { id: string; revision?: string };
    }
  | { type: "FURNI_ASSETS_SUCCESS" }
  | { type: "FURNI_ASSETS_COUNT"; payload: number }
  | { type: "FURNI_ASSETS_DOWNLOAD_COUNT" }
  | { type: "FIGURE_ASSETS_COUNT"; payload: number }
  | { type: "FIGURE_ASSETS_DOWNLOAD_COUNT" }
  | { type: "STARTED" };

export interface State {
  figureData: StepState;
  figureMap: StepState;
  furniData: StepState;
  figureAssets: StepState;
  furniAssets: StepState;
  lastFigureAsset?: string;
  lastFurniAsset?: { id: string; revision?: string };
  furniAssetsCount?: number;
  furniAssetsCompletedCount?: number;
  furniAssetsDownloadCount?: number;
  figureAssetsCount?: number;
  figureAssetsCompletedCount?: number;
  figureAssetsDownloadCount?: number;
  started: boolean;
}

function makeAbsolute(url: string) {
  if (url.slice(0, 2) === "//") {
    return `http:${url}`;
  }

  return url;
}

export async function run({
  dispatch,
  externalVarsUrl,
  steps,
  location,
}: {
  externalVarsUrl: string;
  steps: Steps;
  location: string;
  dispatch: (action: Action) => void;
}) {
  dispatch({ type: "STARTED" });

  const libraryFolder = location;

  await fs.mkdir(libraryFolder, { recursive: true });

  const variables = await getVariables(externalVarsUrl);
  const { figureDataUrl, figureMapUrl, furniDataUrl, hofFurniUrl } = variables;

  const furniData = await tryFetchString(makeAbsolute(furniDataUrl));
  const figureMapString = await tryFetchString(makeAbsolute(figureMapUrl));

  if (steps.figureMap) {
    dispatch({ type: "FIGURE_MAP_LOADING" });

    await fs.mkdir(libraryFolder, { recursive: true });

    await fs.writeFile(
      path.join(libraryFolder, "figuremap.xml"),
      figureMapString
    );

    dispatch({ type: "FIGURE_MAP_SUCCESS" });
  }

  if (steps.figureData) {
    dispatch({ type: "FIGURE_DATA_LOADING" });

    const figureDataString = await tryFetchString(makeAbsolute(figureDataUrl));

    await fs.writeFile(
      path.join(libraryFolder, "figuredata.xml"),
      figureDataString
    );

    dispatch({ type: "FIGURE_DATA_SUCCESS" });
  }

  if (steps.furniData) {
    dispatch({ type: "FURNI_DATA_LOADING" });

    await fs.writeFile(path.join(libraryFolder, "furnidata.xml"), furniData);

    dispatch({ type: "FURNI_DATA_SUCCESS" });
  }

  const figureAssetsJob = () =>
    // eslint-disable-next-line no-async-promise-executor
    new Promise(async (resolve) => {
      if (steps.figureAssets) {
        dispatch({ type: "FIGURE_ASSETS_LOADING" });

        const gordonUrl = figureMapUrl.split("/").slice(0, -1).join("/");
        const figureFolder = path.join(libraryFolder, "figure");
        await fs.mkdir(figureFolder, { recursive: true });

        await dumpFigureLibraries(
          makeAbsolute(gordonUrl),
          figureMapString,
          figureFolder,
          dispatch
        );

        const snapshot = await createOffsetSnapshot(
          figureMapString,
          async (name) => {
            const file = await fs.readFile(
              path.join(figureFolder, `${name}/${name}_manifest.bin`)
            );

            return file.toString("utf-8");
          }
        );

        const offsetsPath = path.join(libraryFolder, "offsets.json");

        await fs.writeFile(offsetsPath, snapshot);

        dispatch({ type: "FIGURE_ASSETS_SUCCESS" });

        resolve(true);
      }
    });

  const furniAssetsJob = () =>
    // eslint-disable-next-line no-async-promise-executor
    new Promise(async (resolve) => {
      if (steps.furniAssets) {
        dispatch({ type: "FURNI_ASSETS_LOADING" });

        const furniFolder = path.join(libraryFolder, "hof_furni");

        await fs.mkdir(furniFolder, { recursive: true });
        await dumpFurniFromFurniData(
          hofFurniUrl,
          furniData,
          furniFolder,
          dispatch
        );

        dispatch({ type: "FURNI_ASSETS_SUCCESS" });

        resolve(true);
      }
    });

  await Bluebird.map(
    [figureAssetsJob, furniAssetsJob],
    (job) => {
      job();
    },
    { concurrency: Infinity }
  );
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "STARTED":
      return {
        ...state,
        started: true,
      };

    case "FIGURE_MAP_LOADING":
      return {
        ...state,
        figureMap: "runs",
      };

    case "FIGURE_MAP_SUCCESS":
      return {
        ...state,
        figureMap: "success",
      };

    case "FIGURE_DATA_LOADING":
      return {
        ...state,
        figureData: "runs",
      };

    case "FIGURE_DATA_SUCCESS":
      return {
        ...state,
        figureData: "success",
      };

    case "FURNI_DATA_LOADING":
      return {
        ...state,
        furniData: "runs",
      };

    case "FURNI_DATA_SUCCESS":
      return {
        ...state,
        furniData: "success",
      };

    case "FIGURE_ASSETS_LOADING":
      return {
        ...state,
        figureAssets: "runs",
      };

    case "FIGURE_ASSETS_PROGRESS_SUCCESS":
      return {
        ...state,
        lastFigureAsset: action.payload,
        figureAssetsCompletedCount: (state.figureAssetsCompletedCount ?? 0) + 1,
      };

    case "FURNI_ASSETS_DOWNLOAD_COUNT":
      return {
        ...state,
        furniAssetsDownloadCount: (state.furniAssetsDownloadCount ?? 0) + 1,
      };

    case "FIGURE_ASSETS_SUCCESS":
      return {
        ...state,
        figureAssets: "success",
      };

    case "FURNI_ASSETS_LOADING":
      return {
        ...state,
        furniAssets: "runs",
      };

    case "FURNI_ASSETS_PROGRESS_SUCCESS":
      return {
        ...state,
        lastFurniAsset: action.payload,
        furniAssetsCompletedCount: (state?.furniAssetsCompletedCount ?? 0) + 1,
      };

    case "FURNI_ASSETS_PROGRESS_ERROR":
      return {
        ...state,
        furniAssetsCompletedCount: (state?.furniAssetsCompletedCount ?? 0) + 1,
      };

    case "FURNI_ASSETS_SUCCESS":
      return {
        ...state,
        furniAssets: "success",
      };

    case "FURNI_ASSETS_COUNT":
      return {
        ...state,
        furniAssetsCount: action.payload,
      };

    case "FIGURE_ASSETS_COUNT":
      return {
        ...state,
        figureAssetsCount: action.payload,
      };

    case "FIGURE_ASSETS_DOWNLOAD_COUNT":
      return {
        ...state,
        figureAssetsDownloadCount: (state?.figureAssetsDownloadCount ?? 0) + 1,
      };

    default:
      return state;
  }
}

export const initialState: State = {
  figureData: "pending",
  figureMap: "pending",
  furniData: "pending",
  figureAssets: "pending",
  furniAssets: "pending",
  started: false,
};
