import { ApiBlockType, ApiRelationshipType } from "../../src/api-models/base";
import { ApiResponsePage } from "../../src/api-models/response";
import { AggregationMethod } from "../../src/base";
import { Field, FieldKey, TextractDocument } from "../../src/document";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testResponseJson: ApiResponsePage = require("../data/test-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const separateBlockTypesResponseJson: ApiResponsePage = require("../data/test-query-response.json");


describe("FieldGeneric", () => {
  it("hoists properties from FieldKey to behave like an ApiBlockWrapper", () => {
    const doc = new TextractDocument(testResponseJson);
    const field = doc.form.getFieldByKey("Phone Number:");
    expect(field?.blockType).toStrictEqual(field?.key.blockType);
    expect(field?.childBlockIds).toStrictEqual(field?.key.childBlockIds);
    expect(field?.dict).toBe(field?.key.dict);
    expect(field?.id).toStrictEqual(field?.key.id);
    const mock = jest
      .spyOn(field?.key as FieldKey, "relatedBlockIdsByRelType")
      .mockImplementation((relType: ApiRelationshipType | ApiRelationshipType[]) => [] as string[]);
    expect(field?.relatedBlockIdsByRelType(ApiRelationshipType.Value).length).toStrictEqual(0);
    expect(mock).toHaveBeenCalledTimes(1);
    mock.mockReset();
  });

  it("exposes field OCR confidences as well as structural detection confidences", () => {
    const doc = new TextractDocument(testResponseJson);
    const field = doc.form.getFieldByKey("Phone Number:");
    if (!field) throw new Error("Test missing expected document field");

    function mean(numberArr: number[]): number {
      return numberArr.reduce((acc, next) => acc + next) / numberArr.length;
    }

    const keyWords = field.key.listWords();
    const keyOcrConf = field.key.getOcrConfidence();
    expect(keyOcrConf).not.toBeNaN();
    expect(keyOcrConf).toStrictEqual(mean(keyWords.map((word) => word.confidence)));
    expect(keyOcrConf).not.toEqual(field.key.confidence);

    if (!field.value) throw new Error("Test missing expected document field value");
    const valueContent = field.value.listContent();
    const valueOcrConf = field.value.getOcrConfidence();
    expect(valueOcrConf).not.toBeNaN();
    expect(valueOcrConf).toStrictEqual(mean(valueContent.map((c) => c.confidence)));
    expect(valueOcrConf).not.toEqual(field.value.confidence);

    expect(field.getOcrConfidence()).toStrictEqual(
      mean(valueContent.map((c) => c.confidence).concat(keyWords.map((w) => w.confidence)))
    );
  });

  it("supports alternative field key/value OCR confidence aggregations", () => {
    const doc = new TextractDocument(testResponseJson);
    const field = doc.form.getFieldByKey("Phone Number:");
    if (!field) throw new Error("Test missing expected document field");

    const keyOcrConf = field.key.getOcrConfidence() as number;
    expect(keyOcrConf).not.toBeNull();
    expect(field.key.getOcrConfidence(AggregationMethod.Mean)).toStrictEqual(keyOcrConf);
    expect(field.key.getOcrConfidence(AggregationMethod.Min)).toBeLessThan(keyOcrConf);
    expect(field.key.getOcrConfidence(AggregationMethod.Max)).toBeGreaterThan(keyOcrConf);

    if (!field.value) throw new Error("Test missing expected document field value");
    const valueOcrConf = field.value.getOcrConfidence() as number;
    expect(valueOcrConf).not.toBeNull();
    expect(field.value.getOcrConfidence(AggregationMethod.Mean)).toStrictEqual(valueOcrConf);
    // The test doc has exactly one WORD/content in this field value:
    expect(field.value.listContent().length).toStrictEqual(1);
    expect(field.value.getOcrConfidence(AggregationMethod.Min)).toStrictEqual(valueOcrConf);
    expect(field.value.getOcrConfidence(AggregationMethod.Max)).toStrictEqual(valueOcrConf);

    const fieldOcrConf = field.getOcrConfidence() as number;
    expect(fieldOcrConf).not.toBeNull();
    expect(field.getOcrConfidence(AggregationMethod.Mean)).toStrictEqual(fieldOcrConf);
    expect(field.getOcrConfidence(AggregationMethod.Min)).toBeLessThan(fieldOcrConf);
    expect(field.getOcrConfidence(AggregationMethod.Max)).toBeGreaterThan(fieldOcrConf);
  });
});

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

  it("loads form fields from alternative 'KEY' and 'VALUE' BlockTypes", () => {
    // Test functionality with KEY and VALUE blocks instead of KEY_VALUE_SET:
    const doc = new TextractDocument(separateBlockTypesResponseJson);
    const page = doc.pageNumber(1);
    expect(page.form.nFields).toStrictEqual(9);
    const field = page.form.listFields()[0];
    expect(field.parentForm).toBe(page.form);
    expect(field.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(field.confidence).toBeLessThanOrEqual(100);
    expect(field.key.text).toStrictEqual("First Name");
    expect(field.value?.text).toStrictEqual("Major");
    expect(page.form.getFieldByKey("First Name")).toBe(field);
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

  it("collects text from fields, per-page forms, and whole-document forms", () => {
    const doc = new TextractDocument(testResponseJson);
    const page = doc.listPages()[0];
    const fieldKeyText = "Phone Number:";
    const fieldValText = "555-0100";
    const field = doc.form.getFieldByKey(fieldKeyText);
    // Individual field key & value:
    expect(field?.key.text).toStrictEqual(fieldKeyText);
    expect(field?.value?.text).toStrictEqual(fieldValText);
    // Individual field:
    expect(field?.text).toStrictEqual(`${fieldKeyText}: ${fieldValText}`);
    // Page-level form:
    expect(page.form.text).toMatch(/.*: .*(?:\n.*: .*)*/g);
    expect(page.form.text).toContain(`\n${fieldKeyText}: ${fieldValText}\n`);
    // Document-level form:
    expect(doc.form.text).toContain(page.form.text);
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
