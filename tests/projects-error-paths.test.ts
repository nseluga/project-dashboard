/**
 * Tests for Item 1.1 fix-report Important criteria:
 *  1. readFile catch discriminates ENOENT vs other errors (not a bare catch-all)
 *  2. matter() is wrapped in try/catch (malformed YAML skips the project rather than crashing)
 *
 * OS_PROJECTS_DIR is read inside getProjects() on each call, so a single module import
 * suffices — no vi.resetModules() needed between tests.
 *
 * NOTE: vi.mockRestore() in vitest 4.x clears call history; all spy assertions must
 * happen BEFORE mockRestore().
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, chmod } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { getProjects } from '../src/lib/projects.js';

async function makeTempProjectsDir(
  dirs: Array<{ name: string; readme?: string; chmodReadme?: number }>,
): Promise<string> {
  const base = await mkdtemp(join(tmpdir(), 'dash-test-'));
  for (const dir of dirs) {
    const d = join(base, dir.name);
    await mkdir(d);
    if (dir.readme !== undefined) {
      const readmePath = join(d, 'README.md');
      await writeFile(readmePath, dir.readme, 'utf-8');
      if (dir.chmodReadme !== undefined) {
        await chmod(readmePath, dir.chmodReadme);
      }
    }
  }
  return base;
}

describe('getProjects() error-path fixes', () => {
  const tempDirs: string[] = [];
  const originalOsProjectsDir = process.env.OS_PROJECTS_DIR;

  afterEach(async () => {
    // Restore env
    if (originalOsProjectsDir === undefined) {
      delete process.env.OS_PROJECTS_DIR;
    } else {
      process.env.OS_PROJECTS_DIR = originalOsProjectsDir;
    }
    // Re-chmod any locked files and remove temp dirs
    for (const dir of tempDirs.splice(0)) {
      try {
        const { readdir: rd } = await import('fs/promises');
        const subs = await rd(dir);
        for (const sub of subs) {
          const readme = join(dir, sub, 'README.md');
          await chmod(readme, 0o644).catch(() => {});
        }
      } catch { /* best-effort */ }
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('ENOENT — directory without README.md is skipped silently (no console.warn)', async () => {
    const tempDir = await makeTempProjectsDir([
      { name: 'proj-a', readme: '---\nname: Project A\nstatus: active\n---\n# A' },
      { name: 'proj-b' /* no README.md → ENOENT on readFile */ },
    ]);
    tempDirs.push(tempDir);
    process.env.OS_PROJECTS_DIR = tempDir;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const projects = await getProjects();
    // Assert BEFORE mockRestore (vitest 4.x clears call history on restore)
    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe('proj-a');
    expect(warnSpy, 'ENOENT must be silent — no console.warn').not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('non-ENOENT readFile error — emits console.warn and skips project (ENOENT discrimination in effect)', async () => {
    const tempDir = await makeTempProjectsDir([
      { name: 'proj-good', readme: '---\nname: Good\nstatus: active\n---\n# Good' },
      {
        name: 'proj-eperm',
        readme: '---\nname: Eperm\nstatus: active\n---\n# Eperm',
        chmodReadme: 0o000, // → EACCES when read (non-ENOENT)
      },
    ]);
    tempDirs.push(tempDir);
    process.env.OS_PROJECTS_DIR = tempDir;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const projects = await getProjects();
    // Assert BEFORE mockRestore
    const ids = projects.map((p) => p.id);
    expect(ids).toContain('proj-good');
    expect(ids).not.toContain('proj-eperm');
    expect(warnSpy, 'non-ENOENT error must emit console.warn').toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('[projects]');
    warnSpy.mockRestore();
  });

  it('matter() try/catch — malformed YAML frontmatter skips project without crashing getProjects()', async () => {
    const tempDir = await makeTempProjectsDir([
      { name: 'proj-valid', readme: '---\nname: Valid\nstatus: active\n---\n# Valid' },
      {
        name: 'proj-malformed',
        // Unclosed flow collection — js-yaml throws YAMLException
        readme: '---\nfoo: {\n---\n# Malformed',
      },
    ]);
    tempDirs.push(tempDir);
    process.env.OS_PROJECTS_DIR = tempDir;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let projects: Awaited<ReturnType<typeof getProjects>> = [];
    let threw = false;
    try {
      projects = await getProjects();
    } catch {
      threw = true;
    }
    // Assert BEFORE mockRestore
    expect(threw, 'getProjects() must not throw on malformed YAML').toBe(false);
    const ids = projects.map((p) => p.id);
    expect(ids).toContain('proj-valid');
    expect(ids).not.toContain('proj-malformed');
    expect(warnSpy, 'matter() parse failure must emit console.warn').toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('[projects]');
    warnSpy.mockRestore();
  });
});
