# Python Built-Ins:
import json
import os

# Local Dependencies:
from trp import Document
from trp.t_tables import __compare_table_headers, ExecuteTableValidations, HeaderFooterType
from trp.trp2 import TDocument, TDocumentSchema


current_folder = os.path.dirname(os.path.realpath(__file__))


def test_table_header_compare():
    """__compare_table_headers correctly matches between tables

    https://github.com/aws-samples/amazon-textract-response-parser/issues/86
    """
    with open(os.path.join(current_folder, "data/gib_multi_tables_multi_page_sample.json")) as f:
        j = json.load(f)
    doc = Document(j)
    # Load 2 tables with same column count:
    test_table_1_id = "4894d2ba-0479-4196-9cbd-c0fea4d28762"
    test_table_1 = doc.pages[0].tables[0]
    test_table_2_id = "b5e061ec-05be-48d5-83fc-6719fdd4397a"
    test_table_2 = doc.pages[1].tables[1]
    assert test_table_1.id == test_table_1_id
    assert test_table_2.id == test_table_2_id

    # compare_table_headers should return false (different text):
    assert __compare_table_headers(test_table_1, test_table_2) is False

    # Overwrite the header text to match between the two tables:
    for ix, cell in enumerate(test_table_1.rows[0].cells):
        cell.text = f"DUMMY TEXT {ix}"
    for ix, cell in enumerate(test_table_2.rows[0].cells):
        cell.text = f"DUMMY TEXT {ix}"

    # compare_table_headers should return true because the text matches:
    assert __compare_table_headers(test_table_1, test_table_2) is True


def test_execute_table_validations():
    """
    GIVEN: The source document may include preceding empty pages
    WHEN: When ExecuteTableValidations is called to propose table merge lists
    THEN: The proposed merge list is still correct

    https://github.com/aws-samples/amazon-textract-response-parser/issues/175
    """
    with open(os.path.join(current_folder, "data/gib_multi_tables_multi_page_sample.json")) as f:
        j = json.load(f)
    j["Blocks"].insert(
        0,
        {
            "BlockType": "PAGE",
            "Geometry": {
                "BoundingBox": {"Width": 1.0, "Height": 1.0, "Left": 0.0, "Top": 0.0},
                "Polygon": [
                    {"X": 0, "Y": 0.0},
                    {"X": 1.0, "Y": 0},
                    {"X": 1.0, "Y": 1.0},
                    {"X": 0.0, "Y": 1.0},
                ]
            },
            "Id": "DUMMY-EMPTY-PAGE",
            "Relationships": [],
            "Page": 0,
        },
    )

    t_document: TDocument = TDocumentSchema().load(j)
    expected_merged_tables = [
        ["4894d2ba-0479-4196-9cbd-c0fea4d28762", "b5e061ec-05be-48d5-83fc-6719fdd4397a"],
        ["8bbc3f4f-0354-4999-a001-4585631bb7fe", "cf8e09a1-c317-40c1-9c45-e830e14167d5"],
    ]

    # Initial validation checks for the test case itself:
    for merge in expected_merged_tables:
        for tbl_id in merge:
            assert t_document.get_block_by_id(tbl_id).block_type == "TABLE"

    merge_list = ExecuteTableValidations(t_document, HeaderFooterType.NONE, accuracy_percentage=98)
    assert merge_list == expected_merged_tables
