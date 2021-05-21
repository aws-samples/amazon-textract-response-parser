# Textract Response Parser for JavaScript/TypeScript

This library loads [Amazon Textract](https://docs.aws.amazon.com/textract/latest/dg/what-is.html) API response JSONs into structured classes with helper methods, for easier post-processing.

It's designed to work in both NodeJS and browser environments, and to support projects in either JavaScript or TypeScript.


## Installation

This draft package is not yet published to NPM. Depending on the nature of your project, there are a few different ways you can try it out:


### For JavaScript projects

You'll need to download this source code (written in TypeScript) and then compile the JavaScript yourself.

- Download this folder to an environment where [NodeJS](https://nodejs.org/en/) is installed, and then run the following in your terminal to build the library:

```sh
# (Install the dev dependencies from package.json)
npm install --dev
# (Build the JavaScript output)
npm run build
```

- You can now copy the contents of `dist/` into your JavaScript project. For example, copying in this folder as `trp` within your codebase.

> ⚠️ **Note:** The built JS should support most modern browsers (it's [ES6](https://caniuse.com/?search=es6)) but it's **not minified** - so if you're planning to serve it direct to users at high volume, you might want to consider minifying to optimize your bandwidth usage and page load times.


### For TypeScript projects

TypeScript users can either **build** this package as described in the JavaScript instructions above, or directly copy the `src/` folder into your TypeScript project (e.g. as `trp/`) to build with the same toolchain as your project.


## Usage

For example, assuming you have the library in a local folder called `trp`:

```typescript
import { TextractDocument } from "./trp";

// Create a TextractDocument from your raw Textract response JSON:
const doc = new TextractDocument(require("./my-textract-response.json"));

// Navigate the document hierarchy:
console.log(`Opened doc with ${doc.pages.length} pages`);
console.log(`The first word of the first line is ${doc.pages[0].lines[0].words[0].text}`);

// ...Including form key-value pairs:
const addr = doc.pages[0].form.getFieldByKey("Address").value?.text;

// ...and tables:
const header_strs = doc.pages[0].tables[0].rows[0].cells.map(c => c.text);
```
