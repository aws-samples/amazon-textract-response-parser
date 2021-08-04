/**
 * Amazon Textract API models (TypeScript interfaces) used by the response parser.

 * While these models should correspond fairly closely to those in the actual typings for the
 * @aws-sdk/client-textract module, there may be some cases where we can be more specific and
 * maintaining lets us avoid introducing dependencies of the AWS SDK for JS.
 */

// Export all for consistency with previous API which made everything accessible at top level
export * from "./document";
export * from "./expense";
export * from "./geometry";
export * from "./response";
