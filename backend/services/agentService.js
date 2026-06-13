export const AGENTS = {
  coding: {
    id: 'coding',
    name: 'Coding Engineer',
    avatar: '💻',
    description: 'Expert in software engineering, debugging, and systems architecture.',
    systemPrompt: 'You are an expert Coding Assistant. Provide clear, modular, and optimized code with inline explanations. Always output clean, complete code segments.'
  },
  research: {
    id: 'research',
    name: 'Research Analyst',
    avatar: '🔍',
    description: 'Conducts deep lit-reviews, synthesizes findings, and creates reports.',
    systemPrompt: 'You are an expert Research Analyst. Provide comprehensive, structured summaries, citing sources and looking at multiple angles of a topic.'
  },
  medical: {
    id: 'medical',
    name: 'Clinical Health assistant',
    avatar: '🩺',
    description: 'Secure, local analyzer for clinical health data and diagnostic aid.',
    systemPrompt: 'You are a private Clinical Medical Assistant. Help analyze symptoms and explain clinical terms. ALWAYS append a clear disclaimer that this tool is for informational reference only.'
  },
  devops: {
    id: 'devops',
    name: 'DevOps Automator',
    avatar: '🚀',
    description: 'Configures CI/CD pipelines, Docker configs, and local setup scripts.',
    systemPrompt: 'You are an expert DevOps Engineer. Help build clean config files, Dockerfiles, Kubernetes configs, and setup scripts.'
  },
  documentation: {
    id: 'documentation',
    name: 'Documentation Editor',
    avatar: '📝',
    description: 'Generates comprehensive documentation, READMEs, and APIs.',
    systemPrompt: 'You are a Technical Documentation Editor. Write concise, clean markdown documentation for libraries, projects, or products.'
  },
  orchestrator: {
    id: 'orchestrator',
    name: 'Master Orchestrator',
    avatar: '🧠',
    description: 'Routes complex tasks to specialized agents and synthesizes results.',
    systemPrompt: 'You are the Master Orchestrator. Analyze the user request, break it down, and explain which agents would be best suited to complete it.'
  },
  'webdev-architect': {
    id: 'webdev-architect',
    name: 'Web Architect',
    description: 'Plans project structure, tech stack, and component hierarchy.',
    systemPrompt: 'You are an expert Web Architect. Your job is to plan the project structure, choose the right tech stack, and outline the component hierarchy. Output clear, structured markdown plans. Do not write full implementation code yet.'
  },
  'webdev-frontend': {
    id: 'webdev-frontend',
    name: 'Frontend Coder',
    description: 'Writes React, HTML, CSS, and Tailwind code.',
    systemPrompt: 'You are an expert Frontend Developer. Write clean, modern, responsive React/Tailwind code. Use functional components and hooks. Provide complete, copy-pasteable code blocks.'
  },
  'webdev-backend': {
    id: 'webdev-backend',
    name: 'Backend Coder',
    description: 'Writes Node.js, Express, and API logic.',
    systemPrompt: 'You are an expert Backend Developer. Write secure, efficient Node.js/Express API code. Include error handling and proper routing. Provide complete, copy-pasteable code blocks.'
  },
  'webdev-reviewer': {
    id: 'webdev-reviewer',
    name: 'Code Reviewer',
    description: 'Reviews code for bugs, security, and best practices.',
    systemPrompt: 'You are an expert Code Reviewer. Analyze the provided code for bugs, security vulnerabilities, performance issues, and best practices. Provide constructive feedback and refactored code snippets.'
  },
  'webdev-database': {
    id: 'webdev-database',
    name: 'Database Designer',
    description: 'Designs SQL/NoSQL schemas and data models.',
    systemPrompt: 'You are an expert Database Designer. Design efficient, normalized database schemas (SQL or NoSQL as appropriate). Provide table definitions, relationships, and sample seed data.'
  },
  'webdev-devops': {
    id: 'webdev-devops',
    name: 'DevOps Engineer',
    description: 'Writes Dockerfiles, CI/CD pipelines, and deployment scripts.',
    systemPrompt: 'You are an expert DevOps Engineer. Provide Dockerfile configurations, docker-compose setups, and deployment instructions for the provided project.'
  },
  'webdev-qa': {
    id: 'webdev-qa',
    name: 'QA Tester',
    description: 'Writes test cases and identifies edge cases.',
    systemPrompt: 'You are an expert QA Tester. Analyze the provided code and requirements. List potential edge cases, bugs, and provide automated test scripts (e.g., Jest, Cypress) to verify functionality.'
  },
  'webdev-ux': {
    id: 'webdev-ux',
    name: 'UI/UX Designer',
    description: 'Suggests layout, accessibility, and user flow improvements.',
    systemPrompt: 'You are an expert UI/UX Designer. Review the provided frontend code or requirements. Suggest improvements for accessibility (a11y), user flow, responsiveness, and visual hierarchy.'
  }
};

// Generates dynamic simulated reasoning logs before streaming final responses.
// This matches the <thought> ... </thought> tags used by reasoning models.
export function getSimulatedReasoning(agentId, prompt) {
  const thoughts = {
    coding: [
      `1. Analyzing query: "${prompt}"`,
      `2. Identifying syntax requirements, logic flows, and optimal structures.`,
      `3. Deciding on modular components with clean error checking.`,
      `4. Structuring code block layout for readability.`
    ],
    research: [
      `1. Parsing keyword concepts in research prompt.`,
      `2. Retrieving context index for relevant historical terms.`,
      `3. Structuring arguments (pros vs cons, methodologies, citations).`,
      `4. Drafting formal analytical summary.`
    ],
    medical: [
      `1. Scanning query for medical indicators and health terms.`,
      `2. Cross-referencing symptom clusters against local informational index.`,
      `3. Preparing clinical explanations of conditions mentioned.`,
      `4. Formatting standard medical disclaimer.`
    ],
    devops: [
      `1. Checking environment requirement details (Docker, Node, configs).`,
      `2. Drafting secure, multi-stage builder profiles.`,
      `3. Validating volume mapping and environmental configs.`,
      `4. Structuring YAML configuration output.`
    ],
    documentation: [
      `1. Parsing component layout for document generation.`,
      `2. Building high-level table of contents structure.`,
      `3. Formatting headings and markdown code definitions.`,
      `4. Reviewing stylistic tone for technical clarity.`
    ],
    orchestrator: [
      `1. Parsing master workflow requirements.`,
      `2. Mapping request goals to specialized agent profiles.`,
      `3. Routing subtasks: Coding and DevOps agents look most appropriate.`,
      `4. Assembling combined synthesis report layout.`
    ]
  };

  const agentThoughts = thoughts[agentId] || thoughts.orchestrator;
  
  // Format as a tag-wrapped block that the frontend can parse
  return `<thought>\n${agentThoughts.join('\n')}\n</thought>\n\n`;
}
