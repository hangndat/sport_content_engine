# Skills & Rules cho Sport Content Engine

## Skills (Cursor Agent)

| Skill | Nguồn | Khi dùng |
|-------|-------|----------|
| **sport-content-engine** | `.cursor/skills/sport-content-engine/` | Khi implement crawler, pipeline, agents, connectors, dedup, ranking |
| **arch-and-structure** | ~/.cursor/skills/ (built-in) | Refactor, clean code, tổ chức module |
| **n8n-workflow** | ~/.cursor/skills/ (built-in) | Tạo/sửa n8n workflow JSON |

## Project Rules

| Rule | Path | Scope |
|------|------|-------|
| architecture | `.cursor/rules/architecture.mdc` | `src/**/*.ts` |
| typescript | `.cursor/rules/typescript.mdc` | `src/**/*.ts` |
| n8n | `.cursor/rules/n8n.mdc` | `n8n/**/*.json` |

Rules tự động apply khi mở file matching glob.
