"""
Author: dhawalkp@amazon.com
(De)Serializer for Textract AnalyzeExpense Response JSON

AnalyzeExpense’s JSON contains “ExpenseDocuments”, and each ExpenseDocument contains a
“SummaryFields” and “LineItemGroups”.
Anything detected in the document that is not a line item will be placed under
“SummaryFields”.
The lowest piece of data in the AnalyzeExpense response consists of “Type”,
“ValueDetection” and “LabelDetection”(Optional).
“LabelDetection” is optional. For the case where a piece of text is detected
on a receipt/invoice that does not explicitly have a “key” to label what the
value is, LabelDetection is omitted.

“LabelDetection” - the “key” of the key-value pair
“Type” - the normalized type of the key-value pair
“ValueDetection” - the “value” of the key-value pair.

Some other examples of AnalyzeExpense Elements that may not have “LabelDetection”
are line items in receipts.
Line items in receipts usually do not have explicit column headers to tell
what the columns are.

SummaryFields that are not normalized will have a Type of “OTHER”

Below are some (not exhaustive listing) of the normalized summary fields
AnalyzeExpense may detect per Expense Document -

VENDOR_NAME
VENDOR_ADDRESS
VENDOR_URL
VENDOR_PHONE
CURRENCY
PAYMENT_TERMS
INVOICE_RECEIPT_ID
INVOICE_RECEIPT_DATE
RECEIVER_NAME
RECEIVER_ADDRESS
DUE_DATE
TAX
DISCOUNT
SUBTOTAL
TOTAL
BANK_WIRING_INSTRUCTIONS
VENDOR_VAT_REG_NO
BILL_TO_VAT_REG_NO
LOCAL_VAT_AMOUNT
VAT_TOTAL
VAT_RATE
GST_NUMBER
HST_NUMBER
QST_NUMBER
TAX_PAYER_ID

Below are the normalized field types returned in the Line item -
ITEM
PRICE
QUANTITY
DESCRIPTION
CATEGORY
"""

from typing import List, Optional
from enum import Enum, auto
import marshmallow as m
from marshmallow import post_load
from trp.trp2 import (BaseSchema, TGeometry, TGeometrySchema,
                      TDocumentMetadata, TDocumentMetadataSchema, TWarnings,
                      TWarningsSchema, TResponseMetadata,
                      TResponseMetadataSchema)
from dataclasses import dataclass


class TextractAnalyzeExpenseSummaryFieldType(Enum):
    """
    Class for FieldType Enum for AnalyzeExpense
    """
    OTHER = auto()


@dataclass
class TLabelDetection():
    """
    Class for LabelDetection in AnalyzeExpense API Response
    """
    text: str
    geometry: TGeometry
    confidence: float


class TLabelDetectionSchema(BaseSchema):
    """
    Class for LabelDetection Schema
    """
    text = m.fields.String(data_key="Text", required=False, allow_none=False)
    geometry = m.fields.Nested(TGeometrySchema,
                               data_key="Geometry",
                               required=False,
                               allow_none=False)
    confidence = m.fields.Float(data_key="Confidence",
                                required=False,
                                allow_none=False)

    @post_load
    def make_tlabeldetection(self, data, **kwargs):
        return TLabelDetection(**data)


@dataclass
class TValueDetection():
    """
    Class for ValueDetection in AnalyzeExpense API Response
    """
    text: str = None
    geometry: TGeometry = None
    confidence: float = None


class TValueDetectionSchema(BaseSchema):
    """
    Class for ValueDetection Schema
    """
    text = m.fields.String(data_key="Text", required=False, allow_none=False)
    geometry = m.fields.Nested(TGeometrySchema,
                               data_key="Geometry",
                               required=False,
                               allow_none=False)
    confidence = m.fields.Float(data_key="Confidence",
                                required=False,
                                allow_none=False)

    @post_load
    def make_tvaluedetection(self, data, **kwargs):
        return TValueDetection(**data)


@dataclass
class TFieldType():
    """
    Class for FieldType in AnalyzeExpense API Response
    """
    text: str = None
    confidence: float = None


class TFieldTypeSchema(BaseSchema):
    """
    Class for FieldType Schema
    """
    text = m.fields.String(data_key="Text", required=False, allow_none=False)
    confidence = m.fields.Float(data_key="Confidence",
                                required=False,
                                allow_none=False)

    @post_load
    def make_tfieldtype(self, data, **kwargs):
        return TFieldType(**data)


@dataclass(repr=True)
class TSummaryField():
    """
    Class for SummaryField in AnalyzeExpense API Response
    """
    ftype: TFieldType = None
    labeldetection: TLabelDetection = None
    valuedetection: TValueDetection = None
    pagenumber: int = None


class TSummaryFieldSchema(BaseSchema):
    """
    Class for SummaryField Schema
    """
    ftype = m.fields.Nested(TFieldTypeSchema,
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
    pagenumber = m.fields.Int(data_key="PageNumber",
                              required=False,
                              allow_none=False)

    @post_load
    def make_tsummaryfield(self, data, **kwargs):
        return TSummaryField(**data)


@dataclass
class TExpenseField():
    """
    Class for ExpenseField in AnalyzeExpense Response
    """
    ftype: TFieldType = None
    pagenumber: int = None
    labeldetection: Optional[TLabelDetection] = None
    valuedetection: Optional[TValueDetection] = None


class TExpenseFieldSchema(BaseSchema):
    """
    Class for ExpenseField Schema
    """
    ftype = m.fields.Nested(TFieldTypeSchema,
                            data_key="Type",
                            required=False,
                            allow_none=False)

    labeldetection = m.fields.Nested(TLabelDetectionSchema,
                                     data_key="LabelDetection",
                                     required=False,
                                     allow_none=True)

    valuedetection = m.fields.Nested(TValueDetectionSchema,
                                     data_key="ValueDetection",
                                     required=False,
                                     allow_none=False)
    pagenumber = m.fields.Int(data_key="PageNumber",
                              required=False,
                              allow_none=False)

    @post_load
    def make_texpensefield(self, data, **kwargs):
        return TExpenseField(**data)


@dataclass
class TLineItem():
    """
    Class for LineItem in AnalyzeExpense Response
    """
    lineitem_expensefields: List[TExpenseField] = None


class TLineItemSchema(BaseSchema):
    """
    Class for LineItem Schema
    """

    lineitem_expensefields = m.fields.List(
        m.fields.Nested(TExpenseFieldSchema),
        data_key="LineItemExpenseFields",
        required=False,
        allow_none=False)

    @post_load
    def make_tlineitem(self, data, **kwargs):
        return TLineItem(**data)


@dataclass
class TLineItemGroup():
    """
    Class for LineItemGroup in AnalyzeExpense Response
    """
    lineitemgroupindex: int = None
    lineitems: List[TLineItem] = None


class TLineItemGroupSchema(BaseSchema):
    """
    Class for LineItemGroup Schema
    """

    lineitemgroupindex = m.fields.Int(data_key="LineItemGroupIndex",
                                      required=False,
                                      allow_none=False)

    lineitems = m.fields.List(m.fields.Nested(TLineItemSchema),
                              data_key="LineItems",
                              required=False,
                              allow_none=False)

    @post_load
    def make_tlineitemgroup(self, data, **kwargs):
        return TLineItemGroup(**data)


@dataclass
class TExpense():
    """
    Class for Expense Document in AnalyzeExpense Response
    """
    expense_idx: int = None
    summaryfields: List[TSummaryField] = None
    lineitemgroups: List[TLineItemGroup] = None


class TExpenseSchema(BaseSchema):
    """
    Class for ExpenseDocument Schema
    """

    expense_idx = m.fields.Int(data_key="ExpenseIndex",
                               required=False,
                               allow_none=False)

    summaryfields = m.fields.List(m.fields.Nested(TSummaryFieldSchema),
                                  data_key="SummaryFields",
                                  required=False,
                                  allow_none=False)

    lineitemgroups = m.fields.List(m.fields.Nested(TLineItemGroupSchema),
                                   data_key="LineItemGroups",
                                   required=False,
                                   allow_none=False)

    @post_load
    def make_texpense(self, data, **kwargs):
        return TExpense(**data)


class TAnalyzeExpenseDocument():
    """
    Class for AnalyzeExpenseDocument in AnalyzeExpense Response
    """
    def __init__(self,
                 document_metadata: TDocumentMetadata = None,
                 expenses_documents: List[TExpense] = None,
                 analyze_expense_model_version: str = None,
                 status_message: str = None,
                 warnings: TWarnings = None,
                 job_status: str = None,
                 response_metadata: TResponseMetadata = None,
                 custom: dict = None,
                 next_token: str = None):
        self.__document_metadata = document_metadata
        self.__expenses_documents = expenses_documents
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
    def expenses_documents(self):
        return self.__expenses_documents

    @expenses_documents.setter
    def expenses_documents(self, value: List[TExpense]):
        self.__expenses_documents = value

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

    def get_expensedocument_by_id(self, docid: int) -> Optional[TExpense]:
        """
        Returns an ExpenseDocument Object based on the ID.
            Parameters:
                docid (int): A Document Identifier
            Returns:
                ExpenseDocument (ExpenseDocument): ExpenseDocument Object
        """
        if self.__expenses_documents:
            for doc in self.__expenses_documents:
                if doc.expense_idx == docid:
                    return doc

    def get_all_summaryfields_by_expense_id(
            self, docid: int) -> Optional[List[TSummaryField]]:
        """
        Returns all the summaryfields by Expense Document ID.
            Parameters:
                docid (int): A Document Identifier
            Returns:
                summaryFieldList (List): List of Summary Fields in Expense Document Object
        """
        summaryfields_list: List[TSummaryField] = list()
        doc = self.get_expensedocument_by_id(docid)
        if doc:
            if doc.summaryfields:
                for field in doc.summaryfields:
                    summaryfields_list.append(field)
                return summaryfields_list

    def get_normalized_summaryfields_by_expense_id(
            self, docid: int) -> Optional[List[TSummaryField]]:
        """
        Returns only Normalized Summary Fields  based on the Expense Document ID.
            Parameters:
                docid (int): A Document Identifier
            Returns:
                implicitsummaryfields (List): Normalized Summary Fields List in the Expense Document Object
        """
        implicit_summaryfields_list: List[TSummaryField] = list()
        doc = self.get_expensedocument_by_id(docid)
        if doc:
            if doc.summaryfields:
                for field in doc.summaryfields:
                    if field.ftype and field.ftype.text != 'OTHER':
                        implicit_summaryfields_list.append(field)
                return implicit_summaryfields_list


class TAnalyzeExpenseDocumentSchema(BaseSchema):
    """
    Class for AnalyzeExpenseDocument Schema
    """
    document_metadata = m.fields.Nested(TDocumentMetadataSchema,
                                        data_key="DocumentMetadata",
                                        required=False,
                                        allow_none=False)
    expenses_documents = m.fields.List(m.fields.Nested(TExpenseSchema),
                                       data_key="ExpenseDocuments",
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
        return TAnalyzeExpenseDocument(**data)
