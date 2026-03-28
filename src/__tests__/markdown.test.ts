import { describe, it, expect } from 'vitest';
import { parseInline, stripLinks } from '../main';

describe('parseInline', () => {
  it('parses plain text', () => {
    expect(parseInline('hello world')).toEqual([{ text: 'hello world' }]);
  });

  it('parses inline code', () => {
    expect(parseInline('use `foo()` here')).toEqual([
      { text: 'use ' },
      { text: 'foo()', font: 'iAWriterMono' },
      { text: ' here' },
    ]);
  });

  it('parses bold', () => {
    expect(parseInline('this is **bold** text')).toEqual([
      { text: 'this is ' },
      { text: 'bold', bold: true },
      { text: ' text' },
    ]);
  });

  it('parses italic', () => {
    expect(parseInline('this is *italic* text')).toEqual([
      { text: 'this is ' },
      { text: 'italic', italics: true },
      { text: ' text' },
    ]);
  });

  it('parses bold+italic (***)', () => {
    expect(parseInline('this is ***both*** here')).toEqual([
      { text: 'this is ' },
      { text: 'both', bold: true, italics: true },
      { text: ' here' },
    ]);
  });
});

describe('stripLinks', () => {
  it('strips markdown links keeping text', () => {
    expect(stripLinks('[click](https://example.com)')).toBe('click');
  });

  it('leaves non-link text alone', () => {
    expect(stripLinks('no links here')).toBe('no links here');
  });

  it('handles multiple links in one line', () => {
    expect(stripLinks('[a](url1) and [b](url2)')).toBe('a and b');
  });
});
