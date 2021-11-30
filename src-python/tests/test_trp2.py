from trp.t_pipeline import add_page_orientation, order_blocks_by_geo
from typing import List
from trp.t_pipeline import add_page_orientation, order_blocks_by_geo, pipeline_merge_tables, add_kv_ocr_confidence
from trp.t_tables import MergeOptions, HeaderFooterType
import trp.trp2 as t2
import trp as t1
import json
import os
import pytest
from trp import Document
from uuid import uuid4
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
    assert -1 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 2

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_10_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert 5 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 15

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__15_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert 10 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 20

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__25_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert 17 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 30

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__180_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert 170 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 190

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__270_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert -100 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < -80

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__90_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert 80 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 100

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__minus_10_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    assert -10 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 5

    doc = t1.Document(t2.TDocumentSchema().dump(t_document))
    for page in doc.pages:
        assert page.custom['PageOrientationBasedOnWords']


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


def test_rotate_point():
    assert t2.TPoint(2, 2) == t2.TPoint(2, 2)

    p = t2.TPoint(2, 2).rotate(degrees=180, origin_y=0, origin_x=0, force_limits=False)
    assert t2.TPoint(x=round(p.x), y=round(p.y)) == t2.TPoint(-2, -2)

    p = t2.TPoint(3, 4).rotate(degrees=-30, origin_y=0, origin_x=0, force_limits=False)
    assert t2.TPoint(x=round(p.x), y=round(p.y)) == t2.TPoint(5, 2)

    p = t2.TPoint(3, 4).rotate(degrees=-77, origin_y=0, origin_x=0, force_limits=False)
    assert t2.TPoint(x=round(p.x), y=round(p.y)) == t2.TPoint(5, -2)

    p = t2.TPoint(3, 4).rotate(degrees=-90, origin_y=0, origin_x=0, force_limits=False)
    assert t2.TPoint(x=round(p.x), y=round(p.y)) == t2.TPoint(4, -3)

    p = t2.TPoint(3, 4).rotate(degrees=-270, origin_y=0, origin_x=0, force_limits=False)
    assert t2.TPoint(x=round(p.x), y=round(p.y)) == t2.TPoint(-4, 3)

    p = t2.TPoint(2, 2).rotate(degrees=180, origin_x=1, origin_y=1)
    assert t2.TPoint(x=round(p.x), y=round(p.y)) == t2.TPoint(0, 0)

    p = t2.TPoint(3, 4).rotate(degrees=-30, origin_y=0, origin_x=0, force_limits=False)
    assert t2.TPoint(x=round(p.x), y=round(p.y)) == t2.TPoint(5, 2)

    p = t2.TPoint(3, 4).rotate(degrees=-77, origin_x=4, origin_y=4, force_limits=False)
    assert t2.TPoint(x=round(p.x), y=round(p.y)) == t2.TPoint(4, 5)

    p = t2.TPoint(3, 4).rotate(degrees=-90, origin_x=4, origin_y=6, force_limits=False)
    assert t2.TPoint(x=round(p.x), y=round(p.y)) == t2.TPoint(2, 7)

    p = t2.TPoint(3, 4).rotate(degrees=-270, origin_x=4, origin_y=6, force_limits=False)
    assert t2.TPoint(x=round(p.x), y=round(p.y)) == t2.TPoint(6, 5)


def test_rotate():

    points = []
    width = 0.05415758863091469
    height = 0.011691284365952015
    left = 0.13994796574115753
    top = 0.8997916579246521
    origin: t2.TPoint = t2.TPoint(x=0.5, y=0.5)
    degrees: float = 180
    points.append(t2.TPoint(x=left, y=top).rotate(origin_x=origin.x, origin_y=origin.y, degrees=degrees))
    points.append(t2.TPoint(x=left + width, y=top).rotate(origin_x=origin.x, origin_y=origin.y, degrees=degrees))
    points.append(t2.TPoint(x=left, y=top + height).rotate(origin_x=origin.x, origin_y=origin.y, degrees=degrees))
    points.append(
        t2.TPoint(x=left + width, y=top + height).rotate(origin_x=origin.x, origin_y=origin.y, degrees=degrees))
    assert not None in points


def test_adjust_bounding_boxes_and_polygons_to_orientation():
    # p = os.path.dirname(os.path.realpath(__file__))
    # f = open(os.path.join(p, "data/gib.json"))
    # j = json.load(f)
    # t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    # t_document = add_page_orientation(t_document)
    # doc = t1.Document(t2.TDocumentSchema().dump(t_document))
    # key = "Date:"
    # fields = doc.pages[0].form.searchFieldsByKey(key)
    # for field in fields:
    #     print(f"Field: Key: {field.key}, Value: {field.value}, Geo: {field.geometry} ")

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__180_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    t_document = add_page_orientation(t_document)
    new_order = order_blocks_by_geo(t_document)
    doc = t1.Document(t2.TDocumentSchema().dump(t_document))
    # for line in doc.pages[0].lines:
    #     print("Line: {}".format(line.text))
    # print("=========================== after rotation ========================")
    # doc = t1.Document(t2.TDocumentSchema().dump(t_document))
    # key = "Date:"
    # fields = doc.pages[0].form.searchFieldsByKey(key)
    # rotate_point = t2.TPoint(x=0.5, y=0.5)
    # for field in fields:
    #     print(f"Field: Key: {field.key}, Value: {field.value}, Geo: {field.geometry} ")
    #     bbox = field.geometry.boundingBox
    #     new_point = t_pipeline.__rotate(origin=rotate_point,
    #                         point=t2.TPoint(x=bbox.left, y=bbox.top),
    #                         angle_degrees=180)
    #     print(f"new point: {new_point}")

    # FIXME: remove duplicates in relationship_recursive!
    # [b.rotate(origin=t2.TPoint(0.5, 0.5), degrees=180) for b in t_document.relationships_recursive(block=t_document.pages[0])]
    # t_document.rotate(page=t_document.pages[0], degrees=180)
    # new_order = order_blocks_by_geo(t_document)
    # with open("/Users/schadem/temp/rotation/rotate_json2.jon", "w") as out_file:
    #     out_file.write(t2.TDocumentSchema().dumps(t_document))

    # doc = t1.Document(t2.TDocumentSchema().dump(t_document))
    # for line in doc.pages[0].lines:
    #     print("Line: {}".format(line.text))

    # p = t2.TPoint(x=0.75, y=0.03)
    # p.rotate(origin_x=0.5, origin_y=0.5, degrees=180)
    # print(p)
    # new_point = rotate(origin=t2.TPoint(x=0.5, y=0.5), point = )
    # print(f"new_point: {new_point.x:.2f}, {new_point.y:.2f}")
    # print(rotate(origin=t2.TPoint(x=0.5, y=0.5), point = t2.TPoint(x=.75, y=0.03)))


def test_scale(caplog):
    p1: t2.TPoint = t2.TPoint(x=0.5, y=0.5)
    p1.scale(doc_width=10, doc_height=10)
    assert (p1 == t2.TPoint(x=5, y=5))
    b1: t2.TBoundingBox = t2.TBoundingBox(width=0.1, height=0.1, left=0.5, top=0.5)
    b1.scale(doc_width=10, doc_height=10)
    assert (b1 == t2.TBoundingBox(width=1, height=1, left=5, top=5))

    p1: t2.TPoint = t2.TPoint(x=0.5, y=0.5)
    b1: t2.TBoundingBox = t2.TBoundingBox(width=0.1, height=0.1, left=0.5, top=0.5)
    g1: t2.TGeometry = t2.TGeometry(bounding_box=b1, polygon=[p1])
    g1.scale(doc_width=10, doc_height=10)
    assert (g1 == t2.TGeometry(bounding_box=t2.TBoundingBox(width=1, height=1, left=5, top=5),
                               polygon=[t2.TPoint(x=5, y=5)]))


def test_ratio(caplog):
    p1: t2.TPoint = t2.TPoint(x=0.5, y=0.5)
    p2: t2.TPoint = t2.TPoint(x=5, y=5)
    p2.ratio(doc_width=10, doc_height=10)
    assert (p1 == p2)

    b1: t2.TBoundingBox = t2.TBoundingBox(width=0.1, height=0.1, left=0.5, top=0.5)
    b2: t2.TBoundingBox = t2.TBoundingBox(width=1, height=1, left=5, top=5)
    b2.ratio(doc_width=10, doc_height=10)
    assert (b1 == b2)

    p1: t2.TPoint = t2.TPoint(x=0.5, y=0.5)
    p2: t2.TPoint = t2.TPoint(x=5, y=5)
    b1: t2.TBoundingBox = t2.TBoundingBox(width=0.1, height=0.1, left=0.5, top=0.5)
    b2: t2.TBoundingBox = t2.TBoundingBox(width=1, height=1, left=5, top=5)

    g1: t2.TGeometry = t2.TGeometry(bounding_box=b1, polygon=[p1])
    g2: t2.TGeometry = t2.TGeometry(bounding_box=b2, polygon=[p2])

    g2.ratio(doc_width=10, doc_height=10)
    assert (g1 == g2)


def test_get_blocks_for_relationship(caplog):
    caplog.set_level(logging.DEBUG)

    # existing relationships
    p = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(p, "data/gib.json")) as f:
        j = json.load(f)
        t_document: t2.TDocument = t2.TDocumentSchema().load(j)
        page = t_document.pages[0]
        block = t_document.get_block_by_id("458a9301-8a9d-4eb2-9469-70302c62622e")
        relationships = block.get_relationships_for_type()
        relationships_value = block.get_relationships_for_type(relationship_type="VALUE")
        if relationships and relationships_value:
            rel = t_document.get_blocks_for_relationships(relationship=relationships)
            assert len(rel) == 1
            rel_value = t_document.get_blocks_for_relationships(relationship=relationships_value)
            assert len(rel_value) == 1

            child_rel: List[t2.TBlock] = list()
            for value_block in rel_value:
                child_rel.extend(t_document.get_blocks_for_relationships(value_block.get_relationships_for_type()))
            assert len(child_rel) == 1
        else:
            assert False


def test_add_ids_to_relationships(caplog):
    tdocument = t2.TDocument()
    page_block = t2.TBlock(
        id=str(uuid4()),
        block_type="PAGE",
        geometry=t2.TGeometry(bounding_box=t2.TBoundingBox(width=1, height=1, left=0, top=0),
                              polygon=[t2.TPoint(x=0, y=0), t2.TPoint(x=1, y=1)]),
    )
    tblock = t2.TBlock(id=str(uuid4()),
                       block_type="WORD",
                       text="sometest",
                       geometry=t2.TGeometry(bounding_box=t2.TBoundingBox(width=0, height=0, left=0, top=0),
                                             polygon=[t2.TPoint(x=0, y=0), t2.TPoint(x=0, y=0)]),
                       confidence=99,
                       text_type="VIRTUAL")
    tdocument.add_block(page_block)
    tdocument.add_block(tblock)
    page_block.add_ids_to_relationships([tblock.id])
    tblock.add_ids_to_relationships(["1", "2"])
    assert page_block.relationships and len(page_block.relationships) > 0
    assert tblock.relationships and len(tblock.relationships) > 0


def test_key_value_set_key_name(caplog):
    caplog.set_level(logging.DEBUG)

    # existing relationships
    p = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(p, "data/gib.json")) as f:
        j = json.load(f)
        t_document: t2.TDocument = t2.TDocumentSchema().load(j)
        page = t_document.pages[0]
        keys = list(t_document.keys(page=page))
        assert keys and len(keys) > 0
        for key_value in keys:
            child_relationship = key_value.get_relationships_for_type('CHILD')
            if child_relationship:
                for id in child_relationship.ids:
                    k_b = t_document.get_block_by_id(id=id)
                    print(k_b.text)
            print(' '.join([x.text for x in t_document.value_for_key(key_value)]))


def test_get_relationships_for_type(caplog):
    # existing relationships
    p = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(p, "data/gib.json")) as f:
        j = json.load(f)
        t_document: t2.TDocument = t2.TDocumentSchema().load(j)
        page = t_document.pages[0]
        new_block = t2.TBlock(id=str(uuid4()))
        t_document.add_block(new_block)
        page.add_ids_to_relationships([new_block.id])
        assert t_document.get_block_by_id(new_block.id) == new_block

    #empty relationships
    t_document: t2.TDocument = t2.TDocument()
    t_document.add_block(t2.TBlock(id=str(uuid4()), block_type="PAGE"))
    page = t_document.pages[0]
    new_block = t2.TBlock(id=str(uuid4()))
    t_document.add_block(new_block)
    page.add_ids_to_relationships([new_block.id])
    assert t_document.get_block_by_id(new_block.id) == new_block


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
