/**
 * AWS Lambda Entry Point for Automerge-Pro
 * Wraps the Express server with @vendia/serverless-express for AWS Lambda compatibility
 */

const serverlessExpress = require('@vendia/serverless-express');
const { app } = require('./server');

// Create the serverless express handler
let serverlessExpressInstance;

/**
 * AWS Lambda handler function
 * @param {Object} event - AWS Lambda event object
 * @param {Object} context - AWS Lambda context object
 * @returns {Promise} Response from the serverless express handler
 */
async function handler(event, context) {
  // Initialize serverless express instance if not already done
  if (!serverlessExpressInstance) {
    serverlessExpressInstance = serverlessExpress({ app });
  }

  // Handle the request
  return serverlessExpressInstance(event, context);
}

module.exports = { handler };