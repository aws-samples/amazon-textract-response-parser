/**
 * Core geometry/shape API models used by the Textract response parser.
 */

export interface ApiBoundingBox {
  Height: number;
  Left: number;
  Top: number;
  Width: number;
}

export interface ApiPoint {
  X: number;
  Y: number;
}

export interface ApiGeometry {
  BoundingBox: ApiBoundingBox;
  Polygon: ApiPoint[];
}
