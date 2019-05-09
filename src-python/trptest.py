import json
from trp import Document

def processDocument(doc):
    for page in doc.pages:
        print("PAGE\n====================")
        for line in page.lines:
            print("Line: {}--{}".format(line.text, line.confidence))
            for word in line.words:
                print("Word: {}--{}".format(word.text, word.confidence))
        for table in page.tables:
            print("TABLE\n====================")
            for r, row in enumerate(table.rows):
                for c, cell in enumerate(row.cells):
                    print("Table[{}][{}] = {}-{}".format(r, c, cell.text, cell.confidence))
        print("Form (key/values)\n====================")
        for field in page.form.fields:
            k = ""
            v = ""
            if(field.key):
                k = field.key.text
            if(field.value):
                v = field.value.text
            print("Field: Key: {}, Value: {}".format(k,v))

        #Get field by key
        key = "Phone Number:"
        print("\nGet field by key ({}):\n====================".format(key))
        f = page.form.getFieldByKey(key)
        if(f):
            print("Field: Key: {}, Value: {}".format(f.key.text, f.value.text))

        #Search field by key
        key = "address"
        print("\nSearch field by key ({}):\n====================".format(key))
        fields = page.form.searchFieldsByKey(key)
        for field in fields:
            print("Field: Key: {}, Value: {}".format(field.key, field.value))

def run():
    response = {}
    
    filePath = "test-response.json"
    with open(filePath, 'r') as document:
        response = json.loads(document.read())

    doc = Document(response)
    processDocument(doc)

run()