# Skills Index - Quick Reference

> Quick reference for all available skills. Use this file to identify which skills to load.

---

## Generic Skills

| Skill              | Path                                | Key Patterns                                            |
| ------------------ | ----------------------------------- | ------------------------------------------------------- |
| `typescript`       | `generic/typescript/SKILL.md`       | `as const`, no `any`, no `enum`, flat interfaces        |
| `react-patterns`   | `generic/react-patterns/SKILL.md`   | Compound components, hooks, composition                 |
| `nextjs-core`      | `generic/nextjs-core/SKILL.md`      | Server Components, Server Actions, streaming            |
| `ui-engineering`   | `generic/ui-engineering/SKILL.md`   | Tailwind v4, shadcn, Aceternity, `cn()`                 |
| `ux`               | `generic/ux/SKILL.md`               | User flows, CRUD UX, validation, recovery states        |
| `database`         | `generic/database/SKILL.md`         | Supabase, mandatory RLS, Zod schemas, service layer     |
| `security`         | `generic/security/SKILL.md`         | XSS/CSRF, input validation, server-side auth            |
| `error-handling`   | `generic/error-handling/SKILL.md`   | Custom errors, Error Boundaries, logging                |
| `testing`          | `generic/testing/SKILL.md`          | Vitest, Testing Library, MSW, behavior-driven           |
| `git-workflow`     | `generic/git-workflow/SKILL.md`     | Conventional Commits, branching, PRs                    |
| `api-design`       | `generic/api-design/SKILL.md`       | REST APIs, webhooks, external integrations              |
| `i18n`             | `generic/i18n/SKILL.md`             | next-intl, locale handling, translations                |
| `accessibility`    | `generic/accessibility/SKILL.md`    | WCAG 2.1, ARIA, keyboard navigation                     |
| `performance`      | `generic/performance/SKILL.md`      | Core Web Vitals, lazy loading, React Compiler           |
| `prisma`           | `generic/prisma/SKILL.md`           | Prisma ORM, PostgreSQL, Neon, service layer, migrations |
| `seo`              | `generic/seo/SKILL.md`              | Meta tags, Open Graph, structured data, sitemap         |
| `state-management` | `generic/state-management/SKILL.md` | Zustand vs Context, stores, slices, persistence         |
| `remotion`         | `generic/remotion/SKILL.md`         | Video creation in React, frame-based animations         |
| `react-native`     | `generic/react-native/SKILL.md`     | Expo, React Navigation, native APIs, mobile performance |

---

## Meta Skills

| Skill           | Path                     | Purpose                                  |
| --------------- | ------------------------ | ---------------------------------------- |
| `skill-creator` | `skill-creator/SKILL.md` | Create new skills following the template |
| `skill-sync`    | `skill-sync/SKILL.md`    | Sync skill metadata to AGENTS.md         |
| `feedback-loop` | `feedback-loop/SKILL.md` | Capture improvements and learnings       |

---

## Decision Matrix: What Skill to Load

### By File Type

| Extension                | Skills to Load                                   |
| ------------------------ | ------------------------------------------------ |
| `.ts`                    | `typescript`                                     |
| `.tsx`                   | `typescript`, `react-patterns`                   |
| `.test.ts` / `.test.tsx` | `testing`, `typescript`                          |
| `app/**/*.tsx`           | `nextjs-core`, `typescript`, `react-patterns`    |
| `components/**/*.tsx`    | `ui-engineering`, `react-patterns`, `typescript` |
| `lib/actions/**/*.ts`    | `nextjs-core`, `security`, `typescript`          |
| `lib/supabase/**/*.ts`   | `database`, `security`, `typescript`             |

### By Task Type

| Task                                | Minimum Skills                                      |
| ----------------------------------- | --------------------------------------------------- |
| Create UI component                 | `ui-engineering`, `react-patterns`, `typescript`    |
| Redesign CRUD dashboard UX          | `ux`, `ui-engineering`, `accessibility`             |
| Create Server Action                | `nextjs-core`, `security`, `database`, `typescript` |
| Create page/layout                  | `nextjs-core`, `typescript`                         |
| Create custom hook                  | `react-patterns`, `typescript`                      |
| Write tests                         | `testing`, `typescript`                             |
| Configure auth                      | `security`, `database`, `nextjs-core`               |
| Make a commit                       | `git-workflow`                                      |
| Create API endpoint                 | `api-design`, `security`, `typescript`              |
| Create video with Remotion          | `remotion`, `react-patterns`, `typescript`          |
| Manage global/shared state          | `state-management`, `react-patterns`, `typescript`  |
| Database query / model              | `prisma`, `security`, `typescript`                  |
| Create database migration           | `prisma`                                            |
| Build React Native screens/features | `react-native`, `typescript`, `react-patterns`      |

---

## How to Load a Skill

To load a skill, read the corresponding SKILL.md file:

```
Read: skills/generic/{skill-name}/SKILL.md
```

Each SKILL.md contains:

- **Core Principle**: Central philosophy
- **FORBIDDEN PATTERNS**: What to NEVER do
- **REQUIRED PATTERNS**: What to ALWAYS do
- **Checklist Before Commit**: Final verification

---

## Skill Composition

Skills can be combined. When multiple skills are active:

1. Rules from ALL active skills apply simultaneously
2. In case of conflict, the more specific skill wins
3. Global rules (`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`) always take precedence

---

_Skills Index v1.6 | Total: 22 skills_
