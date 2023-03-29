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
    assert header
    # print([word.text for x in header for word in x.content])


def test_table_with_headers_and_merged_cells_out_of_order_cells(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "tables_with_headers_out_of_order_cells.json"))
    j = json.load(f)
    doc = Document(j)
    cells_in_child_order: List[List[int]] = list()
    for page in doc.pages:
        for table in page.tables:
            assert 30 == len(table.rows)
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


def _test_table_with_merged_cells(datafile, expected_merged_cells):
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", datafile))
    j = json.load(f)
    doc = Document(j)
    cells_in_child_order: List[List[int]] = list()
    hitCount = 0

    for page in doc.pages:
        for table in page.tables:
            for r, row in enumerate(table.rows):
                for c, cell in enumerate(row.cells):
                    cell_coord = '{}_{}'.format(r, c)
                    if cell_coord in expected_merged_cells and cell.mergedText.strip(
                    ) == expected_merged_cells[cell_coord]:
                        hitCount = hitCount + 1
                    print("Table[{}][{}] = {}-{}".format(r, c, cell.mergedText, cell.confidence))

    return hitCount


def test_table_with_merged_cells_1(caplog):
    caplog.set_level(logging.DEBUG)
    res = _test_table_with_merged_cells(
        "tables_with_merged_cells_sample1.json", {
            '2_0': 'Monday, February 28, 2022',
            '3_0': 'Monday, February 28, 2022',
            '4_0': 'Tuesday, March 01, 2022',
            '5_0': 'Tuesday, March 01, 2022',
            '6_0': 'Wednesday, March 02, 2022',
            '7_0': 'Wednesday, March 02, 2022',
        })
    assert res == 6


def test_table_with_merged_cells_2(caplog):
    caplog.set_level(logging.DEBUG)
    res = _test_table_with_merged_cells("tables_with_merged_cells_sample2.json", {'1_0': '02/02/22', '2_0': '02/02/22'})
    assert res == 2


def test_table_with_header(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "tables_with_merged_cells_sample2.json"))
    j = json.load(f)
    doc = Document(j)

    page = doc.pages[0]
    table = page.tables[1]
    header = table.header
    assert len(header) == 1
    assert len(header[0]) == 6

    rows = table.rows_without_header
    assert len(rows) == 7


def test_signature(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "paystub_with_signature.json"))
    j = json.load(f)
    doc = Document(j)
    assert doc


def test_2023_q1_table_model(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "in-table-title.json"))
    j = json.load(f)
    doc = Document(j)
    assert doc
    f = open(os.path.join(p, "data", "in-table-footer.json"))
    j = json.load(f)
    doc = Document(j)
    assert doc
    f = open(os.path.join(p, "data", "all_features_with_floating_title_header.json"))
    j = json.load(f)
    doc = Document(j)
    assert doc


def test_2023_q2_table_model(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "in-table-title.json"))
    j = json.load(f)
    doc = Document(j)
    assert doc
    f = open(os.path.join(p, "data", "in-table-footer.json"))
    j = json.load(f)
    doc = Document(j)
    assert doc
    f = open(os.path.join(p, "data", "all_features_with_floating_title_header.json"))
    j = json.load(f)
    doc = Document(j)
    assert doc
    f = open(os.path.join(p, "data", "2023-Q2-table-model-sample.json"))
    j = json.load(f)
    doc = Document(j)
    assert doc
