import { afterEach, describe, expect, it } from 'vitest';

import {
  getTwentyFunctionsBaseUrl,
  normalizeTwentyApiOrigin,
} from './twenty-functions-base-url';

describe('normalizeTwentyApiOrigin', () => {
  it('strips trailing slash and /graphql', () => {
    expect(normalizeTwentyApiOrigin('https://t.test/graphql')).toBe('https://t.test');
    expect(normalizeTwentyApiOrigin('https://t.test/graphql/')).toBe('https://t.test');
    expect(normalizeTwentyApiOrigin('https://t.test/')).toBe('https://t.test');
  });
});

describe('getTwentyFunctionsBaseUrl', () => {
  afterEach(() => {
    delete process.env.TWENTY_FUNCTIONS_URL;
    delete process.env.TWENTY_API_URL;
  });

  it('prefers TWENTY_FUNCTIONS_URL', () => {
    process.env.TWENTY_FUNCTIONS_URL = 'https://t.test/functions/';
    process.env.TWENTY_API_URL = 'https://ignored/graphql';
    expect(getTwentyFunctionsBaseUrl()).toBe('https://t.test/functions');
  });

  it('derives /s from API origin without /graphql', () => {
    process.env.TWENTY_API_URL = 'https://t.test/graphql';
    expect(getTwentyFunctionsBaseUrl()).toBe('https://t.test/s');
  });
});
