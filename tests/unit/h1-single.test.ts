import { test, expect } from '@playwright/test';
import { checkH1Single } from '../../src/rules/h1-single.js';
import type { RuleInput } from '../../src/types.js';

function makeInput(html: string, url = 'https://example.com/'): RuleInput {
  return { html, url, context: 'static' };
}

test.describe('h1-single rule', () => {
  test('passes when exactly one h1 exists', () => {
    const html = '<html><body><h1>Page Title</h1><p>Content</p></body></html>';
    const result = checkH1Single(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.ruleId).toBe('h1-single');
    expect(result.actual).toEqual(['Page Title']);
  });

  test('fails when no h1 exists', () => {
    const html = '<html><body><h2>Subtitle</h2><p>Content</p></body></html>';
    const result = checkH1Single(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('No <h1>');
    expect(result.actual).toEqual([]);
  });

  test('fails when two h1 elements exist', () => {
    const html = '<html><body><h1>First</h1><h1>Second</h1></body></html>';
    const result = checkH1Single(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('2 <h1>');
    expect(result.actual).toHaveLength(2);
    expect(result.actual).toContain('First');
    expect(result.actual).toContain('Second');
  });

  test('fails when three or more h1 elements exist', () => {
    const html = '<html><body><h1>A</h1><h1>B</h1><h1>C</h1></body></html>';
    const result = checkH1Single(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('3 <h1>');
  });

  test('passes with h1 inside a nested element', () => {
    const html = '<html><body><main><article><h1>Deep Title</h1></article></main></body></html>';
    const result = checkH1Single(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.actual).toEqual(['Deep Title']);
  });

  test('message shows actual h1 values on multiple h1 failure', () => {
    const html = '<html><body><h1>Alpha</h1><h1>Beta</h1></body></html>';
    const result = checkH1Single(makeInput(html));
    expect(result.message).toContain('"Alpha"');
    expect(result.message).toContain('"Beta"');
  });

  test('expected is always { count: 1 }', () => {
    const html = '<html><body><h1>Title</h1></body></html>';
    const result = checkH1Single(makeInput(html));
    expect(result.expected).toEqual({ count: 1 });
  });

  test('result includes selector pointing to h1', () => {
    const html = '<html><body></body></html>';
    const result = checkH1Single(makeInput(html));
    expect(result.selector).toBe('h1');
  });

  test('result includes duration', () => {
    const html = '<html><body><h1>Title</h1></body></html>';
    const result = checkH1Single(makeInput(html));
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  test('strips whitespace from h1 text', () => {
    const html = '<html><body><h1>  Padded Title  </h1></body></html>';
    const result = checkH1Single(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.actual).toEqual(['Padded Title']);
  });

  test('url is propagated to result', () => {
    const html = '<html><body><h1>Title</h1></body></html>';
    const url = 'https://example.com/page';
    const result = checkH1Single({ html, url, context: 'static' });
    expect(result.url).toBe(url);
  });
});
