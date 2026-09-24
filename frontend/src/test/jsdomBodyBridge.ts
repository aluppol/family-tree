const MULTIPART_BOUNDARY = 'family-tree-test-boundary';

interface EncodedBody {
  body: BodyInit | null | undefined;
  contentType: string | null;
}

export function bridgeJsdomBodiesToNodeFetch(): () => void {
  const interceptedFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => interceptedFetch(input, init === undefined ? init : await nodeCompatibleInit(init));
  return () => {
    globalThis.fetch = interceptedFetch;
  };
}

async function nodeCompatibleInit(init: RequestInit): Promise<RequestInit> {
  const encoded = await encodeBody(init.body);
  const headers = new Headers(init.headers);
  if (encoded.contentType !== null) {
    headers.set('Content-Type', encoded.contentType);
  }
  return { ...init, headers, body: encoded.body };
}

async function encodeBody(body: BodyInit | null | undefined): Promise<EncodedBody> {
  if (body instanceof Blob) {
    return { body: await bytesOf(body), contentType: null };
  }
  if (body instanceof FormData) {
    return { body: await multipartOf(body), contentType: `multipart/form-data; boundary=${MULTIPART_BOUNDARY}` };
  }
  return { body, contentType: null };
}

async function multipartOf(form: FormData): Promise<Uint8Array<ArrayBuffer>> {
  const parts: Uint8Array[] = [];
  for (const [name, value] of form.entries()) {
    parts.push(await multipartPartOf(name, value));
  }
  parts.push(textBytes(`--${MULTIPART_BOUNDARY}--\r\n`));
  return concatenated(parts);
}

async function multipartPartOf(name: string, value: FormDataEntryValue): Promise<Uint8Array> {
  if (typeof value === 'string') {
    return textBytes(`--${MULTIPART_BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
  }
  const header = `--${MULTIPART_BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"; filename="${value.name}"\r\nContent-Type: ${value.type || 'application/octet-stream'}\r\n\r\n`;
  return concatenated([textBytes(header), await bytesOf(value), textBytes('\r\n')]);
}

async function bytesOf(blob: Blob): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await blob.arrayBuffer());
}

function textBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function concatenated(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const joined = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}
