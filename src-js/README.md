# Textract Response Parser for JavaScript/TypeScript

This library loads [Amazon Textract](https://docs.aws.amazon.com/textract/latest/dg/what-is.html) API response JSONs into structured classes with helper methods, for easier post-processing.

It's designed to work in both NodeJS and browser environments, and to support projects in either JavaScript or TypeScript.


## Installation

This draft package is not yet published to NPM. Depending on the nature of your project, there are a few different ways you can try it out:


### For JavaScript projects

You'll need to download this source code (written in TypeScript) and then compile the JavaScript yourself.

Download this folder to an environment where [NodeJS](https://nodejs.org/en/) is installed, and then run the following in your terminal to build the library:

```sh
# (Install the dev dependencies from package.json)
npm install --dev
# (Build the JavaScript output)
npm run build
```

Once the build is complete, you can use either the files in:

- `dist/umd`, for NodeJS or other [Universal Module Definition](https://github.com/umdjs/umd)-compatible environments, or
- `dist/browser`, for use directly in the browser with no module framework.

**NodeJS example:**

```js
const { TextractDocument } = require("./path/to/dist/umd"); // Probably rename the folder...
```

**Browser example:**

```html
<script src="path/to/dist/browser/trp.min.js"></script>
<!-- or -->
<script>{Contents of trp.min.js}</script>

<script>
  // Use via `trp`:
  var doc = new trp.TextractDocument(...);
</script>
```


### For TypeScript projects

TypeScript users can either **build** this package as described in the JavaScript instructions above, or directly copy the `src/` folder into your TypeScript project (e.g. as `trp/`) to build with the same toolchain as your project.


## Usage

If you're using TypeScript, you may need to typecast your input JSON while loading it. The `ApiResponsePage` interface exposed and expected by this module is subtly different from - but functionally compatible with - the output types produced by the [AWS SDK for JavaScript Textract Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-textract/index.html).

For example, assuming you have the library in a local folder called `trp`:

```typescript
import { ApiResponsePage, TextractDocument } from "./trp";

// Create a TextractDocument from your raw Textract response JSON:
const doc = new TextractDocument(require("./my-textract-response.json") as ApiResponsePage);

// Navigate the document hierarchy:
console.log(`Opened doc with ${doc.pages.length} pages`);
console.log(`The first word of the first line is ${doc.pages[0].lines[0].words[0].text}`);

// ...Including form key-value pairs:
const addr = doc.pages[0].form.getFieldByKey("Address").value?.text;

// ...and tables:
const header_strs = doc.pages[0].tables[0].rows[0].cells.map(c => c.text);
```

For more examples of how the library can be used, you can refer to the [tests](tests/) folder and/or the source code.


## Development

The integration tests for this library validate the end-to-end toolchain for calling Amazon Textract and parsing the result, so note that to run the full `npm run test` command:

1. Your environment will need to be configured with a login to AWS (e.g. via the [AWS CLI](https://aws.amazon.com/cli/))
2. Billable API requests may be made

You can alternatively run just the local/unit tests via `npm run test:unit`.
