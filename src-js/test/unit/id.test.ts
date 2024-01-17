import { ApiIdentityDocument } from "../../src/api-models/id";
import { ApiAnalyzeIdResponse } from "../../src/api-models/response";
import {
  IdDocument,
  IdDocumentField,
  IdDocumentType,
  IdFieldType,
  IdFieldValueType,
  TextractIdentity,
} from "../../src/id";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testDrivingLicenseJson: ApiAnalyzeIdResponse = require("../data/analyzeid-test-drivers-license-response.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testPassportJson: ApiAnalyzeIdResponse = require("../data/analyzeid-test-passport-response.json");

const singleEmptyDocumentJson: ApiAnalyzeIdResponse = {
  AnalyzeIDModelVersion: "unknown",
  DocumentMetadata: { Pages: 1 },
  IdentityDocuments: [
    {
      DocumentIndex: 0,
      IdentityDocumentFields: [],
    },
  ],
};

describe("TextractIdentity", () => {
  it("parses the test JSONs without error", () => {
    expect(() => {
      new TextractIdentity(testDrivingLicenseJson);
    }).not.toThrowError();
    expect(() => {
      new TextractIdentity(testPassportJson);
    }).not.toThrowError();
  });

  it("parses empty input to sensible defaults", () => {
    expect(() => {
      new TextractIdentity({} as ApiAnalyzeIdResponse);
    }).not.toThrowError();
    const identity = new TextractIdentity({} as ApiAnalyzeIdResponse);
    expect(identity.nDocuments).toStrictEqual(0);
    expect(identity.nPages).toStrictEqual(0);
  });

  it("parses empty documents to sensible defaults", () => {
    expect(() => {
      new IdDocument({} as ApiIdentityDocument);
    }).not.toThrowError();
    const doc = new IdDocument({} as ApiIdentityDocument);
    expect(doc.parentCollection).toBeUndefined();
    expect(doc.nFields).toStrictEqual(0);
  });

  it("loads ID response metadata", () => {
    const identity = new TextractIdentity(testPassportJson);
    expect(identity.nPages).toStrictEqual(1);
    expect(identity.modelVersion).toStrictEqual("1.0");
    expect(identity.dict).toBe(testPassportJson);
  });

  it("navigates ID documents within a response", () => {
    const identity = new TextractIdentity(testPassportJson);
    // List:
    const docs = identity.listDocuments();
    expect(docs.length).toStrictEqual(identity.nDocuments);
    expect(docs.length).toStrictEqual(1);
    // Iterate:
    const docsFromIterator = [...identity.iterDocuments()];
    expect(docsFromIterator.length).toStrictEqual(docs.length);
    docs.forEach((doc, ixDoc) => {
      expect(doc).toBe(docsFromIterator[ixDoc]);
    });
    // Index:
    expect(identity.getDocAtIndex(0)).toBe(docs[0]);
    expect(() => identity.getDocAtIndex(-1)).toThrowError(/index/);
    expect(() => identity.getDocAtIndex(identity.nDocuments)).toThrowError(/index/);
  });

  it("detects and normalizes ID document types", () => {
    const passportIdentity = new TextractIdentity(testPassportJson);
    expect(passportIdentity.getDocAtIndex(0).idType).toStrictEqual(IdDocumentType.Passport);

    const driverIdentity = new TextractIdentity(testDrivingLicenseJson);
    expect(driverIdentity.getDocAtIndex(0).idType).toStrictEqual(IdDocumentType.DrivingLicense);

    const nullIdentity = new TextractIdentity(singleEmptyDocumentJson);
    expect(nullIdentity.getDocAtIndex(0).idType).toStrictEqual(IdDocumentType.Other);
  });

  it("lists and iterates document fields", () => {
    const identity = new TextractIdentity(testPassportJson);
    const doc = identity.getDocAtIndex(0);

    const fields = doc.listFields();
    expect(fields.length).toStrictEqual(doc.nFields);
    expect(fields.length).toStrictEqual(20);

    const fieldsFromIterator = [...doc.iterFields()];
    expect(fieldsFromIterator.length).toStrictEqual(fields.length);
    fields.forEach((field, ixField) => {
      expect(field).toBe(fieldsFromIterator[ixField]);
    });
  });

  it("links fields and documents to parent collections", () => {
    const identity = new TextractIdentity(testPassportJson);
    const doc = identity.getDocAtIndex(0);
    expect(doc.parentCollection).toBe(identity);
    expect(doc.parentCollection?.dict).toBe(identity.dict);
    const field = doc.listFields()[0];
    expect(field?.parentDocument).toBe(doc);
    expect(field?.parentDocument?.dict).toBe(doc.dict);
  });

  it("retrieves document field by type", () => {
    const identity = new TextractIdentity(testPassportJson);
    const doc = identity.getDocAtIndex(0);
    const docNumberField = doc.getFieldByType(IdFieldType.DocumentNumber);
    expect(docNumberField).toBeTruthy();

    expect(docNumberField?.fieldType).toStrictEqual(IdFieldType.DocumentNumber);
    expect(docNumberField?.fieldTypeRaw).toStrictEqual(IdFieldType.DocumentNumber);
    expect(docNumberField?.isValueNormalized).toStrictEqual(false);
    expect(docNumberField?.value).toStrictEqual("0002028373");
    expect(docNumberField?.valueConfidence).toBeGreaterThan(1); // 1% very unlikely
    expect(docNumberField?.valueConfidence).toBeLessThanOrEqual(100);
    expect(docNumberField?.valueRaw).toStrictEqual("0002028373");
    expect(docNumberField?.valueType).toStrictEqual(IdFieldValueType.Other);
  });

  it("retrieves undefined for missing fields", () => {
    const identity = new TextractIdentity(testDrivingLicenseJson);
    const doc = identity.getDocAtIndex(0);
    const unknownField = doc.getFieldByType(IdFieldType.Other);
    expect(unknownField).toBeUndefined();
  });

  it("parses normalized field values", () => {
    const identity = new TextractIdentity(testDrivingLicenseJson);
    const doc = identity.getDocAtIndex(0);
    const field = doc.getFieldByType(IdFieldType.ExpirationDate);
    expect(field).toBeTruthy();

    expect(field?.fieldType).toStrictEqual(IdFieldType.ExpirationDate);
    expect(field?.isValueNormalized).toStrictEqual(true);

    expect(field?.valueType).toStrictEqual(IdFieldValueType.Date);
    expect(field?.valueRaw).toStrictEqual("01/20/2028");
    const fieldValue = field?.value;
    expect(fieldValue).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    expect(field?.valueConfidence).toBeGreaterThan(1); // 1% very unlikely
    expect(field?.valueConfidence).toBeLessThanOrEqual(100);
  });

  it("normalizes unknown field types", () => {
    const field = new IdDocumentField({
      Type: {
        Confidence: 90,
        Text: "DOES_NOT_EXIST",
      },
      ValueDetection: {
        Confidence: 90,
        Text: "Howdy",
      },
    });
    expect(field.fieldType).toStrictEqual(IdFieldType.Other);
    expect(field.parentDocument).toBeUndefined();
  });

  it("stringifies identity documents to plain text", () => {
    const identity = new TextractIdentity(testDrivingLicenseJson);
    const doc = identity.getDocAtIndex(0);
    const field = doc.listFields()[0];
    const fieldStr = field.str();
    expect(fieldStr).toContain(field.fieldType);
    expect(fieldStr).toContain(field.valueConfidence.toFixed(1) + "%");
    expect(fieldStr).toContain(field.value);
    const docStr = doc.str();
    expect(docStr).toContain(fieldStr);
    expect(identity.str()).toContain(docStr);
  });
});
