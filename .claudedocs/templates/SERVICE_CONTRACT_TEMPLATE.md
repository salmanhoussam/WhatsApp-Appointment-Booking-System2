## Service Contract

Follows: Service Execution Constitution (.claude/rules/service-execution-constitution.md)

### Mission
[one line — what this service does and why it exists independently]

### Context Investigation — Service-Specific
- Real examples this service reads: [...]
- Registry/config files this service reads: [...]
- Relevant ADRs/Skills/Rules beyond the Constitution itself: [...]
- Fallback when a required input is missing: [request from which upstream service / derive from
  which real examples — never invent from unstated assumptions]
- Output: execution-context.md

### Inputs
- REQUIRED: [exact shape/format/source]
- Preconditions that must hold before starting

### Outputs
- [every deliverable precisely: file, link, endpoint response]

### Dependencies
- What must exist/succeed before this service can run (informational — not a dispatch mechanism)
- What downstream work currently follows it, today, informally (if anything)

### How It Runs Today
- Single agent, same-thread — describe the real current execution path, no dispatcher involved
- Environment(s) it's safe to run against (dev/demo/production) and the guardrails for each

### Logs & Evidence
- execution-context.md + evidence.md, both under .claudedocs/work/{service-name}/{run-id}/
- What evidence.md must capture, specific to this service — concrete values only

### Completion Checklist
- [ ] ...
- [ ] execution-context.md and evidence.md both written and match the shapes above
