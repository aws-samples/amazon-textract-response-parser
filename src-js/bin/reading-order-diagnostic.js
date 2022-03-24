/**
 * Basic script to extract and save reading-order text from Amazon Textract JSONs.
 *
 * This script uses the built NodeJS library, so check your build is up-to-date! JSON files are read from
 * IN_FOLDER, parsed with the TRP, and reading-order text files output to the OUT_FOLDER. This can be a
 * helpful tool for debugging issues with (or writing corpus tests for) the 'inReadingOrder' functions.
 */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

// Node Built-Ins:
const fs = require("fs");
const path = require("path");

// Local Dependencies:
const { TextractDocument } = require("../dist/umd");

const IN_FOLDER = "test/data/corpus";
const OUT_FOLDER = "test/data/corpus-readingorder";

if (!fs.existsSync(OUT_FOLDER)) {
  fs.mkdirSync(OUT_FOLDER, { recursive: true });
}

fs.readdirSync(IN_FOLDER).forEach((file) => {
  let response;
  try {
    response = JSON.parse(fs.readFileSync(path.join(IN_FOLDER, file)));
  } catch (err) {
    console.error(`Skipping ${file} - doesn't look like valid JSON`);
    return;
  }
  const pageTexts = [];
  const doc = new TextractDocument(response);
  doc.listPages().forEach((page, ixPage) => {
    pageTexts.push(
      [
        "------------------------------------------------",
        `PAGE ${ixPage + 1}`,
        "------------------------------------------------",
        page.getTextInReadingOrder(),
      ].join("\n")
    );
  });

  const outFileRoot = path.join(OUT_FOLDER, file.split(".")[0]);
  fs.writeFileSync(`${outFileRoot}.readingorder.txt`, pageTexts.join("\n\n\n"));
  fs.writeFileSync(
    `${outFileRoot}.readingorder.json`,
    JSON.stringify(
      doc
        .listPages()
        .map((page) =>
          page._getLineClustersByColumn().map((col) => col.map((cluster) => cluster.map((line) => line.text)))
        ),
      null,
      2
    )
  );
  console.log(`Done ${file}`);
});
console.log("All done!");
