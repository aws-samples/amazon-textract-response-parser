from __future__ import annotations
from functools import lru_cache
import typing
from typing import List, Set, Dict, Optional, Iterator
from dataclasses import dataclass, field
import marshmallow as m
from marshmallow import post_load
from enum import Enum, auto
from dataclasses import dataclass, field
from uuid import uuid4, UUID
import math
import statistics
from uuid import uuid4, UUID
import math
import statistics
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


class BaseSchema(m.Schema):
    """
    skip null values when generating JSON
    https://github.com/marshmallow-code/marshmallow/issues/229#issuecomment-134387999
    """
    SKIP_VALUES = set([None])

    @m.post_dump
    def remove_skip_values(self, data, many, pass_many=False):
        return {
            key: value
            for key, value in data.items()
            if isinstance(value, (dict, list, set, tuple, range, frozenset)) or value not in self.SKIP_VALUES
        }


class TextractBlockTypes(Enum):
    WORD = auto()
    LINE = auto()
    TABLE = auto()
    CELL = auto()
    KEY_VALUE_SET = auto()
    PAGE = auto()
    SELECTION_ELEMENT = auto()
    QUERY = auto()
    QUERY_RESULT = auto()
    MERGED_CELL = auto()


@dataclass
class TextractEntityTypes(Enum):
    KEY = auto()
    VALUE = auto()


@dataclass(eq=True, repr=True)
class TPoint():
    x: float
    y: float

    def __init__(self, x: float, y: float) -> None:
        self.x = x
        self.y = y

    def scale(self, doc_width, doc_height):
        self.x: float = self.x * doc_width
        self.y: float = self.y * doc_height

    def ratio(self, doc_width, doc_height):
        self.x: float = self.x / doc_width
        self.y: float = self.y / doc_height

    def to_list(self) -> List[float]:
        '''
        Convert the point to a list of floats, i.e only standard 
        Python types. The list definition is [x_coor, y_coor].
        '''
        return [self.x, self.y]

    # TODO: add optimization for rotation of 90, 270, 180, -90, -180, -270 degrees
    def rotate(self,
               origin_x: float = 0.5,
               origin_y: float = 0.5,
               degrees: float = 180,
               force_limits: bool = True) -> TPoint:
        """
        rotating this point around an origin point
        force_limits enforces max 1 and min 0 values for the x and y coordinates (similar to min/max for Textract Schema Geometry)
        """
        angle = math.radians(degrees)
        ox = origin_x
        oy = origin_y
        px = self.x
        py = self.y
        cos_result = math.cos(angle)
        sin_result = math.sin(angle)
        new_x = ox + cos_result * (px - ox) - sin_result * (py - oy)
        new_y = oy + sin_result * (px - ox) + cos_result * (py - oy)
        if force_limits:
            new_x = max(min(new_x, 1), 0)
            new_y = max(min(new_y, 1), 0)
        self.x = new_x
        self.y = new_y
        return self


@dataclass(eq=True, repr=True, order=True, unsafe_hash=True)
class TBoundingBox():
    width: float
    height: float
    left: float
    top: float

    def __init__(self, height: float, width: float, left: float, top: float) -> None:
        self.width = width
        self.height = height
        self.left = left
        self.top = top

    def scale(self, doc_width, doc_height):
        self.top: float = self.top * doc_height
        self.height: float = self.height * doc_height
        self.left: float = self.left * doc_width
        self.width: float = self.width * doc_width

    def ratio(self, doc_width, doc_height):
        self.top: float = self.top / doc_height
        self.height: float = self.height / doc_height
        self.left: float = self.left / doc_width
        self.width: float = self.width / doc_width

    @property
    def points(self) -> List[TPoint]:
        points: List[TPoint] = list()
        points.append(TPoint(x=self.left, y=self.top))
        points.append(TPoint(x=self.left + self.width, y=self.top))
        points.append(TPoint(x=self.left, y=self.top + self.height))
        points.append(TPoint(x=self.left + self.width, y=self.top + self.height))
        return points

    @property
    def bottom(self) -> float:
        return self.top + self.height

    @property
    def right(self) -> float:
        return self.left + self.width

    @property
    def centre(self) -> TPoint:
        '''
        Return the centre of mass of the bounding box.
        '''
        return TPoint(x=self.left + self.width / 2.0, y=self.top + self.height / 2.0)

    def to_list(self) -> List[float]:
        '''
        Convert the bounding box definition to a list of floats, i.e only standard 
        Python types. The bounding box definition is [width, height, left, top].
        '''
        #TODO: cannot we use some overloading on the dump method of marshmallow?
        bbox_list: List[float] = [self.width, self.height, self.left, self.top]
        return bbox_list

    def union(self, bbox: TBoundingBox) -> TBoundingBox:
        '''
        Compute the union between two TBoundingBox objects. The union bounding box 
        is the smallest bounding box which contains the N source bounding boxes. In  
        case of this method, N equals 2 (self and bbox)

        Usage
        -----
        union_bbox = self.union(bbox)

        Arguments
        ---------
        bbox:
            A TBoundingBox object
        
        Returns
        -------
        union_bbox
            A TBoundingBox object representing the union between self and bbox
        '''
        new_top = min(self.top, bbox.top)
        new_bottom = max(self.bottom, bbox.bottom)
        new_left = min(self.left, bbox.left)
        new_right = max(self.right, bbox.right)
        new_bbox = TBoundingBox(
            width=new_right - new_left,
            height=new_bottom - new_top,
            left=new_left,
            top=new_top,
        )
        return new_bbox

    def rotate(self, origin: TPoint = TPoint(0, 0), degrees: float = 180) -> TBoundingBox:
        """
        rotate bounding box
        a bounding box sides are always parallel to x and y axis
        """
        points = []
        points.append(TPoint(x=self.left, y=self.top).rotate(origin_x=origin.x, origin_y=origin.y, degrees=degrees))
        points.append(
            TPoint(x=self.left + self.width, y=self.top).rotate(origin_x=origin.x, origin_y=origin.y, degrees=degrees))
        points.append(
            TPoint(x=self.left, y=self.top + self.height).rotate(origin_x=origin.x, origin_y=origin.y, degrees=degrees))
        points.append(
            TPoint(x=self.left + self.width, y=self.top + self.height).rotate(origin_x=origin.x,
                                                                              origin_y=origin.y,
                                                                              degrees=degrees))
        xmin = min([p.x for p in points])
        ymin = min([p.y for p in points])
        xmax = max([p.x for p in points])
        ymax = max([p.y for p in points])

        new_width = xmax - xmin
        new_height = ymax - ymin
        new_left = xmin
        new_top = ymin
        self.width = new_width
        self.height = new_height
        self.left = new_left
        self.top = new_top
        return self


class TBoundingBoxSchema(BaseSchema):
    width = m.fields.Float(data_key="Width", required=False, allow_none=False)
    height = m.fields.Float(data_key="Height", required=False, allow_none=False)
    left = m.fields.Float(data_key="Left", required=False, allow_none=False)
    top = m.fields.Float(data_key="Top", required=False, allow_none=False)

    @post_load
    def make_tbounding_box(self, data, **kwargs):
        return TBoundingBox(**data)


class TPointSchema(BaseSchema):
    x = m.fields.Float(data_key="X", required=False, allow_none=False)
    y = m.fields.Float(data_key="Y", required=False, allow_none=False)

    @post_load
    def make_tpoint(self, data, **kwargs):
        return TPoint(**data)


@dataclass(eq=True, init=True, repr=True, order=True, unsafe_hash=True)
class TGeometry():
    bounding_box: TBoundingBox
    polygon: List[TPoint]

    def ratio(self, doc_width=None, doc_height=None):
        self.bounding_box.ratio(doc_width=doc_width, doc_height=doc_height)
        [x.ratio(doc_width=doc_width, doc_height=doc_height) for x in self.polygon]

    def rotate(self, origin: TPoint = TPoint(0, 0), degrees: float = 180.0):
        self.bounding_box.rotate(origin=origin, degrees=degrees)
        [p.rotate(origin_x=origin.x, origin_y=origin.y) for p in self.polygon]

    def scale(self, doc_width=None, doc_height=None):
        self.bounding_box.scale(doc_width=doc_width, doc_height=doc_height)
        [x.scale(doc_width=doc_width, doc_height=doc_height) for x in self.polygon]


class TGeometrySchema(BaseSchema):
    bounding_box = m.fields.Nested(TBoundingBoxSchema, data_key="BoundingBox", required=False, allow_none=False)
    polygon = m.fields.List(m.fields.Nested(TPointSchema), data_key="Polygon", required=False, allow_none=False)

    @post_load
    def make_tgeometry(self, data, **kwargs):
        return TGeometry(**data)


@dataclass(eq=True, init=True, repr=True)
class TQuery:
    text: str = field(default=None)    # type: ignore
    alias: str = field(default=None)    # type: ignore


class TQuerySchema(BaseSchema):
    text = m.fields.String(data_key="Text", required=False)
    alias = m.fields.String(data_key="Alias", required=False)

    @post_load
    def make_tquery(self, data, **kwargs):
        return TQuery(**data)


@dataclass(eq=True, init=True, repr=True)
class TRelationship():
    type: str = field(default=None)    #type: ignore
    ids: List[str] = field(default=None)    #type: ignore


class TRelationshipSchema(BaseSchema):
    type = m.fields.String(data_key="Type", required=False, allow_none=False)
    ids = m.fields.List(m.fields.String, data_key="Ids", required=False, allow_none=False)

    @post_load
    def make_trelationship(self, data, **kwargs):
        return TRelationship(**data)


@dataclass(eq=True, init=True, repr=True, order=True)
class TBlock():
    """
    https://docs.aws.amazon.com/textract/latest/dg/API_Block.html
    as per this documentation none of the values is actually required
    """
    geometry: TGeometry = field(default=None)    #type: ignore
    id: str = field(default=None)    #type: ignore
    block_type: str = field(default="")    #type: ignore
    relationships: List[TRelationship] = field(default=None)    #type: ignore
    confidence: float = field(default=None)    #type: ignore
    text: str = field(default=None)    #type: ignore
    column_index: int = field(default=None)    #type: ignore
    column_span: int = field(default=None)    #type: ignore
    entity_types: List[str] = field(default=None)    #type: ignore
    page: int = field(default=None)    #type: ignore
    row_index: int = field(default=None)    #type: ignore
    row_span: int = field(default=None)    #type: ignore
    selection_status: str = field(default=None)    #type: ignore
    text_type: str = field(default=None)    #type: ignore
    custom: dict = field(default=None)    #type: ignore
    query: TQuery = field(default=None)    #type: ignore

    def __eq__(self, o: object) -> bool:
        if isinstance(o, TBlock):
            return o.id == self.id
        return False

    def __hash__(self) -> int:
        return hash(self.id)

    def get_relationships_for_type(self, relationship_type="CHILD") -> Optional[TRelationship]:
        """assuming only one relationship type entry in the list"""
        if self.relationships:
            for r in self.relationships:
                if r.type == relationship_type:
                    return r
        return None

    def add_ids_to_relationships(self, ids: List[str], relationships_type: str = "CHILD"):
        """Only adds id if not already existing"""
        relationship = self.get_relationships_for_type(relationship_type=relationships_type)
        if relationship:
            if not relationship.ids:
                relationship.ids = list()
                relationship.ids.extend(ids)
            else:
                relationship.ids.extend(x for x in ids if x not in relationship.ids)
        else:
            # empty, set base
            if not self.relationships:
                self.relationships = list()
            self.relationships.append(TRelationship(type=relationships_type, ids=ids))

    def rotate(self, origin=TPoint(0.5, 0.5), degrees: float = 180):
        self.geometry.rotate(origin=origin, degrees=degrees)


class TBlockSchema(BaseSchema):
    block_type = m.fields.String(data_key="BlockType", allow_none=False)
    geometry = m.fields.Nested(TGeometrySchema, data_key="Geometry", allow_none=False)
    id = m.fields.String(data_key="Id", allow_none=False)
    relationships = m.fields.List(m.fields.Nested(TRelationshipSchema), data_key="Relationships", allow_none=False)
    confidence = m.fields.Float(data_key="Confidence", required=False, allow_none=False)
    text = m.fields.String(data_key="Text", required=False, allow_none=False)
    column_index = m.fields.Int(data_key="ColumnIndex", required=False, allow_none=False)
    column_span = m.fields.Int(data_key="ColumnSpan", required=False, allow_none=False)
    entity_types = m.fields.List(m.fields.String, data_key="EntityTypes", required=False, allow_none=False)
    page = m.fields.Int(data_key="Page", required=False, allow_none=False)
    row_index = m.fields.Int(data_key="RowIndex", required=False, allow_none=False)
    row_span = m.fields.Int(data_key="RowSpan", required=False, allow_none=False)
    selection_status = m.fields.String(data_key="SelectionStatus", required=False, allow_none=False)
    text_type = m.fields.String(data_key="TextType", required=False, allow_none=False)
    custom = m.fields.Dict(data_key="Custom", required=False, allow_none=False)
    query = m.fields.Nested(TQuerySchema, data_key="Query")

    @post_load
    def make_tblock(self, data, **kwargs):
        return TBlock(**data)


@dataclass(eq=True, init=True, repr=True)
class TDocumentMetadata():
    pages: int = field(default=None)    #type: ignore


class TDocumentMetadataSchema(BaseSchema):
    pages = m.fields.Int(data_key="Pages", required=False)

    @post_load
    def make_tdocument_metadat(self, data, **kwargs):
        return TDocumentMetadata(**data)


@dataclass(eq=True, init=True, repr=True)
class TWarnings():
    error_code: str = field(default=None)    #type: ignore
    pages: List[int] = field(default=None)    #type: ignore


class TWarningsSchema(BaseSchema):
    pages = m.fields.List(m.fields.Int, data_key="Pages", required=False, allow_none=False)
    error_code = m.fields.String(data_key="ErrorCode", required=False, allow_none=False)

    @post_load
    def make_twarnings(self, data, **kwargs):
        return TWarnings(**data)


@dataclass(eq=True, init=True, repr=True)
class THttpHeaders():
    x_amzn_request_id: str = field(default=None)    #type: ignore
    content_type: str = field(default=None)    #type: ignore
    content_length: int = field(default=None)    #type: ignore
    connection: str = field(default=None)    #type: ignore
    date: str = field(default=None)    #type: ignore


@dataclass(eq=True, init=True, repr=True)
class TResponseMetadata():
    request_id: str = field(default=None)    #type: ignore
    http_status_code: int = field(default=None)    #type: ignore
    retry_attempts: int = field(default=None)    #type: ignore
    http_headers: THttpHeaders = field(default=None)    #type: ignore


@dataclass(eq=True, init=True, repr=True)
class TDocument():
    document_metadata: TDocumentMetadata = field(default=None)    #type: ignore
    blocks: List[TBlock] = field(default=None)    #type: ignore
    analyze_document_model_version: str = field(default=None)    #type: ignore
    detect_document_text_model_version: str = field(default=None)    #type: ignore
    status_message: str = field(default=None)    #type: ignore
    warnings: TWarnings = field(default=None)    #type: ignore
    job_status: str = field(default=None)    #type: ignore
    response_metadata: TResponseMetadata = field(default=None)    #type: ignore
    custom: dict = field(default=None)    #type: ignore
    next_token: str = field(default=None)    #type: ignore
    id: UUID = field(default_factory=uuid4)

    def __post_init__(self):    #this is a dataclass method
        '''
        Build several hashmaps (signature: Dict[str, int]) with 
        the block ID as key and the block index in self.blocks as value. As Textract 
        identifies blocks by their ID, the goal of this data structure is to access
        blocks by their ID and type at O(1) time complexity.The new hashmaps are 
        stored self._block_id_maps.

        Notes
        -----
        * don't use this data structure directly (it might chang in the future) 
          prefer the method self.block_map and self.block_id_map with the 'block_type' 
          specifier.
        * Method __post_init__ called by @dataclass after  __init__ call
        '''
        self._block_id_maps: Dict[str, typing.Dict[str, int]] = dict()
        for blk_type in TextractBlockTypes:
            # TODO: can we limit the python version and rely on the classic dict?
            self._block_id_maps[blk_type.name] = dict()
        self._block_id_maps['ALL'] = dict()
        if self.blocks != None:
            for blk_i, blk in enumerate(self.blocks):
                self._block_id_maps[blk.block_type][blk.id] = blk_i
                self._block_id_maps['ALL'][blk.id] = blk_i

    def __hash__(self):
        return int(self.id)

    def block_id_map(self, block_type: Optional[TextractBlockTypes] = None) -> Dict[str, int]:
        '''
        Return a hashmap  with the block ID as key and the block index in self.blocks 
        as value.
        '''
        if block_type:
            return self._block_id_maps[block_type.name]
        else:
            return self._block_id_maps['ALL']

    def block_map(self, block_type: Optional[TextractBlockTypes] = None) -> Dict[str, TBlock]:
        '''
        Return a hashmap  with the block ID as key and the block as value.
        '''
        if block_type:
            return {k: self.blocks[v] for k, v in self._block_id_maps[block_type.name].items()}
        else:
            return {k: self.blocks[v] for k, v in self._block_id_maps['ALL'].items()}

    def add_block(self, block: TBlock, page: TBlock = None):
        '''
        Add a block to the document at a give page. If the page is None, the block is 
        added to the first page
        '''
        if not block.id:
            block.id = str(uuid4())
        if not self.blocks:
            self.blocks = list()
        if not self.find_block_by_id(block.id):
            self.blocks.append(block)
            self._block_id_maps['ALL'][block.id] = len(self.blocks) - 1
            if block.block_type != '':
                self._block_id_maps[block.block_type][block.id] = len(self.blocks) - 1
        if not page:
            page = self.pages[0]
        page.add_ids_to_relationships(ids=[block.id])
        self.relationships_recursive.cache_clear()

    @staticmethod
    def create_geometry_from_blocks(values: List[TBlock]) -> TGeometry:
        all_points = [p.geometry.bounding_box.points for p in values]
        all_points = [i for sublist in all_points for i in sublist]
        ymin = min([p.y for p in all_points])
        xmin = min([p.x for p in all_points])
        ymax = max([p.y for p in all_points])
        xmax = max([p.x for p in all_points])
        new_bb = TBoundingBox(width=ymax - ymin, height=xmax - xmin, top=ymin, left=xmin)
        new_poly = [TPoint(x=xmin, y=ymin), TPoint(x=xmax, y=ymin), TPoint(x=xmax, y=ymax), TPoint(x=xmin, y=ymax)]
        return TGeometry(bounding_box=new_bb, polygon=new_poly)

    @staticmethod
    def create_value_block(values: List[TBlock]) -> TBlock:
        value_block = TBlock(id=str(uuid4()), block_type="KEY_VALUE_SET", entity_types=["VALUE"])
        value_block.add_ids_to_relationships([b.id for b in values])
        value_block.geometry = TDocument.create_geometry_from_blocks(values=values)
        value_block.confidence = statistics.mean([b.confidence for b in values])
        return value_block

    def add_virtual_block(self, text: str, page_block: TBlock, text_type="VIRTUAL") -> TBlock:
        tblock = TBlock(id=str(uuid4()),
                        block_type="WORD",
                        text=text,
                        geometry=TGeometry(bounding_box=TBoundingBox(width=0, height=0, left=0, top=0),
                                           polygon=[TPoint(x=0, y=0), TPoint(x=0, y=0)]),
                        confidence=99,
                        text_type=text_type)
        self.add_block(tblock, page=page_block)
        return tblock

    def add_virtual_key_for_existing_key(self, key_name: str, existing_key: TBlock,
                                         page_block: TBlock) -> Optional[TBlock]:
        if existing_key and existing_key.block_type == "KEY_VALUE_SET" and "KEY" in existing_key.entity_types:
            value_blocks: List[TBlock] = self.value_for_key(existing_key)
            return self.add_key_values(key_name=key_name, values=value_blocks, page_block=page_block)
        else:
            logger.warning(
                f"no existing_key or not block_type='KEY_VALUE_SET' or 'KEY' not in entity_type: {existing_key}")

    def add_key_values(self, key_name: str, values: List[TBlock], page_block: TBlock) -> TBlock:
        if not key_name:
            raise ValueError("need values and key_name")
        if not values:
            logger.debug(f"add_key_values: empty values for key: {key_name}, will create virtual empty block")
            values = [self.add_virtual_block(text="", page_block=page_block)]
        for value_block in values:
            if not value_block.id or not self.get_block_by_id(value_block.id):
                raise ValueError("value blocks to add have to already exist. Use add_word_block for new ones.")

        if values[0].page:
            page_block = self.pages[values[0].page - 1]
        else:
            page_block = self.pages[0]

        value_block = TDocument.create_value_block(values=values)
        self.add_block(value_block, page=page_block)

        virtual_block = self.add_virtual_block(text=key_name, page_block=page_block)
        id = str(uuid4())
        key_block = TBlock(id=id,
                           block_type="KEY_VALUE_SET",
                           entity_types=["KEY"],
                           confidence=99,
                           geometry=TGeometry(bounding_box=TBoundingBox(width=0, height=0, left=0, top=0),
                                              polygon=[TPoint(x=0, y=0), TPoint(x=0, y=0)]),
                           page=page_block.page)
        key_block.add_ids_to_relationships(relationships_type="VALUE", ids=[value_block.id])
        key_block.add_ids_to_relationships(relationships_type="CHILD", ids=[virtual_block.id])
        logger.debug(f"add key with id: {id} and key_name: {key_name}")
        self.add_block(key_block, page=page_block)
        return key_block

    def rotate(self, page: TBlock, degrees: float, origin: TPoint = TPoint(x=0.5, y=0.5)) -> None:
        # FIXME: add dimension. the relative scale messes up the new coordinates, have to use the actual image scale
        """atm no way to get back from Block to list of other blocks, hence get_block_by_id is only available on document level and quite some processing has to be here"""
        if not page:
            raise ValueError("need a page to rotate")
        if not degrees:
            raise ValueError("need degrees to rotate")
        [b.rotate(origin=origin, degrees=float(degrees)) for b in self.relationships_recursive(block=page)]
        self.relationships_recursive.cache_clear()

    def find_block_by_id(self, id: str) -> Optional[TBlock]:
        '''Find a block by its ID. Returns None if not found'''
        idx = self.block_id_map().get(id, None)
        if idx:
            return self.blocks[idx]
        return None

    def get_block_by_id(self, id: str) -> TBlock:
        for b in self.blocks:
            if b.id == id:
                return b
        raise ValueError(f"no block for id: {id}")

    def __relationships_recursive(self, block: TBlock) -> Iterator[TBlock]:
        import itertools
        if block and block.relationships:
            all_relations = list(itertools.chain(*[r.ids for r in block.relationships if r and r.ids]))
            all_block = [self.get_block_by_id(id) for id in all_relations if id]
            for b in all_block:
                if b:
                    yield b
                    for child in self.__relationships_recursive(block=b):
                        yield child

    @lru_cache()
    def relationships_recursive(self, block: TBlock) -> Set[TBlock]:
        return set(self.__relationships_recursive(block=block))

    @property
    def pages(self) -> List[TBlock]:
        page_blocks = self.block_map(TextractBlockTypes.PAGE).values()
        page_blocks = sorted(page_blocks, key=lambda item: item.page)
        return page_blocks

    @staticmethod
    def filter_blocks_by_type(block_list: List[TBlock],
                              textract_block_type: list[TextractBlockTypes] = None) -> List[TBlock]:
        if textract_block_type:
            block_type_names = [x.name for x in textract_block_type]
            return [b for b in block_list if b.block_type in block_type_names]
        else:
            return list()

    # TODO: this is more generic and not limited to page, should change the parameter from "page" to "block"
    def get_child_relations(self, page: TBlock):
        return self.get_blocks_by_type(page=page)

    # TODO: not ideal imho. customers want pages.tables or pages.forms like the current trp
    def tables(self, page: TBlock) -> List[TBlock]:
        return self.get_blocks_by_type(page=page, block_type_enum=TextractBlockTypes.TABLE)

    def get_blocks_by_type(self, block_type_enum: TextractBlockTypes = None, page: TBlock = None) -> List[TBlock]:
        table_list: List[TBlock] = list()
        if page and page.relationships:
            block_list = list(self.relationships_recursive(page))
            if block_type_enum:
                return self.filter_blocks_by_type(block_list=block_list, textract_block_type=[block_type_enum])
            else:
                return block_list
        else:
            if self.blocks:
                for b in self.blocks:
                    if block_type_enum and b.block_type == block_type_enum.name:
                        table_list.append(b)
                    if not block_type_enum:
                        table_list.append(b)
                return table_list
            else:
                return list()

    def forms(self, page: TBlock = None) -> List[TBlock]:
        return self.get_blocks_by_type(page=page, block_type_enum=TextractBlockTypes.KEY_VALUE_SET)

    def keys(self, page: TBlock = None) -> List[TBlock]:
        return [x for x in self.forms(page=page) if TextractEntityTypes.KEY.name in x.entity_types]
        # for key_entities in self.forms(page=page):
        #     if TextractEntityTypes.KEY.name in key_entities.entity_types:
        #         yield key_entities

    def queries(self, page: TBlock) -> List[TBlock]:
        return self.get_blocks_by_type(page=page, block_type_enum=TextractBlockTypes.QUERY)

    def get_answers_for_query(self, block: TBlock) -> List[TBlock]:
        result_list: List[TBlock] = list()
        rels = block.get_relationships_for_type(relationship_type="ANSWER")
        if rels:
            for r in rels.ids:
                result_list.append(self.get_block_by_id(r))
        return result_list

    def get_query_answers(self, page: TBlock) -> List[List[str]]:
        result_list: List[List[str]] = list()
        for query in self.queries(page=page):
            answers = [x for x in self.get_answers_for_query(block=query)]
            if answers:
                for answer in answers:
                    result_list.append([query.query.text, query.query.alias, answer.text])
            else:
                result_list.append([query.query.text, query.query.alias, ""])
        return result_list

    def get_key_by_name(self, key_name: str) -> List[TBlock]:
        result_blocks: List[TBlock] = list()
        for key in self.keys():
            keys_text_blocks = key.get_relationships_for_type()
            if keys_text_blocks:
                key_name_text: str = TDocument.get_text_for_tblocks(
                    [self.get_block_by_id(x) for x in keys_text_blocks.ids])
                if key_name == key_name_text:
                    result_blocks.append(key)
        return result_blocks

    def get_blocks_for_relationships(self, relationship: TRelationship = None) -> List[TBlock]:
        all_blocks: List[TBlock] = list()
        if relationship and relationship.ids:
            for id in relationship.ids:
                all_blocks.append(self.get_block_by_id(id))
        return all_blocks

    def value_for_key(self, key: TBlock) -> List[TBlock]:
        return_value_for_key: List[TBlock] = list()
        if TextractEntityTypes.KEY.name in key.entity_types:
            if key and key.relationships:
                value_blocks = self.get_blocks_for_relationships(relationship=key.get_relationships_for_type("VALUE"))
                for block in value_blocks:
                    return_value_for_key.extend(self.get_blocks_for_relationships(block.get_relationships_for_type()))

        return return_value_for_key

    @staticmethod
    def get_text_for_tblocks(tblocks: List[TBlock]) -> str:
        return_value = ' '.join([x.text for x in tblocks if x and x.text])
        return_value += ' '.join([x.selection_status for x in tblocks if x and x.selection_status])
        return return_value

    def lines(self, page: TBlock) -> List[TBlock]:
        return self.get_blocks_by_type(page=page, block_type_enum=TextractBlockTypes.LINE)

    def delete_blocks(self, block_id: List[str]):
        for b in block_id:
            block = self.get_block_by_id(b)
            if block and self.blocks:
                self.blocks.remove(block)
            else:
                logger.warning(f"delete_blocks: did not get block for id: {b}")
        self.__post_init__()
        self.relationships_recursive.cache_clear()

    def merge_tables(self, table_array_ids: List[List[str]]):
        for table_ids in table_array_ids:
            if len(table_ids) < 2:
                raise ValueError("no parent and child tables given")
            parent_table = self.get_block_by_id(table_ids[0])
            if type(parent_table) is not TBlock:
                raise ValueError("parent table is invalid")
            table_ids.pop(0)
            parent_relationships: TRelationship = TRelationship()
            if parent_table.relationships:
                for r in parent_table.relationships:
                    if r.type == "CHILD":
                        parent_relationships = r
            for table_id in table_ids:
                if parent_relationships and parent_relationships.ids:
                    parent_last_row = None
                    parent_last_row_block = self.get_block_by_id(parent_relationships.ids[-1])
                    if parent_last_row_block:
                        parent_last_row = parent_last_row_block.row_index
                    child_table = self.get_block_by_id(table_id)
                    if child_table and child_table.relationships:
                        for r in child_table.relationships:
                            if r.type == "CHILD" and r.ids:
                                for cell_id in r.ids:
                                    cell_block = self.get_block_by_id(cell_id)
                                    if cell_block and cell_block.row_index and parent_last_row:
                                        cell_block.row_index = parent_last_row + cell_block.row_index
                                        if parent_relationships.ids and cell_id not in parent_relationships.ids:
                                            parent_relationships.ids.append(cell_id)
                    self.delete_blocks([table_id])

    def link_tables(self, table_array_ids: List[List[str]]):
        for table_ids in table_array_ids:
            if len(table_ids) < 2:
                raise ValueError("no parent and child tables given")
            for i in range(0, len(table_ids)):
                table = self.get_block_by_id(table_ids[i])
                if i > 0 and table:
                    if table.custom:
                        table.custom['previous_table'] = table_ids[i - 1]
                    else:
                        table.custom = {'previous_table': table_ids[i - 1]}
                if i < len(table_ids) - 1 and table:
                    if table.custom:
                        table.custom['next_table'] = table_ids[i + 1]
                    else:
                        table.custom = {'next_table': table_ids[i + 1]}
        self.relationships_recursive.cache_clear()


class THttpHeadersSchema(BaseSchema):

    class Meta:
        unknown = m.EXCLUDE

    date = m.fields.String(data_key="date", required=False)
    x_amzn_request_id = m.fields.String(data_key="x-amzn-requestid", required=False, allow_none=False)
    content_type = m.fields.String(data_key="content-type", required=False, allow_none=False)
    content_length = m.fields.Int(data_key="content-length", required=False, allow_none=False)
    connection = m.fields.String(data_key="connection", required=False, allow_none=False)

    @post_load
    def make_thttp_headers(self, data, **kwargs):
        return THttpHeaders(**data)


class TResponseMetadataSchema(BaseSchema):

    class Meta:
        unknown = m.EXCLUDE

    request_id = m.fields.String(data_key="RequestId", required=False, allow_none=False)
    http_status_code = m.fields.Int(data_key="HTTPStatusCode", required=False, allow_none=False)
    retry_attempts = m.fields.Int(data_key="RetryAttempts", required=False, allow_none=False)
    http_headers = m.fields.Nested(THttpHeadersSchema, data_key="HTTPHeaders", required=False, allow_none=False)

    @post_load
    def make_tresponse_metadata(self, data, **kwargs):
        return TResponseMetadata(**data)


class TDocumentSchema(BaseSchema):
    document_metadata = m.fields.Nested(TDocumentMetadataSchema,
                                        data_key="DocumentMetadata",
                                        required=False,
                                        allow_none=False)
    blocks = m.fields.List(m.fields.Nested(TBlockSchema), data_key="Blocks", required=False, allow_none=False)
    analyze_document_model_version = m.fields.String(data_key="AnalyzeDocumentModelVersion",
                                                     required=False,
                                                     allow_none=False)
    detect_document_text_model_version = m.fields.String(data_key="DetectDocumentTextModelVersion",
                                                         required=False,
                                                         allow_none=False)
    status_message = m.fields.String(data_key="StatusMessage", required=False, allow_none=False)
    warnings = m.fields.Nested(TWarningsSchema, data_key="Warnings", required=False, allow_none=False)
    job_status = m.fields.String(data_key="JobStatus", required=False, allow_none=False)
    next_token = m.fields.String(data_key="NextToken", required=False, allow_none=False)
    response_metadata = m.fields.Nested(TResponseMetadataSchema,
                                        data_key="ResponseMetadata",
                                        required=False,
                                        allow_none=False)
    custom = m.fields.Dict(data_key="Custom", required=False, allow_none=False)

    @post_load
    def make_tdocument(self, data, **kwargs):
        return TDocument(**data)
