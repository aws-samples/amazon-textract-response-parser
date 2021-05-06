import logging
import trp.trp2 as t2
from typing import List
import math
import statistics

logger = logging.getLogger(__name__)


def order_blocks_by_geo(t_document: t2.TDocument) -> t2.TDocument:
    """
    takes in a Textract JSON response and outputs a Textract JSON response schema which has the elements sorted by geometry (top coordinate of bounding box)
    """
    new_order:List[t2.TBlock] = list()
    for page in t_document.pages:
        new_order.append(page)
        r = t_document.relationships_recursive(page)
        page_relationships = list(r) if r else list()
        page_blocks = sorted(page_relationships,
                                key=lambda b: b.geometry.bounding_box.top if not b.text_type=="PAGE" and b.geometry and b.geometry.bounding_box else 1)
        new_order.extend(page_blocks)
    t_document.blocks=new_order
    return t_document


def __get_degree_from_polygon(poly: List[t2.TPoint] = None) -> float:
    """
    returns degrees as float -180.0 < x < 180.0
    """
    if not poly:
        raise ValueError("no polygon given")
    point_0 = poly[0]
    point_1 = poly[1]
    orientation = math.degrees(
        math.atan2(point_1.y - point_0.y, point_1.x - point_0.x))
    return orientation


def add_page_orientation(t_document: t2.TDocument) -> t2.TDocument:
    """adds orientation as Custom attribute to Textract Schema
       is available in trp as """
    for page in t_document.pages:
        words = t2.TDocument.filter_blocks_by_type(
            block_list=t_document.get_child_relations(page=page),
            textract_block_type=[t2.TextractBlockTypes.WORD, t2.TextractBlockTypes.LINE])
        orientation = statistics.mode(
            [round(__get_degree_from_polygon(w.geometry.polygon)) for w in words])
        if page.custom:
            page.custom['Orientation'] = orientation
        else:
            page.custom = {'Orientation': orientation}
    return t_document
