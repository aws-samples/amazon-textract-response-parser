// Local Dependencies:
import * as textract from "./api-models";

export type ApiResponsePage = textract.ApiResponsePage;

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

  str(): string {
    return `width: ${this._width}, height: ${this._height}, left: ${this._left}, top: ${this._top}`;
  }
  get width(): number {
    return this._width;
  }
  get height(): number {
    return this._height;
  }
  get left(): number {
    return this._left;
  }
  get top(): number {
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

  str(): string {
    return `x: ${this._x}, y: ${this._y}`;
  }
  get x(): number {
    return this._x;
  }
  get y(): number {
    return this._y;
  }
}

export class Geometry {
  _boundingBox: BoundingBox;
  _polygon: Point[];

  constructor(geometry: textract.ApiGeometry) {
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

  str(): string {
    return `BoundingBox: ${this._boundingBox.str()}`;
  }
  get boundingBox(): BoundingBox {
    return this._boundingBox;
  }
  get polygon(): Point[] {
    return this._polygon;
  }
}

export class Word {
  _block: textract.ApiWordBlock;
  _confidence: number;
  _geometry: Geometry;
  _id: string;
  _text: string;

  constructor(block: textract.ApiWordBlock) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._text = block.Text || "";
  }

  str(): string {
    return this._text;
  }
  get confidence(): number {
    return this._confidence;
  }
  get geometry(): Geometry {
    return this._geometry;
  }
  get id(): string {
    return this._id;
  }
  get text(): string {
    return this._text;
  }
  get block(): textract.ApiWordBlock {
    return this._block;
  }
}

export class Line {
  _block: textract.ApiLineBlock;
  _confidence: number;
  _geometry: Geometry;
  _id: string;
  _text: string;
  _words: Word[];

  constructor(block: textract.ApiLineBlock, blockMap: { [blockId: string]: textract.ApiBlock }) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;

    this._text = block.Text || "";

    this._words = [];
    if (block.Relationships) {
      block.Relationships.forEach((rs) => {
        if (rs.Type == textract.ApiRelationshipType.Child) {
          rs.Ids.forEach((cid) => {
            if (blockMap[cid].BlockType == textract.ApiBlockType.Word)
              this._words.push(new Word(blockMap[cid] as textract.ApiWordBlock));
          });
        }
      });
    }
  }

  str(): string {
    return `Line\n==========\n${this._text}\nWords\n----------\n${this._words
      .map((word) => `[${word.str()}]`)
      .join("")}`;
  }

  get confidence(): number {
    return this._confidence;
  }
  get geometry(): Geometry {
    return this._geometry;
  }
  get id(): string {
    return this._id;
  }
  get words(): Word[] {
    return this._words;
  }
  get text(): string {
    return this._text;
  }
  get block(): textract.ApiLineBlock {
    return this._block;
  }
}

export class SelectionElement {
  _confidence: number;
  _geometry: Geometry;
  _id: string;
  _selectionStatus: textract.ApiSelectionStatus;

  constructor(block: textract.ApiSelectionElementBlock) {
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._selectionStatus = block.SelectionStatus;
  }

  get confidence(): number {
    return this._confidence;
  }
  get geometry(): Geometry {
    return this._geometry;
  }
  get id(): string {
    return this._id;
  }
  get selectionStatus(): textract.ApiSelectionStatus {
    return this._selectionStatus;
  }
}

export class FieldKey {
  _block: textract.ApiKeyValueSetBlock;
  _confidence: number;
  _geometry: Geometry;
  _id: string;
  _text: string;
  _content: Word[];

  constructor(
    block: textract.ApiKeyValueSetBlock,
    children: string[],
    blockMap: { [blockId: string]: textract.ApiBlock }
  ) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._text = "";
    this._content = [];

    const t: string[] = [];
    children.forEach((eid) => {
      const wb = blockMap[eid];
      if (wb.BlockType == textract.ApiBlockType.Word) {
        const w = new Word(wb);
        this._content.push(w);
        t.push(w.text);
      }
    });
    this._text = t.join(" ");
  }

  str(): string {
    return this._text;
  }
  get confidence(): number {
    return this._confidence;
  }
  get geometry(): Geometry {
    return this._geometry;
  }
  get id(): string {
    return this._id;
  }
  get content(): Word[] {
    return this._content;
  }
  get text(): string {
    return this._text;
  }
  get block(): textract.ApiKeyValueSetBlock {
    return this._block;
  }
}

export class FieldValue {
  _block: textract.ApiKeyValueSetBlock;
  _confidence: number;
  _geometry: Geometry;
  _id: string;
  _text: string;
  _content: Array<SelectionElement | Word>;

  constructor(
    block: textract.ApiKeyValueSetBlock,
    children: string[],
    blockMap: { [blockId: string]: textract.ApiBlock }
  ) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._text = "";
    this._content = [];

    const t: string[] = [];
    children.forEach((eid) => {
      const wb = blockMap[eid];
      if (wb.BlockType == textract.ApiBlockType.Word) {
        const w = new Word(wb);
        this._content.push(w);
        t.push(w.text);
      } else if (wb.BlockType == textract.ApiBlockType.SelectionElement) {
        const se = new SelectionElement(wb);
        this._content.push(se);
        t.push(se.selectionStatus);
      }
    });
    this._text = t.join(" ");
  }

  str(): string {
    return this._text;
  }
  get confidence(): number {
    return this._confidence;
  }
  get geometry(): Geometry {
    return this._geometry;
  }
  get id(): string {
    return this._id;
  }
  get content(): Array<SelectionElement | Word> {
    return this._content;
  }
  get text(): string {
    return this._text;
  }
  get block(): textract.ApiKeyValueSetBlock {
    return this._block;
  }
}

export class Field {
  _key: FieldKey | null;
  _value: FieldValue | null;

  constructor(block: textract.ApiKeyValueSetBlock, blockMap: { [blockId: string]: textract.ApiBlock }) {
    this._key = null;
    this._value = null;
    block.Relationships.forEach((item) => {
      if (item.Type == textract.ApiRelationshipType.Child) {
        this._key = new FieldKey(block, item.Ids, blockMap);
      } else if (item.Type == textract.ApiRelationshipType.Value) {
        item.Ids.forEach((eid) => {
          const vkvs = blockMap[eid] as textract.ApiKeyValueSetBlock;
          if (vkvs.EntityTypes.indexOf(textract.ApiKeyValueEntityType.Value) >= 0 && vkvs.Relationships) {
            vkvs.Relationships.forEach((vitem) => {
              this._value = new FieldValue(vkvs, vitem.Ids, blockMap);
            });
          }
        });
      }
    });
  }

  str(): string {
    return `\nField\n==========\nKey: ${this._key ? this._key.str() : ""}\nValue: ${
      this._value ? this._value.str() : ""
    }`;
  }

  get key(): FieldKey | null {
    return this._key;
  }
  get value(): FieldValue | null {
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

  addField(field: Field): void {
    this._fields.push(field);
    if (field.key) this._fieldsMap[field.key.text] = field;
  }

  str(): string {
    return this._fields.map((f) => f.str()).join("\n");
  }

  get fields(): Field[] {
    return this._fields;
  }

  getFieldByKey(key: string): Field | null {
    return this._fieldsMap[key] || null;
  }

  searchFieldsByKey(key: string): Field[] {
    const searchKey = key.toLowerCase();
    return this._fields.filter((field) => field.key && field.key.text.toLowerCase().indexOf(searchKey) >= 0);
  }
}

export class Cell {
  _block: textract.ApiCellBlock;
  _confidence: number;
  _rowIndex: number;
  _columnIndex: number;
  _rowSpan: number;
  _columnSpan: number;
  _geometry: Geometry;
  _id: string;
  _content: Array<SelectionElement | Word>;
  _text: string;

  constructor(block: textract.ApiCellBlock, blockMap: { [blockId: string]: textract.ApiBlock }) {
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
        if (rs.Type == textract.ApiRelationshipType.Child) {
          rs.Ids.forEach((cid) => {
            const blockType = blockMap[cid].BlockType;
            if (blockType == textract.ApiBlockType.Word) {
              const w = new Word(blockMap[cid] as textract.ApiWordBlock);
              this._content.push(w);
              this._text += w.text + " ";
            } else if (blockType == textract.ApiBlockType.SelectionElement) {
              const se = new SelectionElement(blockMap[cid] as textract.ApiSelectionElementBlock);
              this._content.push(se);
              this._text += se.selectionStatus + ", ";
            }
          });
        }
      });
    }
  }

  str(): string {
    return this._text;
  }
  get confidence(): number {
    return this._confidence;
  }
  get rowIndex(): number {
    return this._rowIndex;
  }
  get columnIndex(): number {
    return this._columnIndex;
  }
  get rowSpan(): number {
    return this._rowSpan;
  }
  get columnSpan(): number {
    return this._columnSpan;
  }
  get geometry(): Geometry {
    return this._geometry;
  }
  get id(): string {
    return this._id;
  }
  get content(): Array<SelectionElement | Word> {
    return this._content;
  }
  get text(): string {
    return this._text;
  }
  get block(): textract.ApiCellBlock {
    return this._block;
  }
}

export class Row {
  _cells: Cell[];

  constructor() {
    this._cells = [];
  }

  str(): string {
    return this._cells.map((cell) => `[${cell.str()}]`).join("");
  }
  get cells(): Cell[] {
    return this._cells;
  }
}

export class Table {
  _block: textract.ApiTableBlock;
  _confidence: number;
  _geometry: Geometry;
  _id: string;
  _rows: Row[];

  constructor(block: textract.ApiTableBlock, blockMap: { [blockId: string]: textract.ApiBlock }) {
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
        if (rs.Type == textract.ApiRelationshipType.Child) {
          rs.Ids.forEach((cid) => {
            cell = new Cell(blockMap[cid] as textract.ApiCellBlock, blockMap);
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

  str(): string {
    return "Table\n==========\n" + this._rows.map((row) => `Row\n==========\n${row.str()}`).join("\n");
  }

  get confidence(): number {
    return this._confidence;
  }
  get geometry(): Geometry {
    return this._geometry;
  }
  get id(): string {
    return this._id;
  }
  get rows(): Row[] {
    return this._rows;
  }
  get block(): textract.ApiTableBlock {
    return this._block;
  }
}

export class Page {
  _blocks: textract.ApiBlock[];
  _text: string;
  _lines: Line[];
  _form: Form;
  _tables: Table[];
  _content: Array<Line | Table | Field>;
  _geometry: Geometry;

  constructor(
    pageBlock: textract.ApiPageBlock,
    blocks: textract.ApiBlock[],
    blockMap: { [blockId: string]: textract.ApiBlock }
  ) {
    this._blocks = blocks;
    this._text = "";
    this._lines = [];
    this._form = new Form();
    this._geometry = new Geometry(pageBlock.Geometry);
    this._tables = [];
    this._content = [];
    this._parse(blockMap);
  }

  str(): string {
    return `Page\n==========\n${this._content.join("\n")}\n`;
  }

  _parse(blockMap: { [blockId: string]: textract.ApiBlock }): void {
    this._blocks.forEach((item) => {
      if (item.BlockType == textract.ApiBlockType.Line) {
        const l = new Line(item, blockMap);
        this._lines.push(l);
        this._content.push(l);
        this._text += `${l.text}\n`;
      } else if (item.BlockType == textract.ApiBlockType.Table) {
        const t = new Table(item, blockMap);
        this._tables.push(t);
        this._content.push(t);
      } else if (item.BlockType == textract.ApiBlockType.KeyValueSet) {
        if (item.EntityTypes.indexOf(textract.ApiKeyValueEntityType.Key) >= 0) {
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

  getLinesInReadingOrder(): Array<[number, string]> {
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

  getTextInReadingOrder(): string {
    return this.getLinesInReadingOrder()
      .map((l) => l[1])
      .join("\n");
  }

  get blocks(): textract.ApiBlock[] {
    return this._blocks;
  }
  get text(): string {
    return this._text;
  }
  get lines(): Line[] {
    return this._lines;
  }
  get form(): Form {
    return this._form;
  }
  get tables(): Table[] {
    return this._tables;
  }
  get content(): Array<Field | Line | Table> {
    return this._content;
  }
  get geometry(): Geometry {
    return this._geometry;
  }
  //get id() { return this._id; }
}

export class TextractDocument {
  _blockMap: { [blockId: string]: textract.ApiBlock };
  _pages: Page[];
  _responseDocumentPages: Array<{ PageBlock: textract.ApiPageBlock; Blocks: textract.ApiBlock[] }>;
  _responsePages: textract.ApiResponsePage[];

  constructor(responsePages: textract.ApiResponsePage | textract.ApiResponsePage[]) {
    if (!Array.isArray(responsePages)) responsePages = [responsePages];

    this._blockMap = {};
    this._responseDocumentPages = [];
    this._responsePages = responsePages;
    this._pages = [];
    this._parse();
  }

  str(): string {
    return `\nDocument\n==========\n${this._pages.map((p) => p.str()).join("\n\n")}\n\n`;
  }

  _parseDocumentPagesAndBlockMap() {
    const blockMap: { [blockId: string]: textract.ApiBlock } = {};

    const documentPages: Array<{ PageBlock: textract.ApiPageBlock; Blocks: textract.ApiBlock[] }> = [];
    let currentPageBlock: textract.ApiPageBlock | null = null;
    let currentPageContent: textract.ApiBlock[] = [];
    this._responsePages.forEach((resp, ixResp) => {
      if ("JobStatus" in resp) {
        const statusUpper = (resp.JobStatus || "").toLocaleUpperCase();
        if (statusUpper.indexOf("FAIL") >= 0) {
          throw new Error(`Textract response ${ixResp} has failed status '${resp.JobStatus}'`);
        } else if (statusUpper.indexOf("PROGRESS") >= 0) {
          throw new Error(`Textract response ${ixResp} is not yet completed with status '${resp.JobStatus}'`);
        }
      }
      if (!("Blocks" in resp)) {
        console.warn(`Skipping Textract response ${ixResp} which has no content (status ${resp.JobStatus})`);
        return;
      }
      (resp.Blocks || []).forEach((block) => {
        if (block.BlockType && block.Id) {
          blockMap[block.Id] = block;
        }
        if (block.BlockType == textract.ApiBlockType.Page) {
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

  _parse(): void {
    const { documentPages, blockMap } = this._parseDocumentPagesAndBlockMap();
    this._responseDocumentPages = documentPages;
    this._blockMap = blockMap;
    documentPages.forEach((documentPage) => {
      this._pages.push(new Page(documentPage.PageBlock, documentPage.Blocks, this._blockMap));
    });
  }

  get blocks(): textract.ApiResponsePage[] {
    return this._responsePages;
  }
  get pageBlocks(): Array<{ PageBlock: textract.ApiPageBlock; Blocks: textract.ApiBlock[] }> {
    return this._responseDocumentPages;
  }
  get pages(): Page[] {
    return this._pages;
  }

  getBlockById(blockId: string): textract.ApiBlock | undefined {
    return this._blockMap && this._blockMap[blockId];
  }
}
