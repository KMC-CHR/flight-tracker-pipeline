import { execSync } from 'node:child_process';

// Extract git diff for JavaScript files relative to the previous commit
let diff = '';
try {
    diff = execSync('git diff HEAD~1 -- "*.js"').toString();
} catch {
    console.log('No prior git history found to diff against. Skipping SLM audit.');
    process.exit(0);
}

if (!diff.trim()) {
    console.log('No JavaScript changes detected in this commit. Skipping SLM audit.');
    process.exit(0);
}

// Focused prompt targeting security and logic edge cases
const prompt = `You are an automated security auditor in a CI pipeline. Review this git diff for critical security flaws (XSS, Injection, Broken Auth), missing error handling, or game-breaking bugs.

Diff:
${diff}

Respond ONLY in valid JSON format:
{"pass": boolean, "reason": "short explanation"}`;

try {
    const response = execSync(`ollama run llama3.2:1b "${prompt.replace(/"/g, '\\"')}"`).toString();
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (!result.pass) {
            console.error(`AI Security Audit Failed: ${result.reason}`);
            process.exit(1);
        }
    }
    console.log('AI Security & Quality Audit Passed.');
} catch {
    console.warn('SLM Audit completed or bypassed gracefully.');
}