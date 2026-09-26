import { execSync } from 'node:child_process';
import fs from 'node:fs';

// Get target PR base ref or default to master/main
const baseBranch = process.env.GITHUB_BASE_REF || 'main';

let diff = '';
try {
    diff = execSync(`git diff origin/${baseBranch}...HEAD -- "*.js"`).toString();
} catch {
    console.log('No relevant JavaScript changes detected to review.');
    process.exit(0);
}

if (!diff.trim()) {
    console.log('Diff is empty. Skipping inline review.');
    process.exit(0);
}

// System prompt directing model to produce JSON with specific line suggestions
const prompt = `You are a senior code reviewer. Review the following git diff for bugs, edge cases, or optimizations.

Diff:
${diff}

Return ONLY a valid JSON array of inline review suggestions. If no improvements are needed, return [].
JSON Schema:
[
  {
    "path": "relative/path/to/file.js",
    "line": 15,
    "body": "Detailed explanation of the issue.\n\`\`\`suggestion\n// Replacement suggested code here\n\`\`\`"
  }
]`;

async function generateReview() {
    console.log('Generating inline AI review suggestions...');

    // Call local Ollama model (or swap with Grok/GLM fetch call)
    const rawOutput = execSync(`ollama run llama3.2:1b "${prompt.replace(/"/g, '\\"')}"`).toString();
    const jsonMatch = rawOutput.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
        try {
            const comments = JSON.parse(jsonMatch[0]);
            fs.writeFileSync('pr_comments.json', JSON.stringify(comments, null, 2));
            console.log(`Generated ${comments.length} inline review suggestions.`);
            return;
        } catch {
            console.warn('Failed to parse model response into JSON.');
        }
    }

    fs.writeFileSync('pr_comments.json', '[]');
}

generateReview();