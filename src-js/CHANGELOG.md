# Changelog

## 0.4.3 (2024-11-19)
### Changed
- Bumped dev dependencies (including `cross-spawn`, `lint-staged`, `rollup`) for dependabot/audit
### Fixed
- `.html()` no longer fails on empty pages with no content (proposed fix for [this AWS re:Post question](https://repost.aws/questions/QU68wHh5vLSkiDC9Vt4lXXsw))

## 0.4.2 (2024-06-28)
### Added
- Filter content by block type in a variety of contexts, with `includeBlockTypes` (allow-list) and `skipBlockTypes` (deny-list) options. These filters are available in the core `iter/listContent()`, `Layout.iter/listItems()` and `LayoutItem.iter/listLayoutChildren()` accessors, but can also be used to hide certain content (like page headers and footers) when you render with `.html({...})`. ([#179](https://github.com/aws-samples/amazon-textract-response-parser/issues/179))
- Low-level relationship traversal via `iter/listRelatedItemsByRelType()` is now supported from `Page`s (PAGE blocks)
- New accessor on `SelectionElement.isSelected`, in convenient boolean format (versus the 2-member `.selectionStatus` enumeration)
- Form `Field.isCheckbox` and `FieldValue.isCheckbox`, check if a K->V field corresponds to a (label)->(checkbox) pair. Also added `{Field/FieldValue}.isSelected` and `.selectionStatus`, which return `null` for non-'checkbox' fields. (Pre-work for [#183](https://github.com/aws-samples/amazon-textract-response-parser/issues/183))
### Changed
- `WithContent` mixin options refactored to more closely mirror `IBlockTypeFilterOpts`, because WithContent now aligns to `iter/listRelatedItemsByRelType()` under the hood. This will give us more fine-grained but standardised control of missing and unexpected non-content child block type handling, per item class... But means some warning/error behaviour when parsing Textract JSON might have shifted a little (hopefully for the better).
- A page's `Layout` no longer keeps any internal list-of-items state, instead referring to the parent `PAGE` block's child relationships directly.

## 0.4.1 (2024-06-04)
### Added
- `iter/listRelatedItemsByRelType()` utility methods on all host-linked block wrapper objects, as most common use-cases for `relatedBlockIdsByRelType()` were just to then fetch the parsed wrapper for the retrieved block ID. Hope to further standardise across `childBlockIds`, `relatedBlockIdsByRelType`, and these new methods in a future release - but this might require some breaking changes to drive consistency in the handling of invalid JSONs (with missing block IDs, etc).
- `iter/listLayoutChildren()` utility methods to generically traverse (nested?) child layout elements. We support generic & recursive access, but today the only known nesting is LAYOUT_LIST->LAYOUT_TEXT.
### Fixed
- `html()`, `str()` and `text` representations of page `Layout` no longer duplicate the content of `LAYOUT_TEXT` children under `LAYOUT_LIST` obects. ([#177](https://github.com/aws-samples/amazon-textract-response-parser/issues/177))
### Deprecated
- Page `Layout.nItems` is ambiguous: Prefer `.nItemsTotal` for previous behaviour (counting all direct and indirect children) or `.nItemsDirect` to count only top-level layout items, excluding those referenced as children by others.

## 0.4.0 (2024-02-06)
### Added
- Load and navigate [Amazon Textract Layout analysis](https://aws.amazon.com/blogs/machine-learning/amazon-textracts-new-layout-feature-introduces-efficiencies-in-general-purpose-and-generative-ai-document-processing-tasks/) data. ([#164](https://github.com/aws-samples/amazon-textract-response-parser/issues/164))
- Serialize individual elements, pages and documents to semantic markup with `.html()` (for page and document level, currently depends on `Layout` being enabled).
- Proper support for [table title and footer elements](https://aws.amazon.com/blogs/machine-learning/announcing-enhanced-table-extractions-with-amazon-textract/) (`TABLE_TITLE` and `TABLE_FOOTER`) linked from tables. ([#171](https://github.com/aws-samples/amazon-textract-response-parser/issues/171))
- Support [signature detection results](https://aws.amazon.com/blogs/machine-learning/detect-signatures-on-documents-or-images-using-the-signatures-feature-in-amazon-textract/) (`SIGNATURE` blocks)
- More complete exposure of Textract API model constructs and `base.ts` utility functions in external-facing TRP API
### Changed
- **(BREAKING)** Previously-exposed `CellBase` class is removed, due to refactoring `Cell` and `MergedCell` to depend more on composable mixins and less on fragile hierarchy of (now internal) `CellBaseGeneric`. Use `Cell | MergedCell` instead for typing.
- `Page`s now explicitly track parsed objects in their scope by block ID, which reduced state tracking requirements for other objects (like `Line`, `Query`) as we work toward supporting more edit/mutation operations. See `IBlockManager.registerParsedItem()` and `.getItemByBlockId()` for details. This may result in some **minor warning & error behavior changes** when handling invalid or incomplete Textract JSON.
- Split out `api-models/document` types to better align with library components, and made some minor typing updates.
### Fixed
- `Table.nCells` now correctly reflects merged cells (instead of just counting all sub-cells).
- Support alternative `KEY` and `VALUE` blocks for Forms K-V data, observed in place of the typical `KEY_VALUE_SET` blocks for some test data files (Was this a temporary API issue? A change going forward? 🤷‍♂️)
### Deprecated
- `ApiBlockWrapper` base class is now slated to become internal-only: Please let us know if you have use-cases
- Various re-exports from `/api-modules/document` sub-module: Prefer importing direct from top-level
- `ApiAsyncJobOuputInProgress` typo superseded by `ApiAsyncJobOutputInProgress`, but original not yet fully removed

## 0.3.1 (2023-08-28)
### Fixed
- Suppress "content may be truncated" warnings when API `NextToken` is present but `null` ([#154](https://github.com/aws-samples/amazon-textract-response-parser/issues/154))
- Fix typed `TABLE_FOOTER` and `TABLE_SECTION_HEADER` EntityType values to match the [API doc](https://docs.aws.amazon.com/textract/latest/dg/API_Block.html) ([#158](https://github.com/aws-samples/amazon-textract-response-parser/issues/158))

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
