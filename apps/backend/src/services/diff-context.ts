import { Octokit } from '@octokit/rest';
import { MergeContext } from './merge-orchestrator';

function detectLanguage(path: string): MergeContext['language'] {
  if (path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.js') || path.endsWith('.jsx')) return path.endsWith('.ts') || path.endsWith('.tsx') ? 'ts' : 'js';
  if (path.endsWith('.py')) return 'py';
  if (path.endsWith('.go')) return 'go';
  if (path.endsWith('.java')) return 'java';
  if (path.endsWith('.rb')) return 'rb';
  return 'other';
}

async function getFileAtRef(octokit: Octokit, owner: string, repo: string, path: string, ref: string): Promise<string | undefined> {
  try {
    const res: any = await (octokit.repos as any).getContent({ owner, repo, path, ref });
    if ('content' in res.data) {
      return Buffer.from(res.data.content, 'base64').toString('utf8');
    }
  } catch (e: any) {
    if (e?.status === 404) return undefined;
  }
  return undefined;
}

export async function buildMergeContext(octokit: Octokit, repoFullName: string, baseSha: string, headSha: string, files: Array<{ filename: string }>): Promise<MergeContext> {
  const [owner, repo] = repoFullName.split('/');
  // find merge base between baseSha and headSha
  let mergeBase = baseSha;
  try {
    const cmp = await octokit.repos.compareCommits({ owner, repo, base: baseSha, head: headSha });
    mergeBase = (cmp.data as any).merge_base_commit?.sha || baseSha;
  } catch {}

  const mergedFiles: MergeContext['files'] = [];
  for (const f of files) {
    const base = await getFileAtRef(octokit, owner, repo, f.filename, mergeBase);
    const left = await getFileAtRef(octokit, owner, repo, f.filename, baseSha);
    const right = await getFileAtRef(octokit, owner, repo, f.filename, headSha);
    mergedFiles.push({ path: f.filename, base, left, right });
  }

  // Choose a language heuristic by first code file, default ts
  const lang = (() => {
    for (const f of files) {
      const l = detectLanguage(f.filename);
      if (l !== 'other') return l;
    }
    return 'ts' as const;
  })();

  return {
    repo: repoFullName,
    baseSha,
    leftSha: baseSha,
    rightSha: headSha,
    language: lang,
    files: mergedFiles
  };
}

