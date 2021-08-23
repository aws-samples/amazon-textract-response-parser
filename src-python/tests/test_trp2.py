from trp.t_pipeline import add_page_orientation, order_blocks_by_geo, pipeline_merge_tables, add_kv_ocr_confidence
from trp.t_tables import MergeOptions, HeaderFooterType
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


@pytest.fixture
def json_response():
    return return_json_for_file("test-response.json")


def test_serialization():
    """
    testing that None values are removed when serializing
    """
    bb_1 = t2.TBoundingBox(0.4, 0.3, 0.1, top=None)    # type:ignore forcing some None/null values
    bb_2 = t2.TBoundingBox(0.4, 0.3, 0.1, top=0.2)
    p1 = t2.TPoint(x=0.1, y=0.1)
    p2 = t2.TPoint(x=0.3, y=None)    # type:ignore
    geo = t2.TGeometry(bounding_box=bb_1, polygon=[p1, p2])
    geo_s = t2.TGeometrySchema()
    s: str = geo_s.dumps(geo)
    assert not "null" in s
    geo = t2.TGeometry(bounding_box=bb_2, polygon=[p1, p2])
    s: str = geo_s.dumps(geo)
    assert not "null" in s


def test_tblock_order_blocks_by_geo():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    new_order = order_blocks_by_geo(t_document)
    doc = t1.Document(t2.TDocumentSchema().dump(new_order))
    assert "Value 1.1.1" == doc.pages[0].tables[0].rows[0].cells[0].text.strip()
    assert "Value 2.1.1" == doc.pages[0].tables[1].rows[0].cells[0].text.strip()
    assert "Value 3.1.1" == doc.pages[0].tables[2].rows[0].cells[0].text.strip()


def test_tblock_order_block_by_geo_multi_page():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_multi_page_tables.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = order_blocks_by_geo(t_document)
    doc = t1.Document(t2.TDocumentSchema().dump(t_document))
    assert "Page 1 - Value 1.1.1" == doc.pages[0].tables[0].rows[0].cells[0].text.strip()
    assert "Page 1 - Value 2.1.1" == doc.pages[0].tables[1].rows[0].cells[0].text.strip()


def test_tblock():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    new_order = order_blocks_by_geo(t_document)
    doc = t1.Document(t2.TDocumentSchema().dump(new_order))
    assert "Value 1.1.1" == doc.pages[0].tables[0].rows[0].cells[0].text.strip()
    assert "Value 2.1.1" == doc.pages[0].tables[1].rows[0].cells[0].text.strip()
    assert "Value 3.1.1" == doc.pages[0].tables[2].rows[0].cells[0].text.strip()


def test_custom_tblock():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document.custom = {'testblock': {'here': 'is some fun stuff'}}
    assert 'testblock' in t2.TDocumentSchema().dumps(t_document)


def test_custom_page_orientation(json_response):
    doc = Document(json_response)
    assert 1 == len(doc.pages)
    lines = [line for line in doc.pages[0].lines]
    assert 22 == len(lines)
    words = [word for line in lines for word in line.words]
    assert 53 == len(words)
    t_document: t2.TDocument = t2.TDocumentSchema().load(json_response)
    t_document.custom = {'orientation': 180}
    new_t_doc_json = t2.TDocumentSchema().dump(t_document)
    assert "Custom" in new_t_doc_json
    assert "orientation" in new_t_doc_json["Custom"]
    assert new_t_doc_json["Custom"]["orientation"] == 180

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert -1 < t_document.pages[0].custom['Orientation'] < 2

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_10_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert 5 < t_document.pages[0].custom['Orientation'] < 15

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__15_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert 10 < t_document.pages[0].custom['Orientation'] < 20

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__25_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert 17 < t_document.pages[0].custom['Orientation'] < 30

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__180_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert 170 < t_document.pages[0].custom['Orientation'] < 190

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__270_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert -100 < t_document.pages[0].custom['Orientation'] < -80

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__90_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert 80 < t_document.pages[0].custom['Orientation'] < 100

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__minus_10_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert -10 < t_document.pages[0].custom['Orientation'] < 5

    doc = t1.Document(t2.TDocumentSchema().dump(t_document))
    for page in doc.pages:
        assert page.custom['Orientation']


def test_filter_blocks_by_type():
    block_list = [t2.TBlock(id="1", block_type=t2.TextractBlockTypes.WORD.name)]
    assert t2.TDocument.filter_blocks_by_type(block_list=block_list,
                                              textract_block_type=[t2.TextractBlockTypes.WORD]) == block_list


def test_next_token_response():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib.json"))
    j = json.load(f)
    assert j['NextToken']
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert t_document.pages[0].custom

    doc = t1.Document(t2.TDocumentSchema().dump(t_document))
    for page in doc.pages:
        print(page.custom['Orientation'])


def test_merge_tables():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_multi_page_tables.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    tbl_id1 = 'fed02fb4-1996-4a15-98dc-29da193cc476'
    tbl_id2 = '47c6097f-02d5-4432-8423-13c05fbfacbd'
    pre_merge_tbl1_cells_no = len(t_document.get_block_by_id(tbl_id1).relationships[0].ids)    # type: ignore
    pre_merge_tbl2_cells_no = len(t_document.get_block_by_id(tbl_id2).relationships[0].ids)    # type: ignore
    pre_merge_tbl1_lastcell = t_document.get_block_by_id(tbl_id1).relationships[0].ids[-1]    # type: ignore
    pre_merge_tbl2_lastcell = t_document.get_block_by_id(tbl_id2).relationships[0].ids[-1]    # type: ignore
    pre_merge_tbl1_last_row = t_document.get_block_by_id(pre_merge_tbl1_lastcell).row_index    # type: ignore
    pre_merge_tbl2_last_row = t_document.get_block_by_id(pre_merge_tbl2_lastcell).row_index    # type: ignore
    t_document.merge_tables([[tbl_id1, tbl_id2]])
    post_merge_tbl1_cells_no = len(t_document.get_block_by_id(tbl_id1).relationships[0].ids)    # type: ignore
    post_merge_tbl1_lastcell = t_document.get_block_by_id(tbl_id1).relationships[0].ids[-1]    # type: ignore
    post_merge_tbl1_last_row = t_document.get_block_by_id(post_merge_tbl1_lastcell).row_index    # type: ignore
    assert post_merge_tbl1_cells_no == pre_merge_tbl1_cells_no + pre_merge_tbl2_cells_no
    assert pre_merge_tbl2_last_row
    assert post_merge_tbl1_last_row == pre_merge_tbl1_last_row + pre_merge_tbl2_last_row    # type: ignore


def test_delete_blocks():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_multi_page_tables.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    tbl_id1 = 'fed02fb4-1996-4a15-98dc-29da193cc476'
    tbl_id2 = '47c6097f-02d5-4432-8423-13c05fbfacbd'
    pre_delete_block_no = len(t_document.blocks)
    t_document.delete_blocks([tbl_id1, tbl_id2])
    post_delete_block_no = len(t_document.blocks)
    assert post_delete_block_no == pre_delete_block_no - 2


def test_link_tables():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_multi_page_tables.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    tbl_id1 = 'fed02fb4-1996-4a15-98dc-29da193cc476'
    tbl_id2 = '47c6097f-02d5-4432-8423-13c05fbfacbd'
    t_document.link_tables([[tbl_id1, tbl_id2]])
    assert t_document.get_block_by_id(tbl_id1).custom['next_table'] == tbl_id2    # type: ignore
    assert t_document.get_block_by_id(tbl_id2).custom['previous_table'] == tbl_id1    # type: ignore


def test_pipeline_merge_tables():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_multi_page_table_merge.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    tbl_id1 = '5685498d-d196-42a7-8b40-594d6d886ca9'
    tbl_id2 = 'a9191a66-0d32-4d36-8fd6-58e6917f4ea6'
    tbl_id3 = 'e0368543-c9c3-4616-bd6c-f25e66c859b2'
    pre_merge_tbl1_cells_no = len(t_document.get_block_by_id(tbl_id1).relationships[0].ids)    # type: ignore
    pre_merge_tbl2_cells_no = len(t_document.get_block_by_id(tbl_id2).relationships[0].ids)    # type: ignore
    pre_merge_tbl3_cells_no = len(t_document.get_block_by_id(tbl_id3).relationships[0].ids)    # type: ignore
    t_document = pipeline_merge_tables(t_document, MergeOptions.MERGE, None, HeaderFooterType.NONE)
    post_merge_tbl1_cells_no = len(t_document.get_block_by_id(tbl_id1).relationships[0].ids)    # type: ignore
    assert post_merge_tbl1_cells_no == pre_merge_tbl1_cells_no + pre_merge_tbl2_cells_no + pre_merge_tbl3_cells_no


def test_kv_ocr_confidence(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/employment-application.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_kv_ocr_confidence(t_document)

    doc = t1.Document(t2.TDocumentSchema().dump(t_document))
    for page in doc.pages:
        k1 = page.form.getFieldByKey("Home Address:")
        k1.key.custom['OCRConfidence'] == {'mean': 99.60698318481445}
        k1.value.custom['OCRConfidence'] == {'mean': 99.8596928914388}
        k1 = page.form.getFieldByKey("Phone Number:")
        k1.key.custom['OCRConfidence'] == {'mean': 99.55334854125977}
        k1.value.custom['OCRConfidence'] == {'mean': 99.23233032226562}
        # for field in page.form.fields:
        #     print(
        #         f"{field.key.text} - {field.key.custom['OCRConfidence']}, {field.value.text} - {field.value.custom['OCRConfidence']}"
        #     )
