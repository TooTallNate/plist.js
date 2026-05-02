import type { PlistValue } from './parse.js';

class OpenStepParser {
  input: string;
  pos: number;

  constructor(input: string) {
    this.input = input;
    this.pos = 0;
  }

  skipWhitespaceAndComments(): void {
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (/\s/.test(ch)) {
        this.pos++;
        continue;
      }
      if (
        ch === '/' &&
        this.pos + 1 < this.input.length &&
        this.input[this.pos + 1] === '*'
      ) {
        this.pos += 2;
        const end = this.input.indexOf('*/', this.pos);
        if (end === -1) throw new Error('Unterminated block comment');
        this.pos = end + 2;
        continue;
      }
      if (
        ch === '/' &&
        this.pos + 1 < this.input.length &&
        this.input[this.pos + 1] === '/'
      ) {
        this.pos += 2;
        const end = this.input.indexOf('\n', this.pos);
        this.pos = end === -1 ? this.input.length : end + 1;
        continue;
      }
      break;
    }
  }

  parseValue(): PlistValue {
    this.skipWhitespaceAndComments();
    if (this.pos >= this.input.length) {
      throw new Error('Unexpected end of input');
    }
    const ch = this.input[this.pos];
    if (ch === '{') return this.parseDict();
    if (ch === '(') return this.parseArray();
    if (ch === '<') return this.parseData();
    if (ch === '"') return this.parseQuotedString();
    return this.parseUnquotedString();
  }

  parseDict(): { [key: string]: PlistValue } {
    this.pos++; // skip {
    const obj: { [key: string]: PlistValue } = {};
    while (true) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.input.length)
        throw new Error('Unterminated dictionary');
      if (this.input[this.pos] === '}') {
        this.pos++;
        return obj;
      }
      const key = this.parseValue() as string;
      this.skipWhitespaceAndComments();
      if (this.pos >= this.input.length || this.input[this.pos] !== '=')
        throw new Error(
          `Expected '=' after key "${key}" at position ${this.pos}`
        );
      this.pos++; // skip =
      const value = this.parseValue();
      obj[key] = value;
      this.skipWhitespaceAndComments();
      if (this.pos < this.input.length && this.input[this.pos] === ';') {
        this.pos++;
      }
    }
  }

  parseArray(): PlistValue[] {
    this.pos++; // skip (
    const arr: PlistValue[] = [];
    this.skipWhitespaceAndComments();
    if (this.pos < this.input.length && this.input[this.pos] === ')') {
      this.pos++;
      return arr;
    }
    while (true) {
      arr.push(this.parseValue());
      this.skipWhitespaceAndComments();
      if (this.pos >= this.input.length)
        throw new Error('Unterminated array');
      if (this.input[this.pos] === ')') {
        this.pos++;
        return arr;
      }
      if (this.input[this.pos] === ',') {
        this.pos++;
        // Allow trailing comma before )
        this.skipWhitespaceAndComments();
        if (this.pos < this.input.length && this.input[this.pos] === ')') {
          this.pos++;
          return arr;
        }
      } else {
        throw new Error(
          `Expected ',' or ')' in array at position ${this.pos}`
        );
      }
    }
  }

  parseData(): Uint8Array {
    this.pos++; // skip <
    let hex = '';
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (ch === '>') {
        this.pos++;
        // Parse hex pairs
        const clean = hex.replace(/\s+/g, '');
        const bytes = new Uint8Array(clean.length / 2);
        for (let i = 0; i < clean.length; i += 2) {
          bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
        }
        return bytes;
      }
      hex += ch;
      this.pos++;
    }
    throw new Error('Unterminated data');
  }

  parseQuotedString(): string {
    this.pos++; // skip opening "
    let result = '';
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (ch === '\\') {
        this.pos++;
        if (this.pos >= this.input.length)
          throw new Error('Unterminated string escape');
        const esc = this.input[this.pos];
        switch (esc) {
          case '"': result += '"'; break;
          case '\\': result += '\\'; break;
          case 'n': result += '\n'; break;
          case 't': result += '\t'; break;
          case 'r': result += '\r'; break;
          case '0': result += '\0'; break;
          default: result += esc; break;
        }
        this.pos++;
        continue;
      }
      if (ch === '"') {
        this.pos++;
        return result;
      }
      result += ch;
      this.pos++;
    }
    throw new Error('Unterminated string');
  }

  parseUnquotedString(): string {
    const start = this.pos;
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];
      if (/[a-zA-Z0-9._\/$:-]/.test(ch)) {
        this.pos++;
      } else {
        break;
      }
    }
    if (this.pos === start) {
      throw new Error(
        `Unexpected character '${this.input[this.pos]}' at position ${this.pos}`
      );
    }
    return this.input.substring(start, this.pos);
  }
}

/**
 * Parses an OpenStep/ASCII plist string into a PlistValue.
 */
export function parseOpenStep(input: string): PlistValue {
  const parser = new OpenStepParser(input);
  const value = parser.parseValue();
  return value;
}
