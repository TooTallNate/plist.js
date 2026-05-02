import type { PlistValue } from './parse.browser.js';

/**
 * Encode a Uint8Array into a base64 string.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface BuildOptions {
  pretty?: boolean;
  indent?: string;
  newline?: string;
  [key: string]: unknown;
}

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const DOCTYPE =
  '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">';

/**
 * Generate an XML plist string from the input object `obj`.
 *
 * @param obj - the object to convert
 * @param opts - optional options object
 * @returns converted plist XML string
 */
export function build(obj: PlistValue, opts?: BuildOptions): string {
  const pretty = !opts || opts.pretty !== false;
  const indent = opts?.indent ?? '  ';
  const newline = opts?.newline ?? '\n';

  const lines: string[] = [];

  function emit(depth: number, line: string) {
    if (pretty) {
      lines.push(indent.repeat(depth) + line);
    } else {
      lines.push(line);
    }
  }

  function walk(value: unknown, depth: number): void {
    if (typeof value === 'undefined') {
      return;
    } else if (Array.isArray(value)) {
      emit(depth, '<array>');
      for (let i = 0; i < value.length; i++) {
        walk(value[i], depth + 1);
      }
      emit(depth, '</array>');
    } else if (value instanceof ArrayBuffer) {
      emit(depth, '<data>' + uint8ArrayToBase64(new Uint8Array(value)) + '</data>');
    } else if (ArrayBuffer.isView(value)) {
      const bytes =
        value instanceof Uint8Array
          ? value
          : new Uint8Array(value.buffer as ArrayBuffer, value.byteOffset, value.byteLength);
      emit(depth, '<data>' + uint8ArrayToBase64(bytes) + '</data>');
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      emit(depth, '<dict>');
      for (const prop in value as Record<string, unknown>) {
        if (Object.hasOwn(value as Record<string, unknown>, prop)) {
          const val = (value as Record<string, unknown>)[prop];
          if (val === undefined || val === null) continue;
          emit(depth + 1, '<key>' + escapeXml(prop) + '</key>');
          walk(val, depth + 1);
        }
      }
      emit(depth, '</dict>');
    } else if (typeof value === 'number') {
      const tag = value % 1 === 0 ? 'integer' : 'real';
      emit(depth, '<' + tag + '>' + value.toString() + '</' + tag + '>');
    } else if (typeof value === 'bigint') {
      emit(depth, '<integer>' + value.toString() + '</integer>');
    } else if (value instanceof Date) {
      emit(
        depth,
        '<date>' + new Date(value).toISOString().replace(/\.\d{3}Z$/, 'Z') + '</date>',
      );
    } else if (typeof value === 'boolean') {
      emit(depth, value ? '<true/>' : '<false/>');
    } else if (typeof value === 'string') {
      emit(depth, '<string>' + escapeXml(value) + '</string>');
    }
  }

  walk(obj, 2);

  const sep = pretty ? newline : '';
  const innerContent = lines.join(sep);

  const parts = [
    XML_DECLARATION,
    DOCTYPE,
    '<plist version="1.0">',
    innerContent,
    '</plist>',
  ];

  return parts.join(sep);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
