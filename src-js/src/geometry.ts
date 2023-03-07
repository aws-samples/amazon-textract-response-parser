// Local Dependencies:
import { ApiBoundingBox, ApiGeometry, ApiPoint } from "./api-models/geometry";
import { ApiObjectWrapper } from "./base";

export class BoundingBox<
  TParentBlock,
  TParent extends ApiObjectWrapper<TParentBlock>
> extends ApiObjectWrapper<ApiBoundingBox> {
  _parentGeometry: Geometry<TParentBlock, TParent> | null;

  constructor(dict: ApiBoundingBox, parentGeometry: Geometry<TParentBlock, TParent> | null = null) {
    super(dict);
    this._parentGeometry = parentGeometry;
  }

  get bottom(): number {
    return this.top + this.height;
  }
  get hCenter(): number {
    return this.left + this.width / 2;
  }
  get height(): number {
    return this._dict.Height;
  }
  get left(): number {
    return this._dict.Left;
  }
  get parentGeometry(): Geometry<TParentBlock, TParent> | null {
    return this._parentGeometry;
  }
  get top(): number {
    return this._dict.Top;
  }
  get right(): number {
    return this.left + this.width;
  }
  get vCenter(): number {
    return this.top + this.height / 2;
  }
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
      null
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
        null
      );
    } else {
      return null;
    }
  }

  str(): string {
    return `width: ${this._dict.Width}, height: ${this._dict.Height}, left: ${this._dict.Left}, top: ${this._dict.Top}`;
  }
}

export class Point<
  TParentBlock,
  TParent extends ApiObjectWrapper<TParentBlock>
> extends ApiObjectWrapper<ApiPoint> {
  _parentGeometry: Geometry<TParentBlock, TParent> | null;

  constructor(dict: ApiPoint, parentGeometry: Geometry<TParentBlock, TParent> | null = null) {
    super(dict);
    this._parentGeometry = parentGeometry;
  }

  get parentGeometry(): Geometry<TParentBlock, TParent> | null {
    return this._parentGeometry;
  }
  get x(): number {
    return this._dict.X;
  }
  get y(): number {
    return this._dict.Y;
  }

  str(): string {
    return `x: ${this._dict.X}, y: ${this._dict.Y}`;
  }
}

export class Geometry<
  TParentBlock,
  TParent extends ApiObjectWrapper<TParentBlock>
> extends ApiObjectWrapper<ApiGeometry> {
  _boundingBox: BoundingBox<TParentBlock, TParent>;
  _parentObject: TParent | null;
  _polygon: Point<TParentBlock, TParent>[];

  constructor(dict: ApiGeometry, parentObject: TParent | null) {
    super(dict);
    this._parentObject = parentObject;
    this._boundingBox = new BoundingBox(dict?.BoundingBox, this);
    this._polygon = dict?.Polygon.map((pnt) => new Point(pnt, this));
  }

  get boundingBox(): BoundingBox<TParentBlock, TParent> {
    return this._boundingBox;
  }
  get parentObject(): TParent | null {
    return this._parentObject;
  }
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
    if (!this._polygon || this._polygon.length < 2) return null;
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

  str(): string {
    return `BoundingBox: ${this._boundingBox.str()}`;
  }
}
