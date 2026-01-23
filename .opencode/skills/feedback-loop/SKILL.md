---
name: feedback-loop
description: |
  Meta-skill for continuous improvement of the AI library. Captures learnings after tasks.
  Trigger: Activated at the end of significant tasks or when patterns are missing.
license: MIT
metadata:
  author: ai-library
  version: "1.0"
  scope: [root]
  auto_invoke:
    - "After completing a feature"
    - "When a pattern was missing"
    - "When a skill didn't cover a case"
    - "Improving the library"
---

# Feedback Loop - Self-Improvement

> **Core Principle:** Every task is a learning opportunity. Capture what worked and what was missing.

---

## 🔄 When to Use This Skill

Invoke this skill:
1. After completing a significant feature
2. When you had to improvise because a skill was incomplete
3. When you notice a pattern that should be documented
4. When a rule was unclear or conflicting

---

## 📝 Feedback Protocol

After completing a task, ask yourself:

### 1. Skill Coverage Check
```
□ Did all relevant skills get loaded?
□ Was any skill missing for this task?
□ Did any skill have incomplete patterns?
□ Was there a conflict between skills?
```

### 2. Pattern Gap Analysis
```
□ Did I have to create a pattern not in any skill?
□ Is this pattern reusable for future tasks?
□ Which skill should contain this pattern?
```

### 3. Rule Clarity Check
```
□ Were all rules clear and actionable?
□ Did any rule need interpretation?
□ Should any rule have an exception?
```

---

## 📋 Improvement Log Format

When you identify an improvement, log it to `skills/improvements.md`:

```markdown
## [Date] - [Skill Name]

### Context
What task were you doing?

### Gap Identified
What was missing or unclear?

### Suggested Addition
```typescript
// Code example of the pattern that should be added
```

### Priority
- [ ] Critical - Frequently needed
- [ ] High - Would save time
- [ ] Low - Nice to have
```

---

## 🔧 Example Improvement Entry

```markdown
## 2026-01-19 - ui-engineering

### Context
Creating a data table with sorting and pagination.

### Gap Identified
No pattern for complex data tables with server-side operations.

### Suggested Addition
```typescript
// Pattern for server-side paginated tables
interface TableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  onPageChange: (page: number) => void
  onSort: (column: string, direction: 'asc' | 'desc') => void
}
```

### Priority
- [x] High - Would save time
```

---

## 🤖 AI Self-Check Prompt

At the end of significant tasks, mentally run through:

1. **What skills did I use?**
2. **Did I follow all the patterns?**
3. **Did I have to make something up?**
4. **What would have helped if it was documented?**

If #3 or #4 have answers, create an improvement entry.

---

## 📊 Periodic Review

Monthly, review `skills/improvements.md` and:
1. Merge accepted improvements into skills
2. Archive implemented improvements
3. Prioritize remaining items

---

## 🚀 Quick Commands

```bash
# View pending improvements
cat skills/improvements.md

# Count improvements per skill
grep -c "## " skills/improvements.md
```

---

*Skill Version: 1.0.0 | Meta-skill for library evolution*
