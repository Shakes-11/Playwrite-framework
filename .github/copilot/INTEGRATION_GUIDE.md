# Copilot PR Integration Guide

## 🤖 Using Copilot with Your MCP Framework

This guide explains how to use GitHub Copilot to enhance your test development and PR review process.

## 🎯 Key Integration Points

### 1. **Test Creation with Copilot**

When writing a new test file, ask Copilot to suggest the structure:

```bash
# Start your test file
echo "Test Steps:" > prompts/MyTest.txt

# Then ask Copilot in VS Code:
# "Suggest test steps following the pattern in existing prompts"
```

Copilot will:
- ✅ Analyze existing test patterns
- ✅ Suggest descriptive steps
- ✅ Reference your app config selectors
- ✅ Match your testing conventions

### 2. **PR Analysis with Copilot**

After tests run (workflow posts results), ask:

```
@copilot Why did the login test fail on Firefox?
```

Copilot analyzes:
- 🔍 Test failure in PR comment
- 🔍 Parses stack trace/error message
- 🔍 Cross-references your config
- 🔍 Suggests specific fix

**Example Response:**
```
The login test failed because:

1. Element selector changed: "#login-btn" no longer exists
2. App update changed selector to ".auth-submit"
3. Current config has outdated selector

Suggested Fix:
Update config/app-configs/orangehrm.json:
{
  "elements": {
    "loginButton": ".auth-submit"  // was "#login-btn"
  }
}

Should I create a PR with this fix? (>80% confidence)
```

### 3. **Config Validation with Copilot**

Ask Copilot to validate your app config:

```
@copilot Validate orangehrm.json config against the latest UI
```

Copilot checks:
- ✅ All selector paths are valid
- ✅ Element names match test usage
- ✅ Timeout values are reasonable
- ✅ URLs are accessible

## 🚀 Workflow Integration

### Developer → Test Creation → PR

```
1. Developer writes test locally
   └─ Uses Copilot to suggest test steps

2. Pushes to GitHub → Opens PR
   └─ GitHub Actions auto-triggers

3. Tests run on 3 browsers
   └─ Results posted to PR comment

4. Reviewer asks Copilot
   └─ "Why did X fail?"
   └─ Copilot analyzes failure

5. Copilot suggests fix
   └─ Auto-creates PR if high confidence
   └─ Posts suggestion comment if lower confidence

6. Developer merges
   └─ All tests now passing
```

## 💬 Common Copilot Prompts

### Analyzing Test Failures

```
@copilot The checkout test is timing out. What should I do?
```

### Understanding Test Results

```
@copilot Why did the test pass on Chrome but fail on Firefox?
```

### Config Issues

```
@copilot The element selector isn't matching the UI. How do I fix it?
```

### Test Optimization

```
@copilot How can I make this test more reliable?
```

### Coverage Analysis

```
@copilot What test cases are we missing for the login flow?
```

## 🔧 Setting Up Copilot Context

To help Copilot understand your framework better, add this context:

**In your PR description:**
```markdown
## Context for Copilot

- **Framework:** MCP Playwright Automation
- **Test Type:** Configuration-driven
- **Target App:** OrangeHRM
- **Browsers Tested:** Chromium, Firefox, WebKit
- **Related PR:** #[number] if fixing previous failure

## What Changed
- Updated prompts/LoginFlow.txt
- Modified config/app-configs/orangehrm.json

## What to Review
- Test step accuracy
- Selector validity
- Configuration updates
```

## 📊 Understanding Test Results Format

When Copilot analyzes test results, it looks for:

```
## MCP Test Automation Results

✅ PASSED Tests:
- Test name and duration

❌ FAILED Tests:
- Error message
- Stack trace
- Browser that failed

📊 Browser Breakdown:
- Chromium: pass/fail count
- Firefox: pass/fail count
- WebKit: pass/fail count
```

## 🎯 Auto-Fix Workflow

When Copilot detects a fixable issue:

**High Confidence (>80%)**
```
✅ Auto-creating fix PR
  Confidence: 90%
  Fix Type: Selector Update
  Branch: auto-fix/pr-123-[timestamp]
```

**Medium Confidence (50-80%)**
```
💡 Suggesting manual fix
  Confidence: 75%
  Recommendation: Update timeout to 45000ms
  Location: config/app-configs/orangehrm.json
```

**Low Confidence (<50%)**
```
❓ Requires manual review
  Confidence: 40%
  Issue: Element behavior changed
  Suggestion: Review UI and update selectors manually
```

## 🤝 Copilot Commands

### In VS Code

Use Copilot Chat to ask questions about your tests:

```
Ctrl+I (or Cmd+I on Mac)  - Open Copilot Chat inline
Ctrl+Shift+I              - Open Copilot Chat in sidebar
```

### In PR Comments

Mention Copilot to ask about specific aspects:

```
@copilot What's causing the timeout in the checkout test?
@copilot Suggest improvements to this test
@copilot Why did Firefox behave differently than Chrome?
```

### In GitHub Web

Use Copilot in PR review:
1. Click "Copilot" button in PR
2. Ask about specific changes
3. Get AI-powered suggestions

## 📝 Example: Complete Flow

### Step 1: Create Test
```bash
# Developer writes test
cat > prompts/Checkout.txt << 'EOF'
Test Steps:
1. Navigate to application
2. Add item to cart
3. Proceed to checkout
4. Verify order total

Expected Results:
- All steps completed successfully
- Order total displayed correctly
EOF

# Copilot suggests: "Good structure! Consider adding cart verification step."
```

### Step 2: Push & PR
```bash
git push origin feature/checkout-test
# Create PR on GitHub
```

### Step 3: Workflow Runs
- Runs on Chromium, Firefox, WebKit
- ✅ Chromium passes
- ❌ Firefox fails on selector
- ✅ WebKit passes

### Step 4: Ask Copilot
```
Reviewer: @copilot Why did the Firefox test fail?

Copilot Response:
Firefox couldn't find element "Proceed to Checkout" button.
- Selector in config: "button:has-text('Proceed')"
- Actual button in Firefox: <button>Proceed to checkout</button>
- Issue: Case sensitivity - "Checkout" vs "checkout"

Fix: Update selector to match exactly
Config change: "button:has-text('Proceed to checkout')"

Confidence: 85% - Create auto-fix PR? (Y/n)
```

### Step 5: Auto-Fix PR Created
```
🔧 Auto-fix: Selector Update
Triggered by PR #456
Confidence: 85%

Changes:
config/app-configs/orangehrm.json
- "button:has-text('Proceed')" 
+ "button:has-text('Proceed to checkout')"
```

### Step 6: Merge
- Both PRs merge
- Tests now pass on all browsers ✅

## ⚙️ Advanced: Copilot Customization

### Custom Instructions (Optional)

Create `.github/copilot/instructions.md`:

```markdown
# Copilot Instructions for Playwrite Framework

## Context
- This is an MCP-based test automation framework
- Tests are configuration-driven (JSON configs)
- Target application: OrangeHRM
- Tests run on 3 browsers: Chromium, Firefox, WebKit

## When analyzing failures, consider:
1. Browser-specific UI differences
2. Selector changes in app updates
3. Timeout issues in CI environment
4. Dynamic element loading delays

## When suggesting fixes:
1. Prioritize config updates over test rewrites
2. Consider cross-browser compatibility
3. Suggest timeouts for dynamic content
4. Validate selectors against app UI
```

### Custom Prompt Templates

Save common analysis patterns:

```bash
# In your repo:
.github/copilot/
├── test-analysis-template.md
├── config-validation-template.md
└── pr-review-template.md
```

## 🎓 Best Practices

1. **Be Specific** - Include test name, error message, and browser
2. **Provide Context** - Link to config files and app details
3. **Ask Follow-ups** - "Why X?" then "How to fix?" then "Create PR?"
4. **Validate Suggestions** - Always review before merging auto-fixes
5. **Learn Patterns** - Use Copilot to understand test patterns better

## 📚 Related Resources

- [GitHub Actions Guide](./../GITHUB_ACTIONS_GUIDE.md)
- [Main README](../../README.md)
- [Prompting Standards](../../docs/PROMPTING_STANDARDS.md)
- [Auto-Healer Agent](../../agents/auto-healer.ts)

---

**Happy testing with Copilot! 🚀**
