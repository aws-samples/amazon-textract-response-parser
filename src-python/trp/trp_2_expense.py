from typing import List, Optional, Set
import marshmallow as m
from marshmallow import post_load
from enum import Enum, auto

"""
Author: dhawalkp@amazon.com
(De)Serializer for Textract AnalyzeExpense Response JSON

"""

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


"""class TextractBlockTypes(Enum):
    WORD = auto()
    LINE = auto()
    TABLE = auto()
    CELL = auto()
    KEY_VALUE_SET = auto()
    PAGE = auto()"""


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
    def make_tboundingbox(self, data, **kwargs):
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
                 boundingbox: TBoundingBox = None,
                 polygon: List[TPoint] = None):
        self.__boundingbox = boundingbox
        self.__polygon = polygon

    @property
    def boundingbox(self):
        return self.__boundingbox

    @property
    def polygon(self):
        return self.__polygon


class TGeometrySchema(BaseSchema):
    boundingbox = m.fields.Nested(TBoundingBoxSchema,
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


"""
dhawalkp: New Class for LabelDetection

"""

class TLabelDetection():
    def __init__(self,text: str = None,geometry: TGeometry = None,confidence: float = None):
        self.__text = text
        self.__geometry = geometry
        self.__confidence = confidence
    @property
    def text(self):
        return self.__text
    @property
    def geometry(self):
        return self.__geometry
    @property
    def confidence(self):
        return self.__confidence

"""
dhawalkp: New Schema class for LabelDetection

""" 

class TLabelDetectionSchema(BaseSchema):
    text = m.fields.String(data_key="Text", required=False, allow_none=False)
    geometry = m.fields.Nested(TGeometrySchema,
                                   data_key="Geometry",
                                   required=False,
                                   allow_none=False)
    confidence = m.fields.Float(data_key="Confidence", required=False, allow_none=False)
    @post_load
    def make_tlabeldetection(self, data, **kwargs):
        return TLabelDetection(**data)



"""
dhawalkp: New Class for ValueDetection

"""

class TValueDetection():
    def __init__(self,text: str = None,geometry: TGeometry = None,confidence: float = None):
        self.__text = text
        self.__geometry = geometry
        self.__confidence = confidence
    @property
    def text(self):
        return self.__text
    @property
    def geometry(self):
        return self.__geometry
    @property
    def confidence(self):
        return self.__confidence

"""
dhawalkp: New Schema class for LabelDetection

""" 

class TValueDetectionSchema(BaseSchema):
    text = m.fields.String(data_key="Text", required=False, allow_none=False)
    geometry = m.fields.Nested(TGeometrySchema,
                                   data_key="Geometry",
                                   required=False,
                                   allow_none=False)
    confidence = m.fields.Float(data_key="Confidence", required=False, allow_none=False)
    @post_load
    def make_tvaluedetection(self, data, **kwargs):
        return TValueDetection(**data)


"""
dhawalkp: New Class for FieldType

"""
class TFieldType():
    def __init__(self,text: str = None,confidence: float = None):
        self.__text = text
        self.__confidence = confidence
    @property
    def text(self):
        return self.__text
 
    @property
    def confidence(self):
        return self.__confidence


"""
dhawalkp: New Schema class for SummaryFieldType

""" 

class TFieldTypeSchema(BaseSchema):
    text = m.fields.String(data_key="Text", required=False, allow_none=False)
    confidence = m.fields.Float(data_key="Confidence", required=False, allow_none=False)
    @post_load
    def make_tfieldtype(self, data, **kwargs):
        return TFieldType(**data)




"""
dhawalkp: New Class for SummaryFieldType

"""
class TSummaryField():
    def __init__(self,type: TFieldType = None,labeldetection: TLabelDetection = None,valuedetection: TValueDetection = None,pagenumber: int = None):
        self.__type = type
        self.__labeldetection = labeldetection
        self.__valuedetection = valuedetection
        self.__pagenumber = pagenumber
    @property
    def type(self):
        return self.__type
 
    @property
    def labeldetection(self):
        return self.__labeldetection

    @property
    def valuedetection(self):
        return self.__valuedetection

    @property
    def pagenumber(self):
        return self.__pagenumber
    

"""
dhawalkp: New Schema class for SummaryField

""" 

class TSummaryFieldSchema(BaseSchema):
    type = m.fields.Nested(TFieldTypeSchema,
                                   data_key="Type",
                                   required=False,
                                   allow_none=False)
    labeldetection = m.fields.Nested(TLabelDetectionSchema,
                                   data_key="LabelDetection",
                                   required=False,
                                   allow_none=False)
    valuedetection = m.fields.Nested(TValueDetectionSchema,
                                   data_key="ValueDetection",
                                   required=False,
                                   allow_none=False)
    pagenumber = m.fields.Int(data_key="PageNumber", required=False, allow_none=False)
    @post_load
    def make_tsummaryfield(self, data, **kwargs):
        return TSummaryField(**data)


"""
dhawalkp: New Class for ExpenseField

"""
class TExpenseField():
    def __init__(self,type: TFieldType = None,labeldetection: TLabelDetection = None,valuedetection: TValueDetection = None,pagenumber: int = None):
        self.__type = type
        self.__labeldetection = labeldetection
        self.__valuedetection = valuedetection
        self.__pagenumber = pagenumber
    @property
    def type(self):
        return self.__type
 
    @property
    def labeldetection(self):
        return self.__labeldetection

    @property
    def valuedetection(self):
        return self.__valuedetection

    @property
    def pagenumber(self):
        return self.__pagenumber
    

"""
dhawalkp: New Schema class for ExpenseField

""" 

class TExpenseFieldSchema(BaseSchema):
    type = m.fields.Nested(TFieldTypeSchema,
                                   data_key="Type",
                                   required=False,
                                   allow_none=False)
    labeldetection = m.fields.Nested(TLabelDetectionSchema,
                                   data_key="LabelDetection",
                                   required=False,
                                   allow_none=False)
    valuedetection = m.fields.Nested(TValueDetectionSchema,
                                   data_key="ValueDetection",
                                   required=False,
                                   allow_none=False)
    pagenumber = m.fields.Int(data_key="PageNumber", required=False, allow_none=False)
    @post_load
    def make_texpensefield(self, data, **kwargs):
        return TExpenseField(**data)

"""
dhawalkp: New Class for LineItem

"""
class TLineItem():
    def __init__(self,expensefields: List[TExpenseField] = None):
        self.__expensefields = expensefields

    @property
    def expensefields(self):
        return self.__expensefields

"""
dhawalkp: New Class for LineItemSchema

"""
 
class TLineItemSchema(BaseSchema):

    expensefields = m.fields.List(m.fields.Nested(TExpenseFieldSchema),
                            data_key="ExpenseFields",
                            required=False,
                            allow_none=False)

    @post_load
    def make_tlineitem(self, data, **kwargs):
        return TLineItem(**data)

"""
dhawalkp: New Class for Expense

"""

class TExpense():
    def __init__(self,summaryfields: List[TSummaryField] = None,lineitems: List[TLineItem] = None):
        self.__summaryfields = summaryfields
        self.__lineitems = lineitems


    @property
    def summaryfields(self):
        return self.__summaryfields

    @property
    def lineitems(self):
        return self.__lineitems
    
"""
dhawalkp: New Class for ExpenseSchema

"""
 
class TExpenseSchema(BaseSchema):

    summaryfields = m.fields.List(m.fields.Nested(TSummaryFieldSchema),
                            data_key="SummaryFields",
                            required=False,
                            allow_none=False)

    lineitems = m.fields.List(m.fields.Nested(TLineItemSchema),
                            data_key="LineItems",
                            required=False,
                            allow_none=False)
    @post_load
    def make_texpense(self, data, **kwargs):
        return TExpense(**data)









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


class TAnalyzeExpenseDocument():
    def __init__(self,
                 document_metadata: TDocumentMetadata = None,
                 expenses: List[TExpense] = None,
                 analyze_expense_model_version: str = None,
                 status_message: str = None,
                 warnings: TWarnings = None,
                 job_status: str = None,
                 response_metadata: TResponseMetadata = None,
                 custom: dict = None,
                 next_token: str = None):
        self.__document_metadata = document_metadata
        self.__expenses = expenses
        self.__analyze_expense_model_version = analyze_expense_model_version
        self.__status_message = status_message
        self.__next_token = next_token
        self.__warnings = warnings
        self.__job_status = job_status
        self.__response_metadata = response_metadata
        self.__custom = custom

    @property
    def document_metadata(self):
        return self.__document_metadata

    @property
    def expenses(self):
        return self.__expenses

    @expenses.setter
    def expenses(self, value: List[TExpense]):
        self.__expenses = value

    @property
    def analyze_expense_model_version(self):
        return self.__analyze_expense_model_version


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


class TAnalyzeExpenseDocumentSchema(BaseSchema):
    document_metadata = m.fields.Nested(TDocumentMetadataSchema,
                                        data_key="DocumentMetadata",
                                        required=False,
                                        allow_none=False)
    expenses = m.fields.List(m.fields.Nested(TExpenseSchema),
                           data_key="Expenses",
                           required=False,
                           allow_none=False)
    """analyze_expense_model_version = m.fields.String(
        data_key="AnalyzeDocumentModelVersion",
        required=False,
        allow_none=False)"""
   
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
        return TAnalyzeExpenseDocument(**data)
