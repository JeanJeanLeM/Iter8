const { validateShareUrl } = require('./parseSharePage');

describe('importChatgptShare/parseSharePage validateShareUrl', () => {
  it('rejects empty or non-string', () => {
    expect(validateShareUrl('').valid).toBe(false);
    expect(validateShareUrl(null).valid).toBe(false);
    expect(validateShareUrl(undefined).valid).toBe(false);
  });

  it('accepts valid https://chatgpt.com/share/<id>', () => {
    const r = validateShareUrl('https://chatgpt.com/share/699d82b3-47f0-800b-b15a-7b4f7deb2553');
    expect(r.valid).toBe(true);
  });

  it('rejects http', () => {
    const r = validateShareUrl('http://chatgpt.com/share/abc');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/HTTPS/);
  });

  it('rejects wrong host', () => {
    const r = validateShareUrl('https://example.com/share/abc');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/chatgpt.com/);
  });

  it('rejects path without /share/', () => {
    const r = validateShareUrl('https://chatgpt.com/other/abc');
    expect(r.valid).toBe(false);
  });

  it('rejects empty share id', () => {
    const r = validateShareUrl('https://chatgpt.com/share/');
    expect(r.valid).toBe(false);
  });
});
