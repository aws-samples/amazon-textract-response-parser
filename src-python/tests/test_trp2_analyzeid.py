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
    return return_json_for_file("data/test-trp2_analyzeid_sampe1.json")


def test_serialization(caplog, json_response_1):
    caplog.set_level(logging.DEBUG)
    exp_doc: texa.TAnalyzeIdDocument = texa.TAnalyzeIdDocumentSchema().load(json_response_1)
    assert 22 == len(exp_doc.identity_document_fields)
    assert 1.0 == exp_doc.analyze_id_model_version
    assert 1 == exp_doc.document_metadata.pages