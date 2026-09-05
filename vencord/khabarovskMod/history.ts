import * as DataStore from "@api/DataStore";

import { num, settings } from "./settings";

const KEY = "khabarovskMod_history";

export interface HistoryEntry {
    userId: string;
    userTag: string;
    ruleId: string;
    punishment: string;
    dateIssued: string;
    timeIssued: string;
}

/**
 * История наказаний в IndexedDB. В отличие от BetterDiscord-версии,
 * хранилище Vencord асинхронное, поэтому держим копию в памяти:
 * меню строится синхронно и ждать промис там негде.
 */
let cache: HistoryEntry[] = [];

export async function loadHistory(): Promise<HistoryEntry[]> {
    cache = (await DataStore.get<HistoryEntry[]>(KEY)) ?? [];
    return cache;
}

export function getHistory(): HistoryEntry[] {
    return cache;
}

export async function addEntry(entry: HistoryEntry): Promise<void> {
    const max = num(settings.store.maxHistory, 50, 1, 1000);
    cache = [...cache, entry].slice(-max);
    await DataStore.set(KEY, cache);
}

/** Удаляет запись по содержимому: индекс мог устареть с момента отрисовки. */
export async function removeEntry(entry: HistoryEntry): Promise<void> {
    const index = cache.findIndex(h =>
        h.userId === entry.userId &&
        h.punishment === entry.punishment &&
        h.dateIssued === entry.dateIssued &&
        h.timeIssued === entry.timeIssued
    );
    if (index === -1) return;
    cache = cache.filter((_, i) => i !== index);
    await DataStore.set(KEY, cache);
}

export async function clearHistory(): Promise<void> {
    cache = [];
    await DataStore.set(KEY, cache);
}

/** Наказания конкретного пользователя, свежие первыми. */
export function historyForUser(userId: string): HistoryEntry[] {
    return cache.filter(h => h.userId === userId).reverse();
}

/** Недавние сочетания «правило + наказание» без повторов, для быстрого применения. */
export function recentPunishments(limit: number): Array<{ ruleId: string; punishment: string; }> {
    const seen = new Set<string>();
    const result: Array<{ ruleId: string; punishment: string; }> = [];

    for (let i = cache.length - 1; i >= 0 && result.length < limit; i--) {
        const item = cache[i];
        const ruleId = (item.ruleId || "").trim();
        const punishment = (item.punishment || "").trim();
        if (!ruleId || ruleId === "____" || !punishment) continue;

        const key = `${ruleId}::${punishment}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ ruleId, punishment });
    }
    return result;
}
