import { ApiBlockType } from "../../src/api-models/base";
import { ApiTextType, ApiWordBlock } from "../../src/api-models/content";
import { ApiObjectWrapper } from "../../src/base";
import { Geometry, Point } from "../../src/geometry";

// Precision limit for testing calculations
const EPSILON = 1e-15;

const EXAMPLE_WORD_BLOCK: ApiWordBlock = {
  BlockType: "WORD" as ApiBlockType.Word,
  Confidence: 99.9,
  Geometry: {
    BoundingBox: {
      Height: 0.055,
      Left: 0.297,
      Top: 0.04,
      Width: 0.177,
    },
    Polygon: [
      {
        X: 0.297,
        Y: 0.04,
      },
      {
        X: 0.474,
        Y: 0.04,
      },
      {
        X: 0.474,
        Y: 0.095,
      },
      {
        X: 0.297,
        Y: 0.095,
      },
    ],
  },
  Id: "8026a7ef-b929-4154-b805-1d21411b4863",
  Text: "Employment",
  TextType: "PRINTED" as ApiTextType,
};

describe("BoundingBox", () => {
  it("maintains a read-only reference to parent geometry", () => {
    const host = new ApiObjectWrapper(EXAMPLE_WORD_BLOCK);
    const geometry = new Geometry(EXAMPLE_WORD_BLOCK.Geometry, host);
    const box = geometry.boundingBox;
    expect(box.parentGeometry).toBe(geometry);
    expect(() => {
      (box as { parentGeometry: unknown }).parentGeometry = 10;
    }).toThrow();
  });

  it("exposes read-only raw properties", () => {
    const host = new ApiObjectWrapper(EXAMPLE_WORD_BLOCK);
    const geometry = new Geometry(EXAMPLE_WORD_BLOCK.Geometry, host);
    const box = geometry.boundingBox;
    expect(box.height).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Height);
    expect(() => {
      (box as { height: number }).height = 10;
    }).toThrow();
    expect(box.left).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Left);
    expect(() => {
      (box as { left: number }).left = 10;
    }).toThrow();
    expect(box.top).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Top);
    expect(() => {
      (box as { top: number }).top = 10;
    }).toThrow();
    expect(box.width).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Width);
    expect(() => {
      (box as { width: number }).width = 10;
    }).toThrow();
  });

  it("stringifies including raw properties", () => {
    const host = new ApiObjectWrapper(EXAMPLE_WORD_BLOCK);
    const geometry = new Geometry(EXAMPLE_WORD_BLOCK.Geometry, host);
    const box = geometry.boundingBox;
    expect(box.str()).toMatch(/width: [.\d]+, height: [.\d]+, left: [.\d]+, top: [.\d]+/);
  });

  it("exposes read-only computed properties", () => {
    const host = new ApiObjectWrapper(EXAMPLE_WORD_BLOCK);
    const geometry = new Geometry(EXAMPLE_WORD_BLOCK.Geometry, host);
    const box = geometry.boundingBox;
    expect(box.bottom).toStrictEqual(box.top + box.height);
    expect(() => {
      (box as { bottom: number }).bottom = 10;
    }).toThrow();
    expect(box.hCenter).toStrictEqual(box.left + box.width / 2);
    expect(() => {
      (box as { hCenter: number }).hCenter = 10;
    }).toThrow();
    expect(box.right).toStrictEqual(box.left + box.width);
    expect(() => {
      (box as { right: number }).right = 10;
    }).toThrow();
    expect(box.vCenter).toStrictEqual(box.top + box.height / 2);
    expect(() => {
      (box as { vCenter: number }).vCenter = 10;
    }).toThrow();
  });

  it("dynamically tracks updates to the underlying response object", () => {
    const blockCopy: ApiWordBlock = JSON.parse(JSON.stringify(EXAMPLE_WORD_BLOCK));
    const host = new ApiObjectWrapper(blockCopy);
    const geometry = new Geometry(blockCopy.Geometry, host);
    const box = geometry.boundingBox;
    expect(box.height).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Height);
    expect(box.left).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Left);
    expect(box.top).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Top);
    expect(box.width).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Width);
    expect(box.height).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Height);
    expect(box.left).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.BoundingBox.Left);
    const oldArea = box.height * box.width;
    // Edit dimensions in-place on underlying response object:
    blockCopy.Geometry.BoundingBox.Height *= 10;
    blockCopy.Geometry.BoundingBox.Top *= 10;
    blockCopy.Geometry.BoundingBox.Left *= 20;
    blockCopy.Geometry.BoundingBox.Width *= 20;
    // Check BoundingBox reads new values:
    expect(box.height).toStrictEqual(blockCopy.Geometry.BoundingBox.Height);
    expect(box.left).toStrictEqual(blockCopy.Geometry.BoundingBox.Left);
    expect(box.top).toStrictEqual(blockCopy.Geometry.BoundingBox.Top);
    expect(box.width).toStrictEqual(blockCopy.Geometry.BoundingBox.Width);
    expect(box.height).toStrictEqual(blockCopy.Geometry.BoundingBox.Height);
    expect(box.left).toStrictEqual(blockCopy.Geometry.BoundingBox.Left);
    expect(box.bottom).toStrictEqual(box.top + box.height);
    expect(box.hCenter).toStrictEqual(box.left + box.width / 2);
    expect(box.right).toStrictEqual(box.left + box.width);
    expect(box.vCenter).toStrictEqual(box.top + box.height / 2);
    expect(box.top).toStrictEqual(blockCopy.Geometry.BoundingBox.Top);
    expect(box.width).toStrictEqual(blockCopy.Geometry.BoundingBox.Width);
    expect(Math.abs(box.height * box.width - oldArea * 10 * 20)).toBeLessThan(EPSILON);
  });
});

describe("Point (in polygon)", () => {
  it("maintains a read-only reference to parent geometry", () => {
    const host = new ApiObjectWrapper(EXAMPLE_WORD_BLOCK);
    const geometry = new Geometry(EXAMPLE_WORD_BLOCK.Geometry, host);
    const poly = geometry.polygon;
    poly.forEach((point) => {
      expect(point.parentGeometry).toBe(geometry);
      expect(() => {
        (point as { parentGeometry: unknown }).parentGeometry = 10;
      }).toThrow();
    });
  });

  it("exposes read-only raw properties", () => {
    const host = new ApiObjectWrapper(EXAMPLE_WORD_BLOCK);
    const geometry = new Geometry(EXAMPLE_WORD_BLOCK.Geometry, host);
    const poly = geometry.polygon;
    expect(poly.length).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.Polygon.length);
    poly.forEach((point, ixPoint) => {
      expect(point.x).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.Polygon[ixPoint].X);
      expect(() => {
        (point as { x: number }).x = 10;
      }).toThrow();
      expect(point.y).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.Polygon[ixPoint].Y);
      expect(() => {
        (point as { y: number }).y = 10;
      }).toThrow();
    });
  });

  it("stringifies including raw properties", () => {
    const host = new ApiObjectWrapper(EXAMPLE_WORD_BLOCK);
    const geometry = new Geometry(EXAMPLE_WORD_BLOCK.Geometry, host);
    const poly = geometry.polygon;
    poly.forEach((point) => {
      expect(point.str()).toMatch(/x: [.\d]+, y: [.\d]+/);
    });
  });

  it("dynamically tracks updates to the underlying response object", () => {
    const blockCopy: ApiWordBlock = JSON.parse(JSON.stringify(EXAMPLE_WORD_BLOCK));
    const host = new ApiObjectWrapper(blockCopy);
    const geometry = new Geometry(blockCopy.Geometry, host);
    const poly = geometry.polygon;
    expect(poly[0].x).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.Polygon[0].X);
    expect(poly[0].y).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.Polygon[0].Y);
    blockCopy.Geometry.Polygon[0].X *= 2;
    blockCopy.Geometry.Polygon[0].Y *= 4;
    expect(poly[0].x).toStrictEqual(blockCopy.Geometry.Polygon[0].X);
    expect(poly[0].y).toStrictEqual(blockCopy.Geometry.Polygon[0].Y);
    expect(poly[0].x).not.toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.Polygon[0].X);
    expect(poly[0].y).not.toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.Polygon[0].Y);
  });

  it("can be instantiated without a parent geometry", () => {
    const point = new Point(EXAMPLE_WORD_BLOCK.Geometry.Polygon[0]);
    expect(point.x).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.Polygon[0].X);
    expect(point.y).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.Polygon[0].Y);
  });
});

describe("Geometry", () => {
  it("maintains a read-only reference to parent object", () => {
    const host = new ApiObjectWrapper(EXAMPLE_WORD_BLOCK);
    const geometry = new Geometry(EXAMPLE_WORD_BLOCK.Geometry, host);
    expect(geometry.parentObject).toBe(host);
    expect(() => {
      (geometry as { parentObject: unknown }).parentObject = 10;
    }).toThrow();
  });

  it("exposes raw BoundingBox properties", () => {
    const host = new ApiObjectWrapper(EXAMPLE_WORD_BLOCK);
    const geometry = new Geometry(EXAMPLE_WORD_BLOCK.Geometry, host);
    expect(geometry.polygon.length).toStrictEqual(EXAMPLE_WORD_BLOCK.Geometry.Polygon.length);
    EXAMPLE_WORD_BLOCK.Geometry.Polygon.forEach((point, ixPoint) => {
      expect(point.X).toStrictEqual(geometry.polygon[ixPoint].x);
      expect(point.Y).toStrictEqual(geometry.polygon[ixPoint].y);
    });
  });

  it("stringifies with reference to bounding box", () => {
    const host = new ApiObjectWrapper(EXAMPLE_WORD_BLOCK);
    const geometry = new Geometry(EXAMPLE_WORD_BLOCK.Geometry, host);
    expect(geometry.str()).toMatch(/^BoundingBox: /);
  });

  it("returns null orientation if polygon has <2 points", () => {
    const blockCopy = JSON.parse(JSON.stringify(EXAMPLE_WORD_BLOCK)) as ApiWordBlock;

    blockCopy.Geometry.Polygon = [blockCopy.Geometry.Polygon[0]];
    let host = new ApiObjectWrapper(blockCopy);
    let geometry = new Geometry(blockCopy.Geometry, host);
    expect(geometry.orientationDegrees()).toBeNull();
    expect(geometry.orientationRadians()).toBeNull();
  });
});
