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

export const enum ApiRelationshipType {
  Child = "CHILD",
  ComplexFeatures = "COMPLEX_FEATURES",
  Value = "VALUE",
}

export interface ApiRelationship {
  Ids: string[];
  Type: ApiRelationshipType;
}

export const enum ApiBlockType {
  Cell = "CELL",
  KeyValueSet = "KEY_VALUE_SET",
  Line = "LINE",
  Page = "PAGE",
  SelectionElement = "SELECTION_ELEMENT",
  Table = "TABLE",
  Word = "WORD",
}

export interface ApiPageBlock {
  BlockType: "PAGE";
  Geometry: ApiGeometry;
  Id: string;
}

export const enum ApiTextType {
  Handwriting = "HANDWRITING",
  Printed = "PRINTED",
}

export interface ApiWordBlock {
  BlockType: ApiBlockType.Word;
  Confidence: number;
  Geometry: ApiGeometry;
  Id: string;
  Text: string;
  TextType: ApiTextType;
}

export interface ApiLineBlock {
  BlockType: ApiBlockType.Line;
  Confidence: number;
  Geometry: ApiGeometry;
  Id: string;
  Relationships: ApiRelationship[];
  Text: string;
}

export const enum ApiKeyValueEntityType {
  Key = "KEY",
  Value = "VALUE",
}

export interface ApiKeyValueSetBlock {
  BlockType: ApiBlockType.KeyValueSet;
  Confidence: number;
  EntityTypes: ApiKeyValueEntityType;
  Geometry: ApiGeometry;
  Id: string;
  Relationships: ApiRelationship[];
}

export interface ApiTableBlock {
  BlockType: ApiBlockType.Table;
  Confidence: number;
  Geometry: ApiGeometry;
  Id: string;
  Relationships: ApiRelationship[];
}

export interface ApiCellBlock {
  BlockType: ApiBlockType.Cell;
  ColumnIndex: number;
  ColumnSpan: number;
  Confidence: number;
  Geometry: ApiGeometry;
  Id: string;
  Relationships: ApiRelationship[];
  RowIndex: number;
  RowSpan: number;
}

export const enum ApiSelectionStatus {
  Selected = "SELECTED",
  NotSelected = "NOT_SELECTED",
}

export interface ApiSelectionElementBlock {
  BlockType: ApiBlockType.SelectionElement;
  Confidence: number;
  Geometry: ApiGeometry;
  Id: string;
  SelectionStatus: ApiSelectionStatus;
}

export type ApiBlock =
  | ApiCellBlock
  | ApiKeyValueSetBlock
  | ApiLineBlock
  | ApiPageBlock
  | ApiSelectionElementBlock
  | ApiTableBlock
  | ApiWordBlock;

export const enum ApiJobStatus {
  Failed = "FAILED",
  InProgress = "IN_PROGRESS",
  PartialSuccess = "PARTIAL_SUCCESS",
  Succeeded = "SUCCEEDED",
}

export interface ApiResponsePage {
  AnalyzeDocumentModelVersion?: string;
  Blocks: ApiBlock[];
  DocumentMetadata: { Pages: number };
  JobStatus?: ApiJobStatus;
  NextToken?: string;
  StatusMessage?: string;
  Warnings?: Array<{ ErrorCode: string; Pages: number[] }>;
}

export class BoundingBox {
  _width: number;
  _height: number;
  _left: number;
  _top: number;

  constructor(width: number, height: number, left: number, top: number) {
    this._width = width;
    this._height = height;
    this._left = left;
    this._top = top;
  }

  str() {
    return `width: ${this._width}, height: ${this._height}, left: ${this._left}, top: ${this._top}`;
  }
  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }
  get left() {
    return this._left;
  }
  get top() {
    return this._top;
  }
}

export class Point {
  _x: number;
  _y: number;

  constructor(x: number, y: number) {
    this._x = x;
    this._y = y;
  }

  str() {
    return `x: ${this._x}, y: ${this._y}`;
  }
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
}

export class Geometry {
  _boundingBox: BoundingBox;
  _polygon: Point[];

  constructor(geometry: ApiGeometry) {
    const boundingBox = geometry.BoundingBox;
    const polygon = geometry.Polygon;
    this._boundingBox = new BoundingBox(
      boundingBox.Width,
      boundingBox.Height,
      boundingBox.Left,
      boundingBox.Top
    );
    this._polygon = polygon.map((pg) => new Point(pg.X, pg.Y));
  }

  str() {
    return `BoundingBox: ${this._boundingBox.str()}`;
  }
  get boundingBox() {
    return this._boundingBox;
  }
  get polygon() {
    return this._polygon;
  }
}

export class Word {
  _block: ApiWordBlock;
  _confidence: number;
  _geometry: Geometry;
  _id: string;
  _text: string;

  constructor(block: ApiWordBlock, blockMap: { [blockId: string]: ApiBlock }) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._text = block.Text || "";
  }

  str() {
    return this._text;
  }
  get confidence() {
    return this._confidence;
  }
  get geometry() {
    return this._geometry;
  }
  get id() {
    return this._id;
  }
  get text() {
    return this._text;
  }
  get block() {
    return this._block;
  }
}

export class Line {
  _block: ApiLineBlock;
  _confidence: number;
  _geometry: Geometry;
  _id: string;
  _text: string;
  _words: Word[];

  constructor(block: ApiLineBlock, blockMap: { [blockId: string]: ApiBlock }) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;

    this._text = block.Text || "";

    this._words = [];
    if (block.Relationships) {
      block.Relationships.forEach((rs) => {
        if (rs.Type == ApiRelationshipType.Child) {
          rs.Ids.forEach((cid) => {
            if (blockMap[cid].BlockType == ApiBlockType.Word)
              this._words.push(new Word(blockMap[cid] as ApiWordBlock, blockMap));
          });
        }
      });
    }
  }

  str() {
    return `Line\n==========\n${this._text}\nWords\n----------\n${this._words
      .map((word) => `[${word.str()}]`)
      .join("")}`;
  }

  get confidence() {
    return this._confidence;
  }
  get geometry() {
    return this._geometry;
  }
  get id() {
    return this._id;
  }
  get words() {
    return this._words;
  }
  get text() {
    return this._text;
  }
  get block() {
    return this._block;
  }
}

export class SelectionElement {
  _confidence: number;
  _geometry: Geometry;
  _id: string;
  _selectionStatus: ApiSelectionStatus;

  constructor(block: ApiSelectionElementBlock, blockMap: { [blockId: string]: ApiBlock }) {
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._selectionStatus = block.SelectionStatus;
  }

  get confidence() {
    return this._confidence;
  }
  get geometry() {
    return this._geometry;
  }
  get id() {
    return this._id;
  }
  get selectionStatus() {
    return this._selectionStatus;
  }
}

export class FieldKey {
  _block: ApiKeyValueSetBlock;
  _confidence: number;
  _geometry: Geometry;
  _id: string;
  _text: string;
  _content: Word[];

  constructor(block: ApiKeyValueSetBlock, children: string[], blockMap: { [blockId: string]: ApiBlock }) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._text = "";
    this._content = [];

    const t: string[] = [];
    children.forEach((eid) => {
      const wb = blockMap[eid];
      if (wb.BlockType == ApiBlockType.Word) {
        const w = new Word(wb, blockMap);
        this._content.push(w);
        t.push(w.text);
      }
    });
    this._text = t.join(" ");
  }

  str() {
    return this._text;
  }
  get confidence() {
    return this._confidence;
  }
  get geometry() {
    return this._geometry;
  }
  get id() {
    return this._id;
  }
  get content() {
    return this._content;
  }
  get text() {
    return this._text;
  }
  get block() {
    return this._block;
  }
}

export class FieldValue {
  _block: ApiKeyValueSetBlock;
  _confidence: number;
  _geometry: Geometry;
  _id: string;
  _text: string;
  _content: Array<Word | SelectionElement>;

  constructor(block: ApiKeyValueSetBlock, children: string[], blockMap: { [blockId: string]: ApiBlock }) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._text = "";
    this._content = [];

    const t: string[] = [];
    children.forEach((eid) => {
      const wb = blockMap[eid];
      if (wb.BlockType == ApiBlockType.Word) {
        const w = new Word(wb, blockMap);
        this._content.push(w);
        t.push(w.text);
      } else if (wb.BlockType == ApiBlockType.SelectionElement) {
        const se = new SelectionElement(wb, blockMap);
        this._content.push(se);
        t.push(se.selectionStatus);
      }
    });
    this._text = t.join(" ");
  }

  str() {
    return this._text;
  }
  get confidence() {
    return this._confidence;
  }
  get geometry() {
    return this._geometry;
  }
  get id() {
    return this._id;
  }
  get content() {
    return this._content;
  }
  get text() {
    return this._text;
  }
  get block() {
    return this._block;
  }
}

export class Field {
  _key: FieldKey | null;
  _value: FieldValue | null;

  constructor(block: ApiKeyValueSetBlock, blockMap: { [blockId: string]: ApiBlock }) {
    this._key = null;
    this._value = null;
    block.Relationships.forEach((item) => {
      if (item.Type == ApiRelationshipType.Child) {
        this._key = new FieldKey(block, item.Ids, blockMap);
      } else if (item.Type == ApiRelationshipType.Value) {
        item.Ids.forEach((eid) => {
          const vkvs = blockMap[eid] as ApiKeyValueSetBlock;
          if (vkvs.EntityTypes.indexOf(ApiKeyValueEntityType.Value) >= 0 && vkvs.Relationships) {
            vkvs.Relationships.forEach((vitem) => {
              this._value = new FieldValue(vkvs, vitem.Ids, blockMap);
            });
          }
        });
      }
    });
  }

  str() {
    return `\nField\n==========\nKey: ${this._key ? this._key.str() : ""}\nValue: ${
      this._value ? this._value.str() : ""
    }`;
  }

  get key() {
    return this._key;
  }
  get value() {
    return this._value;
  }
}

export class Form {
  _fields: Field[];
  _fieldsMap: { [keyText: string]: Field };

  constructor() {
    this._fields = [];
    this._fieldsMap = {};
  }

  addField(field: Field) {
    this._fields.push(field);
    if (field.key) this._fieldsMap[field.key.text] = field;
  }

  str() {
    return this._fields.map((f) => f.str()).join("\n");
  }

  get fields() {
    return this._fields;
  }

  getFieldByKey(key: string) {
    return this._fieldsMap[key] || null;
  }

  searchFieldsByKey(key: string) {
    const searchKey = key.toLowerCase();
    return this._fields.filter((field) => field.key && field.key.text.toLowerCase().indexOf(searchKey) >= 0);
  }
}

export class Cell {
  _block: ApiCellBlock;
  _confidence: number;
  _rowIndex: number;
  _columnIndex: number;
  _rowSpan: number;
  _columnSpan: number;
  _geometry: Geometry;
  _id: string;
  _content: Array<Word | SelectionElement>;
  _text: string;

  constructor(block: ApiCellBlock, blockMap: { [blockId: string]: ApiBlock }) {
    this._block = block;
    this._confidence = block.Confidence;
    this._rowIndex = block.RowIndex;
    this._columnIndex = block.ColumnIndex;
    this._rowSpan = block.RowSpan;
    this._columnSpan = block.ColumnSpan;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._content = [];
    this._text = "";
    if (block.Relationships) {
      block.Relationships.forEach((rs) => {
        if (rs.Type == ApiRelationshipType.Child) {
          rs.Ids.forEach((cid) => {
            const blockType = blockMap[cid].BlockType;
            if (blockType == ApiBlockType.Word) {
              const w = new Word(blockMap[cid] as ApiWordBlock, blockMap);
              this._content.push(w);
              this._text += w.text + " ";
            } else if (blockType == ApiBlockType.SelectionElement) {
              const se = new SelectionElement(blockMap[cid] as ApiSelectionElementBlock, blockMap);
              this._content.push(se);
              this._text += se.selectionStatus + ", ";
            }
          });
        }
      });
    }
  }

  str() {
    return this._text;
  }
  get confidence() {
    return this._confidence;
  }
  get rowIndex() {
    return this._rowIndex;
  }
  get columnIndex() {
    return this._columnIndex;
  }
  get rowSpan() {
    return this._rowSpan;
  }
  get columnSpan() {
    return this._columnSpan;
  }
  get geometry() {
    return this._geometry;
  }
  get id() {
    return this._id;
  }
  get content() {
    return this._content;
  }
  get text() {
    return this._text;
  }
  get block() {
    return this._block;
  }
}

export class Row {
  _cells: Cell[];

  constructor() {
    this._cells = [];
  }

  str() {
    return this._cells.map((cell) => `[${cell.str()}]`).join("");
  }
  get cells() {
    return this._cells;
  }
}

export class Table {
  _block: ApiTableBlock;
  _confidence: number;
  _geometry: Geometry;
  _id: string;
  _rows: Row[];

  constructor(block: ApiTableBlock, blockMap: { [blockId: string]: ApiBlock }) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._rows = [];
    let ri = 1;
    let row = new Row();
    let cell = null;
    if (block.Relationships) {
      block.Relationships.forEach((rs) => {
        if (rs.Type == ApiRelationshipType.Child) {
          rs.Ids.forEach((cid) => {
            cell = new Cell(blockMap[cid] as ApiCellBlock, blockMap);
            if (cell.rowIndex > ri) {
              this._rows.push(row);
              row = new Row();
              ri = cell.rowIndex;
            }
            row.cells.push(cell);
          });
          if (row && row.cells) this._rows.push(row);
        }
      });
    }
  }

  str() {
    return "Table\n==========\n" + this._rows.map((row) => `Row\n==========\n${row.str()}`).join("\n");
  }

  get confidence() {
    return this._confidence;
  }
  get geometry() {
    return this._geometry;
  }
  get id() {
    return this._id;
  }
  get rows() {
    return this._rows;
  }
  get block() {
    return this._block;
  }
}

export class Page {
  _blocks: ApiBlock[];
  _text: string;
  _lines: Line[];
  _form: Form;
  _tables: Table[];
  _content: Array<Line | Table | Field>;
  _geometry: Geometry;

  constructor(pageBlock: ApiPageBlock, blocks: ApiBlock[], blockMap: { [blockId: string]: ApiBlock }) {
    this._blocks = blocks;
    this._text = "";
    this._lines = [];
    this._form = new Form();
    this._geometry = new Geometry(pageBlock.Geometry);
    this._tables = [];
    this._content = [];
    this._parse(blockMap);
  }

  str() {
    return `Page\n==========\n${this._content.join("\n")}\n`;
  }

  _parse(blockMap: { [blockId: string]: ApiBlock }) {
    this._blocks.forEach((item) => {
      if (item.BlockType == ApiBlockType.Line) {
        const l = new Line(item, blockMap);
        this._lines.push(l);
        this._content.push(l);
        this._text += `${l.text}\n`;
      } else if (item.BlockType == ApiBlockType.Table) {
        const t = new Table(item, blockMap);
        this._tables.push(t);
        this._content.push(t);
      } else if (item.BlockType == ApiBlockType.KeyValueSet) {
        if (item.EntityTypes.indexOf(ApiKeyValueEntityType.Key) >= 0) {
          const f = new Field(item, blockMap);
          if (f.key) {
            this._form.addField(f);
            this._content.push(f);
          } else {
            console.warn(
              "WARNING: Detected K/V where key does not have content. Excluding key from output.",
              f,
              item
            );
          }
        }
      }
    });
  }

  getLinesInReadingOrder() {
    const columns: Array<{ left: number; right: number }> = [];
    const lines: Array<[number, string]> = [];
    this._lines.forEach((line) => {
      let columnFound = false;
      for (let index = 0; index < columns.length; ++index) {
        const column = columns[index];
        const bboxLeft = line.geometry.boundingBox.left;
        const bboxRight = line.geometry.boundingBox.left + line.geometry.boundingBox.width;
        const bboxCentre = line.geometry.boundingBox.left + line.geometry.boundingBox.width / 2;
        const columnCentre = column.left + column.right / 2; // TODO: Isn't this an error?
        if (
          (bboxCentre > column.left && bboxCentre < column.right) ||
          (columnCentre > bboxLeft && columnCentre < bboxRight)
        ) {
          // Bbox appears inside the column
          lines.push([index, line.text]);
          columnFound = true;
          break;
        }
      }
      if (!columnFound) {
        columns.push({
          left: line.geometry.boundingBox.left,
          right: line.geometry.boundingBox.left + line.geometry.boundingBox.width,
        });
        lines.push([columns.length - 1, line.text]);
      }
    });

    return lines.sort((a, b) => Number(a[0] < b[0]));
  }

  getTextInReadingOrder() {
    return this.getLinesInReadingOrder()
      .map((l) => l[1])
      .join("\n");
  }

  get blocks() {
    return this._blocks;
  }
  get text() {
    return this._text;
  }
  get lines() {
    return this._lines;
  }
  get form() {
    return this._form;
  }
  get tables() {
    return this._tables;
  }
  get content() {
    return this._content;
  }
  get geometry() {
    return this._geometry;
  }
  //get id() { return this._id; }
}

export class TextractDocument {
  _blockMap: { [blockId: string]: ApiBlock };
  _pages: Page[];
  _responseDocumentPages: Array<{ PageBlock: ApiPageBlock; Blocks: ApiBlock[] }>;
  _responsePages: ApiResponsePage[];

  constructor(responsePages: ApiResponsePage | ApiResponsePage[]) {
    if (!Array.isArray(responsePages)) responsePages = [responsePages];

    this._blockMap = {};
    this._responseDocumentPages = [];
    this._responsePages = responsePages;
    this._pages = [];
    this._parse();
  }

  str() {
    return `\nDocument\n==========\n${this._pages.map((p) => p.str()).join("\n\n")}\n\n`;
  }

  _parseDocumentPagesAndBlockMap() {
    const blockMap: { [blockId: string]: ApiBlock } = {};

    const documentPages: Array<{ PageBlock: ApiPageBlock; Blocks: ApiBlock[] }> = [];
    let currentPageBlock: ApiPageBlock | null = null;
    let currentPageContent: ApiBlock[] = [];
    this._responsePages.forEach((resp) => {
      resp.Blocks.forEach((block) => {
        if (block.BlockType && block.Id) {
          blockMap[block.Id] = block;
        }
        if (block.BlockType == ApiBlockType.Page) {
          if (currentPageBlock) {
            documentPages.push({
              PageBlock: currentPageBlock,
              Blocks: currentPageContent,
            });
          }
          currentPageBlock = block;
          currentPageContent = [block];
        } else {
          currentPageContent.push(block);
        }
      });
    });
    if (currentPageBlock) {
      documentPages.push({
        PageBlock: currentPageBlock,
        Blocks: currentPageContent,
      });
    }
    return { documentPages, blockMap };
  }

  _parse() {
    const { documentPages, blockMap } = this._parseDocumentPagesAndBlockMap();
    this._responseDocumentPages = documentPages;
    this._blockMap = blockMap;
    documentPages.forEach((documentPage) => {
      this._pages.push(new Page(documentPage.PageBlock, documentPage.Blocks, this._blockMap));
    });
  }

  get blocks() {
    return this._responsePages;
  }
  get pageBlocks() {
    return this._responseDocumentPages;
  }
  get pages() {
    return this._pages;
  }

  getBlockById(blockId: string) {
    return this._blockMap && this._blockMap[blockId];
  }
}
