export {
  FurniDrawDefinition as DrawDefinition,
  FurniDrawPart as DrawPart,
} from "./DrawDefinition";
export * from "./parseAssets";
export * from "./visualization/parseVisualization";
export * from "./parseStringAsync";

export function getCharFromLayerIndex(index: number) {
  return String.fromCharCode(97 + index);
}
