export interface ResolvedFrame {
  file: string;
  line: number;
  column: number;
  name: string | undefined;
  scriptUrl: string;
}

export interface CDPStackFrame {
  url: string;
  lineNumber: number;
  columnNumber: number;
  functionName?: string;
}

export class SourceMapResolver {
  private cache = new Map<string, unknown>();

  async resolve(scriptUrl: string, line: number, col: number): Promise<ResolvedFrame | null> {
    try {
      const resolver = this.cache.get(scriptUrl);
      if (!resolver) {
        return null;
      }
      return { file: scriptUrl, line, column: col, name: undefined, scriptUrl };
    } catch {
      return null;
    }
  }

  async resolveStack(stack: CDPStackFrame[]): Promise<ResolvedFrame[]> {
    const resolved: ResolvedFrame[] = [];
    for (const frame of stack) {
      const r = await this.resolve(frame.url, frame.lineNumber, frame.columnNumber);
      if (r) {
        resolved.push({ ...r, name: frame.functionName });
      }
    }
    return resolved;
  }
}
