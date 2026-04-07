import { test, expect } from '@playwright/test';
import { checkImgAlt } from '../../src/rules/img-alt.js';
import type { RuleInput } from '../../src/types.js';

function makeInput(html: string): RuleInput {
  return { html, url: 'https://example.com/', context: 'static' };
}

test.describe('img-alt rule', () => {
  test('passes when all images have descriptive alt text', () => {
    const html = `<html><body>
      <img src="hero.jpg" alt="A mountain landscape at sunset">
      <img src="logo.png" alt="Company logo">
    </body></html>`;
    const result = checkImgAlt(makeInput(html));
    expect(result.status).toBe('pass');
  });

  test('passes when page has no images', () => {
    const html = '<html><body><p>Text only page</p></body></html>';
    const result = checkImgAlt(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.actual).toHaveLength(0);
  });

  test('passes when decorative image uses empty alt (alt="")', () => {
    const html = `<html><body>
      <img src="divider.png" alt="">
    </body></html>`;
    const result = checkImgAlt(makeInput(html));
    expect(result.status).toBe('pass');
  });

  test('fails when image is missing alt attribute entirely', () => {
    const html = `<html><body>
      <img src="photo.jpg">
    </body></html>`;
    const result = checkImgAlt(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('missing alt');
  });

  test('fails when alt text is the image filename (jpg)', () => {
    const html = `<html><body>
      <img src="/images/photo.jpg" alt="photo.jpg">
    </body></html>`;
    const result = checkImgAlt(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('filename-only');
  });

  test('fails when alt text is filename with path segments', () => {
    // Only the bare filename pattern triggers — path + filename would not match
    const html = `<html><body>
      <img src="/images/logo.PNG" alt="logo.PNG">
    </body></html>`;
    const result = checkImgAlt(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('filename-only');
  });

  test('fails for webp and other formats', () => {
    const html = `<html><body>
      <img src="banner.webp" alt="banner.webp">
    </body></html>`;
    const result = checkImgAlt(makeInput(html));
    expect(result.status).toBe('fail');
  });

  test('does NOT fail for descriptive alt that contains an extension word', () => {
    // "gif of a cat" should not match the filename pattern
    const html = `<html><body>
      <img src="cat.gif" alt="An animated gif of a cat playing">
    </body></html>`;
    const result = checkImgAlt(makeInput(html));
    expect(result.status).toBe('pass');
  });

  test('reports multiple violations', () => {
    const html = `<html><body>
      <img src="a.jpg">
      <img src="b.png" alt="b.png">
      <img src="c.jpg" alt="Valid description">
    </body></html>`;
    const result = checkImgAlt(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('2 img alt issue');
  });

  test('actual contains all images (both passing and failing)', () => {
    const html = `<html><body>
      <img src="ok.jpg" alt="Good alt">
      <img src="bad.jpg">
    </body></html>`;
    const result = checkImgAlt(makeInput(html));
    expect(result.actual).toHaveLength(2);
  });

  test('result includes helpUrl', () => {
    const html = '<html><body></body></html>';
    const result = checkImgAlt(makeInput(html));
    expect(result.helpUrl).toBeTruthy();
    expect(result.helpUrl).toContain('google.com');
  });

  test('selector points to img', () => {
    const html = '<html><body></body></html>';
    const result = checkImgAlt(makeInput(html));
    expect(result.selector).toBe('img');
  });
});
