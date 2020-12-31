# Textract Response Parser

You can use Textract response parser library to easily parser JSON returned by Amazon Textract. Library parses JSON and provides programming language specific constructs to work with different parts of the document. [textractor](https://github.com/aws-samples/amazon-textract-textractor) is an example of PoC batch processing tool that takes advantage of Textract response parser library and generate output in multiple formats.

## Installation

```bash
python -m pip install amazon-textract-response-parser
```

## Python Usage

```python
# Call Amazon Textract and get JSON response
#  client = boto3.client('textract')
#  response = client.analyze_document(Document={...}, FeatureTypes=[...])

# Parse JSON response from Textract
from trp import Document
doc = Document(response)

# Iterate over elements in the document
for page in doc.pages:
    # Print lines and words
    for line in page.lines:
        print("Line: {}--{}".format(line.text, line.confidence))
        for word in line.words:
            print("Word: {}--{}".format(word.text, word.confidence))

    # Print tables
    for table in page.tables:
        for r, row in enumerate(table.rows):
            for c, cell in enumerate(row.cells):
                print("Table[{}][{}] = {}-{}".format(r, c, cell.text, cell.confidence))

    # Print fields
    for field in page.form.fields:
        print("Field: Key: {}, Value: {}".format(field.key.text, field.value.text))

    # Get field by key
    key = "Phone Number:"
    field = page.form.getFieldByKey(key)
    if(field):
        print("Field: Key: {}, Value: {}".format(field.key, field.value))

    # Search fields by key
    key = "address"
    fields = page.form.searchFieldsByKey(key)
    for field in fields:
        print("Field: Key: {}, Value: {}".format(field.key, field.value))

```

## Test

- Clone the repo and run pytest

```bash
python -m pip install pytest
git clone https://github.com/aws-samples/amazon-textract-response-parser.git
cd amazon-textract-response-parser
pytest
```



## Other Resources

- [Large scale document processing with Amazon Textract - Reference Architecture](https://github.com/aws-samples/amazon-textract-serverless-large-scale-document-processing)
- [Batch processing tool](https://github.com/aws-samples/amazon-textract-textractor)
- [Code samples](https://github.com/aws-samples/amazon-textract-code-samples)

## License Summary

This sample code is made available under the Apache License Version 2.0. See the LICENSE file.
