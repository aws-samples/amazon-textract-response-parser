# Python Built-Ins:
import json
import os

# Local Dependencies:
from trp.t_tables import ExecuteTableValidations, HeaderFooterType
from trp.trp2 import TDocument, TDocumentSchema


current_folder = os.path.dirname(os.path.realpath(__file__))


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
        1,
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
            "Relationships": [{"Type": "CHILD", "Ids": []}],
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
