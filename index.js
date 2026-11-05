import { dirname } from 'node:path';
import { BUNDLED_SKILL_RANK } from '@deepseek-ai/dsh-skill';
import { loadSkill, runtimePath, skillDescriptors } from './lib/profile.js';

export const name = 'writing-style';
export const inject = ['skills'];
const PROVIDER = 'writing-style-private';

export function apply(ctx) {
  ctx.skills.registerProvider((control) => {
    const candidates = skillDescriptors().map(({ name, description, file }) => Object.freeze({
      name, description,
      invocation: Object.freeze({ modelInvocable: true, userInvocable: true }),
      source: 'bundled', provider: PROVIDER, rank: BUNDLED_SKILL_RANK,
      locator: file, path: runtimePath(file),
      resourceBase: Object.freeze({ kind: 'directory', path: dirname(runtimePath(file)) }),
    }));
    return {
      name: PROVIDER,
      async list(options = {}) {
        control.signal.throwIfAborted();
        options.signal?.throwIfAborted();
        return candidates;
      },
      async get(candidate, options = {}) {
        const known = candidates.find((item) => item.name === candidate.name && item.locator === candidate.locator);
        if (!known) return undefined;
        const signal = options.signal ? AbortSignal.any([options.signal, control.signal]) : control.signal;
        const content = await loadSkill(known.name, signal);
        if (content === undefined) return undefined;
        const { rank: _rank, locator: _locator, ...summary } = known;
        return { ...summary, content };
      },
    };
  });
}
