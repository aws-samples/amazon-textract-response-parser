import json
from mapping import Document


def processDocument(doc):
    for page in doc.pages:
        print("PAGE\n====================")
        print("Form (key/values)\n====================")
        for field in page['form'].fields:
            k = ""
            v = ""
            print("field --- ", field, "\n")
            if field['key']:
                k = field['key']['text']
            if field['value']:
                v = field['value']['text']
            print("Field: Key: {}, \n Value: {}".format(k, v))
            print("\nGet field by page ({}):\n====================".format(field))

        # Get field by key
        key = "Home Address:"
        # print("\nGet field by page ({}):\n====================".format(field))
        print("\nGet field by key ({}):\n====================".format(key))
        f = page['form'].getFieldByKey(key)
        # f = page.form.getMapDetails(key)
        if f:
            print("Field: Key: {}, Value: {}".format(f['key']['text'], f['value']['text']))
        #     print("Map details \n==================== END".format(f))

        # Search field by key
        key = "Home Address:"
        print("\nSearch field by key ({}):\n====================".format(key))
        fields = page['form'].searchFieldsByKey(key)
        for field in fields:
            print("Field: Key: {}, Value: {}".format(field['key'], field['value']))


def run():
    mappingResponseParse = {}
    filePath = "mapping-response.json"
    with open(filePath, 'r') as document:
        data = json.loads(document.read())
        document = Document(data)
        processDocument(document)


run()
