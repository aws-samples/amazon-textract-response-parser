class BoundingBox {
  constructor(width, height, left, top) {
    this._width = width;
    this._height = height;
    this._left = left;
    this._top = top;
  }

  str() {
    return `width: ${this._width}, height: ${this._height}, left: ${this._left}, top: ${this._top}`;
  }
  get width() { return this._width; }
  get height() { return this._height; }
  get left() { return this._left; }
  get top() { return this._top; }
}

class Polygon {
  constructor(x, y) {
    this._x = x;
    this._y = y;
  }

  str() { return `x: ${this._x}, y: ${this._y}`; }
  get x() { return this._x; }
  get y() { return this._y; }
}

class Geometry {
  constructor(geometry) {
    const boundingBox = geometry.BoundingBox;
    const polygon = geometry.Polygon;
    this._boundingBox = new BoundingBox(
      boundingBox.Width,
      boundingBox.Height,
      boundingBox.Left,
      boundingBox.Top
    );
    this._polygon = polygon.map((pg) => new Polygon(pg.X, pg.Y));
  }

  str() { return `BoundingBox: ${this._boundingBox.str()}`; }
  get boundingBox() { return this._boundingBox; }
  get polygon() { return this._polygon; }
}

class Word {
  constructor(block, blockMap) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._text = block.Text || "";
  }

  str() { return this._text; }
  get confidence() { return this._confidence; }
  get geometry() { return this._geometry; }
  get id() { return this._id; }
  get text() { return this._text; }
  get block() { return this._block; }
}

class Line {
  constructor(block, blockMap) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;

    this._text = block.Text || "";

    this._words = [];
    if (block.Relationships) {
      block.Relationships.forEach((rs) => {
        if (rs.Type == "CHILD") {
          rs.Ids.forEach((cid) => {
            if (blockMap[cid].BlockType == "WORD")
              this._words.push(new Word(blockMap[cid], blockMap));
          });
        }
      });
    }
  }

  str() {
    return `Line\n==========\n${
      this._text
    }\nWords\n----------\n${this._words
      .map((word) => `[${word.str()}]`)
      .join("")}`;
  }

  get confidence() { return this._confidence; }
  get geometry() { return this._geometry; }
  get id() { return this._id; }
  get words() { return this._words; }
  get text() { return this._text; }
  get block() { return this._block; }
}

class SelectionElement {
  constructor(block, blockMap) {
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._selectionStatus = block.SelectionStatus;
  }

  get confidence() { return this._confidence; }
  get geometry() { return this._geometry; }
  get id() { return this._id; }
  get selectionStatus() { return this._selectionStatus; }
}

class FieldKey {
  constructor(block, children, blockMap) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._text = "";
    this._content = [];

    const t = [];
    children.forEach((eid) => {
      const wb = blockMap[eid];
      if (wb.BlockType == "WORD") {
        const w = new Word(wb, blockMap);
        this._content.push(w);
        t.push(w.text);
      }
    });
    this._text = t.join(" ");
  }

  str() { return this._text; }
  get confidence() { return this._confidence; }
  get geometry() { return this._geometry; }
  get id() { return this._id; }
  get content() { return this._content; }
  get text() { return this._text; }
  get block() { return this._block; }
}

class FieldValue {
  constructor(block, children, blockMap) {
    this._block = block;
    this._confidence = block.Confidence;
    this._geometry = new Geometry(block.Geometry);
    this._id = block.Id;
    this._text = "";
    this._content = [];

    const t = [];
    children.forEach((eid) => {
      const wb = blockMap[eid];
      if (wb.BlockType == "WORD") {
        const w = new Word(wb, blockMap);
        this._content.push(w);
        t.push(w.text);
      } else if (wb.BlockType == "SELECTION_ELEMENT") {
        const se = new SelectionElement(wb, blockMap);
        this._content.push(se);
        this._text = t.push(se.selectionStatus);
      }
    });
    this._text = t.join(" ");
  }

  str() { return this._text; }
  get confidence() { return this._confidence; }
  get geometry() { return this._geometry; }
  get id() { return this._id; }
  get content() { return this._content; }
  get text() { return this._text; }
  get block() { return this._block; }
}

class Field {
  constructor(block, blockMap) {
    this._key = null;
    this._value = null;
    block.Relationships.forEach((item) => {
      if (item.Type == "CHILD") {
        this._key = new FieldKey(block, item.Ids, blockMap);
      } else if (item.Type == "VALUE") {
        item.Ids.forEach((eid) => {
          const vkvs = blockMap[eid];
          if (vkvs.EntityTypes.indexOf("VALUE") >= 0 && vkvs.Relationships) {
            vkvs.Relationships.forEach((vitem) => {
              this._value = new FieldValue(vkvs, vitem.Ids, blockMap);
            });
          }
        });
      }
    });
  }

  str() {
    return `\nField\n==========\nKey: ${
      this._key ? this._key.str() : ""
    }\nValue: ${this._value ? this._value.str() : ""}`;
  }

  get key() { return this._key; }
  get value() { return this._value; }
}

class Form {
  constructor() {
    this._fields = [];
    this._fieldsMap = {};
  }

  addField(field) {
    this._fields.push(field);
    this._fieldsMap[field.key.text] = field;
  }

  str() { return this._fields.map((f) => f.str()).join("\n"); }

  get fields() { return this._fields; }

  getFieldByKey(key) {
    return this._fieldsMap[key] || null;
  }

  searchFieldsByKey(key) {
    const searchKey = key.toLowerCase();
    return this._fields.filter(
      (field) =>
        field.key && field.key.text.toLowerCase().indexOf(searchKey) >= 0
    );
  }
}

class Cell {
  constructor(block, blockMap) {
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
        if (rs.Type == "CHILD") {
          rs.Ids.forEach((cid) => {
            const blockType = blockMap[cid].BlockType;
            if (blockType == "WORD") {
              const w = new Word(blockMap[cid], blockMap);
              this._content.push(w);
              this._text += w.text + " ";
            } else if (blockType == "SELECTION_ELEMENT") {
              const se = new SelectionElement(blockMap[cid], blockMap);
              this._content.push(se);
              this._text += se.selectionStatus + ", ";
            }
          });
        }
      });
    }
  }

  str() { return this._text; }
  get confidence() { return this._confidence; }
  get rowIndex() { return this._rowIndex; }
  get columnIndex() { return this._columnIndex; }
  get rowSpan() { return this._rowSpan; }
  get columnSpan() { return this._columnSpan; }
  get geometry() { return this._geometry; }
  get id() { return this._id; }
  get content() { return this._content; }
  get text() { return this._text; }
  get block() { return this._block; }
}

class Row {
  constructor() {
    this._cells = [];
  }

  str() { return this._cells.map((cell) => `[${cell.str()}]`).join(""); }
  get cells() { return this._cells; }
}

class Table {
  constructor(block, blockMap) {
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
        if (rs.Type == "CHILD") {
          rs.Ids.forEach((cid) => {
            cell = new Cell(blockMap[cid], blockMap);
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
    return (
      "Table\n==========\n" +
      this._rows.map((row) => `Row\n==========\n${row.str()}`).join("\n")
    );
  }

  get confidence() { return this._confidence; }
  get geometry() { return this._geometry; }
  get id() { return this._id; }
  get rows() { return this._rows; }
  get block() { return this._block; }
}

class Page {
  constructor(blocks, blockMap) {
    this._blocks = blocks;
    this._text = "";
    this._lines = [];
    this._form = new Form();
    this._tables = [];
    this._content = [];
    this._parse(blockMap);
  }

  str() { return `Page\n==========\n${this._content.join("\n")}\n`; }

  _parse(blockMap) {
    this._blocks.forEach((item) => {
      if (item.BlockType == "PAGE") {
        this._geometry = new Geometry(item.Geometry);
      } else if (item.BlockType == "LINE") {
        const l = new Line(item, blockMap);
        this._lines.push(l);
        this._content.push(l);
        this._text += `${l.text}\n`;
      } else if (item.BlockType == "TABLE") {
        const t = new Table(item, blockMap);
        this._tables.push(t);
        this._content.push(t);
      } else if (item.BlockType == "KEY_VALUE_SET") {
        if (item.EntityTypes.indexOf("KEY") >= 0) {
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
    const columns = [];
    const lines = [];
    this._lines.forEach((line) => {
      let columnFound = false;
      for (let index = 0; index < columns.length; ++index) {
        column = columns[index];
        const bboxLeft = item.geometry.boundingBox.left;
        const bboxRight =
          item.geometry.boundingBox.left + item.geometry.boundingBox.width;
        const bboxCentre =
          item.geometry.boundingBox.left + item.geometry.boundingBox.width / 2;
        const columnCentre = column.left + column.right / 2; // TODO: Isn't this an error?
        if (
          (bboxCentre > column.left && bboxCentre < column.right) ||
          (columnCentre > bboxLeft && columnCentre < bboxRight)
        ) {
          // Bbox appears inside the column
          lines.push([index, item.text]);
          columnFound = true;
          break;
        }
      }
      if (!columnFound) {
        columns.push({
          left: item.geometry.boundingBox.left,
          right:
            item.geometry.boundingBox.left + item.geometry.boundingBox.width,
        });
        lines.push([columns.length - 1, item.text]);
      }
    });

    return lines.sort((a, b) => a[0] < b[0]);
  }

  getTextInReadingOrder() {
    return this.getLinesInReadingOrder()
      .map((l) => l[1])
      .join("\n");
  }

  get blocks() { return this._blocks; }
  get text() { return this._text; }
  get lines() { return this._lines; }
  get form() { return this._form; }
  get tables() { return this._tables; }
  get content() { return this._content; }
  get geometry() { return this._geometry; }
  get id() { return this._id; }
}

class Document {
  constructor(responsePages) {
    if (!Array.isArray(responsePages)) responsePages = [responsePages];

    this._responsePages = responsePages;
    this._pages = [];
    this._parse();
  }

  str() {
    return `\nDocument\n==========\n${this._pages.map(p => p.str()).join("\n\n")}\n\n`;
  }

  _parseDocumentPagesAndBlockMap() {
    const blockMap = {};
    const documentPages = [];
    let documentPage = null;
    this._responsePages.forEach((page) => {
      page.Blocks.forEach((block) => {
        if (block.BlockType && block.Id) {
          blockMap[block.Id] = block;
          if (block.BlockType == "PAGE") {
            if (documentPage) documentPages.push({ Blocks: documentPage });
            documentPage = [];
            documentPage.push(block);
          } else {
            documentPage.push(block);
          }
        }
      });
    });
    if (documentPage) documentPages.push({ Blocks: documentPage });
    return { documentPages, blockMap };
  }

  _parse() {
    const { documentPages, blockMap } = this._parseDocumentPagesAndBlockMap();
    this._responseDocumentPages = documentPages;
    this._blockMap = blockMap;
    documentPages.forEach((documentPage) => {
      this._pages.push(new Page(documentPage.Blocks, this._blockMap));
    });
  }

  get blocks() { return this._responsePages; }
  get pageBlocks() { return this._responseDocumentPages; }
  get blocks() { return this._responsePages; }

  getBlockById(blockId) {
    return this._blockMap && this.blockMap[blockId];
  }
}
