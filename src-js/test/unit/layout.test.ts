import { ApiLayoutListBlock } from "../../src";
import { ApiBlockType, ApiRelationshipType } from "../../src/api-models/base";
import { ApiAnalyzeDocumentResponse } from "../../src/api-models/response";
import { indent } from "../../src/base";
import { LineGeneric } from "../../src/content";
import { Page, TextractDocument } from "../../src/document";
import {
  LayoutFigureGeneric,
  LayoutFooterGeneric,
  LayoutHeaderGeneric,
  LayoutKeyValueGeneric,
  LayoutListGeneric,
  LayoutPageNumberGeneric,
  LayoutSectionHeaderGeneric,
  LayoutTableGeneric,
  LayoutTextGeneric,
  LayoutTitleGeneric,
} from "../../src/layout";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const finDocResponseJson: ApiAnalyzeDocumentResponse = require("../data/financial-document-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const payStubResponseJson: ApiAnalyzeDocumentResponse = require("../data/paystub-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const taxFormResponseJson: ApiAnalyzeDocumentResponse = require("../data/form1005-response.json");

// TODO: Add tests for HTML entity escaping in the individual item types
// TODO: Consider using an HTML/DOM parser for stricter checks of complex renders?
// TODO: Functions/props on .layout to fetch different kinds of layout item as separate lists?

describe("LayoutItemBase and LayoutText", () => {
  it("exposes basic properties", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const item = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutText) as LayoutTextGeneric<Page>;
    expect(item).toBeTruthy();
    // Confidence should be 0-100 scale:
    expect(item.confidence).toStrictEqual(item.dict.Confidence);
    expect(item.confidence).toBeGreaterThan(1);
    expect(item.confidence).toBeLessThanOrEqual(100);
    expect(item.geometry.parentObject).toBe(item);
    expect(item.id).toStrictEqual(item.dict.Id);
    expect(item.parentLayout).toBe(page.layout);
    expect(item.parentPage).toBe(page);
  });

  it("exposes content which should be text Lines", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const item = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutText) as LayoutTextGeneric<Page>;
    expect(item).toBeTruthy();

    const childRels = item.dict.Relationships?.find((rel) => rel.Type === ApiRelationshipType.Child);
    // item.id == 6b065e4c-7fcc-4977-9341-5eef0cd84ead
    expect(item.nContentItems).toBeGreaterThan(0);
    expect(item.nContentItems).toStrictEqual(childRels?.Ids.length);
    const textLines = (childRels?.Ids || []).map((id) => page.getItemByBlockId(id)) as LineGeneric<Page>[];
    const contentItems = item.listContent();
    let nItems = 0;
    for (const line of item.iterContent()) {
      expect(line.blockType).toStrictEqual(ApiBlockType.Line);
      expect(line).toBeInstanceOf(LineGeneric);
      expect(line).toBe(contentItems[nItems]);
      expect(line).toBe(textLines[nItems]);
      ++nItems;
    }
    expect(nItems).toStrictEqual(item.nContentItems);
  });

  it("exposes explicit textLines matching listContent", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const item = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutText) as LayoutTextGeneric<Page>;
    expect(item).toBeTruthy();

    expect(item.nTextLines).toStrictEqual(item.nContentItems);
    const contentList = item.listContent();
    const lineList = item.listTextLines();
    expect(lineList.length).toStrictEqual(contentList.length);
    lineList.forEach((line, ixLine) => {
      expect(line).toBe(contentList[ixLine]);
    });
    let nLines = 0;
    for (const line of item.iterTextLines()) {
      expect(line).toBe(contentList[nLines]);
      ++nLines;
    }
  });

  it("navigates nested layout items", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    // LAYOUT_TEXT items don't have sub-layouts:
    const txt = page.layout
      .listItems()
      .find((ls) => ls.blockType === ApiBlockType.LayoutText) as LayoutTextGeneric<Page>;
    expect(txt).toBeTruthy();
    expect(txt.nLayoutChildrenDirect).toStrictEqual(0);
    expect(txt.nLayoutChildrenTotal).toStrictEqual(0);
    expect(txt.listLayoutChildren()).toStrictEqual([]);

    // LAYOUT_LIST items should link to LAYOUT_TEXT children:
    const lsBlock = finDocResponseJson.Blocks.find(
      (block) => block.BlockType === ApiBlockType.LayoutList,
    ) as ApiLayoutListBlock;
    const lsBlockCids = (lsBlock.Relationships || [])[0].Ids;
    expect(lsBlockCids.length).toBeGreaterThan(0);
    const ls = page.layout
      .listItems()
      .find((ls) => ls.blockType === ApiBlockType.LayoutList) as LayoutListGeneric<Page>;
    expect(ls).toBeTruthy();
    expect(ls.nLayoutChildrenDirect).toStrictEqual(lsBlockCids.length);
    expect(ls.nLayoutChildrenTotal).toStrictEqual(lsBlockCids.length);
    expect(ls.listLayoutChildren().map((c) => c.id)).toStrictEqual(lsBlockCids);
    let ix = 0;
    for (const c of ls.iterLayoutChildren()) {
      expect(c.listLayoutChildren()).toStrictEqual([]);
      expect(c.id).toStrictEqual(lsBlockCids[ix]);
      ++ix;
    }
  });

  it("filters nested layout items", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    // LAYOUT_LIST items should link to LAYOUT_TEXT children:
    const lsBlock = finDocResponseJson.Blocks.find(
      (block) => block.BlockType === ApiBlockType.LayoutList,
    ) as ApiLayoutListBlock;
    const lsBlockCids = (lsBlock.Relationships || [])[0].Ids;
    expect(lsBlockCids.length).toBeGreaterThan(0);
    const ls = page.layout
      .listItems()
      .find((ls) => ls.blockType === ApiBlockType.LayoutList) as LayoutListGeneric<Page>;
    expect(ls).toBeTruthy();
    expect(ls.listLayoutChildren().map((c) => c.id)).toStrictEqual(lsBlockCids);
    expect(
      ls.listLayoutChildren({ includeBlockTypes: [ApiBlockType.LayoutText] }).map((c) => c.id),
    ).toStrictEqual(lsBlockCids);
    expect(ls.listLayoutChildren({ includeBlockTypes: [ApiBlockType.LayoutTable] }).length).toStrictEqual(0);
    expect(ls.listLayoutChildren({ skipBlockTypes: [ApiBlockType.LayoutText] }).length).toStrictEqual(0);
  });

  it("renders semantic representations", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const item = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutText) as LayoutTextGeneric<Page>;
    expect(item).toBeTruthy();
    expect(item.nContentItems).toBeGreaterThan(1); // Check it has multiple lines

    const textLines = item.listContent();

    expect(item.text).toStrictEqual(textLines.map((l) => l.text).join("\n"));
    expect(item.str()).toStrictEqual(item.text);
    expect(item.html()).toStrictEqual(`<p>\n${indent(item.text)}\n</p>`);
  });
});

describe("LayoutFigure", () => {
  it("renders semantic representations", () => {
    const doc = new TextractDocument(payStubResponseJson);
    const page = doc.pageNumber(1);

    const fig = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutFigure) as LayoutFigureGeneric<Page>;
    expect(fig).toBeTruthy();
    // This test figure doesn't have any test content (TODO: Find or make one that does!)
    expect(fig.text).toStrictEqual("");
    expect(fig.html()).toStrictEqual('<div class="figure"></div>');
    expect(fig.str()).toStrictEqual("#### Figure ####\n################");
  });
});

describe("LayoutFooter", () => {
  it("renders semantic representations", () => {
    const doc = new TextractDocument(taxFormResponseJson);
    const page = doc.pageNumber(1);

    const foot = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutFooter) as LayoutFooterGeneric<Page>;
    expect(foot).toBeTruthy();
    expect(foot.text).toStrictEqual("Form 1005");
    expect(foot.html()).toStrictEqual(`<div class="footer-el">\n\t${foot.text}\n</div>`);
    expect(foot.str()).toStrictEqual(`---- Footer text ----\n${foot.text}\n---------------------`);
  });
});

describe("LayoutHeader", () => {
  it("renders semantic representations", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const head = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutHeader) as LayoutHeaderGeneric<Page>;
    expect(head).toBeTruthy();
    expect(head.text).toStrictEqual("IV. Administered Accounts");
    expect(head.html()).toStrictEqual(`<div class="header-el">\n\t${head.text}\n</div>`);
    expect(head.str()).toStrictEqual(`---- Header text ----\n${head.text}\n---------------------`);
  });
});

describe("LayoutKeyValue", () => {
  it("links to Form Fields when the Textract Forms feature was enabled", () => {
    const doc = new TextractDocument(taxFormResponseJson);
    const page = doc.pageNumber(1);
    const kv = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutKeyValue) as LayoutKeyValueGeneric<Page>;
    expect(kv).toBeTruthy();

    const fields = kv.listFields();
    const kvText = kv.text;
    expect(fields.length).toStrictEqual(35);
    expect(kvText).toContain(fields[0].key.text);
    expect(fields[0].key.text).toStrictEqual("1. To (Name and address of employer)");
    // Values (e.g. addresses) may be spread across different Lines so not as easy as
    // expect(kvText).toContain(fields[0].value?.text);
    expect(kvText).toContain("Carlos Salazar");
    expect(fields[2].value?.text).toContain("Carlos Salazar");

    let nFields = 0;
    for (const field of kv.iterFields()) {
      expect(field).toBe(fields[nFields]);
      expect(field.parentPage).toBe(kv.parentPage);
      ++nFields;
    }
    expect(nFields).toStrictEqual(fields.length);
  });

  it("renders semantic representations", () => {
    const doc = new TextractDocument(taxFormResponseJson);
    const page = doc.pageNumber(1);

    const kv = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutKeyValue) as LayoutKeyValueGeneric<Page>;
    expect(kv).toBeTruthy();

    expect(kv.text).toStrictEqual(
      kv
        .listContent()
        .map((line) => line.text)
        .join("\n"),
    );
    expect(kv.str()).toStrictEqual(`---- Key-value ----\n${kv.text}\n-------------------`);

    const kvHtml = kv.html();
    expect(kvHtml).toMatch(/^<div class="key-value">\n\t[^\s]/g); // Starts with HTML tag and indent
    expect(kvHtml).toMatch(/\n<\/div>$/g); // Ends with expected closing tag
    // As many <input/> tags as linked K-V fields:
    expect((kvHtml.match(/\t<input label="/g) || []).length).toStrictEqual(kv.listFields().length);
    // TODO: More fine-grained checks
  });
});

describe("LayoutPageNumber", () => {
  it("renders semantic representations", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const pgnum = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutPageNumber) as LayoutPageNumberGeneric<Page>;
    expect(pgnum).toBeTruthy();
    // This test figure doesn't have any test content (TODO: Find or make one that does!)
    expect(pgnum.text).toStrictEqual("57");
    expect(pgnum.html()).toStrictEqual(`<div class="page-num">\n\t${pgnum.text}\n</div>`);
    expect(pgnum.str()).toStrictEqual(`---- Page number: ${pgnum.text}`);
  });
});

describe("LayoutSectionHeader", () => {
  it("renders semantic representations", () => {
    const doc = new TextractDocument(payStubResponseJson);
    const page = doc.pageNumber(1);

    const head = page.layout
      .listItems()
      .find(
        (item) => item.blockType === ApiBlockType.LayoutSectionHeader,
      ) as LayoutSectionHeaderGeneric<Page>;
    expect(head).toBeTruthy();
    // This test figure doesn't have any test content (TODO: Find or make one that does!)
    expect(head.text).toStrictEqual("Earnings Statement");
    expect(head.html()).toStrictEqual(`<h2>\n\t${head.text}\n</h2>`);
    expect(head.str()).toStrictEqual("\nEarnings Statement\n------------------\n");
  });
});

describe("LayoutTable", () => {
  it("links to Table objects when the Textract Tables feature was enabled", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);
    const tab = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutTable) as LayoutTableGeneric<Page>;
    expect(tab).toBeTruthy();

    const tables = tab.listTables();
    const tabText = tab.text;
    expect(tables.length).toStrictEqual(1);
    // Cell content (e.g. addresses) may be spread across different lines, so won't work for all:
    expect(tabText).toContain(tables[0].cellAt(3, 1)?.text);
    expect(tables[0].cellAt(3, 1)?.text).toStrictEqual("Supplementary Financing Facility Subsidy Account");
    // expect(tables[0].nColumns).toStrictEqual(0);
    expect(tabText).toContain(tables[0].cellAt(12, 6)?.text);
    expect(tables[0].cellAt(12, 6)?.text).toStrictEqual("**");

    let nTables = 0;
    for (const table of tab.iterTables()) {
      expect(table).toBe(tables[nTables]);
      expect(table.parentPage).toBe(tab.parentPage);
      ++nTables;
    }
    expect(nTables).toStrictEqual(tables.length);
  });

  it("renders semantic representations", () => {
    const doc = new TextractDocument(payStubResponseJson);
    const page = doc.pageNumber(1);
    const tab = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutTable) as LayoutTableGeneric<Page>;
    expect(tab).toBeTruthy();

    // Text:
    expect(tab.listContent().length).toStrictEqual(68);
    expect(tab.text).toStrictEqual(
      tab
        .listContent()
        .map((item) => item.text)
        .join("\n"),
    );

    // HTML:
    const tabHtml = tab.html();
    const linkedTables = tab.listTables();
    expect(linkedTables.length).toStrictEqual(2);
    expect(tabHtml).toMatch(/^<div class="table">\n\t[^\s]/g); // Starts with HTML tag and indent
    expect(tabHtml).toMatch(/\t[^\s].*\n<\/div>$/g); // Ends closing HTML tag
    expect(tabHtml).toContain(indent(linkedTables[0].html()));

    // str() representation:
    const tabStr = tab.str();
    expect(tabStr).toMatch(/^|==== Table (structure unknown) ====|\n/g);
    expect(tabStr).toMatch(/\n|==================================|$/g);
    expect(tabStr).toContain(tab.text);
  });
});

describe("LayoutTitle", () => {
  it("renders semantic representations", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const head = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutTitle) as LayoutTitleGeneric<Page>;
    expect(head).toBeTruthy();
    // This test figure doesn't have any test content (TODO: Find or make one that does!)
    expect(head.text).toStrictEqual("ADMINISTERED ACCOUNTS");
    expect(head.html()).toStrictEqual(`<h1>\n\t${head.text}\n</h1>`);
    expect(head.str()).toStrictEqual("\n\nADMINISTERED ACCOUNTS\n=====================\n");
  });
});

describe("LayoutList", () => {
  it("exposes LayoutText children", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const ls = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutList) as LayoutListGeneric<Page>;
    expect(ls).toBeTruthy();
    const lsContents = ls.listContent();
    expect(lsContents.length).toBeGreaterThan(1);
    let nItems = 0;
    for (const item of ls.iterContent()) {
      expect(item.blockType).toStrictEqual(ApiBlockType.LayoutText);
      expect(item).toBeInstanceOf(LayoutTextGeneric<Page>);
      expect(item).toBe(lsContents[nItems]);
      ++nItems;
    }
    expect(nItems).toStrictEqual(lsContents.length);
    expect(ls.nContentItems).toStrictEqual(nItems);
  });

  it("exposes child LayoutTexts' textLines", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const ls = page.layout
      .listItems()
      .find((ls) => ls.blockType === ApiBlockType.LayoutList) as LayoutListGeneric<Page>;
    expect(ls).toBeTruthy();

    const expectedLineIds = ls
      .listContent()
      .map((para) => para.listContent().map((item) => item.id))
      .flat();
    const listLines = ls.listTextLines();
    expect(listLines.map((l) => l.id)).toStrictEqual(expectedLineIds);
    expect(ls.nTextLines).toStrictEqual(listLines.length);
    let nLines = 0;
    for (const line of ls.iterTextLines()) {
      expect(line.id).toStrictEqual(expectedLineIds[nLines]);
      ++nLines;
    }
  });

  it("renders bulleted .text", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const ls = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutList) as LayoutListGeneric<Page>;
    expect(ls).toBeTruthy();
    const lsText = ls.text;
    expect((lsText.match(/^ {2}-/gm) || []).length).toStrictEqual(ls.nContentItems); // As many bullets as items
    expect((lsText.match(/^\s{0,1}[^\s]/gm) || []).length).toStrictEqual(0); // No lines starting without indent
  });

  it("renders semantic representations", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const ls = page.layout
      .listItems()
      .find((item) => item.blockType === ApiBlockType.LayoutList) as LayoutListGeneric<Page>;
    expect(ls).toBeTruthy();
    expect(ls.str()).toStrictEqual(ls.text);
    const lsHtml = ls.html();
    expect(lsHtml).toMatch(/^<ul>\n\t<li>/g); // Starts with ul and li tags
    expect(lsHtml).toMatch(/<\/li>\n<\/ul>$/g); // Ends closing li and ul tags
    expect((lsHtml.match(/<li>/g) || []).length).toStrictEqual(ls.nContentItems);
    // TODO: Stricter checks?
  });
});

describe("Layout", () => {
  it("loads and navigates all layout elements per page (by default)", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);
    expect(page.layout.nItemsTotal).toStrictEqual(14);
    expect(page.layout.nItems).toStrictEqual(page.layout.nItemsTotal); // (Deprecated alias)
    expect(page.layout.parentPage).toBe(page);

    const iterAllItems = [...page.layout.iterItems()];
    const itemAllList = page.layout.listItems();
    expect(iterAllItems.length).toStrictEqual(page.layout.nItemsTotal);
    expect(itemAllList.length).toStrictEqual(page.layout.nItemsTotal);
    for (let ix = 0; ix < page.layout.nItemsTotal; ++ix) {
      expect(iterAllItems[ix]).toBe(itemAllList[ix]);
    }

    const layoutItem = itemAllList[0];
    expect(layoutItem.parentPage).toBe(page);
    expect(layoutItem.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(layoutItem.confidence).toBeLessThanOrEqual(100);
  });

  it("filters layout items by allow-listing block types", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const iterItems = [...page.layout.iterItems({ includeBlockTypes: ApiBlockType.LayoutHeader })];
    const listItems = page.layout.listItems({ includeBlockTypes: ApiBlockType.LayoutHeader });
    expect(iterItems.length).toStrictEqual(listItems.length);
    expect(listItems.length).toStrictEqual(2);
  });

  it("filters layout items by skipping block types", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const iterItems = [
      ...page.layout.iterItems({ skipBlockTypes: [ApiBlockType.LayoutHeader, ApiBlockType.LayoutFooter] }),
    ];
    const listItems = page.layout.listItems({
      skipBlockTypes: [ApiBlockType.LayoutHeader, ApiBlockType.LayoutFooter],
    });
    expect(iterItems.length).toStrictEqual(listItems.length);
    expect(listItems.length).toStrictEqual(12);
  });

  it("cannot broaden filters beyond Layout* elements", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    const iterItems = [...page.layout.iterItems({ includeBlockTypes: [ApiBlockType.Line] })];
    const listItems = page.layout.listItems({ includeBlockTypes: [ApiBlockType.Line] });
    expect(iterItems.length).toStrictEqual(0);
    expect(listItems.length).toStrictEqual(0);
  });

  it("loads and navigates top-level layout elements per page", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);
    expect(page.layout.nItemsDirect).toStrictEqual(9);
    expect(page.layout.parentPage).toBe(page);

    const iterTopItems = [...page.layout.iterItems({ deep: false })];
    const itemTopList = page.layout.listItems({ deep: false });
    expect(iterTopItems.length).toStrictEqual(page.layout.nItemsDirect);
    expect(itemTopList.length).toStrictEqual(itemTopList.length);
    const nestedChildIds = new Set<string>();
    for (let ix = 0; ix < itemTopList.length; ++ix) {
      expect(iterTopItems[ix]).toBe(itemTopList[ix]);
      iterTopItems[ix].listLayoutChildren({ deep: true }).forEach((child) => nestedChildIds.add(child.id));
    }
    expect(itemTopList.length + nestedChildIds.size).toStrictEqual(page.layout.nItemsTotal);
  });

  it("renders semantic representations", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    // Text:
    const layText = page.layout.text;
    expect(layText).toStrictEqual(
      page.layout
        .listItems({ deep: false })
        .map((item) => item.text)
        .join("\n\n"),
    );

    // str() representation:
    const layStr = page.layout.str();
    expect(layStr).toMatch(/^\n#### BEGIN PAGE LAYOUT #################\n/g);
    expect(layStr).toMatch(/\n#### END PAGE LAYOUT {3}#################\n$/g);
    expect(layStr).toContain(
      page.layout
        .listItems({ deep: false })
        .map((item) => item.str())
        .join("\n\n"),
    );

    // HTML:
    const layHtml = page.layout.html();
    expect(layHtml).toStrictEqual(
      page.layout
        .listItems({ deep: false })
        .map((item) => item.html())
        .join("\n"),
    );
  });

  it("does not duplicate content of nested layout items in semantic representations", () => {
    const doc = new TextractDocument(finDocResponseJson);
    const page = doc.pageNumber(1);

    // When LayoutList contains LayoutText children, those same LayoutText items will be listed as
    // children of PAGE. Check that we don't duplicate those nested items in semantic reprs:

    // Text:
    const layText = page.layout.text;
    expect(layText).toStrictEqual(
      page.layout
        .listItems({ deep: false })
        .map((item) => item.text)
        .join("\n\n"),
    );
    expect((layText.match(/Transfer out represents transfer to the CCR Trust/g) || []).length).toStrictEqual(
      1,
    );

    // str() representation:
    const layStr = page.layout.str();
    expect(layStr).toMatch(/^\n#### BEGIN PAGE LAYOUT #################\n/g);
    expect(layStr).toMatch(/\n#### END PAGE LAYOUT {3}#################\n$/g);
    expect(layStr).toContain(
      page.layout
        .listItems({ deep: false })
        .map((item) => item.str())
        .join("\n\n"),
    );
    expect((layStr.match(/Transfer out represents transfer to the CCR Trust/g) || []).length).toStrictEqual(
      1,
    );

    // HTML:
    const layHtml = page.layout.html();
    expect(layHtml).toStrictEqual(
      page.layout
        .listItems({ deep: false })
        .map((item) => item.html())
        .join("\n"),
    );
    expect((layHtml.match(/Transfer out represents transfer to the CCR Trust/g) || []).length).toStrictEqual(
      1,
    );
  });
});
