# Textract Response Parser

You can use Textract response parser library to easily parse JSON returned by Amazon Textract. The library parses JSON and provides programming language specific constructs to work with different parts of the document. [textractor](https://github.com/aws-samples/amazon-textract-textractor) is an example of a PoC batch processing tool that takes advantage of the Textract response parser library and generates output in multiple formats.

## Python Usage

For documentation on usage see: [src-python/README.md](src-python/README.md)

## JavaScript/TypeScript Usage

For documentation on usage see: [src-js/README.md](src-js/README.md)

## Go Usage

For documentation on usage see: [src-go/README.md](src-go/README.md)

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

## Other Resources

- [Large scale document processing with Amazon Textract - Reference Architecture](https://github.com/aws-samples/amazon-textract-serverless-large-scale-document-processing)
- [Batch processing tool](https://github.com/aws-samples/amazon-textract-textractor)
- [Code samples](https://github.com/aws-samples/amazon-textract-code-samples)

## License Summary

This sample code is made available under the Apache License V2.0 license. See the LICENSE file.
