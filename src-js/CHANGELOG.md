# Changelog

## Unreleased
### Changed
- Use new [merged table cells](https://aws.amazon.com/about-aws/whats-new/2022/03/amazon-textract-updates-tables-check-detection/) feature by default, rather than classic split cells.
- Eliminate trailing whitespace automatically added to Cell.text


## 0.1.2 (2021-12-16)
### Added
- Header and footer segmentation utility (by text `LINE`)
### Changed
- Significantly improved `inReadingOrder` results for multi-column documents.
