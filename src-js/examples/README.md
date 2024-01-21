# Examples for TRP.js

This folder contains example projects using the Amazon Textract Response Parser for JavaScript/TypeScript from various different build environments, to help you get started.

The projects use the **local build** of the library for pre-publication testing, so you'll need to run `npm run build` in the parent `src-js` folder before they'll work. To switch to published TRP.js versions:

- For NodeJS projects, Replace the package.json relative path in `"amazon-textract-response-parser": "file:../.."` with a normal version spec like `"amazon-textract-response-parser": "^x.y.z"`, and re-run `npm install`
- For browser IIFE projects, edit the `<script>` tag in the HTML to point to your chosen CDN or downloaded `trp.min.js` location
