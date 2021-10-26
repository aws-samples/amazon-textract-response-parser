# Textract Response Parser for JavaScript/TypeScript

This library loads [Amazon Textract](https://docs.aws.amazon.com/textract/latest/dg/what-is.html) API response JSONs into structured classes with helper methods, for easier post-processing.

It's designed to work in both NodeJS and browser environments, and to support projects in either JavaScript or TypeScript.

> ⚠️ **Warning:** If you're migrating from another TRP implementation such as the [Textract Response Parser for Python](https://github.com/aws-samples/amazon-textract-response-parser/tree/master/src-python), please note that the APIs and available features may be substantially different - due to differences between the languages' ecosystems.


## Installation

You can use TRP in your JavaScript or TypeScript NPM projects:

```sh
$ npm install amazon-textract-response-parser
```

```js
import { TextractDocument, TextractExpense } from "amazon-textract-response-parser";
const { TextractDocument, TextractExpense } = require("amazon-textract-response-parser");
```

...Or link directly in the browser - for example via the [unpkg CDN](https://unpkg.com/):

```html
<script src="https://unpkg.com/amazon-textract-response-parser@x.y.z"></script>

<script>
  // Use via `trp`:
  var doc = new trp.TextractDocument(...);
</script>
```

At a low level, the distribution of this library provides multiple builds:

- `dist/umd`, for NodeJS or other [Universal Module Definition](https://github.com/umdjs/umd)-compatible environments, and
- `dist/cjs`, specifically for CommonJS environments like NodeJS, and
- `dist/browser`, for use directly in the browser with no module framework (IIFE).

## Usage

### Loading data

Initialize a `TextractDocument` (or `TextractExpense`) by providing the parsed response JSON object from [Amazon Textract APIs](https://docs.aws.amazon.com/textract/latest/dg/API_Reference.html) such as [AnalyzeExpense](https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeExpense.html) or [GetDocumentAnalysis](https://docs.aws.amazon.com/textract/latest/dg/API_GetDocumentAnalysis.html):

```js
const doc = new TextractDocument(require("./my-analyze-document-response.json"));
```

If you're using TypeScript, you may need to **typecast** your input JSON while loading it. The `ApiResponsePage` input interface exposed and expected by this module is subtly different from - but functionally compatible with - the output types produced by the [AWS SDK for JavaScript Textract Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-textract/index.html).

```typescript
import { ApiAnalyzeExpenseResponse } from "amazon-textract-response-parser";
import { TextractClient, AnalyzeExpenseCommand } from "@aws-sdk/client-textract";
const textract = new TextractClient({});

async function main() {
  const textractResponse = await textract.send(
    new AnalyzeExpenseCommand({
      Document: { Bytes: await fs.readFile("...") },
    })
  );
  const expense = new TextractExpense((textractResponse as unknown) as ApiAnalyzeExpenseResponse);
}
```

### Analysis Features

With your data loaded in to a TRP `TextractDocument` or `TextractExpense`, you can take advantage of the higher-level functionality to navigate and analyze the result.

For example with a Document result:

```typescript
// Navigate the document hierarchy:
console.log(`Opened doc with ${doc.nPages} pages`);
console.log(`The first word of the first line is ${doc.pageNumber(1).lineAtIndex(0).wordAtIndex(0).text}`);

// Iterate through content:
for (page of doc.iterPages()) {
  // (In Textract's output order...)
  for (line of page.iterLines()) {
    for (word of line.iterWords()) {
      console.log(word.text);
    }
  }
  // (...Or approximate human reading order)
  const inReadingOrder = page.getLineClustersInReadingOrder();
}

// Get snapshot arrays instead of iterators, if you need:
const linesArrsByPage = doc.listPages().map((p) => p.listLines())

// Easily access form key-value pairs:
const page = doc.pageNumber(1);
const addr = page.form.getFieldByKey("Address").value?.text;

// ...and tables:
const firstTable = page.nTables ? page.tableAtIndex(0) : null;
const header_strs = firstTable?.cellsAt(1, null)?.map(cell => cell.text);

// Check the average angle/skew of detected text:
const skew = page.getModalWordOrientationDegrees();
```

...Or with an Expense result:

```typescript
// Iterate through content:
console.log(`Found ${expense.nDocs} expense docs in file`);
const expenseDoc = [...expense.iterDocs()][0];
for (const group of expenseDoc.iterLineItemGroups()) {
  for (const item of group.iterLineItems()) {
    console.log(`Found line item with ${item.nFields} fields`);
    for (const field of item.iterFields()) {
      ...
    }
  }
}

// Get snapshot arrays instead of iterators, if you need:
const summaryFieldsArrByDoc = expense.listDocs().map((doc) => doc.listSummaryFields());
const linesArrsByPage = doc.listPages().map((p) => p.listLines())

// Retrieve item fields by their tagged 'type':
const vendorNameFields = expenseDoc.searchSummaryFieldsByType("VENDOR_NAME");
console.log(`Found ${vendorNameFields.length} vendor name fields in doc summary`);
console.log(vendorNameFields[0].fieldType.text); // "VENDOR_NAME"
console.log(vendorNameFields[0].value.text); // e.g. "Amazon.com"
```

For more examples of the features of the library, you can refer to the [tests](tests/) folder and/or the source code. If you have suggestions for additional features that would be useful, please open a GitHub issue!

### Mutation operations

Easier analysis and querying of Textract results is useful, but what if you want to augment or edit your Textract JSONs with JS/TS Textract Response Parser?

In general:

- Where the library classes (`TextractDocument`, `Page`, `Word`, etc) offer mutation operations, these should modify the source API JSON object in-place and ensure self-consistency.
- For library classes that are backed by a specific object in the source API JSON, you can access it via the `.dict` property (`word.dict`, `table.dict`, etc) but are responsible for updating any required references in other objects if making changes there.

In particular for **array properties**, you'll note that TRP generally exposes getters and iterators (such as `table.nRows`, `table.iterRows()`, `table.listRows()`, `table.cellsAt()`) rather than direct access to lists - to avoid implying that arbitrary array mutations (such as `table.rows.pop()`) are properly supported.


## Development

The integration tests for this library validate the end-to-end toolchain for calling Amazon Textract and parsing the result, so note that to run the full `npm run test` command:

1. Your environment will need to be configured with a login to AWS (e.g. via the [AWS CLI](https://aws.amazon.com/cli/))
2. Billable API requests may be made

You can alternatively run just the local/unit tests via `npm run test:unit`.
