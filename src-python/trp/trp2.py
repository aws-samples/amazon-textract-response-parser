from typing import List, Optional, Set
import marshmallow as m
from marshmallow import post_load
from enum import Enum, auto
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


@dataclass
class TBoundingBox():
    width: float
    height: float
    left: float
    top: float


class TBoundingBoxSchema(BaseSchema):
    width = m.fields.Float(data_key="Width", required=False, allow_none=False)
    height = m.fields.Float(data_key="Height", required=False, allow_none=False)
    left = m.fields.Float(data_key="Left", required=False, allow_none=False)
    top = m.fields.Float(data_key="Top", required=False, allow_none=False)

    @post_load
    def make_tbounding_box(self, data, **kwargs):
        return TBoundingBox(**data)


@dataclass
class TPoint():
    x: float
    y: float


class TPointSchema(BaseSchema):
    x = m.fields.Float(data_key="X", required=False, allow_none=False)
    y = m.fields.Float(data_key="Y", required=False, allow_none=False)

    @post_load
    def make_tpoint(self, data, **kwargs):
        return TPoint(**data)


@dataclass
class TGeometry():
    bounding_box: TBoundingBox = field(default=None)    #type: ignore
    polygon: List[TPoint] = field(default=None)    #type: ignore


class TGeometrySchema(BaseSchema):
    bounding_box = m.fields.Nested(TBoundingBoxSchema, data_key="BoundingBox", required=False, allow_none=False)
    polygon = m.fields.List(m.fields.Nested(TPointSchema), data_key="Polygon", required=False, allow_none=False)

    @post_load
    def make_tgeometry(self, data, **kwargs):
        return TGeometry(**data)


@dataclass
class TRelationship():
    type: str = field(default=None)    #type: ignore
    ids: List[str] = field(default=None)    #type: ignore


class TRelationshipSchema(BaseSchema):
    type = m.fields.String(data_key="Type", required=False, allow_none=False)
    ids = m.fields.List(m.fields.String, data_key="Ids", required=False, allow_none=False)

    @post_load
    def make_trelationship(self, data, **kwargs):
        return TRelationship(**data)


@dataclass
class TBlock():
    """
    https://docs.aws.amazon.com/textract/latest/dg/API_Block.html
    as per this documentation none of the values is actually required
    """
    id: str
    confidence: float = field(default=None)    #type: ignore
    column_index: int = field(default=None)    #type: ignore
    column_span: int = field(default=None)    #type: ignore
    page: int = field(default=None)    #type: ignore
    row_span: int = field(default=None)    #type: ignore
    row_index: int = field(default=None)    #type: ignore
    block_type: str = field(default=None)    #type: ignore
    geometry: TGeometry = field(default=None)    #type: ignore
    relationships: List[TRelationship] = field(default=None)    #type: ignore
    text: str = field(default=None)    #type: ignore
    entity_types: List[str] = field(default=None)    #type: ignore
    selection_status: str = field(default=None)    #type: ignore
    text_type: str = field(default=None)    #type: ignore
    custom: dict = field(default=None)    #type: ignore

    def __eq__(self, o: object) -> bool:
        if isinstance(o, TBlock):
            return o.id == self.id
        return False

    def __hash__(self) -> int:
        return hash(self.id)


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

    @post_load
    def make_tblock(self, data, **kwargs):
        return TBlock(**data)


@dataclass
class TDocumentMetadata():
    pages: int = field(default=None)    #type: ignore


class TDocumentMetadataSchema(BaseSchema):
    pages = m.fields.Int(data_key="Pages", required=False)

    @post_load
    def make_tdocument_metadat(self, data, **kwargs):
        return TDocumentMetadata(**data)


@dataclass
class TWarnings():
    error_code: str = field(default=None)    #type: ignore
    pages: List[int] = field(default=None)    #type: ignore


class TWarningsSchema(BaseSchema):
    pages = m.fields.List(m.fields.Int, data_key="Pages", required=False, allow_none=False)
    error_code = m.fields.String(data_key="ErrorCode", required=False, allow_none=False)

    @post_load
    def make_twarnings(self, data, **kwargs):
        return TWarnings(**data)


@dataclass
class THttpHeaders():
    x_amzn_request_id: str = field(default=None)    #type: ignore
    content_type: str = field(default=None)    #type: ignore
    content_length: int = field(default=None)    #type: ignore
    connection: str = field(default=None)    #type: ignore
    date: str = field(default=None)    #type: ignore


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


@dataclass
class TDocument():
    blocks: List[TBlock] = field(default=None)    #type: ignore
    document_metadata: TDocumentMetadata = field(default=None)    #type: ignore
    analyze_document_model_version: str = field(default=None)    #type: ignore
    detect_document_text_model_version: str = field(default=None)    #type: ignore
    status_message: str = field(default=None)    #type: ignore
    warnings: TWarnings = field(default=None)    #type: ignore
    job_status: str = field(default=None)    #type: ignore
    response_metadata: TResponseMetadata = field(default=None)    #type: ignore
    custom: dict = field(default=None)    #type: ignore
    next_token: str = field(default=None)    #type: ignore

    def get_block_by_id(self, id: str) -> Optional[TBlock]:
        if self.blocks:
            for b in self.blocks:
                if b.id == id:
                    return b

    def __relationships_recursive(self, block: TBlock) -> List[TBlock]:
        import itertools
        if block and block.relationships:
            all_relations = list(itertools.chain(*[r.ids for r in block.relationships if r and r.ids]))
            all_block = [self.get_block_by_id(id) for id in all_relations if id]
            for b in all_block:
                if b:
                    yield b
                    for child in self.__relationships_recursive(block=b):
                        yield child

    def relationships_recursive(self, block: TBlock) -> Optional[Set[TBlock]]:
        return set(self.__relationships_recursive(block=block))

    @property
    def pages(self) -> List[TBlock]:
        page_list: List[TBlock] = list()
        if self.blocks:
            for b in self.blocks:
                if b.block_type == TextractBlockTypes.PAGE.name:
                    page_list.append(b)
            return page_list
        return page_list

    @staticmethod
    def filter_blocks_by_type(block_list: List[TBlock],
                              textract_block_type: List[TextractBlockTypes] = None) -> List[TBlock]:
        if textract_block_type:
            block_type_names = [x.name for x in textract_block_type]
            return [b for b in block_list if b.block_type in block_type_names]
        else:
            return list()

    # TODO: this is more generic and not limited to page, should change the parameter from "page" to "block"
    def get_child_relations(self, page: TBlock):
        return self.__get_blocks_by_type(page=page)

    # TODO: not ideal imho. customers want pages.tables or pages.forms like the current trp
    def tables(self, page: TBlock) -> List[TBlock]:
        return self.__get_blocks_by_type(page=page, block_type_enum=TextractBlockTypes.TABLE)

    def __get_blocks_by_type(self, block_type_enum: TextractBlockTypes = None, page: TBlock = None) -> List[TBlock]:
        table_list: List[TBlock] = list()
        if page and page.relationships:
            for r in page.relationships:
                if r.type == "CHILD" and r.ids:
                    for id in r.ids:
                        b = self.get_block_by_id(id)
                        if b:
                            if block_type_enum:
                                if b.block_type == block_type_enum.name:
                                    table_list.append(b)
                            else:
                                table_list.append(b)
            return table_list
        else:
            if self.blocks:
                for b in self.blocks:
                    if b.block_type == block_type_enum:
                        table_list.append(b)
                return table_list
            else:
                return list()

    # TODO: not ideal imho. customers want pages.tables or pages.forms like the current trp
    def forms(self, page: TBlock) -> List[TBlock]:
        return self.__get_blocks_by_type(page=page, block_type_enum=TextractBlockTypes.KEY_VALUE_SET)

    def lines(self, page: TBlock) -> List[TBlock]:
        return self.__get_blocks_by_type(page=page, block_type_enum=TextractBlockTypes.LINE)

    def delete_blocks(self, block_id: List[str]):
        for b in block_id:
            block = self.get_block_by_id(b)
            if block and self.blocks:
                self.blocks.remove(block)
            else:
                logger.warning(f"delete_blocks: did not get block for id: {b}")

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


class THttpHeadersSchema(BaseSchema):
    date = m.fields.String(data_key="date", required=False)
    x_amzn_request_id = m.fields.String(data_key="x-amzn-requestid", required=False, allow_none=False)
    content_type = m.fields.String(data_key="content-type", required=False, allow_none=False)
    content_length = m.fields.Int(data_key="content-length", required=False, allow_none=False)
    connection = m.fields.String(data_key="connection", required=False, allow_none=False)

    @post_load
    def make_thttp_headers(self, data, **kwargs):
        return THttpHeaders(**data)


class TResponseMetadataSchema(BaseSchema):
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
