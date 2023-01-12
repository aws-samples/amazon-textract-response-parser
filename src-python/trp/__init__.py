# -*- coding: utf-8 -*-
"""Top-level package for amazon-textract-response-parser."""
import logging
from typing import List
from logging import NullHandler

logging.getLogger(__name__).addHandler(NullHandler())

logger = logging.getLogger(__name__)

__version__ = '0.1.39'

ENTITY_TYPE_COLUMN_HEADER = "COLUMN_HEADER"
ENTITY_TYPE_MERGED_CELL = "MERGED_CELL"


class BaseBlock():
    def __init__(self, block, blockMap):
        self._block = block
        self._confidence = block['Confidence']
        self._geometry = Geometry(block['Geometry'])
        self._id = block['Id']
        self._text = ""
        self._text_type = ""
        if 'Text' in block:
            self._text = block['Text']
        if "Custom" in block:
            self._custom = block["Custom"]
        if 'TextType' in block and block['TextType']:
            self._text_type = block['TextType']

    def __str__(self):
        return self._text

    @property
    def custom(self):
        return self._custom

    @property
    def confidence(self):
        return self._confidence

    @property
    def geometry(self):
        return self._geometry

    @property
    def id(self):
        return self._id

    @property
    def text(self):
        return self._text

    @property
    def block(self):
        return self._block

    @property
    def textType(self):
        return self._text_type


class BoundingBox:
    def __init__(self, width, height, left, top):
        self._width = width
        self._height = height
        self._left = left
        self._top = top

    def __str__(self):
        return "width: {}, height: {}, left: {}, top: {}".format(self._width, self._height, self._left, self._top)

    @property
    def width(self):
        return self._width

    @property
    def height(self):
        return self._height

    @property
    def left(self):
        return self._left

    @property
    def top(self):
        return self._top


class Polygon:
    def __init__(self, x, y):
        self._x = x
        self._y = y

    def __str__(self):
        return "x: {}, y: {}".format(self._x, self._y)

    @property
    def x(self):
        return self._x

    @property
    def y(self):
        return self._y


class Geometry:
    def __init__(self, geometry):
        boundingBox = geometry["BoundingBox"]
        polygon = geometry["Polygon"]
        bb = BoundingBox(boundingBox["Width"], boundingBox["Height"], boundingBox["Left"], boundingBox["Top"])
        pgs = []
        for pg in polygon:
            pgs.append(Polygon(pg["X"], pg["Y"]))

        self._boundingBox = bb
        self._polygon = pgs

    def __str__(self):
        s = "BoundingBox: {}\n".format(str(self._boundingBox))
        return s

    @property
    def boundingBox(self):
        return self._boundingBox

    @property
    def polygon(self):
        return self._polygon


class Word(BaseBlock):
    def __init__(self, block, blockMap):
        super().__init__(block, blockMap)


class Line(BaseBlock):
    def __init__(self, block, blockMap):
        super().__init__(block, blockMap)

        self._words = []
        if ('Relationships' in block and block['Relationships']):
            for rs in block['Relationships']:
                if (rs['Type'] == 'CHILD'):
                    for cid in rs['Ids']:
                        if (blockMap[cid]["BlockType"] == "WORD"):
                            self._words.append(Word(blockMap[cid], blockMap))

    def __str__(self):
        s = "Line\n==========\n"
        s = s + self._text + "\n"
        s = s + "Words\n----------\n"
        for word in self._words:
            s = s + "[{}]".format(str(word))
        return s

    @property
    def words(self):
        return self._words


class SelectionElement:
    def __init__(self, block, blockMap):
        self._confidence = block['Confidence']
        self._geometry = Geometry(block['Geometry'])
        self._id = block['Id']
        self._selectionStatus = block['SelectionStatus']

    @property
    def confidence(self):
        return self._confidence

    @property
    def geometry(self):
        return self._geometry

    @property
    def id(self):
        return self._id

    @property
    def selectionStatus(self):
        return self._selectionStatus


class FieldKey(BaseBlock):
    def __init__(self, block, children, blockMap):
        super().__init__(block, blockMap)
        self._content = []

        t = []

        for eid in children:
            wb = blockMap[eid]
            if (wb['BlockType'] == "WORD"):
                w = Word(wb, blockMap)
                self._content.append(w)
                t.append(w.text)

        if (t):
            self._text = ' '.join(t)

    @property
    def content(self):
        return self._content


class FieldValue(BaseBlock):
    def __init__(self, block, children, blockMap):
        super().__init__(block, blockMap)
        self._content = []

        t = []

        for eid in children:
            wb = blockMap[eid]
            if (wb['BlockType'] == "WORD"):
                w = Word(wb, blockMap)
                self._content.append(w)
                t.append(w.text)
            elif (wb['BlockType'] == "SELECTION_ELEMENT"):
                se = SelectionElement(wb, blockMap)
                self._content.append(se)
                self._text = se.selectionStatus

        if (t):
            self._text = ' '.join(t)

    @property
    def content(self):
        return self._content


class Field(BaseBlock):
    def __init__(self, block, blockMap):
        super().__init__(block, blockMap)
        self._key = None
        self._value = None

        if 'Relationships' in block:
            for item in block['Relationships']:
                if (item["Type"] == "CHILD"):
                    self._key = FieldKey(block, item['Ids'], blockMap)
                elif (item["Type"] == "VALUE"):
                    for eid in item['Ids']:
                        vkvs = blockMap[eid]
                        if 'VALUE' in vkvs['EntityTypes']:
                            if ('Relationships' in vkvs):
                                for vitem in vkvs['Relationships']:
                                    if (vitem["Type"] == "CHILD"):
                                        self._value = FieldValue(vkvs, vitem['Ids'], blockMap)
        else:
            logger.warning(f"no 'Relationships' in block: {block}")

    def __str__(self):
        s = "\nField\n==========\n"
        k = ""
        v = ""
        if (self._key):
            k = str(self._key)
        if (self._value):
            v = str(self._value)
        s = s + "Key: {}\nValue: {}".format(k, v)
        return s

    @property
    def key(self):
        return self._key

    @property
    def value(self):
        return self._value


class Form:
    def __init__(self):
        self._fields = []
        self._fieldsMap = {}

    def addField(self, field):
        self._fields.append(field)
        self._fieldsMap[field.key.text] = field

    def __str__(self):
        s = ""
        for field in self._fields:
            s = s + str(field) + "\n"
        return s

    @property
    def fields(self):
        return self._fields

    def getFieldByKey(self, key):
        field = None
        if (key in self._fieldsMap):
            field = self._fieldsMap[key]
        return field

    def searchFieldsByKey(self, key):
        searchKey = key.lower()
        results = []
        for field in self._fields:
            if (field.key and searchKey in field.key.text.lower()):
                results.append(field)
        return results


class BaseCell(BaseBlock):
    def __init__(self, block, blockMap):
        super().__init__(block, blockMap)
        self._rowIndex = block['RowIndex']
        self._columnIndex = block['ColumnIndex']
        self._rowSpan = block['RowSpan']
        self._columnSpan = block['ColumnSpan']
        self._content = []
        self._entityTypes: List[str] = list()
        self._isChildOfMergedCell = False

    @property
    def rowIndex(self):
        return self._rowIndex

    @property
    def columnIndex(self):
        return self._columnIndex

    @property
    def rowSpan(self):
        return self._rowSpan

    @property
    def columnSpan(self):
        return self._columnSpan

    @property
    def content(self):
        return self._content

    @property
    def entityTypes(self):
        """at the moment for COLUMN_HEADER"""
        return self._entityTypes


class Cell(BaseCell):
    def __init__(self, block, blockMap):
        super().__init__(block, blockMap)
        self._mergedText = None
        self._mergedCellParent: MergedCell

        if 'Relationships' in block and block['Relationships']:
            for rs in block['Relationships']:
                if rs['Type'] == 'CHILD':
                    for cid in rs['Ids']:
                        blockType = blockMap[cid]["BlockType"]
                        if (blockType == "WORD"):
                            w = Word(blockMap[cid], blockMap)
                            self._content.append(w)
                            self._text = self._text + w.text + ' '
                        elif (blockType == "SELECTION_ELEMENT"):
                            se = SelectionElement(blockMap[cid], blockMap)
                            self._content.append(se)
                            self._text = self._text + se.selectionStatus + ', '
        if ('EntityTypes' in block and block['EntityTypes']):
            self._entityTypes = block['EntityTypes']

    @property
    def mergedText(self):
        if self._isChildOfMergedCell and self._mergedCellParent != None:
            return self._mergedCellParent._text.strip()
        else:
            return self._text.strip()


class MergedCell(BaseCell):
    def __init__(self, block, blockMap, rows):
        super().__init__(block, blockMap)
        self._rowIndex = block['RowIndex']
        self._columnIndex = block['ColumnIndex']
        self._rowSpan = block['RowSpan']
        self._columnSpan = block['ColumnSpan']
        self._entityTypes: List[str] = list()
        if 'Relationships' in block and block['Relationships']:
            for rs in block['Relationships']:
                if rs['Type'] == 'CHILD':
                    cells = []
                    for row in rows:
                        cells.extend(row._cells)
                    for cid in rs['Ids']:
                        blockType = blockMap[cid]["BlockType"]
                        if (blockType == "CELL"):
                            child_cell = next((x for x in cells if x.id == cid), None)
                            if child_cell != None:
                                child_cell._isChildOfMergedCell = True
                                child_cell._mergedCellParent = self
                                if len(self._text) == 0 and len(child_cell.text) > 0:
                                    self._text = child_cell.text.strip()
        if ('EntityTypes' in block and block['EntityTypes']):
            self._entityTypes = block['EntityTypes']


class Row:
    def __init__(self):
        self._cells: List[Cell] = []

    def __str__(self):
        s = ""
        for cell in self._cells:
            s = s + "[{}]".format(str(cell))
        return s

    @property
    def cells(self):
        return self._cells

    @cells.setter
    def cells(self, cells: List[Cell]):
        self._cells = cells

    @property
    def merged_cells(self):
        return self._cells


class Table(BaseBlock):
    def __init__(self, block, blockMap):
        super().__init__(block, blockMap)
        self._rows: List[Row] = []
        self._merged_cells: List[MergedCell] = []
        self._merged_cells_ids = []
        if ('Relationships' in block and block['Relationships']):
            for rs in block['Relationships']:
                if (rs['Type'] == 'CHILD'):
                    cells: List[Cell] = list()
                    for cid in rs['Ids']:
                        cell = Cell(blockMap[cid], blockMap)
                        cells.append(cell)
                    cells.sort(key=lambda cell: (cell.rowIndex, cell.columnIndex))
                    for row_index in range(1, max([x.rowIndex for x in cells]) + 1):
                        new_row: Row = Row()
                        new_row.cells = [x for x in cells if x.rowIndex == row_index]
                        self._rows.append(new_row)
                elif (rs['Type'] == 'MERGED_CELL'):
                    self._merged_cells_ids = rs['Ids']

            if len(self._merged_cells_ids) > 0:
                self._resolve_merged_cells(blockMap)

    def __str__(self):
        s = "Table\n==========\n"
        for row in self._rows:
            s = s + "Row\n==========\n"
            s = s + str(row) + "\n"
        return s

    def _resolve_merged_cells(self, blockMap):
        for cid in self._merged_cells_ids:
            merged_cell = MergedCell(blockMap[cid], blockMap, self._rows)
            self._merged_cells.append(merged_cell)

    def get_header_field_names(self):
        header_cells = self.header
        header_names = []
        for header in header_cells:
            s = []
            for cell in header:
                if cell._isChildOfMergedCell:
                    s.append(cell.mergedText.strip())
                else:
                    s.append(cell.text.strip())
            header_names.append(s)
        return header_names

    @property
    def rows(self) -> List[Row]:
        return self._rows

    @property
    def header(self) -> List[List[Cell]]:
        header_rows = []
        for row in self._rows:
            header_cells: List[Cell] = list()
            for cell in row.cells:
                for entity_type in cell.entityTypes:
                    if entity_type == ENTITY_TYPE_COLUMN_HEADER:
                        header_cells.append(cell)
            if (len(header_cells) > 0):
                header_rows.append(header_cells)

        return header_rows

    @property
    def rows_without_header(self) -> List[Row]:
        non_header_rows: List[Row] = list()
        for row in self.rows:
            header = False
            for cell in row.cells:
                for entity_type in cell.entityTypes:
                    if entity_type == ENTITY_TYPE_COLUMN_HEADER:
                        header = True
            if not header:
                non_header_rows.append(row)
        return non_header_rows

    @property
    def merged_cells(self) -> List[MergedCell]:
        return self._merged_cells


class Page:
    def __init__(self, blocks, blockMap):
        self._blocks = blocks
        self._text = ""
        self._lines = []
        self._form = Form()
        self._tables = []
        self._content = []
        self._custom = dict()

        self._parse(blockMap)

    def __str__(self):
        s = "Page\n==========\n"
        for item in self._content:
            s = s + str(item) + "\n"
        return s

    def _parse(self, blockMap):
        for item in self._blocks:
            if item["BlockType"] == "PAGE":
                self._geometry = Geometry(item['Geometry'])
                self._id = item['Id']
                if "Custom" in item:
                    self._custom = item["Custom"]
            elif item["BlockType"] == "LINE":
                l = Line(item, blockMap)
                self._lines.append(l)
                self._content.append(l)
                self._text = self._text + l.text + '\n'
            elif item["BlockType"] == "TABLE":
                t = Table(item, blockMap)
                self._tables.append(t)
                self._content.append(t)
            elif item["BlockType"] == "KEY_VALUE_SET":
                if 'KEY' in item['EntityTypes']:
                    f = Field(item, blockMap)
                    if (f.key):
                        self._form.addField(f)
                        self._content.append(f)
                    else:
                        logger.info(
                            f"INFO: Detected K/V where key does not have content. Excluding key from output. {f} - {item}"
                        )

    def getLinesInReadingOrder(self):
        columns = []
        lines = []
        for item in self._lines:
            column_found = False
            for index, column in enumerate(columns):
                bbox_left = item.geometry.boundingBox.left
                bbox_right = item.geometry.boundingBox.left + item.geometry.boundingBox.width
                bbox_centre = item.geometry.boundingBox.left + item.geometry.boundingBox.width / 2
                column_centre = column['left'] + column['right'] / 2
                if (bbox_centre > column['left'] and bbox_centre < column['right']) or (column_centre > bbox_left
                                                                                        and column_centre < bbox_right):
                    #Bbox appears inside the column
                    lines.append([index, item.text])
                    column_found = True
                    break
            if not column_found:
                columns.append({
                    'left': item.geometry.boundingBox.left,
                    'right': item.geometry.boundingBox.left + item.geometry.boundingBox.width
                })
                lines.append([len(columns) - 1, item.text])

        lines.sort(key=lambda x: x[0])
        return lines

    def getTextInReadingOrder(self):
        lines = self.getLinesInReadingOrder()
        text = ""
        for line in lines:
            text = text + line[1] + '\n'
        return text

    @property
    def blocks(self):
        return self._blocks

    @property
    def text(self):
        return self._text

    @property
    def lines(self):
        return self._lines

    @property
    def form(self):
        return self._form

    @property
    def tables(self):
        return self._tables

    @property
    def content(self):
        return self._content

    @property
    def geometry(self):
        return self._geometry

    @property
    def id(self):
        return self._id

    @property
    def custom(self):
        return self._custom


class Document:
    def __init__(self, responsePages):

        if (not isinstance(responsePages, list)):
            rps = []
            rps.append(responsePages)
            responsePages = rps

        self._responsePages = responsePages
        self._pages = []

        self._parse()

    def __str__(self):
        s = "\nDocument\n==========\n"
        for p in self._pages:
            s = s + str(p) + "\n\n"
        return s

    def _parseDocumentPagesAndBlockMap(self):

        blockMap = {}

        documentPages = []
        documentPage = None
        for page in self._responsePages:
            for block in page['Blocks']:
                if ('BlockType' in block and 'Id' in block):
                    blockMap[block['Id']] = block

                if (block['BlockType'] == 'PAGE'):
                    if (documentPage):
                        documentPages.append({"Blocks": documentPage})
                    documentPage = []
                    documentPage.append(block)
                else:
                    if documentPage:
                        documentPage.append(block)
                    else:
                        logger.error("assumed documentPage not None, but was None")
        if (documentPage):
            documentPages.append({"Blocks": documentPage})
        return documentPages, blockMap

    def _parse(self):

        self._responseDocumentPages, self._blockMap = self._parseDocumentPagesAndBlockMap()
        for documentPage in self._responseDocumentPages:
            page = Page(documentPage["Blocks"], self._blockMap)
            self._pages.append(page)

    @property
    def blocks(self):
        return self._responsePages

    @property
    def pageBlocks(self):
        return self._responseDocumentPages

    @property
    def pages(self):
        return self._pages

    def getBlockById(self, blockId):
        block = None
        if (self._blockMap and blockId in self._blockMap):
            block = self._blockMap[blockId]
        return block
