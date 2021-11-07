"""
Author: lanaz@amazon.com
(De)Serializer for Textract AnalyzeID Response JSON
"""
from typing import List, Optional
import marshmallow as m
from marshmallow import post_load
from trp.trp2 import (BaseSchema, 
                      TDocumentMetadata, TDocumentMetadataSchema, TWarnings,
                      TWarningsSchema, TResponseMetadata,
                      TResponseMetadataSchema)
from dataclasses import dataclass


@dataclass
class TType():
    """
    Class for Type in AnalyzeId API Response
    """
    text: str = None

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
    value: str = None
    value_type: str = None

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
    text: str = None
    confidence: float = None
    normalized_value: TNormalizedValue = None


class TValueDetectionSchema(BaseSchema):
    """
    Class for ValueDetection Schema
    """
    text = m.fields.String(data_key="Text", required=False, allow_none=False)
    confidence = m.fields.Float(data_key="Confidence",
                                required=False,
                                allow_none=False)
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
    type: TType = None
    value_detection: TValueDetection = None

class TIdentityDocumentFieldSchema(BaseSchema):
    """
    Class for IdentityDocumentField Schema
    """

    type = m.fields.Nested(TTypeSchema,
                            data_key="Type",
                            required=False,
                            allow_none=False)
    
    value_detection = m.fields.Nested(TValueDetectionSchema,
                            data_key="ValueDetection",
                            required=False,
                            allow_none=False)

    @post_load
    def make_tidentitydocumentfield(self, data, **kwargs):
        return TIdentityDocumentField(**data)


class TAnalyzeIdDocument():
    """
    Class for AnalyzeIdDocument in AnalyzeId Response
    """
    def __init__(self,
                 document_metadata: TDocumentMetadata = None,
                 identity_document_fields: List[TIdentityDocumentField] = None,
                 analyze_id_model_version: str = None,
                 status_message: str = None,
                 warnings: TWarnings = None,
                 job_status: str = None,
                 response_metadata: TResponseMetadata = None,
                 custom: dict = None,
                 next_token: str = None):
        self.__document_metadata = document_metadata
        self.__identity_document_fields = identity_document_fields
        self.__analyze_id_model_version = analyze_id_model_version
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
    def identity_document_fields(self):
        return self.__identity_document_fields

    @identity_document_fields.setter
    def identity_document_fields(self, value: List[TIdentityDocumentField]):
        self.__identity_document_fields = value

    @property
    def analyze_id_model_version(self):
        return self.__analyze_id_model_version

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


class TAnalyzeIdDocumentSchema(BaseSchema):
    """
    Class for AnalyzeIdDocument Schema
    """
    document_metadata = m.fields.Nested(TDocumentMetadataSchema,
                                        data_key="DocumentMetadata",
                                        required=False,
                                        allow_none=False)
    identity_document_fields = m.fields.List(m.fields.Nested(TIdentityDocumentFieldSchema),
                                       data_key="IdentityDocumentFields",
                                       required=False,
                                       allow_none=False)
    analyze_id_model_version = m.fields.String(data_key="AnalyzeIDModelVersion",
                                            Required=False,
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
    def make_tanalyzeiddocument(self, data, **kwargs):
        return TAnalyzeIdDocument(**data)
