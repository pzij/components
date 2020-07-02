'use strict';

/**
 * This logic intercepts ALL Serverless Framework commands, before the V.1 core starts. 
 * This checks to see if the Components CLI should take over.
 */

const minimist = require('minimist');
const {
  runningTemplate,
  legacyLoadComponentConfig,
  legacyLoadInstanceConfig,
  isChinaUser,
} = require('./cli/utils');

// These keywords are intercepted by the Serverless Components CLI
const componentKeywords = new Set(['registry', 'init', 'publish']);

const runningComponents = () => {
  const args = minimist(process.argv.slice(2));

  const isRunningHelpOrVersion =
    process.argv[2] === 'version' ||
    process.argv[2] === 'help' ||
    args.v ||
    args.version ||
    args.h ||
    args.help;

  // don't load components CLI if running version or help
  if (isRunningHelpOrVersion) {
    return false;
  }

  let componentConfig;
  let instanceConfig;

  // load components if user runs a keyword command, or "sls --all" or "sls --target" (that last one for china)
  if (
    componentKeywords.has(process.argv[2]) ||
    (process.argv[2] === 'deploy' && runningTemplate(process.cwd())) ||
    args.target
  ) {
    return true;
  }

  try {
    componentConfig = legacyLoadComponentConfig(process.cwd());
  } catch (e) {
    // ignore
  }
  try {
    instanceConfig = legacyLoadInstanceConfig(process.cwd());
  } catch (e) {
    // ignore
  }

  if (!componentConfig && !instanceConfig) {
    // When no in service context and plain `serverless` command, return true when user in China
    // It's to enable interactive CLI components onboarding for Chinese users
    return process.argv.length === 2 && isChinaUser();
  }

  if (instanceConfig && !instanceConfig.component) {
    return false;
  }

  return true;
};

module.exports = { runningComponents };
