/**
 * AWS Lambda Entry Point for Automerge-Pro
 * This is the main Lambda handler that AWS Lambda will invoke
 * It wraps the Express server using @vendia/serverless-express for compatibility
 */

const { handler } = require('./lambda');

// Export the handler for AWS Lambda
module.exports = {
  handler
};

// For direct invocation compatibility, also export as default handler
exports.handler = handler;