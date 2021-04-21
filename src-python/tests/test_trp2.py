from trp.t_pipeline import order_blocks_by_geo
import trp.trp2 as t2
import trp as t1
import json
import os


def test_serialization():
    """
    testing that None values are removed when serializing
    """
    bb_1 = t2.TBoundingBox(0.4, 0.3, 0.1, top=None) # type:ignore forcing some None/null values
    bb_2 = t2.TBoundingBox(0.4, 0.3, 0.1, top=0.2)
    p1 = t2.TPoint(x=0.1, y=0.1)
    p2 = t2.TPoint(x=0.3, y=None) # type:ignore
    geo = t2.TGeometry(bounding_box=bb_1, polygon=[p1, p2])
    geo_s = t2.TGeometrySchema()
    s:str = geo_s.dumps(geo)
    assert not "null" in s
    geo = t2.TGeometry(bounding_box=bb_2, polygon=[p1, p2])
    s:str = geo_s.dumps(geo)
    assert not "null" in s


def test_tblock():
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/gib.json"))
    j = json.load(f)
    t_document:t2.TDocument = t2.TDocumentSchema().load(j)
    new_order = order_blocks_by_geo(t_document)
    doc = t1.Document(t2.TDocumentSchema().dump(new_order))
    assert "Value 1.1.1" == doc.pages[0].tables[0].rows[0].cells[0].text.strip()
    assert "Value 2.1.1" == doc.pages[0].tables[1].rows[0].cells[0].text.strip()
    assert "Value 3.1.1" == doc.pages[0].tables[2].rows[0].cells[0].text.strip()

