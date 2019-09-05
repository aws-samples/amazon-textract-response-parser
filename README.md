# Textract Response Parser

You can use Textract response parser library to easily parser JSON returned by Amazon Textract. Library parses JSON and provides programming language specific constructs to work with different parts of the document. [textractor](https://github.com/aws-samples/amazon-textract-textractor) is an example of PoC batch processing tool that takes advantage of Textract response parser library and generate output in multiple formats.

## Python Usage

```
# Call Amazon Textract and get JSON response
#  client = boto3.client('textract')
#  response = client.analyze_document(Document={...}, FeatureTypes=[...])

# Parse JSON response from Textract
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

## C# Usage

### Forms

```csharp
document.Pages.ForEach(page => {
    Console.WriteLine("Print Lines and Words:");
    page.Lines.ForEach(line => {
        Console.WriteLine("{0}--{1}", line.Text, line.Confidence);
        line.Words.ForEach(word => {
            Console.WriteLine("{0}--{1}", word.Text, word.Confidence);
        });
    });
    Console.WriteLine("Print Fields:");
    page.Form.Fields.ForEach(f => {
        Console.WriteLine("Field: Key: {0}, Value {1}", f.Key, f.Value);
    });
    Console.WriteLine("Get Field by Key:");
    var key = "Phone Number:";
    var field = page.Form.GetFieldByKey(key);
    if(field != null) {
        Console.WriteLine("Field: Key: {0}, Value: {1}", field.Key, field.Value);
    }
});
```

### Tables

```csharp
document.Pages.ForEach(page => {
    page.Tables.ForEach(table => {
        var r = 0;
        table.Rows.ForEach(row => {
            r++;
            var c = 0;
            row.Cells.ForEach(cell => {
                c++;
                Console.WriteLine("Table [{0}][{1}] = {2}--{3}", r, c, cell.Text, cell.Confidence);
            });
        });
    });
});
```

Check out the `src-csharp` folder for instructions on how to run [.NET Core C#](src-csharp/readme.md) samples

## Test

- Download [code](./src-python) on your local machine.
- Run "python3 trptest.py"
- You should see output using the sample JSON response file included in the source.

## Other Resources

- [Large scale document processing with Amazon Textract - Reference Architecture](https://github.com/aws-samples/amazon-textract-serverless-large-scale-document-processing)
- [Batch processing tool](https://github.com/aws-samples/amazon-textract-textractor)
- [Code samples](https://github.com/aws-samples/amazon-textract-code-samples)

## License Summary

This sample code is made available under the MIT-0 license. See the LICENSE file.
