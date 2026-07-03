export const PITCH_LENGTH = 120;
export const PITCH_WIDTH = 80;

export function toSvgPoint(
  location: [number, number],
  svgWidth: number,
  svgHeight: number
) {
  const [x, y] = location;
  return {
    x: (x / PITCH_LENGTH) * svgWidth,
    y: (y / PITCH_WIDTH) * svgHeight,
  };
}

export function flipLocation(location: [number, number]): [number, number] {
  const [x, y] = location;
  return [PITCH_LENGTH - x, PITCH_WIDTH - y];
}
