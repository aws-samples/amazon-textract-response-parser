import logging
from trp.trp2 import TDocument

logger = logging.getLogger(__name__)

def order_blocks_by_geo(t_document:TDocument)->TDocument:
    """
    takes in a Textract JSON response and outputs a Textract JSON response schema which has the elements sorted by geometry (top coordinate of bounding box)"""
    t_document.blocks = sorted(t_document.blocks, key=lambda b: b.geometry.bounding_box.top)
    return t_document
