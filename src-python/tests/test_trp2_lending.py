import json
import os
import logging
import trp.trp2_lending as tl

current_folder = os.path.dirname(os.path.realpath(__file__))


def test_tblock(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/lending-doc-output.json"))
    j = json.load(f)
    t_lending: tl.TFullLendingDocument = tl.TFullLendingDocumentSchema().load(j)    #type: ignore
    assert t_lending


def test_tblock_no_signature(caplog):
    caplog.set_level(logging.DEBUG)
    p = os.path.dirname(os.path.realpath(__file__))
    f = open(os.path.join(p, "data/lending-package-no-signature.json"))
    j = json.load(f)
    t_lending: tl.TFullLendingDocument = tl.TFullLendingDocumentSchema().load(j)    #type: ignore
    assert t_lending
