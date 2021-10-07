import os
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

logger = logging.getLogger(__name__)

from dataclasses import dataclass, field
import uuid


def test_relationship_recursive_with_lru_cache(caplog):
    caplog.set_level(logging.DEBUG)
    # caplog.set_level(logging.DEBUG, logger='textractgeofinder')
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/patient_intake_form_sample.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    relationships = t_document.relationships_recursive(block=t_document.pages[0])
    assert relationships
    assert len(relationships) == 253


def test_selection_elements(caplog):
    caplog.set_level(logging.DEBUG)
    # caplog.set_level(logging.DEBUG, logger='textractgeofinder')
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/patient_intake_form_sample.json"))
    j = json.load(f)
    t_document: t2.TDocument = t2.TDocumentSchema().load(j)
    selection_elements_tblocks = t_document.get_blocks_by_type(block_type_enum=t2.TextractBlockTypes.SELECTION_ELEMENT)
    assert selection_elements_tblocks
    assert len(selection_elements_tblocks) == 12
    selection_elements_tblocks = t_document.get_blocks_by_type(block_type_enum=t2.TextractBlockTypes.SELECTION_ELEMENT,
                                                               page=t_document.pages[0])
    logger.debug(f"selection_elements_tblocks: {selection_elements_tblocks}")
    assert selection_elements_tblocks
    assert len(selection_elements_tblocks) == 12
