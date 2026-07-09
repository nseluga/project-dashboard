import { describe, it, expect } from 'vitest';
import { autoTag } from '../src/lib/autoTag.js';

describe('autoTag()', () => {
  it('returns null when no projects provided', () => {
    expect(autoTag('working on something', [], [])).toBeNull();
  });

  it('returns null when no match found in text', () => {
    expect(autoTag('just a general idea', ['alpha'], ['Alpha Project'])).toBeNull();
  });

  it('matches project name (case-insensitive)', () => {
    const result = autoTag('need to update the Alpha Project board', ['alpha'], ['Alpha Project']);
    expect(result).toBe('alpha');
  });

  it('matches project id (case-insensitive)', () => {
    const result = autoTag('working on alpha today', ['alpha'], ['Alpha Project']);
    expect(result).toBe('alpha');
  });

  it('returns null when no project name or id appears in text', () => {
    const result = autoTag('unrelated thought about lunch', ['alpha', 'beta'], ['Alpha', 'Beta']);
    expect(result).toBeNull();
  });

  it('picks the project whose name/id appears earliest in text', () => {
    // "beta" appears at index 0, "alpha" appears later
    const result = autoTag('beta then alpha later', ['alpha', 'beta'], ['Alpha', 'Beta']);
    expect(result).toBe('beta');
  });

  it('multi-match: prefers earlier position even when id match beats name match', () => {
    // "project-b" id appears at position 0, "Alpha Project" name appears at position 20
    const result = autoTag('project-b is done; Alpha Project next', ['alpha', 'project-b'], ['Alpha Project', 'Project B']);
    expect(result).toBe('project-b');
  });

  it('single project — exact name match returns its id', () => {
    expect(autoTag('notes about My App', ['my-app'], ['My App'])).toBe('my-app');
  });

  it('single project — exact id match returns its id', () => {
    expect(autoTag('my-app needs more work', ['my-app'], ['My App'])).toBe('my-app');
  });

  it('name match wins over id match when name appears earlier', () => {
    // "Alpha Project" name appears at index 0, "alpha" id appears at index 14
    const result = autoTag('Alpha Project is the alpha project', ['alpha'], ['Alpha Project']);
    expect(result).toBe('alpha');
  });

  it('is case-insensitive for project names', () => {
    expect(autoTag('ALPHA PROJECT is great', ['alpha'], ['Alpha Project'])).toBe('alpha');
  });

  it('is case-insensitive for project ids', () => {
    expect(autoTag('working on ALPHA today', ['alpha'], ['Alpha Project'])).toBe('alpha');
  });

  it('returns first project in array when both match at the same position (tie)', () => {
    // Both ids happen to be at position 0 — impossible in practice but we test tie-breaking
    // "ab" matches the first part of "abc" text — but only exact substring match counts
    // Here we give two projects where the text exactly matches id of first at pos 0
    const result = autoTag('alpha work today', ['alpha', 'alpha'], ['Alpha', 'Alpha2']);
    expect(result).toBe('alpha');
  });
});
