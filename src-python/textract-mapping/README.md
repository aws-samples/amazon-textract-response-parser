# Textract Response Parser to then leverage Comprehend CDK constructs 

You can use Textract-Amazon Augmented AI (A2I) response parser library to easily parser JSON returned by A2I human review workflow . 
Library parses JSON and provides programming language specific constructs to work with different parts of the document. 

## Python Usage

```
# Call Amazon Textract with A2I HumanLoop Config and get JSON response
#  client = boto3.client('textract')
#  response = client.analyze_document(Document={...}, FeatureTypes=[...], HumanLoopConfig={...})

# Parse JSON response from Textract
doc = Document(response)

# Iterate over elements in the document
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

```


## Test

- Download [code](.) on your local machine.
- Run "python3 mappingtest.py"
- You should see output using the sample JSON response file included in the source.

## Other Resources

## License Summary

This sample code is made available under the MIT-0 license. See the LICENSE file.
