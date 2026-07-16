import type * as vscode from "vscode";
import { HistoryEntry } from "../webview/types/internal.types";

const STORAGE_KEY = "restlab.history";
const MAX_PER_REQUEST = 20;
const MAX_GLOBAL = 200;
const MAX_BODY_BYTES = 200_000;

function truncateIfNeeded(value: string | undefined): {
  value: string | undefined;
  truncated: boolean;
} {
  if (!value) return { value, truncated: false };
  const byteLength = Buffer.byteLength(value, "utf8");
  if (byteLength <= MAX_BODY_BYTES) return { value, truncated: false };
  const sliced = value.slice(0, MAX_BODY_BYTES);
  return {
    value: `${sliced}\n...[truncated for storage, original size ${byteLength} bytes]`,
    truncated: true,
  };
}

export class HistoryManager {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private _getAll(): HistoryEntry[] {
    return this.context.globalState.get<HistoryEntry[]>(STORAGE_KEY, []);
  }

  private async _setAll(entries: HistoryEntry[]): Promise<void> {
    await this.context.globalState.update(STORAGE_KEY, entries);
  }

  public getAll(): HistoryEntry[] {
    return this._getAll();
  }

  public getForRequest(requestId: string): HistoryEntry[] {
    return this._getAll().filter((e) => e.requestId === requestId);
  }

  public async addEntry(
    input: Omit<HistoryEntry, "id" | "timestamp" | "truncated">,
  ): Promise<HistoryEntry> {
    const bodyResult = truncateIfNeeded(input.request.body);
    const responseDataResult = truncateIfNeeded(input.response.data);

    const entry: HistoryEntry = {
      ...input,
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      request: { ...input.request, body: bodyResult.value },
      response: { ...input.response, data: responseDataResult.value ?? "" },
      truncated: bodyResult.truncated || responseDataResult.truncated,
    };

    let entries = [entry, ...this._getAll()];

    // Cap entries for this specific request first (newest-first order preserved)
    let keptForRequest = 0;
    entries = entries.filter((e) => {
      if (e.requestId !== entry.requestId) return true;
      keptForRequest += 1;
      return keptForRequest <= MAX_PER_REQUEST;
    });

    // Then cap the global list
    if (entries.length > MAX_GLOBAL) {
      entries = entries.slice(0, MAX_GLOBAL);
    }

    await this._setAll(entries);
    return entry;
  }

  public async deleteEntry(entryId: string): Promise<void> {
    await this._setAll(this._getAll().filter((e) => e.id !== entryId));
  }

  public async clearForRequest(requestId: string): Promise<void> {
    await this._setAll(this._getAll().filter((e) => e.requestId !== requestId));
  }

  public async clearAll(): Promise<void> {
    await this._setAll([]);
  }
}
