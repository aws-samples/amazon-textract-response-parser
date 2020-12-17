import json
import pytest
import os
from trp import Document

current_folder = os.path.dirname(os.path.realpath(__file__))


def return_json_for_file(filename):
    with open(os.path.join(current_folder, filename)) as test_json:
        return json.load(test_json)


@pytest.fixture
def json_response():
    return return_json_for_file("test-response.json")


def test_words(json_response):
    doc = Document(json_response)
    assert 1 == len(doc.pages)
    lines = [line for line in doc.pages[0].lines]
    assert 22 == len(lines)
    words = [word for line in lines for word in line.words]
    assert 53 == len(words)


def test_tables(json_response):
    doc = Document(json_response)
    assert 1 == len(doc.pages[0].tables)


def test_forms(json_response):
    doc = Document(json_response)
    assert 4 == len(doc.pages[0].form.fields)
