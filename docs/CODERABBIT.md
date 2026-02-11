# CodeRabbit AI Code Review

> AI-powered code reviewer for enforcing ShipSmart AI API architecture and security standards

---

## Overview

CodeRabbit is our AI-powered code reviewer that automatically reviews all pull requests. It understands our 5-layer architecture, multi-tenancy requirements, constants-first approach, and security standards.

**Key Benefits:**
- ⚡ Automated architectural review (5-layer pattern enforcement)
- 🔒 Security checks (multi-tenancy, sensitive data logging)
- 📚 Educational feedback for contributors
- ⏱️ Reduces manual review time by 30-40%
- ✅ Consistent quality enforcement across all PRs

---

## How It Works

1. **Automatic Reviews**: When you open a PR, CodeRabbit automatically reviews all changes within 2-3 minutes
2. **Inline Comments**: CodeRabbit posts inline comments on specific lines with actionable suggestions
3. **PR Summary**: CodeRabbit provides a high-level summary of changes and impact analysis
4. **Interactive Chat**: You can chat with CodeRabbit by mentioning `@coderabbitai` in PR comments

---

## Common Commands

Use these commands in PR comments to interact with CodeRabbit:

| Command | Description |
|---------|-------------|
| `@coderabbitai summary` | Generate a summary of the PR changes |
| `@coderabbitai review` | Trigger a manual re-review of all changes |
| `@coderabbitai resolve` | Mark a CodeRabbit comment as resolved |
| `@coderabbitai configuration` | Show current CodeRabbit configuration |
| `@coderabbitai help` | Show all available commands |
| `@coderabbitai explain` | Ask CodeRabbit to explain a specific code change |

**Example Usage:**

```markdown
@coderabbitai why is filtering by user_id required here?
```

```markdown
@coderabbitai can you explain the 5-layer architecture pattern?
```

---

## What CodeRabbit Checks

### 🏗️ Architecture (5-Layer Pattern)

CodeRabbit enforces our strict 5-layer architecture:

| Layer | Location | What CodeRabbit Checks |
|-------|----------|----------------------|
| **Routes** | `service/routes/` | ✅ Only endpoints + middleware<br>✅ No business logic<br>✅ No database access |
| **Controllers** | `service/controller/` | ✅ No repository calls (layer skipping)<br>✅ Context passing to services<br>✅ ResponseFormatter usage<br>✅ Methods under 50 lines |
| **Services** | `service/services/` | ✅ All business logic here<br>✅ Accepts context parameter<br>✅ Private methods with `_` prefix<br>✅ Singleton export pattern |
| **Repositories** | `service/repositories/` | ✅ **user_id filtering (CRITICAL)**<br>✅ Only database access<br>✅ PAGINATION constants usage |
| **Models** | `service/models/` | ✅ snake_case field names<br>✅ UUID primary keys<br>✅ No business logic |

**Most Common Violation:** Controllers calling repositories directly (layer skipping)

**Example of layer skipping (WRONG):**
```javascript
// service/controller/user-controller.js
const userRepository = require('../repositories/user-repository'); // ❌ WRONG

class UserController {
  async getUser(req, res, next) {
    const user = await userRepository.findById(req.params.id); // ❌ Layer skipping!
  }
}
```

**Correct pattern:**
```javascript
// service/controller/user-controller.js
const userService = require('../services/user-service'); // ✅ CORRECT

class UserController {
  async getUser(req, res, next) {
    const context = { currentUser: req.user, requestId: req.id };
    const user = await userService.getUser(req.params.id, context); // ✅ Call service
  }
}
```

### 🔒 Multi-Tenancy (CRITICAL SECURITY)

**Every repository query MUST filter by `user_id`.**

CodeRabbit flags missing `user_id` filters as **HIGH PRIORITY SECURITY ISSUES**.

**Wrong (SECURITY RISK):**
```javascript
// service/repositories/rate-repository.js
async findById(id) {
  return Rate.findOne({ where: { id } }); // ❌ Missing user_id!
}
```

**Correct:**
```javascript
// service/repositories/rate-repository.js
async findById(id, context) {
  return Rate.findOne({
    where: {
      id,
      user_id: context.currentUser.id // ✅ Tenant isolation!
    }
  });
}
```

### 📦 Constants Usage (No Hardcoding)

CodeRabbit enforces use of `@shipsmart/constants` for all values.

| Wrong ❌ | Right ✅ |
|---------|---------|
| `if (carrier === 'fedex')` | `if (carrier === CARRIERS.FEDEX)` |
| `timeout: 15000` | `timeout: TIMEOUTS.CARRIER_API_DEFAULT` |
| `limit: 50` | `limit: PAGINATION.DEFAULT_LIMIT` |
| `if (status !== 'active')` | `if (status !== USER_STATUS.ACTIVE)` |
| `.max(150)` | `.max(VALIDATION_LIMITS.MAX_WEIGHT_LB)` |

**15 constant categories available:** CARRIERS, TIMEOUTS, PAGINATION, USER_STATUS, VALIDATION_LIMITS, HTTP_STATUS, ERROR_CODES, CACHE_KEYS, QUEUE_NAMES, SERVICE_TYPES, PACKAGE_TYPES, RATE_TYPES, LOG_LEVELS, ENV_TYPES, API_VERSIONS

See `packages/constants/README.md` for complete list.

### 🔐 Security

CodeRabbit checks for common security issues:

- ✅ No sensitive data in logs (passwords, tokens, API keys, client secrets)
- ✅ Carrier credentials encrypted with `CryptoHelper.encrypt()`
- ✅ Input validation with Joi schemas
- ✅ Proper error handling with `@shipsmart/errors` (not raw `throw new Error()`)
- ✅ Protected routes use `authenticate()` middleware

**Wrong (SECURITY RISK):**
```javascript
logger.info('Login attempt', { password, token }); // ❌ NEVER log sensitive data!
```

**Correct:**
```javascript
logger.info('Login attempt', { userId: user.id }); // ✅ Log non-sensitive identifiers
```

### 🎨 Code Quality

- ✅ Context `{ currentUser, requestId }` passed through all layers
- ✅ Singleton export pattern: `module.exports = new ServiceClass();`
- ✅ Private methods prefixed with underscore: `_methodName`
- ✅ Controller methods under 50 lines (extract to service if longer)
- ✅ Proper error classes from `@shipsmart/errors`
- ✅ Descriptive test names and proper mocking

---

## Responding to CodeRabbit

### ✅ Valid Suggestions

If CodeRabbit catches a real issue:

1. **Fix the issue** in your branch
2. **Push the changes** (commit and push)
3. **CodeRabbit will automatically re-review** the updated code

CodeRabbit will mark resolved comments automatically when you fix the issue.

### ❌ False Positives

If CodeRabbit flags something incorrectly:

1. **Reply to the comment** explaining why it's not an issue
2. **Tag a human reviewer** for confirmation: `@username can you confirm this is correct?`
3. **We'll update CodeRabbit's configuration** if it's a recurring false positive

**Example response:**
```markdown
@coderabbitai This query doesn't need user_id filtering because it's selecting
from a global configuration table (carrier_services) that's shared across all users.

@reviewer-name can you confirm this is the correct approach?
```

### 💬 Ask Questions

CodeRabbit has full context of your codebase. You can ask:

- "Why is this a security issue?"
- "What's the correct pattern to use here?"
- "Can you explain the 5-layer architecture?"
- "How should I implement context passing?"
- "What constants should I use instead?"

CodeRabbit will provide context-aware answers based on our documentation.

---

## Integration with CI/CD

CodeRabbit runs **alongside** our existing CI/CD pipeline:

| Tool | Purpose | Runs On |
|------|---------|---------|
| **ESLint** | Linting (Airbnb base) | GitHub Actions CI |
| **Jest** | Unit + integration tests | GitHub Actions CI |
| **CodeRabbit** | Architecture + security review | Pull requests (webhook) |
| **Human reviewers** | Final approval | Pull requests |

**CodeRabbit is advisory, not blocking.** Human reviewers still have final approval authority.

---

## Configuration

**Configuration file:** `.coderabbit.yaml` in repository root

**To update configuration:**

1. Edit `.coderabbit.yaml` in a branch
2. Open a PR with changes
3. Get approval from team lead
4. Merge to main
5. Changes take effect immediately for future PRs

**Current configuration enforces:**
- 5-layer architecture patterns
- Multi-tenancy (user_id filtering)
- Constants usage
- Security best practices
- Code quality standards

See `.coderabbit.yaml` for full configuration details.

---

## Disabling CodeRabbit

### For a Specific PR (Emergency Hotfixes)

**Option 1:** Add label to PR
```
Label: coderabbit:ignore
```

**Option 2:** Add to PR description
```markdown
@coderabbitai: ignore
```

Use this sparingly - only for true emergencies where manual review is sufficient.

### For Testing/WIP PRs

Open PR as **Draft**. CodeRabbit won't review draft PRs automatically.

Convert to "Ready for review" when you want CodeRabbit to review.

---

## Review Profile

CodeRabbit runs in **"assertive" mode** for our codebase:
- More thorough reviews
- Catches edge cases and potential issues
- Provides educational feedback
- May flag more items than "chill" mode

This matches our high quality standards and strict architectural requirements.

---

## Troubleshooting

### CodeRabbit Didn't Review My PR

**Possible causes:**
1. PR is a draft (CodeRabbit only reviews non-draft PRs)
2. PR has `coderabbit:ignore` label
3. PR only changes ignored files (see `.coderabbit.yaml` ignore section)
4. GitHub webhook failed (rare - check Settings > Webhooks)

**Solution:** Comment `@coderabbitai review` to trigger manual review

### CodeRabbit Review Is Slow

**Normal:** 2-3 minutes for most PRs
**Slow:** 5+ minutes for large PRs (500+ lines changed)

If taking longer than 10 minutes, check GitHub Actions status page for incidents.

### CodeRabbit Comment Is Wrong

1. Reply to the comment explaining why
2. Tag a human reviewer for confirmation
3. File an issue with label `coderabbit` if it's a configuration problem

We iterate on CodeRabbit's configuration based on team feedback.

---

## Best Practices

### ✅ Do This

- Address CodeRabbit comments promptly (fix or explain)
- Ask CodeRabbit questions about patterns you're unsure about
- Mark comments as resolved once fixed
- Use CodeRabbit feedback to learn architectural patterns
- Suggest configuration improvements if you see false positives

### ❌ Don't Do This

- Ignore CodeRabbit comments without explanation
- Disable CodeRabbit for convenience (only for emergencies)
- Argue with CodeRabbit (reply to explain context instead)
- Expect CodeRabbit to catch everything (human review still required)

---

## Support

### CodeRabbit Documentation

- Main docs: https://docs.coderabbit.ai
- Configuration reference: https://docs.coderabbit.ai/reference/configuration
- Command reference: https://docs.coderabbit.ai/guides/commands

### Internal Support

- **Questions:** Ask in `#dev-tools` Slack channel
- **Issues:** File GitHub issue with label `coderabbit`
- **Configuration changes:** Open PR to update `.coderabbit.yaml`
- **Feedback:** Share in team retros or directly with DevOps lead

---

## Metrics & Feedback

We track CodeRabbit's effectiveness through:
- **False positive rate** (comments that were incorrect)
- **Bugs caught** (issues found before human review)
- **Review time reduction** (time saved for human reviewers)
- **Developer satisfaction** (quarterly surveys)

Your feedback helps improve CodeRabbit's configuration over time.

---

## Quick Reference

**Most Common Checks:**

| Issue | Solution |
|-------|----------|
| Layer skipping | Controllers call services, not repositories |
| Missing user_id | Add `user_id: context.currentUser.id` to where clause |
| Hardcoded carrier | Use `CARRIERS.FEDEX` from `@shipsmart/constants` |
| Hardcoded timeout | Use `TIMEOUTS.CARRIER_API_DEFAULT` |
| Sensitive logging | Remove passwords/tokens from logs |
| Missing context | Add `context` parameter to service methods |
| Wrong export | Use `module.exports = new ClassName();` |
| Raw Error | Use `ValidationError`, `NotFoundError` from `@shipsmart/errors` |

**Commands:**
- `@coderabbitai summary` - Get PR summary
- `@coderabbitai review` - Re-review code
- `@coderabbitai help` - Show commands

**Configuration:** `.coderabbit.yaml`

**Documentation:**
- Architecture: `docs/DEVELOPMENT-HANDBOOK.md`
- Critical rules: `.claude/CLAUDE.md`
- This guide: `docs/CODERABBIT.md`

---

## Appendix: Example CodeRabbit Review

**Sample PR:** Adding a new rate fetching endpoint

**CodeRabbit would check:**

1. ✅ Route only defines endpoint + middleware
2. ✅ Controller passes context to service
3. ✅ Service contains business logic
4. ✅ Repository filters by user_id
5. ✅ No hardcoded carriers (uses CARRIERS constants)
6. ✅ No hardcoded timeouts (uses TIMEOUTS constants)
7. ✅ Proper error handling (uses @shipsmart/errors)
8. ✅ No sensitive data logged
9. ✅ Singleton export patterns
10. ✅ Tests include proper mocking

**Typical CodeRabbit comment:**

> 🔒 **Security:** Missing user_id filter in repository query
>
> This query doesn't filter by `user_id`, which violates our multi-tenancy requirement. All repository queries must include tenant isolation to prevent data leaks.
>
> **Suggested fix:**
> ```javascript
> return Rate.findAll({
>   where: {
>     carrier_id: carrierId,
>     user_id: context.currentUser.id // Add this line
>   }
> });
> ```
>
> **Reference:** `.claude/CLAUDE.md` - Critical Rule #2

---

**Happy coding with CodeRabbit! 🤖✨**
