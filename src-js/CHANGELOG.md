# Changelog

## In development (targeting 0.2.1)
### Changed
- `.geometry` on Expense result fields is now optional, as the underlying field may not be returned by Amazon Textract in some cases. Typings updated to reflect the fix. ([Issue #102](https://github.com/aws-samples/amazon-textract-response-parser/issues/102))

## 0.2.0 (2022-04-28)
### Added
- Initial support for Amazon Textract [identity document APIs](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-identity.html).
- Document-level Form field access and querying via `TextractDocument.form` in addition to `Page.form`.
- `Page.pageNumber` to find and return 1-based index of the current page in the parent document.
- New ES (esnext) module output in `dist/es` and `module` hint in package.json to encourage compatible tools to use this output.
### Changed
- Use CommonJS `dist/cjs` as default NPM module format instead of previous UMD `dist/umd`.
- Separate type declarations into `dist/types` to reduce duplication and build size.
- Use new [merged table cells](https://aws.amazon.com/about-aws/whats-new/2022/03/amazon-textract-updates-tables-check-detection/) feature by default, rather than classic split cells.
- Eliminate trailing whitespace previously automatically added to Cell.text
### Deprecated
- UMD module output `dist/umd` slated to be removed in a future version: Please let us know if the other format options don't work for you!

## 0.1.2 (2021-12-16)
### Added
- Header and footer segmentation utility (by text `LINE`)
### Changed
- Significantly improved `inReadingOrder` results for multi-column documents.
