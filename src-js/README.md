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


## Loading data

Initialize a `TextractDocument` (or `TextractExpense`) by providing the parsed response JSON object from [Amazon Textract APIs](https://docs.aws.amazon.com/textract/latest/dg/API_Reference.html) such as [AnalyzeExpense](https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeExpense.html) or [GetDocumentAnalysis](https://docs.aws.amazon.com/textract/latest/dg/API_GetDocumentAnalysis.html). Providing a list of response objects is also supported (for use when a large Amazon Textract response was split/paginated).

For example, loading a response JSON from file in NodeJS:

```js
fs.readFile("./my-analyze-document-response.json", (err, resBuffer) => {
  if (err) throw err;
  const doc = new TextractDocument(JSON.parse(resBuffer));
  // ...
});
```

If you're using TypeScript, you may need to **typecast** your input JSON while loading it.

> The `ApiResponsePage` input interface exposed and expected by this module is subtly different from - but functionally compatible with - the output types produced by the [AWS SDK for JavaScript Textract Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-textract/index.html).

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

With your data loaded in to a TRP `TextractDocument` or `TextractExpense`, you're ready to take advantage of the higher-level TRP.js functions to navigate and analyze the result.


## Generic document text navigation

In general, this library avoids directly exposing **arrays** in results (see the *Mutation operations* section below). Instead, you can use:

- `.n***` properties to count items
- `.list***()` functions to return a copy of the underlying array
- `.iter***()` functions to iterate through collections, or
- `.***At***()` functions to fetch a specific item from a collection

For example:

```typescript
// Navigate the document hierarchy:
console.log(`Opened doc with ${doc.nPages} pages`);
console.log(`The first word of the first line is ${doc.pageNumber(1).lineAtIndex(0).wordAtIndex(0).text}`);

// Iterate through content:
for (const page of doc.iterPages()) {
  // (In Textract's output order...)
  for (const line of page.iterLines()) {
    for (const word of line.iterWords()) {
      console.log(word.text);
    }
  }
}

// ...Or get snapshot arrays instead of iterators, if you need:
const linesArrsByPage = doc.listPages().map((p) => p.listLines());
```

These arrays are in the raw order returned by Amazon Textract, which is not necessarily a logical human reading order especially for multi-column documents. See the *Other generic document analyses* section below for extra content sorting utilities.


## Forms

As well as looping through the [form data key-value pairs](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html) on a page, you can query fields by key:

```typescript
const page = doc.pageNumber(1);
console.log(page.form.nFields);
const fields = page.form.listFields();

// Exact match:
const addr = page.form.getFieldByKey("Address").value?.text;

// Search key containing (case-insensitive):
const addresses = page.form.searchFieldsByKey("address");
addresses.forEach((addrField) => { console.log(addrField.key.text); });
```

## Tables

This library's table navigation tools address **[merged cells](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html) by default**, for convenience.

```typescript
console.log(page.nTables);
const table = page.tableAtIndex(0);

// Index cells by row, column, or both:
const headerStrs = table.cellsAt(1, null)?.map(cell => cell.text);
const firstColCells = table.cellsAt(null, 1);
const targetCell = table.cellAt(2, 4);

// Iterate over rows/cells:
for (const row of table.iterRows()) {
  for (const cell of row.iterCells()) {
    console.log(cell.text);
  }
}
```

Further configuration arguments can be used to change the treatment of merged cells if needed:

```typescript
// Iterate over rows repeating any cells merged across rows:
for (const row of table.iterRows(true)) {}

// Return split sub-cells instead of merged cells when indexing:
const firstColCellFragments = table.cellsAt(null, 1, true);
```


## Other generic document analyses

Some tools are built in to the library for other common but complex analyses you might want to tackle.

These analyses tackle challenging problems by way of imperfect, heuristic, rule-based methods. There are some configuration parameters exposed to help you tune the results for your particular domain (and test harnesses in the [tests/unit/corpus folder](tests/unit/corpus) to help you experiment via `npm run test:unit`). However, in certain challenging cases it might be more effective to explore different algorithms or even custom ML models.


### List text in approximate human reading order

To list `LINE`s of text in **approximate human reading order**, grouped into pseudo-**paragraphs**:

```typescript
const inReadingOrder = page.getLineClustersInReadingOrder();
for (const pseudoParagraph of inReadingOrder) {
  for (const line of pseudoParagraph) {
    console.log(line.text);
  }
  console.log();  // Print a gap between "paragraphs"
}
```


### Segment headers and footers from main content

To split headers and footers out from main content:

```typescript
const segmented = page.getLinesByLayoutArea(
  true  // (Also try to sort lines in reading order)
);

console.log("---- HEADER:")
console.log(segmented.header.map((l) => l.text).join("\n"));
console.log("\n---- CONTENT:")
console.log(segmented.content.map((l) => l.text).join("\n"));
console.log("\n---- FOOTER:")
console.log(segmented.footer.map((l) => l.text).join("\n"));
```


### Calculate average skew of page text

Calculating the overall skew of a page can be useful for validation checks: For example to detect and reject a strongly skewed image which might degrade the accuracy of tables, forms, or other downstream analyses.

```typescript
// Check the average angle/skew of detected text:
const skew = page.getModalWordOrientationDegrees();
```

This method aggregates the skew to find the most common angle across all content on the page.


## Expense (invoice and receipt) objects

Since the format of responses for Amazon Textract's [Expense results](https://docs.aws.amazon.com/textract/latest/dg/expensedocuments.html) is very different from the [general document analysis APIs](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-document-layout.html), you can use the separate `TextractExpense` class in this library to process these.

```typescript
const expense = new TextractExpense(textractResponse);

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


## Mutation operations

Easier analysis and querying of Textract results is useful, but what if you want to augment or edit your Textract JSONs with JS/TS Textract Response Parser?

In general:

- Where the library classes (`TextractDocument`, `Page`, `Word`, etc) offer mutation operations, these should modify the source API JSON object in-place and ensure self-consistency.
- For library classes that are backed by a specific object in the source API JSON, you can access it via the `.dict` property (`word.dict`, `table.dict`, etc) but are responsible for updating any required references in other objects if making changes there.

In particular for **array properties**, you'll note that TRP generally exposes getters and iterators (such as `table.nRows`, `table.iterRows()`, `table.listRows()`, `table.cellsAt()`) rather than direct access to lists - to avoid implying that arbitrary array mutations (such as `table.rows.pop()`) are properly supported.


## Other features and examples

For more examples of the features of the library, you can refer to the [tests](tests/) folder and/or the source code. If you have suggestions for additional features that would be useful, please open a GitHub issue!


## Development

The integration tests for this library validate the end-to-end toolchain for calling Amazon Textract and parsing the result, so note that to run the full `npm run test` command:

1. Your environment will need to be configured with a login to AWS (e.g. via the [AWS CLI](https://aws.amazon.com/cli/))
2. Billable API requests may be made

You can alternatively run just the local/unit tests via `npm run test:unit`.
