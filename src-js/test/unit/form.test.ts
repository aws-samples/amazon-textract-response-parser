import { ApiBlockType, ApiResponsePage } from "../../src/api-models";
import { Field, TextractDocument } from "../../src/document";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testResponseJson: ApiResponsePage = require("../data/test-response.json");

describe("Form", () => {
  it("loads and navigates form fields per page", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    expect(page.form.nFields).toStrictEqual(14);
    expect(page.form.parentPage).toBe(page);

    const iterFields = [...page.form.iterFields()];
    const fieldList = page.form.listFields();
    expect(iterFields.length).toStrictEqual(page.form.nFields);
    expect(fieldList.length).toStrictEqual(page.form.nFields);
    for (let ix = 0; ix < page.form.nFields; ++ix) {
      expect(iterFields[ix]).toBe(fieldList[ix]);
    }

    const field = fieldList[0];
    expect(field.parentForm).toBe(page.form);
    expect(field.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(field.confidence).toBeLessThanOrEqual(100);
  });

  it("loads and navigates form fields at document level", () => {
    const doc = new TextractDocument(testResponseJson);
    expect(doc.form.nFields).toStrictEqual(14);
    expect(doc.form.parentDocument).toBe(doc);

    const iterFields = [...doc.form.iterFields()];
    const fieldList = doc.form.listFields();
    expect(iterFields.length).toStrictEqual(doc.form.nFields);
    expect(fieldList.length).toStrictEqual(doc.form.nFields);
    for (let ix = 0; ix < doc.form.nFields; ++ix) {
      expect(iterFields[ix]).toBe(fieldList[ix]);
    }
    const allPageFields = ([] as Field[]).concat(...doc.listPages().map((p) => p.form.listFields()));
    allPageFields.forEach((fieldFromPages, ix) => {
      expect(fieldList[ix]).toBe(fieldFromPages);
    });

    const field = fieldList[0];
    expect(field.parentForm).toBe(doc.pageNumber(1).form);
    expect(field.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(field.confidence).toBeLessThanOrEqual(100);
  });

  it("loads correct types of form field content", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    let nFieldValWords = 0;
    let nFieldValSelEls = 0;
    for (const field of page.form.iterFields()) {
      if (field?.value) {
        for (const item of field.value.listContent()) {
          if (item.blockType === ApiBlockType.Word) {
            ++nFieldValWords;
          } else if (item.blockType === ApiBlockType.SelectionElement) {
            ++nFieldValSelEls;
          } else {
            throw new Error(`Unexpected field value content type ${item.blockType}`);
          }
        }
      }
    }
    expect(nFieldValSelEls).toBeGreaterThan(0);
    expect(nFieldValWords).toBeGreaterThan(0);
  });

  it("retrieves form fields by key", () => {
    const doc = new TextractDocument(testResponseJson);
    const field = doc.form.getFieldByKey("Phone Number:");
    expect(field).toBeTruthy();
    if (!field) {
      throw new Error("Test field missing from test document");
    }

    // Check fetching the field on the expected page also works:
    expect(field).toBe(doc.pageNumber(1).form.getFieldByKey("Phone Number:"));

    // We also do bulk of field functionality validation here because we know what the field is:
    expect(field.key?.parentField).toBe(field);
    expect(field.value?.parentField).toBe(field);
    expect(field.key?.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(field.key?.confidence).toBeLessThanOrEqual(100);
    expect(field.key?.geometry.parentObject).toBe(field.key);
    expect(field.key?.str()).toStrictEqual(field.key?.text);
    expect(field.value?.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(field.value?.confidence).toBeLessThanOrEqual(100);
    expect(field.value?.geometry.parentObject).toBe(field.value);
    expect(field.value?.text).toStrictEqual("555-0100");
    expect(field.value?.str()).toStrictEqual(field.value?.text);
  });

  it("returns null for non-existent field key", () => {
    const doc = new TextractDocument(testResponseJson);
    const field = doc.form.getFieldByKey("ThisFieldDoesNotExist");
    expect(field).toBeNull();
  });

  it("searches form fields by key", () => {
    const doc = new TextractDocument(testResponseJson);
    const results = doc.form.searchFieldsByKey("Home Addr");
    expect(results.length).toStrictEqual(1);
    expect(results[0].value?.text).toMatch(/123 Any Street/i);

    // Check searching the field at page level also works:
    const pageLevelResults = doc.pageNumber(1).form.searchFieldsByKey("Home Addr");
    expect(pageLevelResults.length).toStrictEqual(results.length);
    pageLevelResults.forEach((field, ix) => {
      expect(field).toBe(results[ix]);
    });
  });

  it("stringifies composite document forms consistently with per-page forms", () => {
    const doc = new TextractDocument(testResponseJson);
    const docFormStr = doc.form.str();
    expect(docFormStr).toBeTruthy();
    const pageFormStrs = doc.listPages().map((p) => p.form.str());
    expect(docFormStr).toStrictEqual(pageFormStrs.join("\n"));
  });

  it("exposes raw form dicts with traversal up and down the tree", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.pageNumber(1);
    const formKeys = page.form.searchFieldsByKey("");
    expect(formKeys.length).toBeGreaterThan(0);
    expect(formKeys.length && formKeys[0].value?.parentField.parentForm.parentPage.dict).toBe(page.dict);
  });

  it("exposes parent page from document-level field queries", () => {
    const doc = new TextractDocument(testResponseJson);
    const field = doc.form.getFieldByKey("Phone Number:");
    expect(field?.parentPage.pageNumber).toStrictEqual(1);
  });
});
