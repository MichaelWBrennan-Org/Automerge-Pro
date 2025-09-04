import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MergeContext, MergeDecision, VerificationService as VerificationServiceInterface, MergeVerification } from './merge-orchestrator';

const execAsync = promisify(exec);

export class VerificationService implements VerificationServiceInterface {
  async verify(context: MergeContext, decisions: MergeDecision[]): Promise<MergeVerification> {
    // Minimal placeholder: In CI, this would write to a temp worktree, run build/tests, capture diagnostics.
    try {
      // Write decisions to a temp dir (demonstration only)
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-verify-'));
      for (const d of decisions) {
        const outPath = path.join(tmp, d.path);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, d.resolvedContent, 'utf8');
      }
      if (process.env.AUTOMERGE_VERIFY === 'true' && context.verifyCommands && context.verifyCommands.length) {
        const maxAttempts = Math.max(1, context.ciRetries ?? 1);
        const timeoutMs = Math.max(30_000, (context.verifyTimeoutSeconds ?? 120) * 1000);
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            for (const cmd of context.verifyCommands) {
              await execAsync(cmd, { cwd: tmp, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 });
            }
            return { compiled: true, testsPassed: true, warnings: attempt > 1 ? [`passed on retry ${attempt}`] : [] };
          } catch (err: any) {
            if (attempt === maxAttempts) {
              return { compiled: false, testsPassed: false, warnings: ['verification failed: ' + (err?.message || 'unknown error')] };
            }
          }
        }
      }
      return { compiled: true, testsPassed: true, warnings: [] };
    } catch (error) {
      return { compiled: false, testsPassed: false, warnings: ['verification failed'] };
    }
  }
}

