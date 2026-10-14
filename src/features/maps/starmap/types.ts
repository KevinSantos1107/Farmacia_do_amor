export interface StarMapConfig {
  specialDate: string;
  time?: string;
  customLocation: { lat: number; lng: number; name: string };
  romanticQuote: string;
  constellations: string[];
}

export interface ConstellationShape {
  stars: { x: number; y: number; mag: number }[];
  lines: [number, number][];
}

export interface RenderedConstellation {
  cx: number;
  cy: number;
  scale: number;
  name: string;
  stars: { x: number; y: number; r: number }[];
  lines: [number, number][];
  shape: ConstellationShape;
  reqRadius?: number;
}

export interface BackgroundStar {
  x: number;
  y: number;
  r: number;
  a: number;
  speed: number;
  phase: number;
}
