"""
Author: lanaz@amazon.com
(De)Serializer for Textract AnalyzeID Response JSON
"""
from typing import List
import marshmallow as m
from marshmallow import post_load
from trp.trp2 import (BaseSchema, TDocumentMetadata, TDocumentMetadataSchema, TWarnings, TWarningsSchema,
                      TResponseMetadata, TResponseMetadataSchema, TBlock, TBlockSchema)
from dataclasses import dataclass, field


@dataclass
class TType():
    """
    Class for Type in AnalyzeId API Response
    """
    text: str = field(default=None)    #type: ignore


class TTypeSchema(BaseSchema):
    """
    Class for Type Schema
    """
    text = m.fields.String(data_key="Text", required=False, allow_none=False)

    @post_load
    def make_ttype(self, data, **kwargs):
        return TType(**data)


@dataclass
class TNormalizedValue():
    """
    Class for Normalized Value in AnalyzeId API Response
    """
    value: str = field(default=None)    #type: ignore
    value_type: str = field(default=None)    #type: ignore


class TNormalizedValueSchema(BaseSchema):
    """
    Class for NormalizedValue Schema
    """
    value = m.fields.String(data_key="Value", required=False, allow_none=False)
    value_type = m.fields.String(data_key="ValueType", required=False, allow_none=False)

    @post_load
    def make_tnormalizedtype(self, data, **kwargs):
        return TNormalizedValue(**data)


@dataclass
class TValueDetection():
    """
    Class for ValueDetection in AnalyzeId API Response
    """
    text: str = field(default=None)    #type: ignore
    confidence: float = field(default=None)    #type: ignore
    normalized_value: TNormalizedValue = field(default=None)    #type: ignore


class TValueDetectionSchema(BaseSchema):
    """
    Class for ValueDetection Schema
    """
    text = m.fields.String(data_key="Text", required=False, allow_none=False)
    confidence = m.fields.Float(data_key="Confidence", required=False, allow_none=False)
    normalized_value = m.fields.Nested(TNormalizedValueSchema,
                                       data_key="NormalizedValue",
                                       required=False,
                                       allow_none=False)

    @post_load
    def make_tvaluedetection(self, data, **kwargs):
        return TValueDetection(**data)


@dataclass
class TIdentityDocumentField():
    """
    Class for Analyze ID Response
    """
    type: TType = field(default=None)    #type: ignore
    value_detection: TValueDetection = field(default=None)    #type: ignore


class TIdentityDocumentFieldSchema(BaseSchema):
    """
    Class for IdentityDocumentField Schema
    """

    type = m.fields.Nested(TTypeSchema, data_key="Type", required=False, allow_none=False)

    value_detection = m.fields.Nested(TValueDetectionSchema,
                                      data_key="ValueDetection",
                                      required=False,
                                      allow_none=False)

    @post_load
    def make_tidentitydocumentfield(self, data, **kwargs):
        return TIdentityDocumentField(**data)


@dataclass
class TIdentityDocument():
    """
    Class for Analyze ID Response
    """
    document_index: int = 1
    identity_document_fields: List[TIdentityDocumentField] = field(default=None)    #type: ignore fs
    blocks: List[TBlock] = field(default=None)    #type: ignore


class TIdentityDocumentSchema(BaseSchema):
    """
    Class for IdentityDocument Schema
    """

    document_index = m.fields.Int(data_key="DocumentIndex", required=False, allow_none=True)

    identity_document_fields = m.fields.List(m.fields.Nested(TIdentityDocumentFieldSchema),
                                             data_key="IdentityDocumentFields",
                                             required=False,
                                             allow_none=True)
    blocks = m.fields.List(m.fields.Nested(TBlockSchema), data_key="Blocks", required=False, allow_none=False)

    @post_load
    def make_tidentitydocumentfield(self, data, **kwargs):
        return TIdentityDocument(**data)


@dataclass
class TAnalyzeIdDocument():
    """
    Class for AnalyzeIdDocument in AnalyzeId Response
    """
    document_metadata: TDocumentMetadata = field(default=None)    #type: ignore
    identity_documents: List[TIdentityDocument] = field(default=None)    #type: ignore
    analyze_id_model_version: str = field(default=None)    #type: ignore
    status_message: str = field(default=None)    #type: ignore
    warnings: TWarnings = field(default=None)    #type: ignore
    job_status: str = field(default=None)    #type: ignore
    response_metadata: TResponseMetadata = field(default=None)    #type: ignore
    custom: dict = field(default=None)    #type: ignore
    next_token: str = field(default=None)    #type: ignore

    def get_values_as_list(self) -> List[List[str]]:
        """
        return a List of List of str in the following format
        [["doc_number", "type", "value", "confidence", "normalized_value", "normalized_value_type"]]
        """
        result_list: List[List[str]] = list()
        for identity_document in self.identity_documents:
            doc_number = identity_document.document_index
            for identity_document_field in identity_document.identity_document_fields:
                normalized_value = ""
                normalized_value_type = ""
                if identity_document_field.value_detection.normalized_value:
                    normalized_value = identity_document_field.value_detection.normalized_value.value
                    normalized_value_type = identity_document_field.value_detection.normalized_value.value_type
                result_list.append([
                    str(doc_number),
                    str(identity_document_field.type.text),
                    str(identity_document_field.value_detection.text),
                    str(identity_document_field.value_detection.confidence),
                    str(normalized_value),
                    str(normalized_value_type)
                ])
        return result_list


class TAnalyzeIdDocumentSchema(BaseSchema):
    """
    Class for AnalyzeIdDocument Schema
    """
    document_metadata = m.fields.Nested(TDocumentMetadataSchema,
                                        data_key="DocumentMetadata",
                                        required=False,
                                        allow_none=False)
    identity_documents = m.fields.List(m.fields.Nested(TIdentityDocumentSchema),
                                       data_key="IdentityDocuments",
                                       required=False,
                                       allow_none=False)

    analyze_id_model_version = m.fields.String(data_key="AnalyzeIDModelVersion", required=False, allow_none=False)
    status_message = m.fields.String(data_key="StatusMessage", required=False, allow_none=False)
    warnings = m.fields.Nested(TWarningsSchema, data_key="Warnings", required=False, allow_none=False)
    job_status = m.fields.String(data_key="JobStatus", required=False, allow_none=False)
    response_metadata = m.fields.Nested(TResponseMetadataSchema,
                                        data_key="ResponseMetadata",
                                        required=False,
                                        allow_none=False)
    custom = m.fields.Dict(data_key="Custom", required=False, allow_none=False)
    next_token = m.fields.String(data_key="NextToken", required=False, allow_none=False)

    @post_load
    def make_tanalyzeiddocument(self, data, **kwargs):
        return TAnalyzeIdDocument(**data)
