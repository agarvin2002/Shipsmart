## 📝 Description

<!-- Clear, concise description of what this PR does -->


## 🤖 CodeRabbit Review

<!--
CodeRabbit will automatically review this PR. Please address any comments it posts.
You can interact with CodeRabbit by mentioning @coderabbitai in comments.
Common commands: @coderabbitai summary, @coderabbitai review, @coderabbitai help
See docs/CODERABBIT.md for full usage guide.
-->


## 🏷️ Type

- [ ] `feat` - New feature
- [ ] `fix` - Bug fix
- [ ] `refactor` - Code restructuring (no functional change)
- [ ] `docs` - Documentation only
- [ ] `chore` - Maintenance (dependencies, config)
- [ ] `perf` - Performance improvement
- [ ] `security` - Security enhancement/fix

## 🔗 Related Issue

<!-- Closes #123 -->


## 🧪 Testing

**How tested:**
<!-- Manual testing, specific scenarios tested, etc. -->


**Testing checklist:**
- [ ] Tested locally
- [ ] No console.log or debug code
- [ ] All lint checks pass (`yarn lint`)

## ✅ Pre-merge Checklist

**Architecture & Code Quality:**
- [ ] Follows 5-layer architecture (Routes → Controllers → Services → Repositories → Models)
- [ ] No layer skipping (e.g., Controller doesn't call Repository directly)
- [ ] Context object `{ currentUser, requestId }` passed through layers
- [ ] All database queries filter by `user_id` (multi-tenancy)
- [ ] Code follows naming conventions (see [CLAUDE.md](.claude/CLAUDE.md))

**Security:**
- [ ] No sensitive data logged (passwords, tokens, API keys)
- [ ] Input validation with Joi schemas
- [ ] Proper error handling

**General:**
- [ ] Commit messages follow semantic format (`type: description`)
- [ ] No breaking changes (or clearly documented if unavoidable)
- [ ] Self-reviewed code
- [ ] Ready for review

## 📸 Screenshots (if applicable)

<!-- Add screenshots for UI changes -->


## 📚 Additional Context

<!-- Any additional information, decisions made, trade-offs, etc. -->
