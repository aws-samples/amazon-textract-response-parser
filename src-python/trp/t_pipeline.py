import logging
import trp.trp2 as t2
from typing import List
import math
import statistics

logger = logging.getLogger(__name__)

def order_blocks_by_geo(t_document: t2.TDocument) -> t2.TDocument:
    # TODO: add ordering of pages by pagenumber
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

def add_orientation_to_blocks(t_document: t2.TDocument) -> t2.TDocument:
    """adds orientation as Custom attribute to all blocks """
    logger.debug("add_orientation")
    for block in t_document.blocks:
        if block and block.geometry and block.geometry.polygon:
            orientation = __get_degree_from_polygon(block.geometry.polygon)
            if block.custom:
                block.custom['Orientation'] = orientation
            else:
                block.custom = {'Orientation': orientation}
    return t_document

def add_page_orientation(t_document: t2.TDocument) -> t2.TDocument:
    """adds orientation as Custom attribute to Textract Schema
       is available in trp as """
    logger.debug("add_page_orientation")
    for page in t_document.pages:
        words = t2.TDocument.filter_blocks_by_type(
            block_list=t_document.get_child_relations(page=page),
            textract_block_type=[t2.TextractBlockTypes.WORD, t2.TextractBlockTypes.LINE])
        orientation = statistics.mode(
            [round(__get_degree_from_polygon(w.geometry.polygon)) for w in words])
        if page.custom:
            page.custom['PageOrientationBasedOnWords'] = orientation
        else:
            page.custom = {'PageOrientationBasedOnWords': orientation}
    return t_document

def add_image_size(t_document: t2.TDocument) -> t2.TDocument:
    raise Exception("not implemented yet")

def rotate_points_to_page_orientation(t_document:t2.TDocument)->t2.TDocument:
    # TODO add rotation information to document (degree and center)
    logger.debug("rotate_points_to_page_orientation")
    for page in t_document.pages:
        logger.debug(page)
        if page.custom:
            logger.debug("page.custom")
            page_rotation = - page.custom['Orientation'] 
            logger.debug(f"page_rotation: {page_rotation}")
            t_document.rotate(page=page, origin=t2.TPoint(0.5,0.5), degrees=float(page_rotation))
            page.custom['Rotation'] = {'Degrees': page_rotation,
                                       'RotationPointX': 0.5,
                                       'RotationPointY': 0.5}
    return t_document
