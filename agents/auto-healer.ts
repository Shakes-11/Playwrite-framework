import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";
import { configManager } from "../config/config-manager";

/**
 * Auto-Healing Agent
 * Detects test failures and automatically creates PRs with fixes
 */
export class AutoHealingAgent {
  private octokit: Octokit;
  private repo = { owner: "Shakes-11", repo: "Playwrite-framework" };
  private confidenceThreshold = 0.8;

  constructor(githubToken: string) {
    this.octokit = new Octokit({ auth: githubToken });
  }

  /**
   * Analyze a failed PR and suggest fixes
   */
  async analyzePRFailure(prNumber: number): Promise<void> {
    console.log(`🔍 Analyzing failure in PR #${prNumber}`);

    try {
      // 1. Get PR metadata
      const { data: pr } = await this.octokit.pulls.get({
        ...this.repo,
        pull_number: prNumber,
      });

      // 2. Find test result comment
      const comments = await this.octokit.issues.listComments({
        ...this.repo,
        issue_number: prNumber,
      });

      const testComment = comments.data.find(
        (c) =>
          c.user?.login === "github-actions[bot]" &&
          c.body?.includes("MCP Test Automation Results")
      );

      if (!testComment) {
        console.log("ℹ️ No test results found");
        return;
      }

      // 3. Extract failure information
      const failureData = this.extractFailureData(testComment.body);
      if (!failureData) {
        console.log("ℹ️ No failures to fix");
        return;
      }

      // 4. Get changed files in PR
      const { data: files } = await this.octokit.pulls.listFiles({
        ...this.repo,
        pull_number: prNumber,
      });

      const testFile = files.find((f) => f.filename.startsWith("prompts/"));
      if (!testFile) {
        console.log("ℹ️ No test files in PR");
        return;
      }

      // 5. Generate fix suggestion
      const fix = await this.generateFix(failureData);

      // 6. Create auto-fix PR if confidence is high
      if (fix.confidence >= this.confidenceThreshold) {
        await this.createFixPR(prNumber, fix);
      } else {
        // Post comment with suggestion
        await this.postSuggestionComment(prNumber, fix);
      }
    } catch (error) {
      console.error("❌ Error analyzing PR:", error);
    }
  }

  /**
   * Extract failure data from test result comment
   */
  private extractFailureData(
    comment: string
  ): FailureData | null {
    // Look for common failure patterns
    const elementNotFoundMatch = comment.match(
      /Element not found: "(.+?)"/
    );
    const timeoutMatch = comment.match(/Timeout waiting for (.+?)\n/);
    const selectorMismatchMatch = comment.match(
      /Selector mismatch: (.+?) \(expected: (.+?)\)/
    );

    if (elementNotFoundMatch) {
      return {
        type: "element_not_found",
        element: elementNotFoundMatch[1],
        confidence: 0.85,
      };
    }

    if (timeoutMatch) {
      return {
        type: "timeout",
        target: timeoutMatch[1],
        confidence: 0.75,
      };
    }

    if (selectorMismatchMatch) {
      return {
        type: "selector_mismatch",
        element: selectorMismatchMatch[1],
        expected: selectorMismatchMatch[2],
        confidence: 0.9,
      };
    }

    return null;
  }

  /**
   * Generate fix for detected failure
   */
  private async generateFix(failure: FailureData): Promise<FixSuggestion> {
    console.log(`🔧 Generating fix for: ${failure.type}`);

    switch (failure.type) {
      case "timeout":
        return {
          type: "timeout_increase",
          description: `Increase timeout for ${(failure as any).target}`,
          change: { environment: { timeout: 45000 } },
          confidence: 0.8,
        };

      case "element_not_found":
        return {
          type: "element_selector_update",
          description: `Update selector for element: "${(failure as any).element}"`,
          change: {
            elements: {
              [(failure as any).element]:
                "[Updated selector - manual review needed]",
            },
          },
          confidence: 0.6, // Lower confidence - needs review
        };

      case "selector_mismatch":
        return {
          type: "selector_correction",
          description: `Update selector from "${(failure as any).expected}" for "${(failure as any).element}"`,
          change: {
            elements: { [(failure as any).element]: (failure as any).expected },
          },
          confidence: 0.85,
        };

      default:
        return {
          type: "unknown",
          description: "Manual review required",
          confidence: 0,
        };
    }
  }

  /**
   * Create auto-fix PR
   */
  private async createFixPR(prNumber: number, fix: FixSuggestion): Promise<void> {
    console.log(`🚀 Creating auto-fix PR for: ${fix.type}`);

    const branchName = `auto-fix/pr-${prNumber}-${Date.now()}`;

    try {
      // Get current main branch SHA
      const { data: mainRef } = await this.octokit.git.getRef({
        ...this.repo,
        ref: "heads/main",
      });

      // Create new branch
      await this.octokit.git.createRef({
        ...this.repo,
        ref: `refs/heads/${branchName}`,
        sha: mainRef.object.sha,
      });

      // Update config file with fix
      const configPath = "config/app-configs/orangehrm.json";
      const { data: fileData } = await this.octokit.repos.getContent({
        ...this.repo,
        path: configPath,
      });

      const currentConfig = JSON.parse(
        Buffer.from((fileData as any).content, "base64").toString()
      );
      const updatedConfig = this.applyFix(currentConfig, fix);

      // Commit changes
      await this.octokit.repos.createOrUpdateFileContents({
        ...this.repo,
        branch: branchName,
        path: configPath,
        message: `🔧 Auto-fix: ${fix.description} (triggered by PR #${prNumber})`,
        content: Buffer.from(
          JSON.stringify(updatedConfig, null, 2)
        ).toString("base64"),
        sha: (fileData as any).sha,
      });

      // Create PR
      const { data: newPR } = await this.octokit.pulls.create({
        ...this.repo,
        title: `🔧 Auto-fix: ${fix.description}`,
        body: `# Auto-Generated Fix

**Triggered by:** PR #${prNumber}
**Confidence:** ${(fix.confidence * 100).toFixed(0)}%

## Change Summary
${fix.description}

## Fix Details
\`\`\`json
${JSON.stringify(fix.change, null, 2)}
\`\`\`

---
*This PR was automatically created by the AutoHealing Agent. Please review and test before merging.*`,
        head: branchName,
        base: "main",
      });

      console.log(`✅ Created auto-fix PR: #${newPR.number}`);
    } catch (error) {
      console.error("❌ Error creating fix PR:", error);
    }
  }

  /**
   * Post suggestion comment on PR
   */
  private async postSuggestionComment(prNumber: number, fix: FixSuggestion): Promise<void> {
    const comment = `## 💡 Suggested Fix

**Type:** ${fix.type}  
**Confidence:** ${(fix.confidence * 100).toFixed(0)}%

**Suggestion:** ${fix.description}

### Recommended Change
\`\`\`json
${JSON.stringify(fix.change, null, 2)}
\`\`\`

**Note:** This suggestion requires manual review and testing. Would you like me to create an auto-fix PR?`;

    await this.octokit.issues.createComment({
      ...this.repo,
      issue_number: prNumber,
      body: comment,
    });
  }

  /**
   * Apply fix to configuration
   */
  private applyFix(config: any, fix: FixSuggestion): any {
    const updated = JSON.parse(JSON.stringify(config));

    if (fix.change) {
      // Deep merge fix changes into config
      this.deepMerge(updated, fix.change);
    }

    return updated;
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    for (const key in source) {
      if (source[key] && typeof source[key] === "object") {
        if (!target[key] || typeof target[key] !== "object") {
          target[key] = {};
        }
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
}

interface FailureData {
  type: string;
  confidence: number;
  [key: string]: any;
}

interface FixSuggestion {
  type: string;
  description: string;
  change?: object;
  confidence: number;
}

// CLI entry point
if (process.env.GITHUB_TOKEN && process.env.PR_NUMBER) {
  const agent = new AutoHealingAgent(process.env.GITHUB_TOKEN);
  agent.analyzePRFailure(parseInt(process.env.PR_NUMBER, 10));
}
