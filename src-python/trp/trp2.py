from typing import List
import marshmallow as m


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

class TBoundingBoxSchema(m.Schema):
    width = m.fields.Float(data_key="Width")
    height = m.fields.Float(data_key="Height")
    left = m.fields.Float(data_key="Left")
    top = m.fields.Float(data_key="Top")

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

class TPointSchema(m.Schema):
    x = m.fields.Float(data_key="X")
    y = m.fields.Float(data_key="Y")


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

class TGeometrySchema(m.Schema):
    bounding_box = m.fields.Nested(TBoundingBoxSchema, data_key="BoundingBox")
    polygon = m.fields.List(m.fields.Nested(TPointSchema), data_key="Polygon")

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

class TRelationshipSchema(m.Schema):
    type = m.fields.String(data_key="Type")
    ids = m.fields.List(m.fields.String, data_key="Ids")


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
                 text_type: str = None):
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

class TBlockSchema(m.Schema):
    block_type = m.fields.String(data_key="BlockType")
    geometry = m.fields.Nested(TGeometrySchema, data_key="Geometry")
    id = m.fields.String(data_key="Id")
    relationships=m.fields.List(m.fields.Nested(TRelationshipSchema), data_key="Relationships")
    confidence=m.fields.Float(data_key="Confidence")
    text=m.fields.String(data_key="Text")
    column_index=m.fields.Int(data_key="ColumnIndex")
    column_span=m.fields.Int(data_key="ColumnSpan")
    entity_types=m.fields.List(m.fields.String, data_key="EntityTypes")
    page=m.fields.Int(data_key="Page")
    row_index=m.fields.Int(data_key="RowIndex")
    row_span=m.fields.Int(data_key="RowSpan")
    selection_status=m.fields.String(data_key="SelectionStatus")
    text_type=m.fields.String(data_key="TextType")

class TDocumentMetadata():
    def __init__(self, pages: int = None):
        self.__pages = pages

    @property
    def pages(self):
        return self.__pages

class TDocumentMetadataSchema(m.Schema):
    pages = m.fields.Int(data_key="Pages")


class TWarnings():
    def __init__(self, error_code: str=None, pages: List[int]=None):
        self.__pages = pages
        self.__error_code = error_code

    @property
    def pages(self):
        return self.__pages

    @property
    def error_code(self):
        return self.__error_code

class TWarningsSchema(m.Schema):
    pages = m.fields.List(m.fields.Int, data_key="Pages")
    error_code = m.fields.String(data_key="ErrorCode")

class THttpHeaders():
    def __init__(self, x_amzn_request_id:str=None,
                 content_type:str=None,
                 content_length:int=None,
                 date:str=None):
        self.__date=date
        self.__x_amzn_request_id = x_amzn_request_id
        self.__content_type = content_type
        self.__content_length = content_length
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

class TResponseMetadata():
    def __init__(self, request_id:str=None, http_status_code: int = None,
                 retry_attempts:int=None,
                 http_headers:THttpHeaders = None):
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
                 response_metadata: TResponseMetadata = None
                 ):
        self.__document_metatdata = document_metadata
        self.__blocks = blocks
        self.__analyze_document_model_version = analyze_document_model_version
        self.__detect_document_text_model_version = detect_document_text_model_version
        self.__status_message = status_message
        self.__warnings = warnings
        self.__job_status = job_status
        self.__response_metadata = response_metadata

    @property
    def document_metadata(self):
        return self.__document_metatdata

    @property
    def blocks(self):
        return self.__blocks

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

class THttpHeadersSchema(m.Schema):
    date = m.fields.String(data_key="date")
    x_amzn_request_id = m.fields.String(data_key="x-amzn-requestid")
    content_type = m.fields.String(data_key="content-type")
    content_length = m.fields.Int(data_key="content-length")

class TResponseMetadataSchema(m.Schema):
    request_id = m.fields.String(data_key="RequestId")
    http_status_code = m.fields.Int(data_key="HTTPStatusCode")
    retry_attempts = m.fields.Int(data_key="RetryAttempts")
    http_headers = m.fields.Nested(THttpHeadersSchema, data_key="HTTPHeaders")


class TDocumentSchema(m.Schema):

    document_metadata = m.fields.Nested(TDocumentMetadataSchema, data_key="DocumentMetadata")
    blocks = m.fields.List(m.fields.Nested(TBlockSchema), data_key="Blocks")
    analyze_document_model_version = m.fields.String(data_key="AnalyzeDocumentModelVersion")
    detect_document_text_model_version = m.fields.String(data_key="DetectDocumentTextModelVersion")
    status_message = m.fields.String(data_key="StatusMessage")
    warnings = m.fields.Nested(TWarningsSchema, data_key="Warnings")
    job_status = m.fields.String(data_key="JobStatus")
    response_metadata = m.fields.Nested(TResponseMetadataSchema, data_key="ResponseMetadata")


