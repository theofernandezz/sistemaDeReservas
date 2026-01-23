---
name: Skill Creator - Meta Skill
description: |
  Template and instructions for creating new skills following the library's standards.
  Trigger: Activated when user asks to "create a new skill" or "add a new rule".
license: MIT
metadata:
  author: ai-library
  version: "2.0"
  scope: [root]
  auto_invoke:
    - "Creating new skills"
    - "Adding new rules/patterns"
    - "Defining new standards"
    - "After creating/modifying a skill"
---

# Skill Creator - Meta Skill

> **Purpose:** This meta-skill provides the template and guidelines for creating new skills that integrate seamlessly with the Universal AI Development Library.

---

## 📋 Skill Creation Checklist

Before creating a new skill, verify:

- [ ] The pattern isn't already covered by existing skills
- [ ] The scope is well-defined (not too broad, not too narrow)
- [ ] There are clear, enforceable rules (not just suggestions)
- [ ] Examples demonstrate both ❌ and ✅ patterns
- [ ] The skill integrates with existing architecture

---

## 📄 Skill Template

Use this exact template when creating new skills:

````markdown
---
name: [Skill Name]
description: |
  [2-3 sentence description of what this skill enforces]
  Trigger: [When this skill should be auto-invoked]
version: 1.0.0
scope: [global | feature | project]
auto_invoke:
  patterns:
    - "[file patterns that trigger this skill]"
  actions:
    - "[user actions that trigger this skill]"
---

# [Skill Name]

> **Core Principle:** [One sentence philosophy that guides all rules in this skill]

---

## 🏗️ Architecture Overview

[Optional: Include a diagram or description of how components relate]

---

## 🚫 FORBIDDEN PATTERNS

### 1. [Pattern Name]

[Brief explanation of why this is forbidden]

```typescript
// ❌ FORBIDDEN - [Reason]
[bad code example]

// ✅ CORRECT - [Explanation]
[good code example]
```

### 2. [Pattern Name]

[Repeat for each forbidden pattern]

---

## ✅ REQUIRED PATTERNS

### 1. [Pattern Name]

[Explanation of why this is required]

```typescript
// [Example implementation]
```

### 2. [Pattern Name]

[Repeat for each required pattern]

---

## 📁 File Structure

```
[relevant directory structure]
```

---

## 🔧 Configuration

[Any config files or settings required]

---

## 📋 Checklist Before Commit

- [ ] [Verification item 1]
- [ ] [Verification item 2]
- [ ] [Verification item 3]

---

*Skill Version: 1.0.0 | Compatible with [tech versions]*
````

---

## 🎯 Skill Categories

When creating a skill, determine its category:

| Category | Location | Scope | Example |
|----------|----------|-------|---------|
| **Generic** | `/skills/generic/` | Applies to all projects | TypeScript, UI |
| **Framework** | `/skills/frameworks/` | Specific framework patterns | Next.js, React Native |
| **Domain** | `/skills/domains/` | Business domain rules | E-commerce, SaaS |
| **Project** | `/skills/projects/` | Single project rules | Client-specific |

---

## 📝 Writing Guidelines

### Rule Clarity

Each rule must be:

| Attribute | Description |
|-----------|-------------|
| **Specific** | Clear criteria for pass/fail |
| **Actionable** | Developer knows exactly what to do |
| **Justified** | Includes "why" not just "what" |
| **Testable** | Can be verified programmatically or by review |

```markdown
// ❌ Vague rule
"Use good naming conventions"

// ✅ Specific rule
"Function names must be verbs describing the action: `getUserById`, `validateInput`, `sendEmail`"
```

### Code Examples

Every rule needs both patterns:

```typescript
// ❌ FORBIDDEN - Always show the anti-pattern with explanation
const bad = example()

// ✅ CORRECT - Always show the correct implementation
const good = example()
```

### Severity Levels

Use consistent terminology:

| Term | Meaning |
|------|---------|
| **FORBIDDEN** | Never do this, will be rejected in code review |
| **AVOID** | Strong suggestion against, exceptions possible |
| **PREFER** | Recommended approach, alternatives exist |
| **REQUIRED** | Must do this, no exceptions |

---

## 🔗 Skill Integration

### Updating AGENTS.md

After creating a skill, add it to the router:

```markdown
<!-- In AGENTS.md Auto-Invoke table -->
| [trigger action] | `/skills/[category]/[name]` | [priority] |

<!-- In Skills Index table -->
| [Name] | `/skills/[category]/[name]/SKILL.md` | [Description] |
```

### Cross-Skill References

If your skill depends on or extends another:

```markdown
---
extends:
  - /skills/generic/typescript
requires:
  - /skills/generic/database
---
```

---

## 🧪 Skill Validation

Before finalizing a skill:

### 1. Coverage Test

```bash
# The skill should cover common scenarios
✓ Basic usage pattern
✓ Edge cases
✓ Error handling
✓ Integration with other rules
```

### 2. Conflict Check

Ensure no conflicts with existing skills:

```markdown
# Check existing skills for overlapping rules
/skills/generic/typescript  - Type rules
/skills/generic/nextjs-core - Framework rules
/skills/generic/ui-engineering - UI rules
/skills/generic/database - Data rules
```

### 3. Real-World Test

Apply the skill to a real codebase section and verify all rules are applicable and beneficial.

---

## 📚 Example: Creating a Testing Skill

Here's a complete example of creating a new skill:

```markdown
---
name: Testing Patterns - Vitest
description: |
  Production testing patterns using Vitest with Testing Library.
  Trigger: Activated when creating or editing test files.
version: 1.0.0
scope: global
auto_invoke:
  patterns:
    - "**/*.test.ts"
    - "**/*.test.tsx"
    - "**/*.spec.ts"
  actions:
    - "write test"
    - "create test"
    - "add test"
---

# Testing Patterns - Vitest

> **Core Principle:** Test behavior, not implementation. Every test should survive a refactor.

---

## 🚫 FORBIDDEN PATTERNS

### 1. Never Test Implementation Details

```typescript
// ❌ FORBIDDEN - Testing internal state
it('should set loading to true', () => {
  const { result } = renderHook(() => useData())
  expect(result.current.isLoading).toBe(true)
})

// ✅ CORRECT - Testing user-visible behavior
it('should show loading spinner while fetching', () => {
  render(<DataComponent />)
  expect(screen.getByRole('status')).toBeInTheDocument()
})
```

### 2. Never Use Arbitrary Timeouts

```typescript
// ❌ FORBIDDEN - Flaky tests
await new Promise(resolve => setTimeout(resolve, 1000))
expect(element).toBeVisible()

// ✅ CORRECT - Wait for condition
await waitFor(() => {
  expect(element).toBeVisible()
})
```

---

## ✅ REQUIRED PATTERNS

### 1. Arrange-Act-Assert Structure

```typescript
it('should create a new project', async () => {
  // Arrange
  const user = userEvent.setup()
  render(<CreateProjectForm />)
  
  // Act
  await user.type(screen.getByLabelText('Name'), 'My Project')
  await user.click(screen.getByRole('button', { name: 'Create' }))
  
  // Assert
  expect(await screen.findByText('Project created')).toBeInTheDocument()
})
```

---

## 📋 Checklist Before Commit

- [ ] Tests follow AAA pattern
- [ ] No implementation detail testing
- [ ] No hardcoded timeouts
- [ ] Meaningful test descriptions
- [ ] Coverage above 80%

---

*Skill Version: 1.0.0 | Compatible with Vitest 1.x & Testing Library*
```

---

## 🚀 Skill Maintenance

### Version Updates

When updating a skill:

1. Increment version in frontmatter
2. Document breaking changes
3. Update compatibility note
4. Add migration guide if needed

### Deprecation Process

```markdown
---
deprecated: true
deprecation_notice: |
  This skill is deprecated in favor of `/skills/generic/new-skill`.
  Migration guide: [link]
  Removal date: 2025-01-01
---
```

---

*Meta-Skill Version: 2.0.0*
