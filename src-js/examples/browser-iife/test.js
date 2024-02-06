/**
 * Script to test main.html using headless Chrome browser via Puppeteer
 *
 * This test script opens the HTML file in a headless browser, selects an example Textract response
 * JSON from the test data folder, and then waits for the JS to process the file.
 */
// NodeJS Built-Ins:
import path from "node:path";
import { fileURLToPath } from "node:url";

// External Dependencies:
import colors from "colors";
import puppeteer from "puppeteer";

// We need an absolute path to main.html for puppeteer, but __dirname is not defined in ES module
// mode NodeJS - so need to go through some extra steps:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HTML_URI = `file:///${__dirname}/main.html`;
const RESPONSE_JSON_PATH = path.join(__dirname, "..", "..", "test", "data", "test-response.json");

// A try/catch block is necessary to run top-level `await`s in NodeJS module:
// eslint-disable-next-line no-useless-catch
try {
  // Launch the browser & configure event listeners to forward console msgs + throw errors:
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page
    .on("console", (message) =>
      console.log(`[${message.type().substring(0, 3).toUpperCase()}] ${message.text()}`),
    )
    .on("pageerror", (err) => {
      console.error("Browser page error");
      throw err;
    })
    .on("requestfailed", (req) => {
      console.error("Browser request failed");
      throw new Error(req.failure().errorText);
    });

  console.log(colors.green("Opening main.html in browser..."));
  await page.goto(HTML_URI);

  console.log(colors.green("Uploading Amazon Textract sample JSON..."));
  const elementHandle = await page.$("input#textractJson");
  await elementHandle.uploadFile(RESPONSE_JSON_PATH);

  console.log(colors.green("Waiting for sample JS to process the file..."));
  await page.waitForFunction("window.fileProcessed", {
    timeout: 5000, // 5sec
  });

  console.log(colors.green("Closing browser..."));
  await browser.close();
  console.log(colors.green("Done!"));
} catch (err) {
  // We want to re-throw any error so it marks the test run as failed:
  throw err;
}
