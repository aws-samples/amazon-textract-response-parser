from __future__ import annotations
from typing import List, Set, Optional
from dataclasses import dataclass, field
import marshmallow as m
from marshmallow import post_load
from enum import Enum, auto
from uuid import uuid4
import math
import statistics
import logging

from marshmallow.fields import String
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
            if isinstance(value, (dict, list, set, tuple, range,
                                  frozenset)) or value not in self.SKIP_VALUES
        }


class TextractBlockTypes(Enum):
    WORD = auto()
    LINE = auto()
    TABLE = auto()
    CELL = auto()
    KEY_VALUE_SET = auto()
    PAGE = auto()
    SELECTION_ELEMENT = auto()

@dataclass(init=True, eq=True, repr=True)
class TPoint():
    x:float
    y:float

    def scale(self, doc_width=None, doc_height=None):
        self.x: float =  self.x * doc_width
        self.y: float =  self.y * doc_height

    def ratio(self, doc_width=None, doc_height=None):
        self.x: float =  self.x / doc_width
        self.y: float =  self.y / doc_height

    # TODO: add optimization for rotation of 90, 270, 180, -90, -180, -270 degrees
    def rotate(self, origin_x:float=0.5, origin_y:float=0.5, degrees:float=180, force_limits:bool=True)->TPoint:
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


@dataclass(eq=True, init=True, repr=True, order=True, unsafe_hash=True)
class TBoundingBox():
    width:float
    height:float
    left:float
    top:float

    def scale(self, doc_width=None, doc_height=None):
        self.top: float = self.top * doc_height
        self.height: float = self.height * doc_height
        self.left: float = self.left * doc_width
        self.width: float = self.width * doc_width

    def ratio(self, doc_width=None, doc_height=None):
        self.top: float = self.top / doc_height
        self.height: float = self.height / doc_height
        self.left: float = self.left / doc_width
        self.width: float = self.width / doc_width

    @property
    def points(self)->List[TPoint]:
        points:List[TPoint] = list()
        points.append(TPoint(x=self.left, y=self.top))
        points.append(TPoint(x=self.left + self.width, y = self.top))
        points.append(TPoint(x=self.left, y=self.top + self.height))
        points.append(TPoint(x=self.left + self.width, y = self.top + self.height))
        return points 

    def rotate(self, origin:TPoint=TPoint(0,0), degrees:float=180)->TBoundingBox:
        """
        rotate bounding box
        a bounding box sides are always parallel to x and y axis
        """
        points = []
        points.append(TPoint(x=self.left, y=self.top).rotate(origin_x=origin.x, origin_y=origin.y, degrees=degrees))
        points.append(TPoint(x=self.left + self.width, y = self.top).rotate(origin_x=origin.x, origin_y=origin.y, degrees=degrees))
        points.append(TPoint(x=self.left, y=self.top + self.height).rotate(origin_x=origin.x, origin_y=origin.y, degrees=degrees))
        points.append(TPoint(x=self.left + self.width, y = self.top + self.height).rotate(origin_x=origin.x, origin_y=origin.y, degrees=degrees))
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
    height = m.fields.Float(data_key="Height",
                            required=False,
                            allow_none=False)
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
    bounding_box:TBoundingBox
    polygon:List[TPoint]

    def scale(self, doc_width=None, doc_height=None):
        self.bounding_box.scale(doc_width=doc_width, doc_height=doc_height)
        [ x.scale(doc_width=doc_width, doc_height=doc_height) for x in self.polygon ]

    def ratio(self, doc_width=None, doc_height=None):
        self.bounding_box.ratio(doc_width=doc_width, doc_height=doc_height)
        [ x.ratio(doc_width=doc_width, doc_height=doc_height) for x in self.polygon ]

    def rotate(self, origin:TPoint=TPoint(0,0), degrees:float=180):
        self.bounding_box.rotate(origin=origin, degrees=degrees)
        [p.rotate(origin_x=origin.x, origin_y=origin.y) for p in self.polygon ]

class TGeometrySchema(BaseSchema):
    bounding_box = m.fields.Nested(TBoundingBoxSchema,
                                   data_key="BoundingBox",
                                   required=False,
                                   allow_none=False)
    polygon = m.fields.List(m.fields.Nested(TPointSchema),
                            data_key="Polygon",
                            required=False,
                            allow_none=False)

    @post_load
    def make_tgeometry(self, data, **kwargs):
        return TGeometry(**data)


@dataclass(eq=True, init=True, repr=True)
class TRelationship():
    type: str  = field(default=None) #type: ignore
    ids: List[str] = field(default=None) #type: ignore


class TRelationshipSchema(BaseSchema):
    type = m.fields.String(data_key="Type", required=False, allow_none=False)
    ids = m.fields.List(m.fields.String,
                        data_key="Ids",
                        required=False,
                        allow_none=False)

    @post_load
    def make_trelationship(self, data, **kwargs):
        return TRelationship(**data)

@dataclass(eq=True, init=True, repr=True, order=True)
class TBlock():
    """
    https://docs.aws.amazon.com/textract/latest/dg/API_Block.html
    as per this documentation none of the values is actually required
    """
    geometry: TGeometry = field(default=None) #type: ignore
    id: str = field(default=None) #type: ignore
    block_type: str = field(default="") #type: ignore
    relationships: List[TRelationship] = field(default=None) #type: ignore
    confidence: float  = field(default=None) #type: ignore
    text: str = field(default=None) #type: ignore
    column_index: int = field(default=None) #type: ignore
    column_span: int = field(default=None) #type: ignore
    entity_types: List[str] = field(default=None) #type: ignore
    page: int = field(default=None) #type: ignore
    row_index: int = field(default=None) #type: ignore
    row_span: int = field(default=None) #type: ignore
    selection_status: str = field(default=None) #type: ignore
    text_type: str = field(default=None) #type: ignore
    custom: dict = field(default=None) #type: ignore

    def __hash__(self):
        return hash(id)

    def get_relationships_for_type(self, relationship_type_list=["CHILD"])->Optional[List[TRelationship]]:
        if self.relationships:
            return [r for r in self.relationships if r.type in relationship_type_list ]
        else:
            return None

    def add_ids_to_relationships(self, ids:List[str], relationships_type:str="CHILD"):
        relationships = self.get_relationships_for_type(relationship_type_list=relationships_type)
        if relationships and len(relationships) > 1:
            raise ValueError(f"more than 1 relationship with same type: {len(relationships)}")
        if relationships:
            if not relationships[0].ids:
                relationships[0].ids = list()
            relationships[0].ids.extend(ids)
        else:
            # empty, set base
            if not self.relationships:
                self.relationships = list()
            self.relationships.append(TRelationship(type=relationships_type, ids=ids))


    def rotate(self, origin=TPoint(0.5, 0.5), degrees=180):
        self.geometry.rotate(origin=origin, degrees=degrees)

class TBlockSchema(BaseSchema):
    block_type = m.fields.String(data_key="BlockType", allow_none=False)
    geometry = m.fields.Nested(TGeometrySchema,
                               data_key="Geometry",
                               allow_none=False)
    id = m.fields.String(data_key="Id", allow_none=False)
    relationships = m.fields.List(m.fields.Nested(TRelationshipSchema),
                                  data_key="Relationships",
                                  allow_none=False)
    confidence = m.fields.Float(data_key="Confidence",
                                required=False,
                                allow_none=False)
    text = m.fields.String(data_key="Text", required=False, allow_none=False)
    column_index = m.fields.Int(data_key="ColumnIndex",
                                required=False,
                                allow_none=False)
    column_span = m.fields.Int(data_key="ColumnSpan",
                               required=False,
                               allow_none=False)
    entity_types = m.fields.List(m.fields.String,
                                 data_key="EntityTypes",
                                 required=False,
                                 allow_none=False)
    page = m.fields.Int(data_key="Page", required=False, allow_none=False)
    row_index = m.fields.Int(data_key="RowIndex",
                             required=False,
                             allow_none=False)
    row_span = m.fields.Int(data_key="RowSpan",
                            required=False,
                            allow_none=False)
    selection_status = m.fields.String(data_key="SelectionStatus",
                                       required=False,
                                       allow_none=False)
    text_type = m.fields.String(data_key="TextType",
                                required=False,
                                allow_none=False)
    custom = m.fields.Dict(data_key="Custom", required=False, allow_none=False)

    @post_load
    def make_tblock(self, data, **kwargs):
        return TBlock(**data)


@dataclass(eq=True, init=True, repr=True)
class TDocumentMetadata():
    pages:int = field(default=None) #type: ignore


class TDocumentMetadataSchema(BaseSchema):
    pages = m.fields.Int(data_key="Pages", required=False)

    @post_load
    def make_tdocument_metadat(self, data, **kwargs):
        return TDocumentMetadata(**data)


@dataclass(eq=True, init=True, repr=True)
class TWarnings():
    error_code: str = field(default=None) #type: ignore
    pages: List[int] = field(default=None) #type: ignore

class TWarningsSchema(BaseSchema):
    pages = m.fields.List(m.fields.Int,
                          data_key="Pages",
                          required=False,
                          allow_none=False)
    error_code = m.fields.String(data_key="ErrorCode",
                                 required=False,
                                 allow_none=False)

    @post_load
    def make_twarnings(self, data, **kwargs):
        return TWarnings(**data)


@dataclass(eq=True, init=True, repr=True)
class THttpHeaders():
    x_amzn_request_id: str = field(default=None) #type: ignore
    content_type: str = field(default=None) #type: ignore
    content_length: int = field(default=None) #type: ignore
    connection: str = field(default=None) #type: ignore
    date: str = field(default=None) #type: ignore


@dataclass(eq=True, init=True, repr=True)
class TResponseMetadata():
    request_id: str = field(default=None) #type: ignore
    http_status_code: int = field(default=None) #type: ignore
    retry_attempts: int = field(default=None) #type: ignore
    http_headers: THttpHeaders = field(default=None) #type: ignore


@dataclass(eq=True, init=True, repr=True)
class TDocument():
    document_metadata: TDocumentMetadata = field(default=None) #type: ignore
    blocks: List[TBlock] = field(default=None) #type: ignore
    analyze_document_model_version: str = field(default=None) #type: ignore
    detect_document_text_model_version: str = field(default=None) #type: ignore
    status_message: str = field(default=None) #type: ignore
    warnings: TWarnings = field(default=None) #type: ignore
    job_status: str = field(default=None) #type: ignore
    response_metadata: TResponseMetadata = field(default=None) #type: ignore
    custom: dict = field(default=None) #type: ignore
    next_token: str = field(default=None) #type: ignore

    def add_block(self, block:TBlock):
        if not self.blocks:
            self.blocks = list()
        self.blocks.append(block)

    @staticmethod
    def create_geometry_from_blocks(values:List[TBlock])->TGeometry:
        all_points = [p.geometry.bounding_box.points for p in values]
        all_points = [i for sublist in all_points for i in sublist]
        ymin = min([p.y for p in all_points])
        xmin = min([p.x for p in all_points])
        ymax = max([p.y for p in all_points])
        xmax = max([p.x for p in all_points])
        new_bb = TBoundingBox(width=ymax-ymin, height=xmax-xmin, top=ymin, left=xmin)
        new_poly = [TPoint(x=xmin, y=ymin),
                    TPoint(x=xmax, y=ymin),
                    TPoint(x=xmax, y=ymax),
                    TPoint(x=xmin, y=ymax)]
        return TGeometry(bounding_box=new_bb, polygon=new_poly)

    @staticmethod
    def create_value_block(values:List[TBlock])->TBlock:
        value_block = TBlock(id=str(uuid4()), block_type="KEY_VALUE_SET", entity_types=["VALUE"])
        value_block.add_ids_to_relationships([b.id for b in values])
        value_block.geometry = TDocument.create_geometry_from_blocks(values=values)
        value_block.confidence = statistics.mean([b.confidence for b in values])
        return value_block

    def create_virtual_block(self, text:str, page_block:TBlock)->TBlock:
        tblock = TBlock(id=str(uuid4()),
                                block_type="WORD",
                                text=text,
                                geometry=TGeometry(bounding_box=TBoundingBox(width=0, height=0, left=0, top=0),
                                                        polygon=[TPoint(x=0,y=0), TPoint(x=0,y=0)]),
                                confidence=99,
                                text_type="VIRTUAL")
        page_block.add_ids_to_relationships([tblock.id])
        self.add_block(tblock)
        return tblock


    def add_key_values(self, key_name:str, values:List[TBlock], page_block:TBlock):
        if not key_name:
            raise ValueError("need values and key_name")
        if not values:
            logger.debug(f"add_key_values: empty values for key: {key_name}, will create virtual empty block")
            values = [ self.create_virtual_block(text="", page_block=page_block) ]

        if values[0].page:
            page_block = self.pages[values[0].page - 1]
        else:
            page_block = self.pages[0]

        value_block = TDocument.create_value_block(values=values)
        self.add_block(value_block)
        page_block.add_ids_to_relationships([value_block.id])
        virtual_block = self.create_virtual_block(text=key_name, page_block=page_block)

        key_block = TBlock(id=str(uuid4()),
                            block_type="KEY_VALUE_SET",
                            entity_types=["KEY"],
                            confidence=99,
                            geometry=TGeometry(bounding_box=TBoundingBox(width=0, height=0, left=0, top=0),
                                        polygon=[TPoint(x=0,y=0), TPoint(x=0,y=0)]),)
        key_block.add_ids_to_relationships(relationships_type="VALUE", ids=[value_block.id])
        key_block.add_ids_to_relationships(relationships_type="CHILD", ids=[virtual_block.id])
        self.add_block(key_block)


    def rotate(self, page:TBlock=None, origin:TPoint=TPoint(x=0.5, y=0.5), degrees:float=None)->None:
        # FIXME: add dimension. the relative scale messes up the new coordinates, have to use the actual image scale
        """atm no way to get back from Block to list of other blocks, hence get_block_by_id is only available on document level and quite some processing has to be here"""
        if not page:
            raise ValueError("need a page to rotate")
        if not degrees:
            raise ValueError("need degrees to rotate")
        [b.rotate(origin=origin, degrees=degrees) for b in self.relationships_recursive(block=page)]

    def get_block_by_id(self, id: str) -> TBlock:
        for b in self.blocks:
            if b.id == id:
                return b
        raise ValueError(f"no block for id: {id}")

    def __relationships_recursive(self, block:TBlock)->List[TBlock]:
        import itertools
        if block and block.relationships:
            all_relations = list(itertools.chain(*[ r.ids for r in block.relationships if r]))
            all_block = [self.get_block_by_id(id) for id in all_relations if id]
            for b in all_block:
                yield b
                for child in self.__relationships_recursive(block=b):
                    yield child


    def relationships_recursive(self, block:TBlock)->Optional[Set[TBlock]]:
        return set(self.__relationships_recursive(block=block))

    @property
    def pages(self) -> List[TBlock]:
        page_list: List[TBlock] = list()
        for b in self.blocks:
            if b.block_type == TextractBlockTypes.PAGE.name:
                page_list.append(b)
        return page_list

    @staticmethod
    def filter_blocks_by_type(
            block_list: List[TBlock],
            textract_block_type: List[TextractBlockTypes] = None) -> List[TBlock]:
        block_type_names = [ x.name for x in textract_block_type]
        return [
            b for b in block_list if b.block_type in block_type_names
        ]

    def get_child_relations(self, page: TBlock):
        return self.get_blocks_by_type(page=page)

    # TODO: not ideal imho. customers want pages.tables or pages.forms like the current trp
    def tables(self, page: TBlock) -> List[TBlock]:
        return self.get_blocks_by_type(
            page=page, block_type_enum=TextractBlockTypes.TABLE)

    def get_blocks_by_type(self,
                             block_type_enum: TextractBlockTypes = None,
                             page: TBlock = None) -> List[TBlock]:
        if page:
            return [b for b in self.relationships_recursive(block=page) if b.block_type == block_type_enum.name]
        else:
            return [b for b in self.blocks]

    # TODO: not ideal imho. customers want pages.tables or pages.forms like the current trp
    def forms(self, page: TBlock) -> List[TBlock]:
        return self.get_blocks_by_type(
            page=page, block_type_enum=TextractBlockTypes.KEY_VALUE_SET)

    def lines(self, page: TBlock) -> List[TBlock]:
        return self.get_blocks_by_type(
            page=page, block_type_enum=TextractBlockTypes.LINE)

    def selection_elements(self, page:TBlock)->List[TBlock]:
        return self.get_blocks_by_type(
            page=page, block_type_enum=TextractBlockTypes.SELECTION_ELEMENT)

        


class THttpHeadersSchema(BaseSchema):
    date = m.fields.String(data_key="date", required=False)
    x_amzn_request_id = m.fields.String(data_key="x-amzn-requestid",
                                        required=False,
                                        allow_none=False)
    content_type = m.fields.String(data_key="content-type",
                                   required=False,
                                   allow_none=False)
    content_length = m.fields.Int(data_key="content-length",
                                  required=False,
                                  allow_none=False)
    connection = m.fields.String(data_key="connection",
                                 required=False,
                                 allow_none=False)

    @post_load
    def make_thttp_headers(self, data, **kwargs):
        return THttpHeaders(**data)


class TResponseMetadataSchema(BaseSchema):
    request_id = m.fields.String(data_key="RequestId",
                                 required=False,
                                 allow_none=False)
    http_status_code = m.fields.Int(data_key="HTTPStatusCode",
                                    required=False,
                                    allow_none=False)
    retry_attempts = m.fields.Int(data_key="RetryAttempts",
                                  required=False,
                                  allow_none=False)
    http_headers = m.fields.Nested(THttpHeadersSchema,
                                   data_key="HTTPHeaders",
                                   required=False,
                                   allow_none=False)

    @post_load
    def make_tresponse_metadata(self, data, **kwargs):
        return TResponseMetadata(**data)


class TDocumentSchema(BaseSchema):
    document_metadata = m.fields.Nested(TDocumentMetadataSchema,
                                        data_key="DocumentMetadata",
                                        required=False,
                                        allow_none=False)
    blocks = m.fields.List(m.fields.Nested(TBlockSchema),
                           data_key="Blocks",
                           required=False,
                           allow_none=False)
    analyze_document_model_version = m.fields.String(
        data_key="AnalyzeDocumentModelVersion",
        required=False,
        allow_none=False)
    detect_document_text_model_version = m.fields.String(
        data_key="DetectDocumentTextModelVersion",
        required=False,
        allow_none=False)
    status_message = m.fields.String(data_key="StatusMessage",
                                     required=False,
                                     allow_none=False)
    warnings = m.fields.Nested(TWarningsSchema,
                               data_key="Warnings",
                               required=False,
                               allow_none=False)
    job_status = m.fields.String(data_key="JobStatus",
                                 required=False,
                                 allow_none=False)
    next_token = m.fields.String(data_key="NextToken",
                                required=False,
                                allow_none=False)
    response_metadata = m.fields.Nested(TResponseMetadataSchema,
                                        data_key="ResponseMetadata",
                                        required=False,
                                        allow_none=False)
    custom = m.fields.Dict(data_key="Custom", required=False, allow_none=False)

    @post_load
    def make_tdocument(self, data, **kwargs):
        return TDocument(**data)
