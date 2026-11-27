import * as fs from 'node:fs';
import * as path from 'node:path';

export function validateRefRoot(refRoot: unknown): string {
  if (typeof refRoot !== 'string' || !path.isAbsolute(refRoot)) {
    throw new Error(`Invalid refRoot ${JSON.stringify(refRoot)}: it must be an absolute path`);
  }
  let real: string;
  try {
    real = fs.realpathSync(refRoot);
  } catch {
    throw new Error(`Invalid refRoot ${JSON.stringify(refRoot)}: the directory does not exist`);
  }
  if (!fs.statSync(real).isDirectory()) {
    throw new Error(`Invalid refRoot ${JSON.stringify(refRoot)}: it is not a directory`);
  }
  return real;
}

export function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  if (relative === '') return true;
  if (path.isAbsolute(relative)) return false;
  return relative !== '..' && !relative.startsWith('..' + path.sep);
}

export function resolveExternalFile(
  ref: string,
  file: string,
  baseDir: string,
  root: string
): string {
  const candidate = path.isAbsolute(file) ? file : path.join(baseDir, file);
  let real: string;
  try {
    real = fs.realpathSync(candidate);
  } catch {
    throw new Error(`Unresolvable $ref ${JSON.stringify(ref)}: the file does not exist`);
  }
  if (!isInside(root, real)) {
    throw new Error(`$ref ${JSON.stringify(ref)} points outside the reference root`);
  }
  return real;
}

export function walkOwn(start: unknown, keys: string[], ref: string): any {
  let cur: any = start;
  for (const key of keys) {
    if (
      cur === null ||
      typeof cur !== 'object' ||
      !Object.prototype.hasOwnProperty.call(cur, key)
    ) {
      throw new Error(`Unresolvable $ref ${JSON.stringify(ref)}`);
    }
    cur = cur[key];
  }
  return cur;
}

export function decodePointer(pointer: string): string[] {
  return pointer.split('/').map((k: string) => k.replace(/~1/g, '/').replace(/~0/g, '~'));
}

export function assignOwn(target: any, key: string, value: unknown): void {
  if (key === '__proto__') {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  } else {
    target[key] = value;
  }
}
