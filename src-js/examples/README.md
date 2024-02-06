# Examples for TRP.js

This folder contains example projects using the Amazon Textract Response Parser for JavaScript/TypeScript from various different build environments, to help you get started.

> ⚠️ **Note:** While all of the example projects reference local API response JSON files, some also make Amazon Textract API calls by default - so running them may incur (typically very small) charges. See [Amazon Textract Pricing](https://aws.amazon.com/textract/pricing/) for details.


## Pre-requisites for running the examples


### Local builds of TRP.js

The projects use the **local build** of the library for pre-publication testing, so you'll need to run `npm run build` in the parent `src-js` folder before they'll work.

To instead switch to published TRP.js versions (if you're using an example as a skeleton for your own project):

- For NodeJS projects, Replace the package.json relative path in `"amazon-textract-response-parser": "file:../.."` with a normal version spec like `"amazon-textract-response-parser": "^0.4.0"`, and re-run `npm install`
- For browser IIFE projects, edit the `<script>` tag in the HTML to point to your chosen CDN or downloaded `trp.min.js` location


### API credentials for Amazon Textract

For the example projects that demonstrate actual integration with Amazon Textract, we create a [TextractClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/textract/) with empty [configuration](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-textract/TypeAlias/TextractClientConfigType/). This assumes that your AWS IAM **credentials** and default **region** are pre-configured for access through e.g. environment variables.

If you're new to setting up AWS credentials for CLI and SDK access in general, refer to the credentials guidance in the [AWS SDK for JavaScript (v3) Developer Guide](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials.html) and/or the [AWS CLI user guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html).


## Working with multi-page documents or many documents at once

The ['synchronous' request/response APIs](https://docs.aws.amazon.com/textract/latest/dg/sync.html) used in these examples generally only support images or single-page documents. Multi-page documents will need to use [Asynchronous Textract APIs](https://docs.aws.amazon.com/textract/latest/dg/async.html) instead. Since Asynchronous APIs like [StartDocumentAnalysis](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/textract/command/StartDocumentAnalysisCommand/) return a **job ID** rather than an immediate result, applications will need to wait and [GetDocumentAnalysis](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/textract/command/GetDocumentAnalysisCommand/) to retrieve the result once it's ready. You'll also need to **upload the source document to Amazon S3** rather than passing it directly in the API request.

Furthermore, Amazon Textract applies [quota limits](https://docs.aws.amazon.com/textract/latest/dg/limits-quotas-explained.html) on these APIs.

As a result, applications processing multi-page documents will generally need to orchestrate uploading the source file to S3; starting the analysis job; and resuming the processing flow once [notified via Amazon SNS](https://docs.aws.amazon.com/textract/latest/dg/async-notification-payload.html) that the analysis is ready (which is much more quota-efficient than polling the `GetDocumentAnalysis` API)... Particularly spiky workflows (where many documents are submitted at once) may also want to implement queuing to manage inbound request rates.

A full end-to-end solution for this involves deploying cloud infrastructure like AWS Lambda functions and Amazon SNS topics, so is outside the scope of these TRP samples. Instead, refer to:

- [Amazon Textract IDP CDK Constructs](https://github.com/aws-samples/amazon-textract-idp-cdk-constructs) for composable, deployable solution components written in [AWS CDK](https://aws.amazon.com/cdk/).
- [Amazon Textract Textractor](https://github.com/aws-samples/amazon-textract-textractor/) which mainly provides Python bindings, but also a [handy CLI](https://aws-samples.github.io/amazon-textract-textractor/commandline.html) for processing a batch of documents for a quick PoC.
- Other code samples listed in the [Amazon Textract Developer Guide](https://docs.aws.amazon.com/textract/latest/dg/service_code_examples.html).
