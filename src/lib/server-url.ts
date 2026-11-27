export interface ServerLocation {
  host?: string;
  scheme?: string;
  basePath: string;
}

export function substituteVariables(serverUrl: string, variables: unknown): string {
  if (variables === null || typeof variables !== 'object') return serverUrl;
  return serverUrl.replace(/\{([^{}]*)\}/g, (token: string, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(variables, name)) return token;
    const variable = (variables as Record<string, any>)[name];
    const value = variable && typeof variable === 'object' ? variable.default : undefined;
    return value ? String(value) : token;
  });
}

function stripQueryAndFragment(value: string): string {
  const end = value.search(/[?#]/);
  return end === -1 ? value : value.slice(0, end);
}

function pathOf(value: string): string {
  const schemeEnd = value.indexOf('://');
  if (schemeEnd === -1) return stripQueryAndFragment(value);
  const rest = value.slice(schemeEnd + 3);
  const slash = rest.search(/[/?#]/);
  if (slash === -1 || rest[slash] !== '/') return '';
  return stripQueryAndFragment(rest.slice(slash));
}

export function parseServerUrl(value: string): ServerLocation {
  if (/[{}]/.test(value)) return { basePath: pathOf(value) };
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { basePath: pathOf(value) };
  }
  return {
    host: parsed.host || undefined,
    scheme: parsed.protocol.slice(0, -1),
    basePath: parsed.pathname,
  };
}
