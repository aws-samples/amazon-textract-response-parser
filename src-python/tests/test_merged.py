import json
import pytest
import os
from trp import Document

current_folder = os.path.dirname(os.path.realpath(__file__))


@pytest.mark.parametrize(
    "file_path, len_pages",
    [
        (
            "data/test_table_merged_text.json",  # noqa: E501
            1
        )
    ])
def test_merged_cells(file_path, len_pages):
    doc = Document(json.load(open(os.path.join(current_folder, file_path))))
    assert len_pages == len(doc.pages)
    table = doc.pages[0].tables[0]
    assert ["now this is the merged cell "] == [m.text for m in table.merged_cells]
    assert "now this is the merged cell" == table.rows[2].cells[0].mergedText
    assert "now this is the merged cell" == table.rows[2].cells[1].mergedText
    assert "is the merged cell " == table.rows[2].cells[1].text
    assert "now this " == table.rows[2].cells[0].text
