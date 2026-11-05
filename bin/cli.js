#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { composePrompt, doctor, listProfiles } from '../lib/profile.js';

const help = `dsh-writing-style 0.1.0 — local profile inspection and prompt composition
Usage:
  dsh-writing-style list
  dsh-writing-style doctor
  dsh-writing-style compose --task draft|revise|review|feedback --genre GENRE [--json]

Genres: general, work-summary, conference-report, technical-note,
        numerical-development, personal-narrative
Defaults: task=draft, genre=general. Exactly one genre is selected.
This CLI prints guidance; the DSH host model performs writing/review.
No network calls, model training, corpus loading or automatic profile edits.
`;

try {
  const { values, positionals, tokens } = parseArgs({
    allowPositionals: true,
    tokens: true,
    options: { help: { type: 'boolean', short: 'h' }, version: { type: 'boolean' }, task: { type: 'string' }, genre: { type: 'string' }, json: { type: 'boolean' } },
  });
  for (const name of ['task', 'genre']) {
    if (tokens.filter((token) => token.kind === 'option' && token.name === name).length > 1) throw new Error(`--${name} must be supplied only once`);
  }
  if (values.help) {
    console.log(help);
  } else if (values.version) {
    console.log('0.1.0');
  } else {
    const [command, ...extra] = positionals;
    if (extra.length) throw new Error('Unexpected positional arguments');
    if (!command) {
      console.log(help);
    } else if (command === 'list' || command === 'doctor') {
      if (values.task || values.genre) throw new Error('--task and --genre are only accepted by compose');
      console.log(JSON.stringify(command === 'list' ? listProfiles() : await doctor(), null, 2));
    } else if (command === 'compose') {
      const result = await composePrompt({ task: values.task ?? 'draft', genre: values.genre ?? 'general' });
      console.log(values.json ? JSON.stringify(result, null, 2) : result.content);
    } else {
      throw new Error(`Unknown command: ${command}. Run --help.`);
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
