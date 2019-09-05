# Usage

## Forms

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

## Tables

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

# Test

## Prerequisites

- [Install](https://dotnet.microsoft.com/download) .NET Core
- [Install](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
  and
  [Configure](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)
  AWS CLI

Then

- Download source code to your local machine
- Run the following at a command line inside the source code folder to execute

```
dotnet run
```

# Extra

upload file to S3

```
aws s3 cp test-files/employmentapp.png s3://<your-s3-bucket>
```
