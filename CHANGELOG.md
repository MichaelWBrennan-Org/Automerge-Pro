# Changelog

## Unreleased
- Merge Orchestrator scaffolding with AST-first then LLM fallback
- TypeScript semantic resolver using recast + ts-morph (conservative strategies)
- Python/Go/Java semantic resolvers with external AST merge service opt-in
- Diff context builder to fetch base/left/right from GitHub (merge-base aware)
- VerificationService with optional real verification via AUTOMERGE_VERIFY
- Silent GitHub Check Runs for orchestrator progress/completion
- Zero-config defaults for docs-only and Dependabot low-risk auto-merge
- Audit log plugin and Prisma AuditEvent model
- Actions workflow for dry run + summary posting