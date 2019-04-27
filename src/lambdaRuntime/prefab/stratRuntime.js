//config will be placed inside the lambda
const config = require('./config.json');
const cat = require('util').promisify(require('fs').readFile);
const domoFactory = require(config.onHost['Strat.majordomo']);
var domo;
module.exports = {
  //this won't get called until we've created the domo on line 11
  getMajordomo: function () {
    return domo;
  },
  handler: async function (event, context, callback) {
    domo = await domoFactory(invoke, config.hostName);
    try {
      callback(null, await domo.dispatch(event));
    } catch (e) {
      callback(e);
    }
  }
};

async function invoke (reference, event) {
  const onHostFile = config.onHost[reference]
  if (onHostFile !== undefined) {
    if (config.resources[reference]) {
      const fileData = await cat(onHostFile);
      return (fileData || Buffer.from('')).toString();
    }
    return require(onHostFile)(event);
  }
  const service = (reference || '').split('.')[0];
  if (service !== undefined) {
    return await callLambda(config.ranged[service], event);
  } else {
    throw new Error(`Cannot invoke reference ${reference}`);
  }
}

async function callLambda (functionName, event) {
  const AWS = require('aws-sdk');
  const lambda = new AWS.Lambda();
  const invoke = require('util').promisify(lambda.invoke.bind(lambda));

  const response = await invoke({
    InvocationType: 'RequestResponse',
    FunctionName: functionName,
    Payload: Buffer.from(JSON.stringify(event))
  });

  return JSON.parse(response.Payload);
}
