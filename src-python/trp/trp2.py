from typing import List, Optional, Set
import marshmallow as m
from marshmallow import post_load
from enum import Enum, auto
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


class TBoundingBox():
    def __init__(self, width: float, height: float, left: float, top: float):
        self.__width = width
        self.__height = height
        self.__left = left
        self.__top = top

    @property
    def width(self):
        return self.__width

    @property
    def height(self):
        return self.__height

    @property
    def left(self):
        return self.__left

    @property
    def top(self):
        return self.__top


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


class TPoint():
    def __init__(self, x: float, y: float):
        self.__x = x
        self.__y = y

    @property
    def x(self):
        return self.__x

    @property
    def y(self):
        return self.__y

    def __str__(self) -> str:
        return f"Point: x: {self.__x}, y: {self.__y}"


class TPointSchema(BaseSchema):
    x = m.fields.Float(data_key="X", required=False, allow_none=False)
    y = m.fields.Float(data_key="Y", required=False, allow_none=False)

    @post_load
    def make_tpoint(self, data, **kwargs):
        return TPoint(**data)


class TGeometry():
    def __init__(self,
                 bounding_box: TBoundingBox = None,
                 polygon: List[TPoint] = None):
        self.__bounding_box = bounding_box
        self.__polygon = polygon

    @property
    def bounding_box(self):
        return self.__bounding_box

    @property
    def polygon(self):
        return self.__polygon


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


class TRelationship():
    def __init__(self, type: str = None, ids: List[str] = None):
        self.__type = type
        self.__ids = ids

    @property
    def type(self):
        return self.__type

    @property
    def ids(self):
        return self.__ids

    def __repr__(self):
        return f'type: {self.__type}, ids: {self.__ids}'


class TRelationshipSchema(BaseSchema):
    type = m.fields.String(data_key="Type", required=False, allow_none=False)
    ids = m.fields.List(m.fields.String,
                        data_key="Ids",
                        required=False,
                        allow_none=False)

    @post_load
    def make_trelationship(self, data, **kwargs):
        return TRelationship(**data)


class TBlock():
    """
    https://docs.aws.amazon.com/textract/latest/dg/API_Block.html
    as per this documentation none of the values is actually required
    """
    def __init__(self,
                 block_type: str = None,
                 geometry: TGeometry = None,
                 id: str = None,
                 relationships: List[TRelationship] = None,
                 confidence: float = None,
                 text: str = None,
                 column_index: int = None,
                 column_span: int = None,
                 entity_types: List[str] = None,
                 page: int = None,
                 row_index: int = None,
                 row_span: int = None,
                 selection_status: str = None,
                 text_type: str = None,
                 custom: dict = None):
        self.__block_type = block_type
        self.__geometry = geometry
        self.__id = id
        self.__relationships = relationships
        self.__confidence = confidence
        self.__text = text
        self.__column_index = column_index
        self.__column_span = column_span
        self.__entity_types = entity_types
        self.__page = page
        self.__row_index = row_index
        self.__row_span = row_span
        self.__selection_status = selection_status
        self.__text_type = text_type
        self.__custom = custom

    @property
    def block_type(self):
        return self.__block_type

    @property
    def geometry(self):
        return self.__geometry

    @property
    def id(self):
        return self.__id

    @property
    def relationships(self):
        return self.__relationships

    @relationships.setter
    def relationships(self, value: List[TRelationship]):
        self.__relationships = value

    @property
    def confidence(self):
        return self.__confidence

    @property
    def text(self):
        return self.__text

    @property
    def column_index(self):
        return self.__column_index

    @property
    def column_span(self):
        return self.__column_span

    @property
    def entity_types(self):
        return self.__entity_types

    @property
    def page(self):
        return self.__page

    @property
    def row_index(self):
        return self.__row_index

    @property
    def row_span(self):
        return self.__row_span

    @property
    def selection_status(self):
        return self.__selection_status

    @property
    def text_type(self):
        return self.__text_type

    @property
    def custom(self):
        return self.__custom

    @custom.setter
    def custom(self, value: dict):
        self.__custom = value

    @row_index.setter
    def row_index(self, value: int):
        self.__row_index = value
    
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


class TDocumentMetadata():
    def __init__(self, pages: int = None):
        self.__pages = pages

    @property
    def pages(self):
        return self.__pages


class TDocumentMetadataSchema(BaseSchema):
    pages = m.fields.Int(data_key="Pages", required=False)

    @post_load
    def make_tdocument_metadat(self, data, **kwargs):
        return TDocumentMetadata(**data)


class TWarnings():
    def __init__(self, error_code: str = None, pages: List[int] = None):
        self.__pages = pages
        self.__error_code = error_code

    @property
    def pages(self):
        return self.__pages

    @property
    def error_code(self):
        return self.__error_code


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


class THttpHeaders():
    def __init__(self,
                 x_amzn_request_id: str = None,
                 content_type: str = None,
                 content_length: int = None,
                 connection: str = None,
                 date: str = None):
        self.__date = date
        self.__x_amzn_request_id = x_amzn_request_id
        self.__content_type = content_type
        self.__content_length = content_length
        self.__connection = connection

    @property
    def date(self):
        return self.__date

    @property
    def x_amzn_request_id(self):
        return self.__x_amzn_request_id

    @property
    def content_type(self):
        return self.__content_type

    @property
    def content_length(self):
        return self.__content_length

    @property
    def connection(self):
        return self.__connection


class TResponseMetadata():
    def __init__(self,
                 request_id: str = None,
                 http_status_code: int = None,
                 retry_attempts: int = None,
                 http_headers: THttpHeaders = None):
        self.__request_id = request_id
        self.__http_status_code = http_status_code
        self.__retry_attempts = retry_attempts
        self.__http_headers = http_headers

    @property
    def request_id(self):
        return self.__request_id

    @property
    def http_status_code(self):
        return self.__http_status_code

    @property
    def retry_attempts(self):
        return self.__retry_attempts

    @property
    def http_headers(self):
        return self.__http_headers


class TDocument():
    def __init__(self,
                 document_metadata: TDocumentMetadata = None,
                 blocks: List[TBlock] = None,
                 analyze_document_model_version: str = None,
                 detect_document_text_model_version: str = None,
                 status_message: str = None,
                 warnings: TWarnings = None,
                 job_status: str = None,
                 response_metadata: TResponseMetadata = None,
                 custom: dict = None,
                 next_token: str = None):
        self.__document_metatdata = document_metadata
        self.__blocks = blocks
        self.__analyze_document_model_version = analyze_document_model_version
        self.__detect_document_text_model_version = detect_document_text_model_version
        self.__status_message = status_message
        self.__next_token = next_token
        self.__warnings = warnings
        self.__job_status = job_status
        self.__response_metadata = response_metadata
        self.__custom = custom

    @property
    def document_metadata(self):
        return self.__document_metatdata

    @property
    def blocks(self):
        return self.__blocks

    @blocks.setter
    def blocks(self, value: List[TBlock]):
        self.__blocks = value

    @property
    def analyze_document_model_version(self):
        return self.__analyze_document_model_version

    @property
    def detect_document_text_model_version(self):
        return self.__detect_document_text_model_version

    @property
    def status_message(self):
        return self.__status_message

    @property
    def warnings(self):
        return self.__warnings

    @property
    def job_status(self):
        return self.__job_status

    @property
    def response_metadata(self):
        return self.__response_metadata

    @property
    def next_token(self):
        return self.__next_token

    @property
    def custom(self):
        return self.__custom

    @custom.setter
    def custom(self, value: dict):
        self.__custom = value

    def get_block_by_id(self, id: str) -> Optional[TBlock]:
        for b in self.__blocks:
            if b.id == id:
                return b

    def __relationships_recursive(self, block:TBlock)->List[TBlock]:
        import itertools
        if block and block.relationships:
            all_relations = list(itertools.chain(*[ r.ids for r in block.relationships if r]))
            all_block = [self.get_block_by_id(id) for id in all_relations if id] 
            for b in all_block:
                if b:
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
        return self.__get_blocks_by_type(page=page)

    # TODO: not ideal imho. customers want pages.tables or pages.forms like the current trp
    def tables(self, page: TBlock) -> List[TBlock]:
        return self.__get_blocks_by_type(
            page=page, block_type_enum=TextractBlockTypes.TABLE)

    def __get_blocks_by_type(self,
                             block_type_enum: TextractBlockTypes = None,
                             page: TBlock = None) -> List[TBlock]:
        table_list: List[TBlock] = list()
        if page:
            for r in page.relationships:
                if r.type == "CHILD":
                    for id in r.ids:
                        b = self.get_block_by_id(id)
                        if b:
                            if block_type_enum and b.block_type == block_type_enum.name:
                                table_list.append(b)
                            else:
                                table_list.append(b)
            return table_list
        else:
            for b in self.blocks:
                if b.block_type == block_type_enum:
                    table_list.append(b)
            return table_list

    # TODO: not ideal imho. customers want pages.tables or pages.forms like the current trp
    def forms(self, page: TBlock) -> List[TBlock]:
        return self.__get_blocks_by_type(
            page=page, block_type_enum=TextractBlockTypes.KEY_VALUE_SET)

    def lines(self, page: TBlock) -> List[TBlock]:
        return self.__get_blocks_by_type(
            page=page, block_type_enum=TextractBlockTypes.LINE)

    def delete_blocks(self,block_id:List[str]):
        for b in block_id:
            block = self.get_block_by_id(b)
            if block:
                self.blocks.remove(block)
            else:
                logger.warning(f"delete_blocks: did not get block for id: {b}")

    def merge_tables(self, table_array_ids:List[List[str]]):
        for table_ids in table_array_ids:
            if len(table_ids)<2:
                raise ValueError("no parent and child tables given")
            parent_table = self.get_block_by_id(table_ids[0])
            if type(parent_table) is not TBlock:
                raise ValueError("parent table is invalid")
            table_ids.pop(0)
            parent_relationships: TRelationship = TRelationship()
            for r in parent_table.relationships:
                if r.type == "CHILD":
                    parent_relationships = r
            for table_id in table_ids:
                if parent_relationships:
                    parent_last_row = self.get_block_by_id(parent_relationships.ids[-1]).row_index
                    child_table = self.get_block_by_id(table_id)
                    for r in child_table.relationships:
                        if r.type == "CHILD":
                            for cell_id in r.ids:
                                cell_block = self.get_block_by_id(cell_id)
                                if cell_block.row_index:
                                    cell_block.row_index= parent_last_row + cell_block.row_index
                                    if parent_relationships.ids and cell_id not in parent_relationships.ids:
                                        parent_relationships.ids.append(cell_id)
                    self.delete_blocks([table_id])

    def link_tables(self, table_array_ids:List[List[str]]):
        for table_ids in table_array_ids:
            if len(table_ids)<2:
                raise ValueError("no parent and child tables given")
            for i in range(0,len(table_ids)):
                table = self.get_block_by_id(table_ids[i])
                if i>0:
                    if table.custom:
                        table.custom['previous_table']=table_ids[i-1]
                    else:
                        table.custom = {'previous_table':table_ids[i-1]}
                if i<len(table_ids)-1:
                    if table.custom:
                        table.custom['next_table']=table_ids[i+1]
                    else:
                        table.custom = {'next_table':table_ids[i+1]}

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