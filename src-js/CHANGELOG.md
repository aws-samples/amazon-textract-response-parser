# Changelog

## In development (targeting 0.3.1)
### Fixed
- Suppress "content may be truncated" warnings when API `NextToken` is present but `null` ([#154](https://github.com/aws-samples/amazon-textract-response-parser/issues/154))

## 0.3.0 (2023-07-31)
### Added
- **(BREAKING)** `ignoreMerged` and `repeatMultiRowCells` options on `Table` methods are now wrapped into `opts` objects for better future extensibility and clearer user code.
- Expose the `ignoreMerged` option through `Table.rowAt()`, `Table.iterRows()`, and `Table.listRows()`, to enable navigating table rows ignoring merged cells.
- Page-level access to [Amazon Textract Queries](https://docs.aws.amazon.com/textract/latest/dg/queryresponse.html) results. (Still assessing compositing architecture for a unified document-level view in future) ([#80](https://github.com/aws-samples/amazon-textract-response-parser/issues/80))
- Average OCR (text recognition) confidence is now available on form fields (and their keys and values) as well as tables, table rows, and table cells - via `getOcrConfidence()`, with configurable aggregation method (including minimum, mean, etc.).
- `EntityTypes` for tables and table cells/merged-cells are now accessible through `Table.tableType` property and `Cell.hasEntityTypes()` function - and also added to the underlying API data types. ([#78](https://github.com/aws-samples/amazon-textract-response-parser/issues/78))
### Changed
- **(BREAKING)** UMD module output `dist/umd` removed, following deprecation at v0.2.0 and no requests from users to restore it.
### Fixed
- Corrected wrongly typed `ApiCellBlock.Relationships` from an array of `ApiChildRelationship` to an optional array of same: This field may be omitted altogether when a cell is detected but has no content.
- Corrected wrongly typed `ApiKeyValueSetBlock.EntityTypes` data model from `ApiKeyValueEntityType` to an array of same.

## 0.2.2 (2023-06-19)
### Fixed
- Removed `browser` field from package.json because front end bundlers like webpack use it, and the (IIFE `dist/browser`) build it pointed to was not appropriate for these build systems. Added `jsdelivr` field in its place to help ensure direct-to-browser CDN imports continue to consume the IIFE build by default. ([Issue #139](https://github.com/aws-samples/amazon-textract-response-parser/issues/139))

## 0.2.1 (2023-05-22)
### Fixed
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
