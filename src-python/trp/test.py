import trp2_analyzeid as texa
import json


def return_json_for_file(filename):
    with open(filename) as test_json:
        return json.load(test_json)

resp = texa.TAnalyzeIdDocumentSchema().load(return_json_for_file('/Users/lanaz/Documents/TFC/AI:ML/Amazon-textract-response-parser/src-python/tests/data/test-trp2_analyzeid_sampe1.json'))
print(resp)