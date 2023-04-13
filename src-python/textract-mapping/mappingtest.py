import json
from mapping import Document


def processDocument(doc):
    for page in doc.pages:
        print("PAGE\n====================")
        print("Form (key/values)\n====================")
        for field in page.form.fields:
            k = ""
            v = ""
            if field.key:
                k = field.key.text
            if field.value:
                v = field.value.text
            print("Field: Key: {}, Value: {}".format(k, v))

        # Get field by key
        key = "Policy Number:"
        print("\nGet field by key ({}):\n====================".format(key))
        f = page.form.getFieldByKey(key)
        if f:
            print("Field: Key: {}, Value: {}".format(f.key.text, f.value.text))

        # Search field by key
        key = "Policy Number:"
        print("\nSearch field by key ({}):\n====================".format(key))
        fields = page.form.searchFieldsByKey(key)
        for field in fields:
            print("Field: Key: {}, Value: {}".format(field.key, field.value))


def run():
    mappingResponseParse = {}
    filePath = "mapping-response.json"
    with open(filePath, 'r') as document:
        data = json.loads(document.read())
        document = Document(data)
        print( "document", document)
        processDocument(document)


run()
