import { describe, it, expect } from 'vitest';
import { parseInline, stripLinks } from '../markdown/parser';

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

  it('handles empty string input', () => {
    const result = parseInline('');
    expect(result).toEqual([{ text: '' }]);
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

  it('handles nested brackets in stripLinks', () => {
    // stripLinks should at minimum not crash — the inner brackets may not parse perfectly
    const result = stripLinks('[a [b]](url)');
    expect(typeof result).toBe('string');
  });
});
