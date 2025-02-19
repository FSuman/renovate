import is from '@sindresorhus/is';
import { CONFIG_VALIDATION } from '../constants/error-messages';
// eslint-disable-next-line import/no-cycle
import { logger } from '../logger';

let RegEx: RegExpConstructor;

try {
  // eslint-disable-next-line
  const RE2 = require('re2');
  // Test if native is working
  new RE2('.*').exec('test');
  logger.debug('Using RE2 as regex engine');
  RegEx = RE2;
} catch (err) {
  logger.warn({ err }, 'RE2 not usable, falling back to RegExp');
  RegEx = RegExp;
}

export function regEx(pattern: string | RegExp, flags?: string): RegExp {
  try {
    return new RegEx(pattern, flags);
  } catch (err) {
    const error = new Error(CONFIG_VALIDATION);
    error.validationSource = pattern.toString();
    error.validationError = `Invalid regular expression: ${pattern.toString()}`;
    throw error;
  }
}

export function escapeRegExp(input: string): string {
  return input.replace(regEx(/[.*+\-?^${}()|[\]\\]/g), '\\$&'); // $& means the whole matched string // TODO #12071
}

const configValStart = regEx(/^!?\//);
const configValEnd = regEx(/\/$/);

export function isConfigRegex(input: unknown): input is string {
  return (
    is.string(input) && configValStart.test(input) && configValEnd.test(input)
  );
}

function parseConfigRegex(input: string): RegExp | null {
  try {
    const regexString = input
      .replace(configValStart, '')
      .replace(configValEnd, '');
    return regEx(regexString);
  } catch (err) {
    // no-op
  }
  return null;
}

type ConfigRegexPredicate = (string) => boolean;

export function configRegexPredicate(input: string): ConfigRegexPredicate {
  const configRegex = parseConfigRegex(input);
  if (configRegex) {
    const isPositive = !input.startsWith('!');
    return (x: string): boolean => {
      const res = configRegex.test(x);
      return isPositive ? res : !res;
    };
  }
  return null;
}
