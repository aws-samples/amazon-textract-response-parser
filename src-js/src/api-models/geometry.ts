/**
 * Core geometry/shape API models used by the Textract Response Parser.
 */

/**
 * An axis-aligned bounding box on the page in relative coordinates
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/API_BoundingBox.html
 */
export interface ApiBoundingBox {
  /**
   * Height of the box relative to the input page/image, from 0-1
   */
  Height: number;
  /**
   * X coordinate of the left side of the box relative to the input page/image edge, from 0-1
   */
  Left: number;
  /**
   * Y coordinate of the top of the box relative to the top of the input page/image edge, from 0-1
   */
  Top: number;
  /**
   * Width of the box relative to the input page/image, from 0-1
   */
  Width: number;
}

/**
 * A specific point on the page in relative coordinates
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/API_Point.html
 */
export interface ApiPoint {
  /**
   * X coordinate of the point relative to the input page/image edge, from 0-1
   */
  X: number;
  /**
   * Y coordinate of the point relative to the top of the input page/image edge, from 0-1
   */
  Y: number;
}

/**
 * Information about the location of a detected element on the input page/image
 *
 * See: https://docs.aws.amazon.com/textract/latest/dg/API_Geometry.html
 */
export interface ApiGeometry {
  /**
   * The smallest coordinate-aligned box containing the element
   */
  BoundingBox: ApiBoundingBox;
  /**
   * A fine-grained polygon around the element (usually a 4-point box, but may not be axis-aligned)
   */
  Polygon: ApiPoint[];
}
