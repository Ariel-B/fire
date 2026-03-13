import { readFileSync } from 'node:fs';

const demoPlanUrl = new URL('../../../tools/fixtures/fire-plan-demo.json', import.meta.url);

export const demoPlan = JSON.parse(readFileSync(demoPlanUrl, 'utf8')) as Record<string, unknown>;

export function cloneDemoPlan<T = Record<string, unknown>>(): T {
  return structuredClone(demoPlan) as T;
}

export function currentYearPlus(offset: number): number {
  return new Date().getFullYear() + offset;
}
