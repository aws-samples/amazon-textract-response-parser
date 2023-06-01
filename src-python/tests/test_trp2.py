from typing import List
from trp.t_pipeline import add_page_orientation, order_blocks_by_geo, order_blocks_by_geo_x_y, pipeline_merge_tables, add_kv_ocr_confidence, add_orientation_to_blocks
from trp.t_tables import MergeOptions, HeaderFooterType
import trp.trp2 as t2
import time
import trp as t1
import json
import os
import pytest
from trp import Document
from uuid import uuid4
import logging
import re

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
    bb_2 = t2.TBoundingBox(0.4, 0.3, 0.1, top=0.2)    # type: ignore
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
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    new_order = order_blocks_by_geo(t_document)
    doc = t1.Document(t2.TDocumentSchema().dump(new_order))
    assert "Value 1.1.1" == doc.pages[0].tables[0].rows[0].cells[0].text.strip()
    assert "Value 2.1.1" == doc.pages[0].tables[1].rows[0].cells[0].text.strip()
    assert "Value 3.1.1" == doc.pages[0].tables[2].rows[0].cells[0].text.strip()


def test_tblock_order_block_by_geo_multi_page():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_multi_page_tables.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    t_document = order_blocks_by_geo(t_document)
    doc = t1.Document(t2.TDocumentSchema().dump(t_document))
    assert "Page 1 - Value 1.1.1" == doc.pages[0].tables[0].rows[0].cells[0].text.strip()
    assert "Page 1 - Value 2.1.1" == doc.pages[0].tables[1].rows[0].cells[0].text.strip()


def test_tblock_order_blocks_by_geo_x_y():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    new_order = order_blocks_by_geo_x_y(t_document)
    doc = t1.Document(t2.TDocumentSchema().dump(new_order))
    assert "Value 1.1.1" == doc.pages[0].tables[0].rows[0].cells[0].text.strip()
    assert "Value 2.1.1" == doc.pages[0].tables[1].rows[0].cells[0].text.strip()
    assert "Value 3.1.1" == doc.pages[0].tables[2].rows[0].cells[0].text.strip()


def test_tblock():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    new_order = order_blocks_by_geo(t_document)
    doc = t1.Document(t2.TDocumentSchema().dump(new_order))
    assert "Value 1.1.1" == doc.pages[0].tables[0].rows[0].cells[0].text.strip()
    assert "Value 2.1.1" == doc.pages[0].tables[1].rows[0].cells[0].text.strip()
    assert "Value 3.1.1" == doc.pages[0].tables[2].rows[0].cells[0].text.strip()


def test_custom_tblock():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    t_document.custom = {'testblock': {'here': 'is some fun stuff'}}
    assert 'testblock' in t2.TDocumentSchema().dumps(t_document)


def test_custom_page_orientation(json_response):
    doc = Document(json_response)
    assert 1 == len(doc.pages)
    lines = [line for line in doc.pages[0].lines]
    assert 22 == len(lines)
    words = [word for line in lines for word in line.words]
    assert 53 == len(words)
    t_document: t2.TDocument = t2.TDocumentSchema().load(json_response)    #type: ignore
    t_document.custom = {'orientation': 180}
    new_t_doc_json = t2.TDocumentSchema().dump(t_document)
    assert "Custom" in new_t_doc_json
    assert "orientation" in new_t_doc_json["Custom"]    #type: ignore
    assert new_t_doc_json["Custom"]["orientation"] == 180    #type: ignore

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    t_document = add_page_orientation(t_document)
    assert -1 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 2

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_10_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    t_document = add_page_orientation(t_document)
    assert 5 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 15

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__15_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    t_document = add_page_orientation(t_document)
    assert 10 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 20

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__25_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    t_document = add_page_orientation(t_document)
    assert 17 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 30

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__180_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    t_document = add_page_orientation(t_document)
    assert 170 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 190

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__270_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    t_document = add_page_orientation(t_document)
    assert -100 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < -80

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__90_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    t_document = add_page_orientation(t_document)
    assert 80 < t_document.pages[0].custom['PageOrientationBasedOnWords'] < 100

    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib__minus_10_degrees.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
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
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
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
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    t_document = add_page_orientation(t_document)
    new_order = order_blocks_by_geo(t_document)
    assert t1.Document(t2.TDocumentSchema().dump(new_order))
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


def test_tbbox_union():
    b1: t2.TBoundingBox = t2.TBoundingBox(width=1, height=1, left=0.5, top=0.5)
    b2: t2.TBoundingBox = t2.TBoundingBox(width=1, height=1, left=1.5, top=0.5)
    b_gt: t2.TBoundingBox = t2.TBoundingBox(width=2, height=1, left=0.5, top=0.5)
    b_union: t2.TBoundingBox = b2.union(b1)
    assert (b_union == b_gt)

    b1: t2.TBoundingBox = t2.TBoundingBox(width=1, height=1, left=0.5, top=0.5)
    b2: t2.TBoundingBox = t2.TBoundingBox(width=1, height=1, left=0.5, top=0.5)
    b_gt: t2.TBoundingBox = t2.TBoundingBox(width=1, height=1, left=0.5, top=0.5)
    b_union: t2.TBoundingBox = b2.union(b1)
    assert (b_union == b_gt)

    b1: t2.TBoundingBox = t2.TBoundingBox(width=1, height=1, left=0.5, top=0.5)
    b2: t2.TBoundingBox = t2.TBoundingBox(width=0.1, height=0.1, left=0.6, top=0.6)
    b_gt: t2.TBoundingBox = t2.TBoundingBox(width=1, height=1, left=0.5, top=0.5)
    b_union: t2.TBoundingBox = b2.union(b1)
    assert (b_union == b_gt)

    b1: t2.TBoundingBox = t2.TBoundingBox(width=1, height=1, left=0.5, top=0.5)
    b2: t2.TBoundingBox = t2.TBoundingBox(width=1, height=1, left=2, top=4)
    b_gt: t2.TBoundingBox = t2.TBoundingBox(width=2.5, height=4.5, left=0.5, top=0.5)
    b_union: t2.TBoundingBox = b2.union(b1)
    assert (b_union == b_gt)


def test_get_blocks_for_relationship(caplog):
    caplog.set_level(logging.DEBUG)

    # existing relationships
    p = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(p, "data/gib.json")) as f:
        j = json.load(f)
        t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
        # page = t_document.pages[0]
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
                child_rel.extend(t_document.get_blocks_for_relationships(
                    value_block.get_relationships_for_type()))    #type: ignore
            assert len(child_rel) == 1
        else:
            assert False


def test_block_id_map():
    p = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(p, "data/employment-application.json")) as f:
        j = json.load(f)
        tdoc: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
        assert len(tdoc.block_id_map(t2.TextractBlockTypes.PAGE)) == 1
        assert len(tdoc.block_id_map(t2.TextractBlockTypes.TABLE)) == 1
        assert len(tdoc.block_id_map(t2.TextractBlockTypes.CELL)) == 20
        assert len(tdoc.block_id_map(t2.TextractBlockTypes.LINE)) == 28
        assert len(tdoc.block_id_map(t2.TextractBlockTypes.WORD)) == 63
        assert len(tdoc.block_id_map(t2.TextractBlockTypes.KEY_VALUE_SET)) == 8
        # test some random blocks in the main hashmap (all blocks included)
        assert tdoc.block_id_map()['31ce6ec7-2d33-4d48-8968-922bdf8b6c46'] == 0    #the page
        assert tdoc.block_id_map()['7a2a9b0e-582b-4852-98bb-8e067e0b4703'] == 103    #a cell
        assert tdoc.block_id_map()['5ff46696-e06e-4577-ac3f-32a1ffde3290'] == 21    #a line
        # test some random blocks in the dedicted haspmaps
        assert tdoc.block_id_map(t2.TextractBlockTypes.PAGE)['31ce6ec7-2d33-4d48-8968-922bdf8b6c46'] == 0    # the page
        assert tdoc.block_id_map(t2.TextractBlockTypes.CELL)['7a2a9b0e-582b-4852-98bb-8e067e0b4703'] == 103    #a cell
        assert tdoc.block_id_map(t2.TextractBlockTypes.LINE)['5ff46696-e06e-4577-ac3f-32a1ffde3290'] == 21    #a line


def test_block_map():
    p = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(p, "data/employment-application.json")) as f:
        j = json.load(f)
        tdoc: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
        assert len(tdoc.block_map(t2.TextractBlockTypes.PAGE)) == 1
        assert len(tdoc.block_map(t2.TextractBlockTypes.TABLE)) == 1
        assert len(tdoc.block_map(t2.TextractBlockTypes.CELL)) == 20
        assert len(tdoc.block_map(t2.TextractBlockTypes.LINE)) == 28
        assert len(tdoc.block_map(t2.TextractBlockTypes.WORD)) == 63
        assert len(tdoc.block_map(t2.TextractBlockTypes.KEY_VALUE_SET)) == 8
        # test some random blocks in the main hashmap (all blocks included)
        assert tdoc.block_map()['31ce6ec7-2d33-4d48-8968-922bdf8b6c46'] == tdoc.blocks[0]    #the page
        assert tdoc.block_map()['7a2a9b0e-582b-4852-98bb-8e067e0b4703'] == tdoc.blocks[103]    #a cell
        assert tdoc.block_map()['5ff46696-e06e-4577-ac3f-32a1ffde3290'] == tdoc.blocks[21]    #a line
        # test some random blocks in the dedicted haspmaps
        assert tdoc.block_map(
            t2.TextractBlockTypes.PAGE)['31ce6ec7-2d33-4d48-8968-922bdf8b6c46'] == tdoc.blocks[0]    # the page
        assert tdoc.block_map(
            t2.TextractBlockTypes.CELL)['7a2a9b0e-582b-4852-98bb-8e067e0b4703'] == tdoc.blocks[103]    #a cell
        assert tdoc.block_map(
            t2.TextractBlockTypes.LINE)['5ff46696-e06e-4577-ac3f-32a1ffde3290'] == tdoc.blocks[21]    #a line


def test_find_block_by_id():
    p = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(p, "data/employment-application.json")) as f:
        j = json.load(f)
        tdoc: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
        assert tdoc.find_block_by_id('7a2a9b0e-582b-4852-98bb-8e067e0b4703') == tdoc.blocks[103]
        assert tdoc.find_block_by_id('caa21fc2-834c-463e-a668-bb94722f3fe3') == tdoc.blocks[41]
        assert tdoc.find_block_by_id('foo-bar-baz') == None


def test_get_block_by_id():
    p = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(p, "data/employment-application.json")) as f:
        j = json.load(f)
        tdoc: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
        assert tdoc.get_block_by_id('7a2a9b0e-582b-4852-98bb-8e067e0b4703') == tdoc.blocks[103]
        assert tdoc.get_block_by_id('caa21fc2-834c-463e-a668-bb94722f3fe3') == tdoc.blocks[41]
        with pytest.raises(ValueError):
            tdoc.get_block_by_id('foo-bar-baz')


def test_pages():
    p = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(p, "data/gib_multi_page_tables.json")) as f:
        j = json.load(f)
        tdoc: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
        pages_ids = [p.id for p in tdoc.pages]
        assert pages_ids == ["e8610e55-7a61-4bd0-a9ff-583a4dc69459", "5f146db3-4d4a-4add-8da1-e6828f1ce877"]


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
        t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
        page = t_document.pages[0]
        keys = list(t_document.keys(page=page))
        assert keys and len(keys) > 0
        for key_value in keys:
            child_relationship = key_value.get_relationships_for_type('CHILD')
            if child_relationship:
                for id in child_relationship.ids:
                    k_b = t_document.get_block_by_id(id=id)
            #         print(k_b.text)
            # print(' '.join([x.text for x in t_document.value_for_key(key_value)]))


def test_get_relationships_for_type(caplog):
    # existing relationships
    p = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(p, "data/gib.json")) as f:
        j = json.load(f)
        t_document: t2.TDocument = t2.TDocumentSchema().load(j)    # type: ignore
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
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    # type: ignore
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


def test_add_block():
    # add a block WITHOUT type
    p = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(p, "data/gib.json")) as f:
        j = json.load(f)
        t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
        new_block_id = str(uuid4())
        new_block = t2.TBlock(id=new_block_id)
        t_document.add_block(new_block)
        assert t_document.block_id_map()[new_block_id] == len(t_document.blocks) - 1
        # add a block WITH type
        new_block_id = str(uuid4())
        new_block = t2.TBlock(id=new_block_id, block_type="WORD")
        t_document.add_block(new_block)
        assert t_document.block_id_map()[new_block_id] == len(t_document.blocks) - 1
        assert t_document.block_id_map(t2.TextractBlockTypes.WORD)[new_block_id] == len(t_document.blocks) - 1


def test_delete_blocks():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_multi_page_tables.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    # type: ignore
    tbl_id1 = 'fed02fb4-1996-4a15-98dc-29da193cc476'
    tbl_id2 = '47c6097f-02d5-4432-8423-13c05fbfacbd'
    pre_delete_block_no = len(t_document.blocks)
    t_document.delete_blocks([tbl_id1, tbl_id2])
    post_delete_block_no = len(t_document.blocks)
    assert post_delete_block_no == pre_delete_block_no - 2
    assert tbl_id1 not in t_document.block_map()
    assert tbl_id1 not in t_document.block_id_map()
    assert tbl_id2 not in t_document.block_map()
    assert tbl_id2 not in t_document.block_id_map()
    assert tbl_id1 not in t_document.block_map(t2.TextractBlockTypes.TABLE)
    assert tbl_id1 not in t_document.block_id_map(t2.TextractBlockTypes.TABLE)
    assert tbl_id2 not in t_document.block_map(t2.TextractBlockTypes.TABLE)
    assert tbl_id2 not in t_document.block_id_map(t2.TextractBlockTypes.TABLE)


def test_link_tables():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_multi_page_tables.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    # type: ignore
    tbl_id1 = 'fed02fb4-1996-4a15-98dc-29da193cc476'
    tbl_id2 = '47c6097f-02d5-4432-8423-13c05fbfacbd'
    t_document.link_tables([[tbl_id1, tbl_id2]])
    assert t_document.get_block_by_id(tbl_id1).custom['next_table'] == tbl_id2    # type: ignore
    assert t_document.get_block_by_id(tbl_id2).custom['previous_table'] == tbl_id1    # type: ignore


def test_pipeline_merge_tables():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_multi_tables_multi_page_sample.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    # type: ignore
    tbl_id1 = '4894d2ba-0479-4196-9cbd-c0fea4d28762'
    tbl_id2 = 'b5e061ec-05be-48d5-83fc-6719fdd4397a'
    tbl_id3 = '8bbc3f4f-0354-4999-a001-4585631bb7fe'
    tbl_id4 = 'cf8e09a1-c317-40c1-9c45-e830e14167d5'
    pre_merge_tbl1_cells_no = len(t_document.get_block_by_id(tbl_id1).relationships[0].ids)    # type: ignore
    pre_merge_tbl2_cells_no = len(t_document.get_block_by_id(tbl_id2).relationships[0].ids)    # type: ignore
    pre_merge_tbl3_cells_no = len(t_document.get_block_by_id(tbl_id3).relationships[0].ids)    # type: ignore
    pre_merge_tbl4_cells_no = len(t_document.get_block_by_id(tbl_id4).relationships[0].ids)    # type: ignore
    t_document = pipeline_merge_tables(t_document, MergeOptions.MERGE, None, HeaderFooterType.NONE)    #type: ignore
    post_merge_tbl1_cells_no = len(t_document.get_block_by_id(tbl_id1).relationships[0].ids)    # type: ignore
    post_merge_tbl2_cells_no = len(t_document.get_block_by_id(tbl_id3).relationships[0].ids)    # type: ignore
    assert post_merge_tbl1_cells_no == pre_merge_tbl1_cells_no + pre_merge_tbl2_cells_no
    assert post_merge_tbl2_cells_no == pre_merge_tbl3_cells_no + pre_merge_tbl4_cells_no


def test_pipeline_merge_multiple_tables():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib_multi_tables_multi_page_sample.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    # type: ignore
    tbl_id1 = '4894d2ba-0479-4196-9cbd-c0fea4d28762'
    tbl_id2 = 'b5e061ec-05be-48d5-83fc-6719fdd4397a'
    tbl_id3 = '8bbc3f4f-0354-4999-a001-4585631bb7fe'
    tbl_id4 = 'cf8e09a1-c317-40c1-9c45-e830e14167d5'
    pre_merge_tbl1_cells_no = len(t_document.get_block_by_id(tbl_id1).relationships[0].ids)    # type: ignore
    pre_merge_tbl2_cells_no = len(t_document.get_block_by_id(tbl_id2).relationships[0].ids)    # type: ignore
    pre_merge_tbl3_cells_no = len(t_document.get_block_by_id(tbl_id3).relationships[0].ids)    # type: ignore
    pre_merge_tbl4_cells_no = len(t_document.get_block_by_id(tbl_id4).relationships[0].ids)    # type: ignore
    t_document = pipeline_merge_tables(t_document, MergeOptions.MERGE, None, HeaderFooterType.NONE)    #type: ignore
    post_merge_tbl1_cells_no = len(t_document.get_block_by_id(tbl_id1).relationships[0].ids)    # type: ignore
    post_merge_tbl2_cells_no = len(t_document.get_block_by_id(tbl_id3).relationships[0].ids)    # type: ignore
    assert post_merge_tbl1_cells_no == pre_merge_tbl1_cells_no + pre_merge_tbl2_cells_no
    assert post_merge_tbl2_cells_no == pre_merge_tbl3_cells_no + pre_merge_tbl4_cells_no


def test_kv_ocr_confidence(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/employment-application.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    # type: ignore
    t_document = add_kv_ocr_confidence(t_document)

    doc = t1.Document(t2.TDocumentSchema().dump(t_document))
    for page in doc.pages:
        k1 = page.form.getFieldByKey("Home Address:")
        assert k1.key.custom['OCRConfidence'] == {'min': 95.0, 'mean': 99.26356930202908}
        assert k1.value.custom['OCRConfidence'] == {'mean': 99.8596928914388, 'min': 99.74813079833984}
        k1 = page.form.getFieldByKey("Phone Number:")
        assert k1.key.custom['OCRConfidence'] == {'mean': 97.33475685119629, 'min': 91.0}
        assert k1.value.custom['OCRConfidence'] == {'mean': 99.23233032226562, 'min': 99.23233032226562}
        # for field in page.form.fields:
        #     print(
        #         f"{field.key.text} - {field.key.custom['OCRConfidence']}, {field.value.text} - {field.value.custom['OCRConfidence']}"
        #     )


def test_get_answers_for_query(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "queries_sample.json"))
    j = json.load(f)
    t_doc: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    page: t2.TBlock = t_doc.pages[0]
    answers = list()
    for query in t_doc.queries(page=page):
        answers.append(t_doc.get_answers_for_query(block=query))
    assert len(answers) == 9


def test_table_with_headers_and_merged_cells(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "tables_with_headers_and_merged_cells.json"))
    j = json.load(f)
    t_doc: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    page: t2.TBlock = t_doc.pages[0]
    tables: t2.TBlock = t_doc.tables(page=page)[0]


def test_bla(caplog):
    import trp as t
    import json
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "tables_with_headers_and_merged_cells.json"))
    # f = open("data/employment-application.json")
    j = json.load(f)
    d = Document(j)
    for p in d.pages:
        for t in p.tables:
            table: List[List[str]] = list()
            for r in t.rows:
                row: List[str] = list()
                for c in r.cells:
                    row.append(c.text)
                table.append(row)


def test_add_key_values_new_value_blocks(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/employment-application.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type:ignore
    test_block = t_document.add_virtual_block(text="test", page_block=t_document.pages[0], text_type="VIRTUAL")
    assert t_document.get_block_by_id(test_block.id)
    t_document.add_key_values(key_name="new_key", values=[test_block], page_block=t_document.pages[0])
    assert t_document.get_key_by_name(key_name="new_key")
    assert len(t_document.get_key_by_name(key_name="new_key")) == 1


def test_add_virtual_key_for_existing_key_multi_page(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/multi-page-forms-samples-2-page.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    assert t_document

    # page 1
    key_page_1_t_block = t_document.find_block_by_id("450b87d0-8407-4e2c-8ca6-6f669f9acb67")
    assert key_page_1_t_block
    test_block_1 = t_document.add_virtual_key_for_existing_key(key_name="TEST_PAGE_1",
                                                               existing_key=key_page_1_t_block,
                                                               page_block=t_document.pages[0])
    assert test_block_1
    rels = t_document.pages[0].get_relationships_for_type()
    assert rels
    ids = rels.ids
    assert ids
    assert [id for id in ids if test_block_1.id == id]
    assert test_block_1.page == 1

    # page 2
    key_page_1_t_block = t_document.find_block_by_id("f2749b18-d331-4097-bc52-95dfb3af959a")
    assert key_page_1_t_block
    test_block_1 = t_document.add_virtual_key_for_existing_key(key_name="TEST_PAGE_2",
                                                               existing_key=key_page_1_t_block,
                                                               page_block=t_document.pages[1])
    assert test_block_1
    rels = t_document.pages[1].get_relationships_for_type()
    assert rels
    ids = rels.ids
    assert ids
    assert [id for id in ids if test_block_1.id == id]
    assert test_block_1.page == 2


def test_paystub_with_signature(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "paystub_with_signature.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    assert t_document


def test_2023_q1_table_model(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "in-table-title.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    assert t_document

    f = open(os.path.join(p, "data", "in-table-footer.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    assert t_document

    f = open(os.path.join(p, "data", "all_features_with_floating_title_header.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    assert t_document

    f = open(os.path.join(p, "data", "2023-Q2-table-model-sample.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    assert t_document


def test_180_degree_orientation_page_and_based_on_words(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "180-degree-roation.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    assert t_document
    t_document = add_page_orientation(t_document)
    # Check orientation based on words
    assert 180 == t_document.pages[0].custom['PageOrientationBasedOnWords']
    t_document = add_orientation_to_blocks(t_document)
    # Check PAGE rotation
    assert 179.94186486482977 == t_document.pages[0].custom['Orientation']


def test_large_json(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "table-performance-pretty.json"))
    j = json.load(f)
    t_doc: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    assert t_doc


def test_process_tables_timing(caplog):
    fields = list()
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data", "table-performance-pretty.json"))
    j = json.load(f)
    t_doc: t2.TDocument = t2.TDocumentSchema().load(j)    #type: ignore
    assert t_doc
    ordered_doc = order_blocks_by_geo(t_doc)
    trp_doc = Document(t2.TDocumentSchema().dump(ordered_doc))
    page_num = 0
    table_index = 0
    for page in trp_doc.pages:
        page_num += 1
        for table in page.tables:
            try:
                table_data = []
                headers = table.get_header_field_names()    # New Table method to retrieve header column names
                if len(headers) > 0:    # Let's retain the only table with headers
                    merged_header = headers[0]
                    if len(headers) > 1:
                        for header in headers:
                            merged_header = [x if x == y else x + " " + y for x, y in zip(merged_header, header)]
                    merged_header = [re.sub(r'[^\w]+', '', x) for x in merged_header]
                    final_header = [[{
                        "displayName": " " if not x else x,
                        "key": " " if not ("".join(x.title().split())) else "".join(x.title().split())
                    } for x in merged_header]]
                    for _, row in enumerate(
                            table.rows_without_header):    # New Table attribute returning rows without headers
                        table_row = {}
                        for c, cell in enumerate(row.cells):
                            table_row[final_header[0][c].get("key")] = {
                                "name": final_header[0][c].get("key"),
                            # normal buter fieldformat
                                "value": [cell.mergedText],
                                "confidence": cell.confidence,
                                "page": page_num,
                                "coordinates": {
                                    "height": cell.geometry.boundingBox.height,
                                    "left": cell.geometry.boundingBox.left,
                                    "top": cell.geometry.boundingBox.top,
                                    "width": cell.geometry.boundingBox.width
                                } if cell.geometry else None
                            }    # New Cell attribute returning merged cells common va
                        table_data.append(table_row)
                    if len(table_data) > 0:
                        table_index += 1
                        fields.append({
                            "key": "table_" + str(table_index),
                            "value": json.dumps({
                                "headers": final_header,
                                "rows": table_data
                            }),
                            "confidence": table.confidence,
                            "page": page_num,
                            "coordinates": {
                                "height": table.geometry.boundingBox.height,
                                "left": table.geometry.boundingBox.left,
                                "top": table.geometry.boundingBox.top,
                                "width": table.geometry.boundingBox.width
                            } if table.geometry else None
                        })
            except:
                logging.error("Error parsing tabular data")


def test_tdoc_signature(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/request_for_verification_of_employment.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    # type: ignore
    page = t_document.pages[0]
    assert len(t_document.signatures(page=page)) == 3


def test_lines_in_order(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/little_women_page_1.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    # type: ignore
    page = t_document.pages[0]
    assert "The Project Gutenberg EBook of Little Women, by Louisa M. Alcott" == t_document.lines(page=page)[0].text
    assert "This eBook is for the use of anyone anywhere at no cost and with" == t_document.lines(page=page)[1].text


# >   all_points = [p.geometry.bounding_box.points for p in values]
# E   AttributeError: 'NoneType' object has no attribute 'bounding_box'
def test_create_geometry_from_blocks(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/bounding_box_issue.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)    # type: ignore
    no_geometry = t_document.find_block_by_id(id="5c860e58-deb4-4c24-8282-2394a2c535c0")
    assert no_geometry
    assert not t_document.create_geometry_from_blocks([no_geometry])
