# Textract Response Parser

You can use Textract response parser library to easily parser JSON returned by Amazon Textract. Library parses JSON and provides programming language specific constructs to work with different parts of the document. [textractor](https://github.com/aws-samples/amazon-textract-textractor) is an example of PoC batch processing tool that takes advantage of Textract response parser library and generate output in multiple formats.

## Installation

```
python -m pip install amazon-textract-response-parser
```

## Pipeline and Serializer/Deserializer

### Serializer/Deserializer

Based on the [marshmallow](https://marshmallow.readthedocs.io/en/stable/) framework, the serializer/deserializer allows for creating an object represenation of the Textract JSON response.

#### Deserialize Textract JSON
```python
# j holds the Textract JSON
from trp.trp2 import TDocument, TDocumentSchema
t_doc = TDocumentSchema().load(json.loads(j))
```

#### Serialize Textract
```python
from trp.trp2 import TDocument, TDocumentSchema
t_doc = TDocumentSchema().dump(t_doc)
```


### Pipeline order blocks

By default Textract does not put the elements identified in an order in the JSON response.

The sample implementation ```order_blocks_by_geo``` of a function using the Serializer/Deserializer shows how to change the structure and order the elements while maintaining the schema. This way no change is necessary to integrate with existing processing.

```python
# the sample code below makes use of the amazon-textract-caller
python -m pip install amazon-textract-caller
```

```python
from textractcaller.t_call import call_textract, Textract_Features
from trp.trp2 import TDocument, TDocumentSchema
from trp.t_pipeline import order_blocks_by_geo
import trp
import json

j = call_textract(input_document="path_to_some_document (PDF, JPEG, PNG)", features=[Textract_Features.FORMS, Textract_Features.TABLES])
# the t_doc will be not ordered
t_doc = TDocumentSchema().load(json.loads(j))
# the ordered_doc has elements ordered by y-coordinate (top to bottom of page)
ordered_doc = order_blocks_by_geo(t_doc)
# send to trp for further processing logic
trp_doc = trp.Document(TDocumentSchema().dump(ordered_doc))
```


## Python Usage

```
# the sample code below makes use of the amazon-textract-caller
python -m pip install amazon-textract-caller
```
from textractcaller.t_call import call_textract, Textract_Features


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

```
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
