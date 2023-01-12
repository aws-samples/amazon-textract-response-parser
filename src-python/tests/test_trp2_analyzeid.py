import trp.trp2_analyzeid as texa
import json
import os
import pytest
import logging

current_folder = os.path.dirname(os.path.realpath(__file__))


def return_json_for_file(filename):
    with open(os.path.join(current_folder, filename)) as test_json:
        return json.load(test_json)


@pytest.fixture
def json_response_1():
    return return_json_for_file("data/test-trp2_analyzeid_sample1.json")


@pytest.fixture
def json_response_3():
    return return_json_for_file("data/test-trp2_analyzeid_sample1_with_OCR.json")


@pytest.fixture
def json_response_multi_page():
    return return_json_for_file("data/test-trp2-analyzeid_sample_multi_page.json")


@pytest.fixture
def json_response_2():
    return return_json_for_file("data/test-trp2_analyzeid_sample2.json")


def test_analyzeid_serialization(caplog, json_response_1):
    caplog.set_level(logging.DEBUG)
    exp_doc: texa.TAnalyzeIdDocument = texa.TAnalyzeIdDocumentSchema().load(json_response_1)    #type: ignore
    assert 1 == len(exp_doc.identity_documents)
    identityDoc1 = exp_doc.identity_documents[0]
    assert 21 == len(identityDoc1.identity_document_fields)
    assert "1.0" == exp_doc.analyze_id_model_version
    assert 1 == exp_doc.document_metadata.pages


def test_analyzeid_serialization_empty(caplog, json_response_2):
    caplog.set_level(logging.DEBUG)
    exp_doc: texa.TAnalyzeIdDocument = texa.TAnalyzeIdDocumentSchema().load(json_response_2)    #type: ignore
    assert "1.0" == exp_doc.analyze_id_model_version
    assert 1 == exp_doc.document_metadata.pages


def test_analyzeid_serialization_multi_page(caplog, json_response_multi_page):
    caplog.set_level(logging.DEBUG)
    exp_doc: texa.TAnalyzeIdDocument = texa.TAnalyzeIdDocumentSchema().load(json_response_multi_page)    #type: ignore
    assert "1.0" == exp_doc.analyze_id_model_version
    assert 2 == exp_doc.document_metadata.pages
    identityDoc1 = exp_doc.identity_documents[0]
    identityDoc2 = exp_doc.identity_documents[1]
    assert 20 == len(identityDoc1.identity_document_fields)
    assert 20 == len(identityDoc2.identity_document_fields)
    result = exp_doc.get_values_as_list()
    assert result
    assert len(result) > 0


def test_analyzeid_serialization_with_OCR(caplog, json_response_3):
    caplog.set_level(logging.DEBUG)
    exp_doc: texa.TAnalyzeIdDocument = texa.TAnalyzeIdDocumentSchema().load(json_response_3)    #type: ignore
    assert 1 == len(exp_doc.identity_documents)
    identityDoc1 = exp_doc.identity_documents[0]
    assert 21 == len(identityDoc1.identity_document_fields)
    assert "1.0" == exp_doc.analyze_id_model_version
    assert 1 == exp_doc.document_metadata.pages
