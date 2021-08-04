import { ApiAnalyzeExpenseResponse, TextractExpense } from "../../src";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testFailedJson = {} as ApiAnalyzeExpenseResponse;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const testExpenseJson: ApiAnalyzeExpenseResponse = require("../data/invoice-expense-response.json");

describe("Expense", () => {
  it("throws status error on failed job JSON", () => {
    expect(() => {
      new TextractExpense(testFailedJson);
    }).toThrowError(/ExpenseDocuments/);
  });

  it("parses the test JSON without error", () => {
    expect(() => {
      new TextractExpense(testExpenseJson);
    }).not.toThrowError();
  });

  it("iterates through expense documents and summary fields", () => {
    const expense = new TextractExpense(testExpenseJson);
    expect(expense.nDocs).toStrictEqual(1);
    const expenseDocs = [...expense.iterDocs()].map((doc, ixDoc) => {
      expect(doc.index).toStrictEqual(ixDoc + 1); // One-based indexes
      return doc;
    });
    const expenseDoc = expenseDocs[0];
    expect(expenseDoc.parentExpense).toStrictEqual(expense);
    let nFieldsSeen = 0;
    for (const field of expenseDoc.iterSummaryFields()) {
      ++nFieldsSeen;
      expect(field.parent).toStrictEqual(expenseDoc);
    }
    expect(nFieldsSeen).toStrictEqual(expenseDoc.nSummaryFields);
    expect(nFieldsSeen).toStrictEqual(15);
  });

  it("iterates through expense document item groups, line items, and fields", () => {
    const expense = new TextractExpense(testExpenseJson);
    expect(expense.nDocs).toStrictEqual(1);
    const expenseDoc = [...expense.iterDocs()][0];
    expect(expenseDoc.parentExpense).toStrictEqual(expense);

    let nGroupsSeen = 0;
    for (const group of expenseDoc.iterLineItemGroups()) {
      ++nGroupsSeen;
      expect(group.index).toStrictEqual(nGroupsSeen); // One-based indexes
      let groupItemsSeen = 0;
      for (const item of group.iterLineItems()) {
        ++groupItemsSeen;
        const itemFields = [...item.iterFields()];
        expect(itemFields.length).toBeGreaterThanOrEqual(1);
        expect(itemFields.length).toStrictEqual(item.nFields);
      }
      expect(groupItemsSeen).toBeGreaterThanOrEqual(1);
      expect(groupItemsSeen).toStrictEqual(group.nLineItems);
    }
    expect(nGroupsSeen).toStrictEqual(expenseDoc.nLineItemGroups);
    expect(nGroupsSeen).toStrictEqual(1);
  });

  it("fetches expense summary fields by type", () => {
    const expense = new TextractExpense(testExpenseJson);
    const expenseDoc = [...expense.iterDocs()][0];

    const vendorNameFields = expenseDoc.searchSummaryFieldsByType("VENDOR_NAME");
    expect(vendorNameFields.length).toStrictEqual(1);
    expect(vendorNameFields[0].fieldType.text).toStrictEqual("VENDOR_NAME");
    expect(vendorNameFields[0].value.text).toStrictEqual("Amazon.com");

    const subtotalField = expenseDoc.getSummaryFieldByType("SUBTOTAL");
    expect(subtotalField).toBeTruthy();
    if (!subtotalField) return;
    expect(subtotalField.pageNumber).toStrictEqual(1);
    expect(subtotalField.fieldType.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(subtotalField.fieldType.confidence).toBeLessThanOrEqual(100);
    expect(subtotalField.fieldType.parentField).toStrictEqual(subtotalField);
    expect(subtotalField.fieldType.text).toStrictEqual("SUBTOTAL");
    expect(subtotalField.label?.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(subtotalField.label?.confidence).toBeLessThanOrEqual(100);
    expect(subtotalField.label?.geometry.parentObject).toStrictEqual(subtotalField.label);
    expect(subtotalField.label?.parentField).toStrictEqual(subtotalField);
    expect(subtotalField.label?.text).toStrictEqual("Total");
    expect(subtotalField.value.confidence).toBeGreaterThan(1); // (<1% very unlikely)
    expect(subtotalField.value.confidence).toBeLessThanOrEqual(100);
    expect(subtotalField.value.geometry.parentObject).toStrictEqual(subtotalField.value);
    expect(subtotalField.value.parentField).toStrictEqual(subtotalField);
    expect(subtotalField.value.text).toStrictEqual("$6169.40");
  });

  it("returns no matches for non-existent summary field types", () => {
    const expense = new TextractExpense(testExpenseJson);
    const expenseDoc = [...expense.iterDocs()][0];

    const searchResult = expenseDoc.searchSummaryFieldsByType("doesnotexist");
    expect(searchResult.length).toStrictEqual(0);

    const getResult = expenseDoc.getSummaryFieldByType("alsodoesnotexist");
    expect(getResult).toStrictEqual(null);
  });

  it("fetches line item fields by type", () => {
    const expense = new TextractExpense(testExpenseJson);
    const expenseDoc = [...expense.iterDocs()][0];

    const lineItems = [...[...expenseDoc.iterLineItemGroups()][0].iterLineItems()];
    expect(lineItems.length).toBeGreaterThanOrEqual(1);
    const lineItem = lineItems[0];

    const quantityFields = lineItem.searchFieldsByType("QUANTITY");
    expect(quantityFields.length).toStrictEqual(1);
    expect(quantityFields[0].fieldType.text).toStrictEqual("QUANTITY");
    expect(quantityFields[0].label?.text).toStrictEqual("Quantity");
    expect(quantityFields[0].value.text).toStrictEqual("1");

    const priceField = lineItem.getFieldByType("PRICE");
    expect(priceField).toBeTruthy();
    if (!priceField) return;
    expect(priceField.fieldType.text).toStrictEqual("PRICE");
    expect(priceField.label?.text).toStrictEqual("Amount");
    expect(priceField.value.text).toStrictEqual("$1000");
  });

  it("returns no matches for non-existent line item field types", () => {
    const expense = new TextractExpense(testExpenseJson);
    const expenseDoc = [...expense.iterDocs()][0];

    const lineItems = [...[...expenseDoc.iterLineItemGroups()][0].iterLineItems()];
    expect(lineItems.length).toBeGreaterThanOrEqual(1);
    const lineItem = lineItems[0];

    const searchResult = lineItem.searchFieldsByType("doesnotexist");
    expect(searchResult.length).toStrictEqual(0);

    const getResult = lineItem.getFieldByType("alsodoesnotexist");
    expect(getResult).toStrictEqual(null);
  });
});
