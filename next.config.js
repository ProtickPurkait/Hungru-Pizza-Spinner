/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't auto-generate AGENTS.md/CLAUDE.md files in the repo.
  agentRules: false,
};

module.exports = nextConfig;
