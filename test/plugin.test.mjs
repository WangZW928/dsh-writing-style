import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { Context } from '@deepseek-ai/cordis';
import { SkillRegistry } from '@deepseek-ai/dsh-skill';
import * as plugin from '../index.js';
import { composePrompt, doctor, listProfiles, loadSkill, packageRoot, profileManifest, readRule, runtimePath, skillDescriptors } from '../lib/profile.js';

const cli = join(packageRoot, 'bin/cli.js');
const run = (args, cwd = tmpdir()) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });

test('manifest is private, declares a complete DSH host bundle, and exports runtime resources', async () => {
  const pkg = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.name, 'dsh-writing-style');
  assert.equal(pkg.version, '0.1.1');
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml');
  assert.match(await readFile(join(packageRoot, pkg.dsh.bundle.patch), 'utf8'), /name: dsh-writing-style/);
  assert.equal(pkg.scripts.prepare, undefined);
  assert.equal(pkg.scripts.postinstall, undefined);
  for (const file of ['index.js', 'lib/profile.js', 'bin/cli.js', 'profiles/manifest.json', 'assets/icon.svg', 'locale/en.json', 'locale/zh.json']) await access(join(packageRoot, file));
});

test('four tasks, five genre branches, and ten unique skill descriptors are explicit', async () => {
  const list = listProfiles();
  assert.equal(list.tasks.length, 4);
  assert.equal(list.genres.length, 6); // Five branches plus general/core-only.
  assert.equal(list.dossierVersion, '0.4');
  assert.equal(list.referenceCount, 1);
  assert.equal(list.sourceCount, 5);
  const descriptors = skillDescriptors();
  assert.equal(descriptors.length, 10);
  assert.equal(new Set(descriptors.map((item) => item.name)).size, 10);
  assert.ok(Object.isFrozen(profileManifest));
  assert.ok(Object.isFrozen(profileManifest.genres));
  for (const item of descriptors) {
    const body = await loadSkill(item.name);
    assert.match(body, /共同写作规则/);
    assert.ok(body.includes(item.name));
    assert.ok(body.length > 500);
  }
  assert.equal(await loadSkill('not-a-skill'), undefined);
});

test('all 24 task/genre combinations contain exactly one selected branch or core only', async () => {
  const headers = new Map();
  for (const branch of profileManifest.genres) headers.set(branch.id, (await readRule(branch.file)).split('\n')[0]);
  for (const task of profileManifest.tasks) {
    for (const genre of listProfiles().genres) {
      const prompt = await composePrompt({ task: task.id, genre: genre.id });
      assert.equal(prompt.task, task.id);
      assert.equal(prompt.genre, genre.id);
      assert.match(prompt.content, /无需再次调用文体 skill/);
      assert.match(prompt.content, /不重复加载/);
      for (const [id, header] of headers) assert.equal(prompt.content.includes(header), id === genre.id, `${task.id}/${genre.id}/${id}`);
    }
  }
  const defaults = await composePrompt();
  assert.equal(defaults.task, 'draft');
  assert.equal(defaults.genre, 'general');
});

test('five user-confirmed reference rules load only in the technical-note genre', async () => {
  const ids = ['R01-C1', 'R01-C2', 'R01-C3', 'R01-C4', 'R01-C5'];
  const skill = await loadSkill('writing-style-technical-note');
  assert.match(skill, /本人样本数量：5；外部参考数量：1/);
  assert.match(skill, /袁野《电动力学讲义》/);
  assert.match(skill, /作用域为技术学习笔记（genre）/);
  for (const task of profileManifest.tasks) {
    for (const genre of listProfiles().genres) {
      const { content } = await composePrompt({ task: task.id, genre: genre.id });
      for (const id of ids) assert.equal(content.includes(id), genre.id === 'technical-note', `${task.id}/${genre.id}/${id}`);
    }
  }
  for (const id of ids) assert.equal(skill.split(id).length - 1, 1, id);
  for (const term of ['不强造对立', '形式表达、可计算、已实现和已测试分别记录', '总体优劣', '不为模仿探索口吻而虚构', '生活比喻不代替严格定义']) assert.ok(skill.includes(term), term);
});

test('adopted reference metadata preserves author attribution and original sample count', async () => {
  const confirmed = profileManifest.confirmedRuleSets.find(({ id }) => id === 'R01');
  assert.equal(profileManifest.sourceCount, 5);
  assert.equal(profileManifest.referenceCount, 1);
  assert.equal(confirmed.sourceAuthor, '袁野');
  assert.equal(confirmed.sourceTitle, '电动力学讲义');
  assert.equal(confirmed.isUserAuthored, false);
  assert.equal(confirmed.confirmedOn, '2026-11-24');
  assert.equal(confirmed.genre, 'technical-note');
  assert.equal(confirmed.scope, 'genre');
  assert.deepEqual(confirmed.ruleIds, ['R01-C1', 'R01-C2', 'R01-C3', 'R01-C4', 'R01-C5']);
  // Public tests verify curated metadata without requiring unpublished source files.
  assert.equal(profileManifest.dossierVersion, '0.4');
});

test('unknown task or genre is rejected rather than falling back silently', async () => {
  await assert.rejects(composePrompt({ task: 'publish' }), /Unknown task/);
  await assert.rejects(composePrompt({ genre: 'blog-inferred' }), /Unknown genre/);
  await assert.rejects(composePrompt({ genre: '../corpus/originals' }), /Unknown genre/);
});

test('curated path allowlist rejects corpus, traversal and arbitrary filesystem access', () => {
  for (const file of ['corpus/originals/secret.md', 'analysis/style.md', '../profiles/core.md', '/tmp/profiles/core.md', 'profiles/genres/../../corpus.md', 'profiles/.env', 'profiles/manifest.json']) {
    assert.throws(() => runtimePath(file), /Not a curated runtime file/);
  }
  assert.equal(runtimePath('profiles/core.md'), join(packageRoot, 'profiles/core.md'));
});

test('aborted profile reads and compositions stop promptly', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(readRule('profiles/core.md', controller.signal), { name: 'AbortError' });
  await assert.rejects(composePrompt({ signal: controller.signal }), { name: 'AbortError' });
});

test('real DSH registry loads ten skills, respects overrides, and removes provider on unload', async (t) => {
  const ctx = new Context();
  await ctx.plugin(SkillRegistry);
  t.after(() => ctx.fiber.dispose());
  const fiber = await ctx.plugin(plugin);
  const listed = await ctx.skills.list({ cwd: tmpdir() });
  assert.equal(listed.length, 10);
  for (const summary of listed) {
    assert.equal(summary.provider, 'writing-style-private');
    assert.equal(summary.source, 'bundled');
    const skill = await ctx.skills.get(summary.name);
    assert.match(skill.content, /风格档案版本：0\.4/);
    assert.equal(skill.invocation.userInvocable, true);
    await access(skill.path);
    assert.ok(skill.resourceBase.path.startsWith(packageRoot));
  }
  const unregister = ctx.skills.register({ name: 'writing-style-draft', description: 'User override', content: 'User-owned override', source: 'runtime' });
  assert.equal((await ctx.skills.get('writing-style-draft')).content, 'User-owned override');
  unregister();
  assert.equal((await ctx.skills.get('writing-style-draft')).provider, 'writing-style-private');
  await fiber.dispose();
  assert.equal((await ctx.skills.list()).length, 0);
  assert.equal(await ctx.skills.get('writing-style'), undefined);
});

test('composed rules preserve task-specific fact, numerical-status and feedback boundaries', async () => {
  const revise = (await composePrompt({ task: 'revise', genre: 'numerical-development' })).content;
  for (const term of ['公式及符号', '代码', '引用原文及归属', '事实纠错分开', '数学正确性与风格审查分开']) assert.ok(revise.includes(term), term);
  const review = (await composePrompt({ task: 'review' })).content;
  for (const term of ['当前待检稿', '百分比相似度', '不自动整篇重写']) assert.ok(review.includes(term), term);
  const feedback = (await composePrompt({ task: 'feedback', genre: 'personal-narrative' })).content;
  for (const term of ['stable', 'genre', 'candidate', '等待用户确认', '不自动编辑规则文件', '不制造对照稿']) assert.ok(feedback.includes(term), term);
});

test('CLI works outside repository and reports invalid or duplicate selections', () => {
  for (const args of [['--help'], ['--version'], ['list'], ['doctor']]) {
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
  }
  const composed = run(['compose', '--task', 'review', '--genre', 'numerical-development', '--json']);
  assert.equal(composed.status, 0, composed.stderr);
  const body = JSON.parse(composed.stdout);
  assert.equal(body.task, 'review');
  assert.equal(body.genre, 'numerical-development');
  for (const args of [['unknown'], ['compose', '--genre', 'invalid'], ['list', '--task', 'draft'], ['compose', '--genre', 'general', '--genre', 'personal-narrative'], ['compose', '--task', 'review', '--task', 'draft'], ['compose', 'unexpected']]) {
    assert.equal(run(args).status, 2, args.join(' '));
  }
});

test('runtime operates with raw-material directories absent and rejects rule symlinks', async (t) => {
  const temp = await mkdtemp(join(tmpdir(), 'writing style $ offline '));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const isolated = join(temp, 'package');
  await mkdir(isolated);
  for (const file of ['package.json', 'bin', 'lib', 'profiles', 'skills']) await cp(join(packageRoot, file), join(isolated, file), { recursive: true });
  const isolatedCli = join(isolated, 'bin/cli.js');
  const result = spawnSync(process.execPath, [isolatedCli, 'doctor'], { cwd: tmpdir(), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).automaticCorpusReads, false);
  const outside = join(temp, 'outside.md');
  await writeFile(outside, 'PRIVATE_CORPUS_SENTINEL');
  await rm(join(isolated, 'profiles/core.md'));
  await symlink(outside, join(isolated, 'profiles/core.md'));
  const rejected = spawnSync(process.execPath, [isolatedCli, 'compose'], { encoding: 'utf8' });
  assert.equal(rejected.status, 2);
  assert.match(rejected.stderr, /outside the package/);
  assert.ok(!rejected.stdout.includes('PRIVATE_CORPUS_SENTINEL'));
});

test('published file list excludes originals, historical analysis, credentials and local artifacts', () => {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: packageRoot, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  const pack = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0];
  const files = pack.files.map((file) => file.path);
  for (const file of ['index.js', 'lib/profile.js', 'profiles/core.md', 'profiles/manifest.json', 'skills/entry.md', 'skills/feedback.md', 'profiles/genres/numerical-development.md', 'locale/zh.json', 'cordis.patch.yml']) assert.ok(files.includes(file), file);
  for (const file of files) assert.doesNotMatch(file, /(^|\/)(corpus|analysis|node_modules|\.git|\.env|outputs|__pycache__)(\/|\.|$)|\.(zip|pdf|tex|tgz)$/i);
});

test('doctor and composition make no fetch calls and expose no private source paths', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unexpected network call'); };
  try {
    const result = await doctor();
    assert.equal(result.skillCount, 10);
    assert.equal(result.runtimeFiles, 11);
    for (const task of profileManifest.tasks) {
      const content = (await composePrompt({ task: task.id, genre: 'personal-narrative' })).content;
      assert.doesNotMatch(content, /\/home\/|\/Users\/|attachments\/v1|杨晓雷|郭子硕/);
    }
  } finally {
    globalThis.fetch = original;
  }
});
