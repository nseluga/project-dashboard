import { describe, it, expect } from 'vitest';
import { getProjects } from '../src/lib/projects.js';

describe('getProjects()', () => {
  it('returns exactly 6 projects', async () => {
    const projects = await getProjects();
    expect(projects).toHaveLength(6);
  });

  it('excludes os-evals', async () => {
    const projects = await getProjects();
    const ids = projects.map((p) => p.id);
    expect(ids).not.toContain('os-evals');
  });

  it('includes the expected 6 project ids', async () => {
    const projects = await getProjects();
    const ids = new Set(projects.map((p) => p.id));
    const expected = [
      'os',
      'portfolio-website',
      'patio',
      'pitcher-injury-risk',
      'batting-average-ability',
      'nba-shot-value',
    ];
    for (const id of expected) {
      expect(ids.has(id), `missing expected project: ${id}`).toBe(true);
    }
  });

  it('has non-negative days_since_active for every project', async () => {
    const projects = await getProjects();
    for (const p of projects) {
      expect(
        p.days_since_active,
        `${p.id}.days_since_active must be >= 0`,
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it('nba-shot-value falls back to frontmatter last_active (no local repo)', async () => {
    const projects = await getProjects();
    const nba = projects.find((p) => p.id === 'nba-shot-value');
    expect(nba, 'nba-shot-value project not found').toBeDefined();
    // Frontmatter last_active is 2025-05-11; git would return empty (no local clone)
    expect(nba!.last_active).toContain('2025-05-11');
  });

  it('projects with a local repo get a git-derived last_active (ISO-8601 with offset)', async () => {
    const projects = await getProjects();
    // 'os' has repo: ~/os and has commits — should get a git date
    const os = projects.find((p) => p.id === 'os');
    expect(os, 'os project not found').toBeDefined();
    // Git ISO dates include timezone offset: 2026-07-07T...+00:00 or similar
    expect(os!.last_active).toMatch(/T\d{2}:\d{2}:\d{2}/);
  });

  it('every project has required string fields', async () => {
    const projects = await getProjects();
    for (const p of projects) {
      expect(typeof p.id, `${p.id}: id must be string`).toBe('string');
      expect(typeof p.name, `${p.id}: name must be string`).toBe('string');
      expect(typeof p.status, `${p.id}: status must be string`).toBe('string');
      expect(typeof p.last_active, `${p.id}: last_active must be string`).toBe('string');
      expect(typeof p.days_since_active, `${p.id}: days_since_active must be number`).toBe('number');
      expect(Array.isArray(p.tags), `${p.id}: tags must be array`).toBe(true);
    }
  });
});
