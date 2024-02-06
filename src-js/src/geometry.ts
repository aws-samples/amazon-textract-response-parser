/**
 * TRP classes for objects describing geometry (of e.g. words, text lines, tables) on the page
 */
// Local Dependencies:
import { ApiBoundingBox, ApiGeometry, ApiPoint } from "./api-models/geometry";
import { ApiObjectWrapper } from "./base";

/**
 * The coordinate axis-aligned bounding box of a detected object
 */
export class BoundingBox<
  TParentBlock,
  TParent extends ApiObjectWrapper<TParentBlock>,
> extends ApiObjectWrapper<ApiBoundingBox> {
  _parentGeometry: Geometry<TParentBlock, TParent> | null;

  constructor(dict: ApiBoundingBox, parentGeometry: Geometry<TParentBlock, TParent> | null = null) {
    super(dict);
    this._parentGeometry = parentGeometry;
  }

  /**
   * 0-1, top-to-bottom Y coordinate of the bottom of the box relative to the input page/image
   */
  get bottom(): number {
    return this.top + this.height;
  }
  /**
   * 0-1, left-to-right X coordinate of the center of the box relative to the input page/image
   */
  get hCenter(): number {
    return this.left + this.width / 2;
  }
  /**
   * Height of the box relative to the input page/image, from 0-1
   */
  get height(): number {
    return this._dict.Height;
  }
  /**
   * 0-1, left-to-right X coordinate of the left side of the box relative to the input page/image
   */
  get left(): number {
    return this._dict.Left;
  }
  /**
   * Optional parent geometry object owning this bounding box
   */
  get parentGeometry(): Geometry<TParentBlock, TParent> | null {
    return this._parentGeometry;
  }
  /**
   * 0-1, top-to-bottom Y coordinate of the top of the box relative to the input page/image
   */
  get top(): number {
    return this._dict.Top;
  }
  /**
   * 0-1, left-to-right X coordinate of the right side of the box relative to the input page/image
   */
  get right(): number {
    return this.left + this.width;
  }
  /**
   * 0-1, top-to-bottom Y coordinate of the middle of the box relative to the input page/image
   */
  get vCenter(): number {
    return this.top + this.height / 2;
  }
  /**
   * Width of the box relative to the input page/image, from 0-1
   */
  get width(): number {
    return this._dict.Width;
  }

  /**
   * Calculate the minimum box enclosing both this and `other`.
   * @returns A new BoundingBox object with null `parentGeometry`.
   */
  union<T>(other: BoundingBox<T, ApiObjectWrapper<T>>): BoundingBox<T, ApiObjectWrapper<T>> {
    const left = Math.min(this.left, other.left);
    const top = Math.min(this.top, other.top);
    const right = Math.max(this.right, other.right);
    const bottom = Math.max(this.bottom, other.bottom);
    return new BoundingBox(
      {
        Height: bottom - top,
        Left: left,
        Top: top,
        Width: right - left,
      },
      null,
    );
  }

  /**
   * Calculate the intersection (if there is one) between two boxes.
   * @returns A new BoundingBox object with null `parentGeometry`, or null if inputs don't overlap
   */
  intersection<T>(other: BoundingBox<T, ApiObjectWrapper<T>>): BoundingBox<T, ApiObjectWrapper<T>> | null {
    const vIsectTop = Math.max(this.top, other.top);
    const vIsectBottom = Math.min(this.bottom, other.bottom);
    const vIsect = Math.max(0, vIsectBottom - vIsectTop);
    const hIsectLeft = Math.max(this.left, other.left);
    const hIsectRight = Math.min(this.right, other.right);
    const hIsect = Math.max(0, hIsectRight - hIsectLeft);
    if (vIsect > 0 && hIsect > 0) {
      return new BoundingBox(
        {
          Height: vIsectBottom - vIsectTop,
          Left: hIsectLeft,
          Top: vIsectTop,
          Width: hIsectRight - hIsectLeft,
        },
        null,
      );
    } else {
      return null;
    }
  }

  /**
   * Create a human-readable string representation of this bounding box's key characteristics
   */
  str(): string {
    return `width: ${this._dict.Width}, height: ${this._dict.Height}, left: ${this._dict.Left}, top: ${this._dict.Top}`;
  }
}

/**
 * One X-Y point from a polygon describing the detailed shape of a detected object
 */
export class Point<
  TParentBlock,
  TParent extends ApiObjectWrapper<TParentBlock>,
> extends ApiObjectWrapper<ApiPoint> {
  _parentGeometry: Geometry<TParentBlock, TParent> | null;

  constructor(dict: ApiPoint, parentGeometry: Geometry<TParentBlock, TParent> | null = null) {
    super(dict);
    this._parentGeometry = parentGeometry;
  }

  /**
   * Optional parent geometry object owning this point
   */
  get parentGeometry(): Geometry<TParentBlock, TParent> | null {
    return this._parentGeometry;
  }
  /**
   * 0-1, left-to-right X coordinate of the point relative to the input image/page
   */
  get x(): number {
    return this._dict.X;
  }
  /**
   * 0-1, top-to-bottom Y coordinate of the point relative to the input image/page
   */
  get y(): number {
    return this._dict.Y;
  }

  /**
   * Create a human-readable string representation of this point's key characteristics
   */
  str(): string {
    return `x: ${this._dict.X}, y: ${this._dict.Y}`;
  }
}

/**
 * Shape/location on the page of an element detected by Textract
 */
export class Geometry<
  TParentBlock,
  TParent extends ApiObjectWrapper<TParentBlock>,
> extends ApiObjectWrapper<ApiGeometry> {
  _boundingBox: BoundingBox<TParentBlock, TParent>;
  _parentObject: TParent | null;
  _polygon: Point<TParentBlock, TParent>[];

  constructor(dict: ApiGeometry, parentObject: TParent | null) {
    super(dict);
    this._parentObject = parentObject;
    this._boundingBox = new BoundingBox(dict.BoundingBox, this);
    this._polygon = dict.Polygon.map((pnt) => new Point(pnt, this));
  }

  /**
   * The minimal coordinate-axis-aligned box containing the object
   */
  get boundingBox(): BoundingBox<TParentBlock, TParent> {
    return this._boundingBox;
  }
  /**
   * The (optional) TRP object that this geometry belongs to
   */
  get parentObject(): TParent | null {
    return this._parentObject;
  }
  /**
   * The detailed polygon shape of the object
   *
   * Usually this is still just a 4-point quadrilateral, but can help to indicate the element's
   * actual orientation as used in `.orientationRadians()`
   */
  get polygon(): Point<TParentBlock, TParent>[] {
    return this._polygon.slice();
  }

  /**
   * Get the slope (in radians -pi < x +pi) of the initial segment of the polygon.
   *
   * Because Textract constructs polygons with first two points as T-L and T-R corners, this yields
   * the approximate (since it might not be completely rectangular) orientation of the object.
   */
  orientationRadians(): number | null {
    // (this._polygon must be a valid array, per constructor)
    if (this._polygon.length < 2) return null;
    const point0 = this._polygon[0];
    const point1 = this._polygon[1];
    return Math.atan2(point1.y - point0.y, point1.x - point0.x);
  }

  /**
   * Wrapper over orientationRadians to translate result to degrees (-180 < x < 180).
   */
  orientationDegrees(): number | null {
    const rads = this.orientationRadians();
    if (rads == null) return rads;
    return (rads * 180) / Math.PI;
  }

  /**
   * Create a human-readable representation of this geometry's key characteristics
   */
  str(): string {
    return `BoundingBox: ${this._boundingBox.str()}`;
  }
}

/**
 * Basic interface for objects referencing an Amazon Textract Geometry
 */
export interface IWithGeometry<TParentBlock, TParent extends ApiObjectWrapper<TParentBlock>> {
  /**
   * Geometry of this object on the page
   */
  get geometry(): Geometry<TParentBlock, TParent>;
}
