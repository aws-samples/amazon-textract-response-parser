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
# j holds the Textract JSON dict
from trp.trp2 import TDocument, TDocumentSchema
t_doc = TDocumentSchema().load(j)
```

#### Serialize Textract 
```python
from trp.trp2 import TDocument, TDocumentSchema
t_doc = TDocumentSchema().dump(t_doc)
```

#### Deserialize Textract AnalyzeId JSON
```python
# j holds the Textract JSON
from trp.trp2_analyzeid import TAnalyzeIdDocument, TAnalyzeIdDocumentSchema
t_doc = TAnalyzeIdDocumentSchema().load(json.loads(j))
```
#### Serialize Textract AnalyzeId object to JSON
```python
from trp.trp2_analyzeid import TAnalyzeIdDocument, TAnalyzeIdDocumentSchema
t_doc = TAnalyzeIdDocumentSchema().dump(t_doc)
```


### Pipeline 

We added some commonly requested features as easily consumable components that modify the Textract JSON Schema and ideally don't require big changes to any  existing workflow.

#### Order blocks (WORDS, LINES, TABLE, KEY_VALUE_SET) by geometry y-axis

By default Textract does not put the elements identified in an order in the JSON response.

The sample implementation ```order_blocks_by_geo``` of a function using the Serializer/Deserializer shows how to change the structure and order the elements while maintaining the schema. This way no change is necessary to integrate with existing processing.

```bash
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
t_doc = TDocumentSchema().load(j)
# the ordered_doc has elements ordered by y-coordinate (top to bottom of page)
ordered_doc = order_blocks_by_geo(t_doc)
# send to trp for further processing logic
trp_doc = trp.Document(TDocumentSchema().dump(ordered_doc))
```

#### Page orientation in degrees

Amazon Textract supports all in-plane document rotations. However the response does not include a single number for the degree, but instead each word and line does have polygon points which can be used to calculate the degree of rotation. The following code adds this information as a custom field to Amazon Textract JSON response.

```python
from trp.t_pipeline import add_page_orientation
import trp.trp2 as t2
import trp as t1

# assign the Textract JSON dict to j
j = <call_textract(input_document="path_to_some_document (PDF, JPEG, PNG)") or your JSON dict>
t_document: t2.TDocument = t2.TDocumentSchema().load(j)
t_document = add_page_orientation(t_document)

doc = t1.Document(t2.TDocumentSchema().dump(t_document))
# page orientation can be read now for each page
for page in doc.pages:
    print(page.custom['Orientation'])
```

#### Using the pipeline on command line

The amazon-textract-response-parser package also includes a command line tool to test pipeline components like the add_page_orientation or the order_blocks_by_geo.

Here is one example of the usage (in combination with the ```amazon-textract``` command from amazon-textract-helper and the ```jq``` tool (https://stedolan.github.io/jq/))

```bash
> amazon-textract --input-document "s3://somebucket/some-multi-page-pdf.pdf" | amazon-textract-pipeline --components add_page_orientation | jq '.Blocks[] | select(.BlockType=="PAGE") | .Custom'm

{
  "Orientation": 7
}
{
  "Orientation": 11
}
...
{
  "Orientation": -7
}
{
  "Orientation": 0
}
```


#### Merge or link tables across pages

Sometimes tables start on one page and continue across the next page or pages. This component identifies if that is the case based on the number of columns and if a header is present on the subsequent table and can modify the output Textract JSON schema for down-stream processing. Other custom-logic is possible to develop for specific use cases.

The MergeOptions.MERGE combines the tables and makes them appear as one for post processing, with the drawback that the geometry information is not accuracy any longer. So overlaying with bounding boxes will not be accuracy.

The MergeOptions.LINK maintains the geometric structure and enriches the table information with links between the table elements. There is a custom['previus_table'] and custom['next_table'] attribute added to the TABLE blocks in the Textract JSON schema.

Usage is simple

```python
from trp.t_pipeline import pipeline_merge_tables
import trp.trp2 as t2

j = <call_textract(input_document="path_to_some_document (PDF, JPEG, PNG)") or your JSON dict>
t_document: t2.TDocument = t2.TDocumentSchema().load(j)
t_document = pipeline_merge_tables(t_document, MergeOptions.MERGE, None, HeaderFooterType.NONE)
```

Using from command line example

```bash
# from the root of the repository
cat src-python/tests/data/gib_multi_page_table_merge.json | amazon-textract-pipeline --components merge_tables | amazon-textract --stdin --pretty-print TABLES
# compare to cat src-python/tests/data/gib_multi_page_table_merge.json | amazon-textract --stdin --pretty-print TABLES
```

#### Add OCR confidence score to KEY and VALUE

It can be useful for some use cases to validate the confidence score for a given KEY or the VALUE from an Analyze action with FORMS feature result.

The Confidence property of a BlockType 'KEY_VALUE_SET' expresses the confidence in this particular prediction being a KEY or a VALUE, but not the confidence of the underlying text value.

Simplified example:

```json
{
    "Confidence": 95.5,
    "Geometry": {<...>},
    "Id": "v1",
    "Relationships": [{"Type": "CHILD", "Ids": ["c1"]}],
    "EntityTypes": ["VALUE"],
    "BlockType": "KEY_VALUE_SET"
},
{
    "Confidence": 99.2610092163086,
    "TextType": "PRINTED",
    "Geometry": {<...>},
    "Id": "c1",
    "Text": "2021-Apr-08",
    "BlockType": "WORD"
},
```

In this example the confidence in the prediction of the VALUE to be an actual value in a key/value relationship is 95.5.

The confidence in the actual text representation is 99.2610092163086.
For simplicity in this example the value consists of just one word, but is not limited to that and could contain multiple words.

The KV_OCR_Confidence pipeline component adds confidence scores for the underlying OCR to the JSON. After executing the example JSON will look like this:

```json
{
    "Confidence": 95.5,
    "Geometry": {<...>},
    "Id": "v1",
    "Relationships": [{"Type": "CHILD", "Ids": ["c1"]}],
    "EntityTypes": ["VALUE"],
    "BlockType": "KEY_VALUE_SET",
    "Custom": {"OCRConfidence": {"mean": 99.2610092163086, "min": 99.2610092163086}}
},
{
    "Confidence": 99.2610092163086,
    "TextType": "PRINTED",
    "Geometry": {<...>},
    "Id": "c1",
    "Text": "2021-Apr-08",
    "BlockType": "WORD"
},
```

Usage is simple

```python
from trp.t_pipeline import add_kv_ocr_confidence
import trp.trp2 as t2

j = <call_textract(input_document="path_to_some_document (PDF, JPEG, PNG)") or your JSON dict>
t_document: t2.TDocument = t2.TDocumentSchema().load(j)
t_document = add_kv_ocr_confidence(t_document)
# further processing
```

Using from command line example and validating the output:

```bash
# from the root of the repository
cat "src-python/tests/data/employment-application.json" | amazon-textract-pipeline --components kv_ocr_confidence | jq '.Blocks[] | select(.BlockType=="KEY_VALUE_SET") '
```

# Parse JSON response from Textract

```python
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

## Table Headers
Through the Table class you can retrieve header column names by calling the get_header_field_names method. By default it returns an array containing the detected column names. If the table has more than one header, the output is returned in the form an array of arrays. You may alternatively pass a custom header processor function as argument to reformat the columns list(s) according to your own requirements. Please find a code sample below.

```python

    from textractcaller.t_call import call_textract, Textract_Features
    from trp.trp2 import TDocument, TDocumentSchema
    from trp.t_pipeline import order_blocks_by_geo
    import trp
    import json

    j = call_textract(input_document="path_to_some_document (PDF, JPEG, PNG)", features=[Textract_Features.FORMS, Textract_Features.TABLES])
    t_doc = TDocumentSchema().load(j)
    ordered_doc = order_blocks_by_geo(t_doc)
    trp_doc = trp.Document(TDocumentSchema().dump(ordered_doc))
    
    page = trp_doc.pages[0]
    table = page.tables[2]

    def process_headers(header_cells):
        header_names = []
        for header in header_cells:
            s = []
            for cell in header:
                if cell._isChildOfMergedCell:
                    s.append(cell.mergedText.strip())
                else:
                    s.append(cell.text.strip())
            header_names.append(s)

        t = header_names[0]
        b = header_names[1]
        header_names = [i + " / " + j for i, j in zip(t, b)]
        return header_names


    headers = table.get_header_field_names(process_headers)

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
