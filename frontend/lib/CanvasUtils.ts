export const GRID_SIZE = 20;

export function snap(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function normalizeX(x: number, width: number): number {
  return width > 0 ? x / width : 0;
}

export function normalizeY(y: number, height: number): number {
  return height > 0 ? y / height : 0;
}

export function denormalizeX(x_norm: number, width: number): number {
  return x_norm * width;
}

export function denormalizeY(y_norm: number, height: number): number {
  return y_norm * height;
}
