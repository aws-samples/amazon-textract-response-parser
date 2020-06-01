import json
from a2irp import Document


def processDocument(doc):
    for page in doc.pages:
        print("PAGE\n====================")
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
        key = "Policy Number:"
        print("\nGet field by key ({}):\n====================".format(key))
        f = page.form.getFieldByKey(key)
        if(f):
            print("Field: Key: {}, Value: {}".format(f.key.text, f.value.text))

        #Search field by key
        key = "Policy Number:"
        print("\nSearch field by key ({}):\n====================".format(key))
        fields = page.form.searchFieldsByKey(key)
        for field in fields:
            print("Field: Key: {}, Value: {}".format(field.key, field.value))

def run():
  a2iResponseParse = {}
  filePath = "a2i-response.json"
  with open(filePath, 'r') as document:
    data = json.loads(document.read())
    a2iResponseParse=data["humanAnswers"][0]["answerContent"]["AWS/Textract/AnalyzeDocument/Forms/V1"]
    document = Document(a2iResponseParse)
    processDocument(document)

run()