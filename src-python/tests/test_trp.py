import json
import pytest
import os
from trp import Document, Cell
from typing import List
import logging

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


def test_table_with_headers_and_merged_cells(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "textract-new-tables-api.json"))
    j = json.load(f)
    doc = Document(j)
    header: List[Cell] = list()
    for page in doc.pages:
        for table in page.tables:
            header = table.header
    print([word.text for x in header for word in x.content])


def test_table_with_headers_and_merged_cells_out_of_order_cells(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "tables_with_headers_out_of_order_cells.json"))
    j = json.load(f)
    doc = Document(j)
    cells_in_child_order: List[List[int]] = list()
    for page in doc.pages:
        for table in page.tables:
            for row in table.rows:
                for cell in row.cells:
                    cells_in_child_order.append([int(cell.rowIndex), int(cell.columnIndex)])

    sorted_cells = sorted(cells_in_child_order, key=lambda row: (row[0], row[1]))
    assert sorted_cells == cells_in_child_order


def test_tables_after_sort_cells():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/multi-tables-multi-page-sample.json"))
    j = json.load(f)
    doc = Document(j)
    for page in doc.pages:
        for table in page.tables:
            cells_in_child_order: List[List[int]] = list()
            for row in table.rows:
                for cell in row.cells:
                    cells_in_child_order.append([int(cell.rowIndex), int(cell.columnIndex)])

            sorted_cells = sorted(cells_in_child_order, key=lambda row: (row[0], row[1]))
            assert sorted_cells == cells_in_child_order
