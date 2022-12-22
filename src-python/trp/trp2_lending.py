from dataclasses import dataclass, field
from typing import List
from uuid import uuid4, UUID

from trp.trp2 import TGeometry, TDocumentMetadata, TDocumentMetadataSchema, BaseSchema, TGeometrySchema, TWarnings, TWarningsSchema, TResponseMetadata, TResponseMetadataSchema
from trp.trp2_expense import TExpenseSchema, TExpense
from trp.trp2_analyzeid import TIdentityDocument, TIdentityDocumentSchema
import marshmallow as m


@dataclass(eq=True, init=True, repr=True)
class TLendingDetection():
    confidence: float
    geometry: TGeometry = field(default=None)    #type: ignore
    selection_status: str = field(default=None)    #type: ignore
    text: str = field(default=None)    #type: ignore


@dataclass(eq=True, init=True, repr=True)
class TSignatureDetection():
    confidence: float = field(default=None)    #type: ignore
    geometry: TGeometry = field(default=None)    #type: ignore


@dataclass(eq=True, init=True, repr=True)
class TLendingField():
    field_type: str = field(default=None)    #type: ignore
    value_detections: List[TLendingDetection] = field(default=None)    #type: ignore
    key_detection: TLendingDetection = field(default=None)    #type: ignore


@dataclass(eq=True, init=True, repr=True)
class TLendingDocument():
    lending_fields: List[TLendingField] = field(default=None)    #type: ignore
    signature_detections: List[TSignatureDetection] = field(default=None)    #type: ignore


@dataclass(eq=True, init=True, repr=True)
class TExtraction():
    expense_document: TExpense = field(default=None)    #type: ignore
    identity_document: TIdentityDocument = field(default=None)    #type: ignore
    lending_document: TLendingDocument = field(default=None)    #type: ignore


@dataclass(eq=True, init=True, repr=True)
class TPrediction():
    confidence: float = field(default=None)    #type: ignore
    value: str = field(default=None)    #type: ignore


@dataclass(eq=True, init=True, repr=True)
class TPageClassification():
    page_number: List[TPrediction]
    page_type: List[TPrediction]


@dataclass(eq=True, init=True, repr=True)
class TLendingResult():
    extractions: List[TExtraction] = field(default=None)    #type: ignore
    page: int = field(default=None)    #type: ignore
    page_classification: TPageClassification = field(default=None)    #type: ignore


@dataclass(eq=True, init=True, repr=True)
class TFullLendingDocument():
    analyze_lending_model_version: str
    lending_results: List[TLendingResult] = field(default=None)    #type: ignore
    document_metadata: TDocumentMetadata = field(default=None)    #type: ignore
    job_status: str = field(default=None)    #type: ignore
    status_message: str = field(default=None)    #type: ignore
    warnings: TWarnings = field(default=None)    #type: ignore
    response_metadata: TResponseMetadata = field(default=None)    #type: ignore
    next_token: str = field(default=None)    #type: ignore
    id: UUID = field(default_factory=uuid4)


################
# SCHEMA
###############


class TLendingDetectionSchema(BaseSchema):
    confidence = m.fields.Float(data_key="Confidence", required=False)
    geometry = m.fields.Nested(TGeometrySchema, data_key="Geometry", required=False)
    selection_status = m.fields.String(data_key="SelectionStatus", required=False)
    text = m.fields.String(data_key="Text", required=False)

    @m.post_load
    def make(self, data, **kwargs):
        return TLendingDetection(**data)


class TSignatureDetectionSchema(BaseSchema):
    confidence = m.fields.Float(data_key="Confidence", required=False)
    geometry = m.fields.Nested(TGeometrySchema, data_key="Geometry", required=False)

    @m.post_load
    def make(self, data, **kwargs):
        return TSignatureDetection(**data)


class TLendingFieldSchema(BaseSchema):
    key_detection = m.fields.Nested(TLendingDetectionSchema, data_key="KeyDetection", required=False)
    field_type = m.fields.String(data_key="Type", required=False)
    value_detections = m.fields.List(m.fields.Nested(TLendingDetectionSchema),
                                     data_key="ValueDetections",
                                     required=False)

    @m.post_load
    def make(self, data, **kwargs):
        return TLendingField(**data)


class TLendingDocumentSchema(BaseSchema):
    lending_fields = m.fields.List(m.fields.Nested(TLendingFieldSchema), data_key="LendingFields", required=False)
    signature_detections = m.fields.List(m.fields.Nested(TSignatureDetectionSchema),
                                         data_key="SignatureDetections",
                                         required=False)

    @m.post_load
    def make(self, data, **kwargs):
        return TLendingDocument(**data)


class TExtractionSchema(BaseSchema):
    expense_document = m.fields.Nested(TExpenseSchema, data_key="ExpenseDocument", required=False, allow_none=True)
    identity_document = m.fields.Nested(TIdentityDocumentSchema,
                                        data_key="IdentityDocument",
                                        required=False,
                                        allow_none=True)
    lending_document = m.fields.Nested(TLendingDocumentSchema,
                                       data_key="LendingDocument",
                                       required=False,
                                       allow_none=True)

    @m.post_load
    def make(self, data, **kwargs):
        return TExtraction(**data)


class TPredictionSchema(BaseSchema):
    confidence = m.fields.Float(data_key="Confidence")
    value = m.fields.String(data_key="Value")

    @m.post_load
    def make(self, data, **kwargs):
        return TPrediction(**data)


class TPageClassificationSchema(BaseSchema):
    page_number = m.fields.List(m.fields.Nested(TPredictionSchema), data_key="PageNumber", required=False)
    page_type = m.fields.List(m.fields.Nested(TPredictionSchema), data_key="PageType", required=False)

    @m.post_load
    def make(self, data, **kwargs):
        return TPageClassification(**data)


class TLendingResultSchema(BaseSchema):
    extractions = m.fields.List(m.fields.Nested(TExtractionSchema),
                                data_key="Extractions",
                                required=False,
                                allow_none=True)
    page = m.fields.Int(data_key="Page", required=False)
    page_classification = m.fields.Nested(TPageClassificationSchema, data_key="PageClassification", required=False)

    @m.post_load
    def make(self, data, **kwargs):
        return TLendingResult(**data)


class TFullLendingDocumentSchema(BaseSchema):
    document_metadata = m.fields.Nested(TDocumentMetadataSchema,
                                        data_key="DocumentMetadata",
                                        required=False,
                                        allow_none=False)
    analyze_lending_model_version = m.fields.String(data_key="AnalyzeLendingModelVersion",
                                                    required=False,
                                                    allow_none=False)
    status_message = m.fields.String(data_key="StatusMessage", required=False, allow_none=True)
    warnings = m.fields.Nested(TWarningsSchema, data_key="Warnings", required=False, allow_none=True)
    job_status = m.fields.String(data_key="JobStatus", required=False, allow_none=True)
    next_token = m.fields.String(data_key="NextToken", required=False, allow_none=True)
    response_metadata = m.fields.Nested(TResponseMetadataSchema,
                                        data_key="ResponseMetadata",
                                        required=False,
                                        allow_none=True)
    lending_results = m.fields.List(m.fields.Nested(TLendingResultSchema),
                                    data_key="Results",
                                    required=False,
                                    allow_none=True)
    custom = m.fields.Dict(data_key="Custom", required=False, allow_none=True)

    @m.post_load
    def make(self, data, **kwargs):
        return TFullLendingDocument(**data)
