# Textract Response Parser for JavaScript/TypeScript

This library loads [Amazon Textract](https://docs.aws.amazon.com/textract/latest/dg/what-is.html) API response JSONs into structured classes with helper methods, for easier post-processing.

It's designed to work in both NodeJS and browser environments, and to support projects in either JavaScript or TypeScript.

> ⚠️ **Warning:** If you're migrating from another TRP implementation such as the [Textract Response Parser for Python](https://github.com/aws-samples/amazon-textract-response-parser/tree/master/src-python), please note that the APIs and available features may be substantially different - due to differences between the languages' conventions and ecosystems.


## Installation

You can use TRP in your JavaScript or TypeScript NPM projects:

```sh
$ npm install amazon-textract-response-parser
```

```js
// With ES-style module imports:
import { TextractDocument, TextractExpense } from "amazon-textract-response-parser";
// Or CommonJS-style require:
const { TextractDocument, TextractIdentity } = require("amazon-textract-response-parser");
```

...Or link directly in the browser - for example via a CDN like [unpkg](https://unpkg.com/):

```html
<script src="https://unpkg.com/amazon-textract-response-parser@x.y.z"></script>

<script>
  // Use top-level classes via global `trp` object:
  var doc = new trp.TextractDocument(...);
  // Other components will be under sub-modules:
  var avg = trp.base.aggregate([1, 2, 3], trp.base.AggregationMethod.Mean);
</script>
```

To enable this, the distribution of this library provides multiple builds:

- `dist/cjs` (default `main`), for CommonJS environments like NodeJS - including most front end applications built with tools like React and Webpack.
- `dist/es` (default `module`), for ES6/ES2015/esnext capable environments.
- `dist/browser` (default `jsdelivr` and `unpkg`), for linking directly from browser HTML with no module framework (IIFE).

This means that **deep imports** will depend on your build environment, but are generally discouraged anyway and may not work correctly with TypeScript. Check out the [examples/](examples/README.md) folder on GitHub for some basic starters using the different styles.


## Loading data

Initialize a `TextractDocument` (or `TextractExpense`, `TextractIdentity`) by providing the parsed response JSON object from the corresponding [Amazon Textract APIs](https://docs.aws.amazon.com/textract/latest/dg/API_Reference.html) such as [GetDocumentAnalysis](https://docs.aws.amazon.com/textract/latest/dg/API_GetDocumentAnalysis.html), [AnalyzeID](https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeID.html), or [AnalyzeExpense](https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeExpense.html). In most cases, providing an **array** of response objects is also supported (for use when a large Amazon Textract response was split/paginated).

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

With your data loaded in to a TRP `TextractDocument` or similar, you're ready to take advantage of the higher-level TRP.js functions to navigate and analyze the result.


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
console.log(
  `The first word of the first line is ${doc.pageNumber(1).lineAtIndex(0).wordAtIndex(0).text}`
);

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

These arrays are in the raw order returned by Amazon Textract, which is not necessarily a logical human reading order especially for multi-column documents. See the *Layout analysis* and *List text in approximate reading order* sections below for extra content sorting utilities.


## Queries

The results of [Amazon Textract Queries](https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html) are accessible at the page level under `page.queries`. You can `get*` a query by exact question text or alias, or `search*` them by case-insensitive substrings:

```typescript
doc.listPages().forEach((page) => {
  // Log a quick human-readable overview of queries & answers:
  console.log(page.queries.str());

  // Get a query (and its top result's text) by exact alias:
  const customer = page.queries.getQueryByAlias("customer_name")?.topResult?.text;

  // Get possible results of a query from most to least confident:
  const shippingAddrCandidates =
    page.queries.getQueryByAlias("shipping_addr")?.listResultsByConfidence() || [];
  const shippingAddrTopConf = shippingAddrCandidates[0].confidence;

  // Seaching matches queries e.g. 'What is the Shipping Address?', 'FIND THE BILLING ADDRESS', etc
  const addrQueries = page.queries.searchQueriesByQuestion("address");
});
```


## Forms (Key-Value pairs)

As well as looping through the [form data key-value pairs](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html) in the document, you can query fields by key:

```typescript
console.log(doc.form.nFields);
const fields = doc.form.listFields();

// Exact match:
const addr = doc.form.getFieldByKey("Address").value?.text;

// Search key containing (case-insensitive):
const addresses = doc.form.searchFieldsByKey("address");
addresses.forEach((addrField) => { console.log(addrField.key.text); });
```

Note that the `Field.confidence`, `FieldKey.confidence` and `FieldValue.confidence` scores reflect confidence of the **key-value structure detection** model. For aggregated OCR confidence of their **actual text**, use `.getOcrConfidence()` instead.

You can also search form keys at the individual page level, or look up the page number for detected fields:

```typescript
const fieldByDoc = doc.form.getFieldByKey("Address");
console.log(`Detected Address on page ${fieldByDoc.parentPage.pageNumber}`);

const page = doc.pageNumber(1);
const fieldByPage = page.form.getFieldByKey("Address");
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
// Iterate over rows repeating any cells spanning multiple rows:
for (const row of table.iterRows({repeatMultiRowCells: true})) {}

// Return split sub-cells instead of merged cells when indexing:
const firstColCellFragments = table.cellsAt(null, 1, {ignoreMerged: true});
```

The `Table.confidence`, `Row.getConfidence()` and `Cell.confidence` scores reflect confidence of the **table structure detection** model. For aggregated OCR confidence of the text contained inside, use `.getOcrConfidence()` instead.

Use `Table.tableType` and `Cell.hasEntityTypes()` to explore the more advanced [entity types](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html) extracted by Amazon Textract: For example column headers, title cells, footer cells, and summary cells:

```typescript
import { ApiTableCellEntityType, ApiTableEntityType } from "amazon-textract-response-parser";

const isSemiStruct = table.tableType === ApiTableEntityType.SemiStructuredTable;
const colHeaders = table.rowAt(1).listCells()
  .filter((c) => c.hasEntityTypes(ApiTableCellEntityType.ColumnHeader));
```

For [overall table-level title and footer captions](https://aws.amazon.com/blogs/machine-learning/announcing-enhanced-table-extractions-with-amazon-textract/), see `table.listTitles()` and `table.listFooters()`, etc.


## Layout analysis

[Layout analysis in Amazon Textract](https://aws.amazon.com/blogs/machine-learning/amazon-textracts-new-layout-feature-introduces-efficiencies-in-general-purpose-and-generative-ai-document-processing-tasks/) detects higher-level semantic components than the core text Lines & Words - like paragraphs and headings. If you enabled this analysis, you can access the results through the `page.layout` collection:

```typescript
// Loop through content in implied reading order (from Layout API):
page.layout.listItems().forEach((layItem) => {
  console.log(layItem.blockType);  // There are different kinds of Layout Item
  const textLines = layItem.listTextLines();  // All Layout* items can be queried for text LINEs
  const children = layItem.listContent();  // Usually text LINEs, but sometimes other Layout* items
  console.log(layItem.text + "\n");  // ...Or you can just pull up the text
});
```

If Forms and/or Tables analyses were also enabled, you'll be able to traverse from the relevant Layout object types to these more detailed representations. **However,** because these are separate analyses the correspondence may not be 1-to-1 and TRP is having to do some reconciliation under the hood:

```typescript
import { ApiBlockType, LayoutKeyValue, LayoutTable } from "amazon-textract-response-parser";

page.layout.listItems().forEach((layItem) => {
  if (layItem.blockType === ApiBlockType.LayoutKeyValue) {
    const fields = (layItem as LayoutKeyValue).listFields(); // Probably multiple
    fields.forEach((field) => console.log(field.key.text));
  } else if (layItem.blockType === ApiBlockType.LayoutTable) {
    const tables = (layItem as LayoutTable).listTables(); // Probably just 1
    tables.forEach((table) => console.log(table.nCells));
  }
});
```


### List text in approximate reading order (with or without `Layout`)

Particularly for multi-column documents, the default output sequence for Amazon Textract `LINE`/`WORD` OCR results will likely not be the overall reading order you'd like. For best performance, enable and use the `Layout` analysis because **layout items are returned in implied reading order** as estimated by the AI service.

Alternatively, TRP.js provides a **client-side heuristic algorithm** that can attempt to sort results without Layout. There are even some configuration parameters exposed to help you tune the results for your particular domain, and test harnesses in the [tests/unit/corpus folder](tests/unit/corpus) to help you experiment via `npm run test:unit`:

```typescript
import { ReadingOrderLayoutMode } from "amazon-textract-response-parser";

// By default, we automatically use `Layout` when it's available and heuristics when it's not:
let textInReadingOrder: string = page.getTextInReadingOrder();  // Just generate text
let pseudoParas = page.getLineClustersInReadingOrder();

// You can force use of `Layout` (throwing an error if none available):
let layText = page.getTextInReadingOrder({ useLayout: ReadingOrderLayoutMode.RequireLayout });
// Or fine-tune heuristic parameters:
let layParas = page.getLineClustersInReadingOrder({
  colHOverlapThresh = 0.75,
  paraVDistTol = 0.8,
  // ...
  useLayout: ReadingOrderLayoutMode.IgnoreLayout,
});

// Lines are clustered by "paragraph"/layout element:
for (const pseudoParagraph of pseudoParas) {
  for (const line of pseudoParagraph) {
    console.log(line.text);
  }
  console.log();  // Print a gap between "paragraphs"
}
```

When configured to use Layout analysis results, these functions should be equivalent to just looping through your `page.layout.iterItems()` to get the text from each one in order.


### Render documents to semantic markup/markdown

If you'd like to use AI/ML models to further post-process your Amazon Textract results, you have a choice between those that take text-only inputs - and "multi-modal" models that can also ingest structural information (see for example [this Amazon Comprehend feature](https://aws.amazon.com/about-aws/whats-new/2021/09/amazon-comprehend-extract-entities-native-format/) and [this Amazon SageMaker sample](https://github.com/aws-samples/amazon-textract-transformer-pipeline/tree/main)). While multi-modal models work well on complex structured documents, the pace of research on text-only Large Language Models has historically been faster (perhaps because plain text data is easier to come by and work with).

**Semantic markup like HTML** provides somewhat of a middle ground where we can try to preserve the layout/form/table/etc structure Amazon Textract extracted, but still provide plain text. This may be particularly useful for working with **Generative Large Language Models** (GenAI/LLMs) like those on [Amazon Bedrock](https://aws.amazon.com/bedrock/).

```typescript
// Render HTML for individual components:
console.log(page.listTables[0].html());

// ...Or for whole pages/documents:
const docHtml = doc.html();
fs.writeFile("./my-doc.html", docHtml, (err) => {});
```

Some caveats to be aware of:

- Top-level `Page.html()` and `TextractDocument.html()` currently depend on Layout analysis being enabled, because the Layout results are used to sequence all the elements together.
- Only HTML is supported currently, but we're keen to add `.markdown()` if there's interest

If either of these affects your planned use-cases, please let us know in the GitHub issues to help prioritise!


### Segment headers and footers from main content

This is another task for which you might find [Textract Layout analysis](https://docs.aws.amazon.com/textract/latest/dg/layoutresponse.html) useful - by looping through layout items and excluding those of type 'header', 'footer', and 'page number'.

However, TRP.js also provides a heuristic function you can try instead:

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

**Note:** Unlike the `*inReadingOrder` APIs, this utility has not yet been updated to use Textract Layout analysis when it's available. That behavior might change in future.


### Calculate average skew of page text

Calculating the overall skew of a page can be useful for validation checks: For example to detect and reject a strongly skewed image which might degrade the accuracy of tables, forms, or other downstream analyses.

```typescript
// Check the average angle/skew of detected text:
const skew = page.getModalWordOrientationDegrees();
```

This method aggregates the skew to find the most common angle across all content on the page.


## Signatures

If you enabled [signature detection in Amazon Textract](https://aws.amazon.com/blogs/machine-learning/detect-signatures-on-documents-or-images-using-the-signatures-feature-in-amazon-textract/), you can check for signatures at the page level:

```typescript
// e.g. print number of signatures detected by page:
doc.listPages()
      .forEach((page, ix) => { console.log(`${page.nSignatures} signatures on page ${ix+1}`); });
// ...Or get the position of the first signature on the first page:
const bbox = doc.pageNumber(1).listSignatures()[0].geometry.boundingBox;
```


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


## Identity document objects

Similarly to expenses mentioned above, Amazon Textract offers specific APIs for [identity document analysis](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-identity.html). You can use the separate `TextractIdentity` class in this library to process these.

```typescript
import { ApiAnalyzeIdResponse, TextractIdentity } from "amazon-textract-response-parser";
import { TextractClient, AnalyzeIDCommand } from "@aws-sdk/client-textract";
const textract = new TextractClient({});

async function main() {
  const textractResponse = await textract.send(
    new AnalyzeIDCommand({
      Document: { Bytes: await fs.readFile("...") },
    })
  );
  const identity = new TextractIdentity((textractResponse as unknown) as ApiAnalyzeIdResponse);
}
```

The library implements some enumerations of known values (for field types, ID types, and so on) to make processing AnalyzeID responses a little simpler:

```typescript
import { IdDocumentType, IdFieldType } from "amazon-textract-response-parser";

const idDoc = identity.getDocAtIndex(0); // (Or iterate, list docs in a result)

if (idDoc.idType === IdDocumentType.Passport) {
  // Fetch fields by known type:
  const passNumField = idDoc.getFieldByType(IdFieldType.DocumentNumber);
  console.log(
    `Passport number ${passNumField.value}, confidence ${passNumField.valueConfidence}%`
  );

} else if (idDoc.idType === IdDocumentType.DrivingLicense) {
  // ...Or list or iterate the document's fields:
  for (const field of idDoc.iterFields()) {
    console.log(`${field.fieldTypeRaw}: ${field.valueRaw}`);
  }

} else {
  // Produce human-readable representations of fields, documents, or whole responses:
  console.log(idDoc.str());
}
```


## Mutation operations

Easier analysis and querying of Textract results is useful, but what if you want to augment or edit your Textract JSONs with JS/TS Textract Response Parser?

In general:

- Where the library classes (`TextractDocument`, `Page`, `Word`, etc) offer mutation operations, these should modify the source API JSON object **in-place** and ensure self-consistency.
- For library classes that are backed by a specific object in the source API JSON, you can access it via the `.dict` property (`word.dict`, `table.dict`, etc) but are responsible for updating any required references in other objects if making changes there.
- Any individual-block-level changes you make to the underlying API JSON should be dynamically reflected in the parsed TRP objects (e.g. overriding word text, coordinates, etc)... But changes that affect inter-block relationships are more likely to cause staleness issues.

In particular for **array properties**, you'll note that TRP generally exposes getters and iterators (such as `table.nRows`, `table.iterRows()`, `table.listRows()`, `table.cellsAt()`) rather than direct access to lists - to avoid implying that arbitrary array mutations (such as `table.rows.pop()`) are properly supported.


## Other features and examples

For more examples on how to use the library, you can refer to the (basic) [examples](examples/) and (more complete) [tests](tests/) folders on GitHub, and the source code itself. If you have suggestions for additional features that would be useful, please open a GitHub issue!


## Development

The integration tests for this library validate the end-to-end toolchain for calling Amazon Textract and parsing the result, so note that to run the full `npm run test` command:

1. Your environment will need to be configured with a login to AWS (e.g. via the [AWS CLI](https://aws.amazon.com/cli/))
2. Billable API requests may be made

You can alternatively run just the local/unit tests via `npm run test:unit`.
