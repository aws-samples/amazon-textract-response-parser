import trp.trp2_expense as texp
import trp.trp2 as t2
import trp as t1
import json
import os
import pytest
from trp import Document
import logging

current_folder = os.path.dirname(os.path.realpath(__file__))


def return_json_for_file(filename):
    with open(os.path.join(current_folder, filename)) as test_json:
        return json.load(test_json)


# data/expense/test_trp2_expense_sample2.json
# data/expense/test_trp2_expense_sample3.json
# data/expense/test_trp2_expense_sample4.json


@pytest.fixture
def json_response_1():
    return return_json_for_file("data/expense/test_trp2_expense_sample1.json")


def test_serialization(caplog, json_response_1):
    caplog.set_level(logging.DEBUG)
    exp_docs: texp.TAnalyzeExpenseDocument = texp.TAnalyzeExpenseDocumentSchema(
    ).load(json_response_1)
    assert 1 == len(exp_docs.expenses_documents)
    exp_doc = exp_docs.expenses_documents[0]
    assert 6 == len(exp_doc.summaryfields)
    all_fields = exp_docs.get_all_summaryfields_by_expense_id(
        docid=exp_doc.expense_idx)
    assert all_fields
    assert 6 == len(all_fields)
    normalized_fields = exp_docs.get_normalized_summaryfields_by_expense_id(
        docid=exp_doc.expense_idx)
    assert normalized_fields
    assert 1 == len(normalized_fields)
