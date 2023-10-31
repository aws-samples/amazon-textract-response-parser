import trp.trp2_expense as texp
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
    return return_json_for_file("data/test_trp2_expense_sample1.json")

@pytest.fixture
def json_response_2():
    return return_json_for_file("data/analyzeExpenseResponse-multipage.json")

def test_serialization(caplog, json_response_1):
    caplog.set_level(logging.DEBUG)
    exp_docs: texp.TAnalyzeExpenseDocument = texp.TAnalyzeExpenseDocumentSchema().load(json_response_1)
    assert 1 == len(exp_docs.expenses_documents)
    exp_doc = exp_docs.expenses_documents[0]
    assert 6 == len(exp_doc.summaryfields)
    all_fields = exp_docs.get_all_summaryfields_by_expense_id(docid=exp_doc.expense_idx)
    assert all_fields
    assert 6 == len(all_fields)
    normalized_fields = exp_docs.get_normalized_summaryfields_by_expense_id(docid=exp_doc.expense_idx)
    assert normalized_fields
    assert 1 == len(normalized_fields)

def test_multipage(caplog, json_response_2):
    caplog.set_level(logging.DEBUG)
    exp_docs: texp.TAnalyzeExpenseDocument = texp.TAnalyzeExpenseDocumentSchema().load(json_response_2)
    assert 2 == len(exp_docs.expenses_documents)

def test_generate_multipage_text(caplog, json_response_2):
    caplog.set_level(logging.DEBUG)
    exp_docs: texp.TAnalyzeExpenseDocument = texp.TAnalyzeExpenseDocumentSchema().load(json_response_2) #type: ignore
    assert 2 == len(exp_docs.expenses_documents)
    for idx, page in enumerate(exp_docs.expenses_documents):
        print(f"page: {idx} ")
        line_texts = " ".join([block.text for block in page.blocks
                               if block.block_type == 'LINE' and block.text ])
        print(line_texts)





