import type { SipocNode, SipocEdge } from '../types/sipoc.types';

/**
 * Demo: Enterprise Software Development Lifecycle (SDLC) Value Stream
 *
 * A 15-node value stream modelling an end-to-end software product delivery pipeline,
 * from feature ideation through development, testing, deployment, and post-release monitoring.
 * Includes branching (parallel tracks: frontend + backend), merging (integration),
 * and decision points (release gate, hotfix path).
 */

export const sdlcDemoNodes: SipocNode[] = [
  {
    id: 'sdlc-1',
    type: 'sipoc',
    position: { x: 50, y: 300 },
    data: {
      label: 'Feature Ideation & Backlog Grooming',
      processDescription: 'Product owners collect feature requests from stakeholders, customer feedback, and market analysis. Items are prioritized using WSJF scoring and refined into actionable user stories with acceptance criteria.',
      suppliers: 'Product Owner\nCustomer Success Team\nSales Engineers\nSupport Ticket Analysis',
      inputs: 'Customer Feedback Reports\nMarket Research\nSupport Ticket Trends\nStrategic Roadmap\nCompetitor Analysis',
      outputs: 'Prioritized Product Backlog\nRefined User Stories\nAcceptance Criteria\nEpic Breakdown',
      customers: 'Scrum Team\nEngineering Manager\nUX Design Team',
      applicationsInvolved: 'Jira\nProductboard\nConfluence\nMiro (Story Mapping)\nSlack',
      involvedTeams: 'Product Management\nCustomer Success\nBusiness Analysis',
      knownIssues: 'WSJF scoring subjective — different POs produce inconsistent priorities\nBacklog grows faster than delivery capacity (currently 340 items)\nStakeholder requests bypass formal intake process 30% of the time',
      cycleTime: '120',
      leadTime: '2880',
      valueAddPercent: '45',
    },
  },
  {
    id: 'sdlc-2',
    type: 'sipoc',
    position: { x: 400, y: 300 },
    data: {
      label: 'UX Research & Design',
      processDescription: 'UX team conducts user research (interviews, surveys, analytics), creates wireframes and interactive prototypes, runs usability tests, and produces final design specs with component library references.',
      suppliers: 'Product Management\nEnd Users\nCustomer Advisory Board',
      inputs: 'Refined User Stories\nUser Research Repository\nDesign System Components\nAccessibility Guidelines (WCAG 2.1)',
      outputs: 'Figma Design Specs\nInteractive Prototypes\nUsability Test Results\nDesign Tokens\nAccessibility Annotations',
      customers: 'Frontend Development Team\nQA Team\nProduct Owner (sign-off)',
      applicationsInvolved: 'Figma\nMaze (Usability Testing)\nHotjar\nGoogle Analytics\nStorybook\nAxe DevTools',
      involvedTeams: 'UX Design\nUX Research\nAccessibility Specialist',
      knownIssues: 'Usability testing recruitment takes 2 weeks on average\nDesign-to-development handoff loses context — 25% of specs need clarification\nDesign system has 15 undocumented components',
      cycleTime: '480',
      leadTime: '7200',
      valueAddPercent: '70',
    },
  },
  {
    id: 'sdlc-3',
    type: 'sipoc',
    position: { x: 750, y: 300 },
    data: {
      label: 'Sprint Planning & Task Breakdown',
      processDescription: 'Development team pulls items from backlog into sprint, breaks user stories into technical tasks, estimates effort using planning poker, identifies dependencies, and commits to sprint goal.',
      suppliers: 'Scrum Master\nEngineering Manager\nProduct Owner',
      inputs: 'Prioritized Backlog\nDesign Specs\nTeam Velocity History\nTechnical Debt Backlog\nDependency Map',
      outputs: 'Sprint Backlog\nTask Assignments\nSprint Goal\nCapacity Plan\nRisk Register',
      customers: 'Frontend Development Team\nBackend Development Team\nDevOps Team',
      applicationsInvolved: 'Jira\nConfluence\nMiro (Planning Board)\nTeams (Sprint Planning Meeting)',
      involvedTeams: 'Scrum Team\nEngineering Management\nProduct Management',
      knownIssues: 'Velocity variance ±30% between sprints due to unplanned work\nCross-team dependencies cause 40% of sprint commitment misses\nTechnical debt items consistently deprioritized (last addressed 4 sprints ago)',
      cycleTime: '180',
      leadTime: '480',
      valueAddPercent: '55',
    },
  },
  {
    id: 'sdlc-4',
    type: 'sipoc',
    position: { x: 1100, y: 100 },
    data: {
      label: 'Frontend Development',
      processDescription: 'React/TypeScript implementation of UI components following design specs. Includes component development in Storybook, unit tests, accessibility compliance, responsive design, and performance optimization.',
      suppliers: 'UX Design Team\nDesign System Maintainers',
      inputs: 'Figma Design Specs\nDesign Tokens\nComponent Library\nAPI Contracts (OpenAPI)\nAccessibility Annotations',
      outputs: 'React Components\nUnit Test Suite (Jest/Vitest)\nStorybook Stories\nBundle Size Report\nAccessibility Audit Results',
      customers: 'Integration Testing Team\nQA Team\nCode Review (Pull Request)',
      applicationsInvolved: 'VS Code\nGitHub\nStorybook\nChromatic (Visual Regression)\nLighthouse\nAxe DevTools\nVite',
      involvedTeams: 'Frontend Development\nDesign System Team',
      knownIssues: 'Bundle size growing 5% per sprint — no active tree-shaking strategy\nStorybook build takes 8 minutes (blocks visual regression checks)\nIE11 polyfill removal postponed 3 times due to enterprise customer dependency',
      cycleTime: '960',
      leadTime: '4320',
      valueAddPercent: '80',
    },
  },
  {
    id: 'sdlc-5',
    type: 'sipoc',
    position: { x: 1100, y: 500 },
    data: {
      label: 'Backend Development',
      processDescription: 'API development in Java/Spring Boot or Node.js. Includes database migrations, business logic implementation, API documentation, integration tests, and security hardening (OWASP Top 10).',
      suppliers: 'Architecture Team\nDatabase Team\nSecurity Team',
      inputs: 'API Contracts (OpenAPI)\nDatabase Schema\nBusiness Rules Documentation\nSecurity Requirements\nPerformance SLAs',
      outputs: 'REST/GraphQL APIs\nDatabase Migrations\nIntegration Tests\nAPI Documentation (Swagger)\nPerformance Benchmark Results',
      customers: 'Frontend Development Team\nIntegration Testing Team\nQA Team',
      applicationsInvolved: 'IntelliJ IDEA\nGitHub\nPostgres\nRedis\nDocker\nPostman\nSonarQube',
      involvedTeams: 'Backend Development\nDatabase Engineering\nPlatform Team',
      knownIssues: 'Database migration rollback strategy undocumented for 6 critical tables\nAPI response times degrade under >500 concurrent users (connection pool limits)\nTechnical debt: 3 legacy services still on Java 11 blocking Spring Boot 3 migration',
      cycleTime: '1200',
      leadTime: '5760',
      valueAddPercent: '75',
    },
  },
  {
    id: 'sdlc-6',
    type: 'sipoc',
    position: { x: 1450, y: 300 },
    data: {
      label: 'Code Review & Pull Request',
      processDescription: 'Peer review of all code changes via pull requests. Reviewers check code quality, architectural adherence, test coverage, security vulnerabilities, and documentation. Automated checks run in CI before human review.',
      suppliers: 'Frontend Developers\nBackend Developers\nCI/CD Pipeline (automated checks)',
      inputs: 'Pull Request Diff\nCI Check Results\nSonarQube Analysis\nTest Coverage Report\nArchitecture Decision Records',
      outputs: 'Approved Pull Request\nCode Review Feedback\nMerged Code to Main Branch\nUpdated Documentation',
      customers: 'Integration Testing Team\nCI/CD Pipeline',
      applicationsInvolved: 'GitHub (Pull Requests)\nSonarQube\nCodeClimate\nGitHub Actions\nSnyk (Dependency Scanning)',
      involvedTeams: 'All Engineering Teams\nSecurity Champions\nTech Leads',
      knownIssues: 'Average PR review time is 18 hours — goal is 4 hours\nReview fatigue on large PRs (>500 lines) leads to rubber-stamping\n2 senior engineers are bottleneck reviewers for 60% of backend PRs',
      cycleTime: '30',
      leadTime: '1080',
      valueAddPercent: '65',
    },
  },
  {
    id: 'sdlc-7',
    type: 'sipoc',
    position: { x: 1800, y: 300 },
    data: {
      label: 'Integration & E2E Testing',
      processDescription: 'Run automated integration tests (API contract tests, service-to-service), end-to-end tests (Playwright/Cypress), performance tests (k6), and security scans (DAST) in a staging environment.',
      suppliers: 'CI/CD Pipeline\nStaging Environment\nTest Data Management',
      inputs: 'Merged Code (Main Branch)\nTest Suites (Integration + E2E)\nTest Data Sets\nPerformance Baselines\nSecurity Scan Configuration',
      outputs: 'Test Execution Report\nPerformance Test Results\nSecurity Scan Report\nCode Coverage Metrics\nDefect Reports',
      customers: 'QA Team\nRelease Manager\nSecurity Team',
      applicationsInvolved: 'Playwright\nk6 (Performance)\nOWASP ZAP (DAST)\nAllure (Test Reports)\nGitHub Actions\nArgoCD (Staging Deploy)',
      involvedTeams: 'QA Engineering\nPerformance Engineering\nSecurity Engineering',
      knownIssues: 'E2E test suite takes 45 minutes — exceeds 30-minute target\nFlaky tests: 8% of E2E tests fail intermittently due to timing issues\nTest data management is manual — no automated seeding/teardown for staging',
      cycleTime: '45',
      leadTime: '180',
      valueAddPercent: '85',
    },
  },
  {
    id: 'sdlc-8',
    type: 'sipoc',
    position: { x: 2150, y: 300 },
    data: {
      label: 'QA Sign-off & Release Gate',
      processDescription: 'QA team performs exploratory testing, verifies acceptance criteria, reviews test automation results, and makes go/no-go recommendation. Release gate checklist ensures all quality criteria are met.',
      suppliers: 'QA Engineering\nProduct Owner\nRelease Manager',
      inputs: 'Test Execution Reports\nExploratory Testing Notes\nAcceptance Criteria\nRelease Gate Checklist\nPerformance Benchmarks',
      outputs: 'Release Approval\nRelease Notes Draft\nKnown Issues List\nRollback Plan',
      customers: 'DevOps Team (Deployment)\nProduct Marketing\nCustomer Success',
      applicationsInvolved: 'Jira (Release Board)\nConfluence (Release Notes)\nTestRail\nSlack (Go/No-Go Channel)',
      involvedTeams: 'QA Team\nProduct Management\nRelease Management',
      knownIssues: 'Release gate meetings take 2 hours due to too many stakeholders\nNo automated release readiness scoring — decision is subjective\nKnown issues list format inconsistent between teams',
      cycleTime: '60',
      leadTime: '480',
      valueAddPercent: '50',
    },
  },
  {
    id: 'sdlc-9',
    type: 'sipoc',
    position: { x: 2500, y: 150 },
    data: {
      label: 'Canary Deployment',
      processDescription: 'Deploy new version to 5% of production traffic using canary strategy. Monitor error rates, latency, and business metrics. Automated rollback triggered if error rate exceeds threshold.',
      suppliers: 'DevOps Team\nSRE Team\nCI/CD Pipeline',
      inputs: 'Release Approval\nContainer Images\nHelm Charts\nCanary Configuration\nRollback Plan',
      outputs: 'Canary Metrics Dashboard\nCanary Health Report\nPromotion Decision\nDeployment Artifacts',
      customers: 'SRE Team\nRelease Manager\nEnd Users (5% traffic)',
      applicationsInvolved: 'ArgoCD\nIstio (Traffic Splitting)\nPrometheus\nGrafana\nPagerDuty\nAWS EKS\nHelm',
      involvedTeams: 'DevOps Engineering\nSite Reliability Engineering\nPlatform Team',
      knownIssues: 'Canary analysis window (30 min) may miss slow-burn memory leaks\nDatabase migrations cannot be canary-tested (schema changes are all-or-nothing)\nCanary metrics baseline drifts on weekends due to different traffic patterns',
      cycleTime: '30',
      leadTime: '120',
      valueAddPercent: '90',
    },
  },
  {
    id: 'sdlc-10',
    type: 'sipoc',
    position: { x: 2500, y: 450 },
    data: {
      label: 'Full Production Rollout',
      processDescription: 'Progressive rollout from canary (5%) to 25% → 50% → 100% of production traffic. Each stage includes automated health checks and manual verification of business metrics.',
      suppliers: 'DevOps Team\nSRE Team',
      inputs: 'Canary Health Report\nPromotion Decision\nDeployment Runbook\nMonitoring Dashboards',
      outputs: 'Production Deployment (100%)\nDeployment Record\nVersion Manifest\nRelease Tag',
      customers: 'End Users\nCustomer Success Team\nSupport Team',
      applicationsInvolved: 'ArgoCD\nAWS EKS\nDatadog\nGrafana\nStatusPage\nGitHub (Release Tags)',
      involvedTeams: 'DevOps Engineering\nSRE Team',
      knownIssues: 'Rollout to 100% takes 2 hours due to pod scheduling in multi-region EKS\nNo automated verification of business metrics during rollout stages\nStatusPage update is manual — often delayed by 30+ minutes',
      cycleTime: '15',
      leadTime: '180',
      valueAddPercent: '88',
    },
  },
  {
    id: 'sdlc-11',
    type: 'sipoc',
    position: { x: 2850, y: 300 },
    data: {
      label: 'Post-Deployment Monitoring',
      processDescription: 'Monitor production metrics for 24-48 hours after deployment. Track error rates, latency percentiles (p50/p95/p99), business KPIs, and user feedback. Trigger incident response if anomalies detected.',
      suppliers: 'SRE Team\nMonitoring Infrastructure\nEnd Users',
      inputs: 'Production Metrics Stream\nError Logs\nUser Feedback (in-app)\nAlerting Rules\nSLA Definitions',
      outputs: 'Deployment Health Assessment\nIncident Reports (if any)\nPerformance Regression Tickets\nUser Feedback Summary',
      customers: 'Engineering Teams\nProduct Management\nCustomer Success',
      applicationsInvolved: 'Datadog\nGrafana\nPagerDuty\nSentry (Error Tracking)\nStatusPage\nSlack (#incidents)',
      involvedTeams: 'Site Reliability Engineering\nOn-Call Engineers\nCustomer Success',
      knownIssues: 'Alert fatigue: 40% of PagerDuty alerts are non-actionable\nSentry error grouping produces too many unique issues (noisy)\nNo correlation between deployment events and business metric changes in Datadog',
      cycleTime: '10',
      leadTime: '2880',
      valueAddPercent: '70',
    },
  },
  {
    id: 'sdlc-12',
    type: 'sipoc',
    position: { x: 3200, y: 150 },
    data: {
      label: 'Hotfix & Incident Response',
      processDescription: 'Emergency response for production incidents. Includes incident triage, root cause analysis, hotfix development, expedited review, and emergency deployment bypassing standard release gate.',
      suppliers: 'On-Call Engineer\nIncident Commander\nSRE Team',
      inputs: 'Incident Report\nError Logs & Traces\nAffected User Reports\nRunbook Procedures\nRollback Decision',
      outputs: 'Hotfix Deployment\nIncident Post-Mortem\nRunbook Updates\nPreventive Action Items',
      customers: 'End Users\nCustomer Success\nEngineering Management',
      applicationsInvolved: 'PagerDuty\nSlack (#war-room)\nGitHub (hotfix branch)\nArgoCD\nSentry\nDatadog\nStatusPage',
      involvedTeams: 'On-Call Engineers\nSRE Team\nEngineering Management\nCustomer Communications',
      knownIssues: 'Mean time to detect (MTTD) is 8 minutes but mean time to resolve (MTTR) is 47 minutes\nPost-mortem action items completion rate is only 60% within 2 weeks\nHotfix deploys bypass E2E tests — introduced regression twice in Q1',
      cycleTime: '30',
      leadTime: '180',
      valueAddPercent: '95',
    },
  },
  {
    id: 'sdlc-13',
    type: 'sipoc',
    position: { x: 3200, y: 450 },
    data: {
      label: 'Feature Flag & Gradual Rollout',
      processDescription: 'Manage feature visibility via feature flags. Enable features for internal users, beta users, then percentage rollout. Collect telemetry on feature adoption, performance impact, and A/B test results.',
      suppliers: 'Product Management\nEngineering Team\nData Analytics',
      inputs: 'Deployed Feature (behind flag)\nTarget User Segments\nA/B Test Hypothesis\nSuccess Metrics Definition',
      outputs: 'Feature Adoption Metrics\nA/B Test Results\nPerformance Impact Report\nFull Rollout or Rollback Decision',
      customers: 'Product Management\nEnd Users\nData Analytics Team',
      applicationsInvolved: 'LaunchDarkly\nAmplitude (Product Analytics)\nDatadog\nBigQuery\nLooker (Dashboards)',
      involvedTeams: 'Product Management\nData Analytics\nEngineering (Feature Owners)',
      knownIssues: 'Feature flag cleanup: 45 stale flags active in production (technical debt)\nA/B test sample sizes often too small for statistical significance\nLaunchDarkly SDK adds 200ms to initial page load (evaluated synchronously)',
      cycleTime: '15',
      leadTime: '10080',
      valueAddPercent: '60',
    },
  },
  {
    id: 'sdlc-14',
    type: 'sipoc',
    position: { x: 3550, y: 300 },
    data: {
      label: 'Retrospective & Continuous Improvement',
      processDescription: 'Sprint retrospective reviews delivery metrics, identifies bottlenecks, celebrates wins, and generates improvement actions. Feed learnings back into process, tooling, and architecture decisions.',
      suppliers: 'Scrum Master\nAll Team Members\nDelivery Metrics',
      inputs: 'Sprint Velocity & Burndown\nDeployment Frequency\nMTTR & Change Failure Rate\nTeam Satisfaction Survey\nIncident Post-Mortems',
      outputs: 'Improvement Action Items\nProcess Changes\nTooling Requests\nArchitecture Decision Records\nUpdated Team Agreements',
      customers: 'Scrum Team\nEngineering Management\nPlatform Team',
      applicationsInvolved: 'Miro (Retro Board)\nJira (Action Items)\nConfluence (Team Agreements)\nGitHub (DORA Metrics)\nMultiplier (Team Health)',
      involvedTeams: 'Scrum Team\nEngineering Management\nAgile Coaches',
      knownIssues: 'Retro action items completion rate is 55% — too many actions generated per retro\nSame systemic issues recur across 3+ retros without resolution (cross-team dependencies)\nDORA metrics not yet automated — manual collection takes 2 hours per sprint',
      cycleTime: '90',
      leadTime: '90',
      valueAddPercent: '40',
    },
  },
  {
    id: 'sdlc-15',
    type: 'sipoc',
    position: { x: 3900, y: 300 },
    data: {
      label: 'Customer Feedback & Analytics',
      processDescription: 'Collect and analyze product usage telemetry, NPS scores, feature adoption rates, and customer support trends. Synthesize insights into actionable product recommendations that feed back into ideation.',
      suppliers: 'End Users\nCustomer Success\nSupport Team\nProduct Analytics',
      inputs: 'Product Usage Telemetry\nNPS Survey Responses\nSupport Ticket Themes\nChurn Analysis\nFeature Adoption Metrics',
      outputs: 'Product Insights Report\nFeature Request Synthesis\nChurn Risk Indicators\nCustomer Health Scores\nRoadmap Input',
      customers: 'Product Management\nEngineering Leadership\nCustomer Success',
      applicationsInvolved: 'Amplitude\nGainsight\nIntercom\nBigQuery\nLooker\nSalesforce',
      involvedTeams: 'Product Analytics\nCustomer Success\nSupport Operations\nProduct Management',
      knownIssues: 'Telemetry event taxonomy inconsistent across frontend/backend — 20% of events unattributed\nNPS response rate dropped from 25% to 12% after survey frequency increase\nNo single customer health score — 3 competing models in use across teams',
      cycleTime: '240',
      leadTime: '10080',
      valueAddPercent: '55',
    },
  },
];

export const sdlcDemoEdges: SipocEdge[] = [
  // Linear flow: Ideation → Design → Planning
  { id: 'sdlc-e1-2', source: 'sdlc-1', target: 'sdlc-2', type: 'smart', animated: true, data: { label: 'Prioritized User Stories' } },
  { id: 'sdlc-e2-3', source: 'sdlc-2', target: 'sdlc-3', type: 'smart', animated: true, data: { label: 'Design Specs' } },

  // Branch: Planning splits into Frontend + Backend (parallel development)
  { id: 'sdlc-e3-4', source: 'sdlc-3', target: 'sdlc-4', type: 'smart', animated: true, data: { label: 'Frontend Tasks' } },
  { id: 'sdlc-e3-5', source: 'sdlc-3', target: 'sdlc-5', type: 'smart', animated: true, data: { label: 'Backend Tasks' } },

  // Merge: Both tracks → Code Review
  { id: 'sdlc-e4-6', source: 'sdlc-4', target: 'sdlc-6', type: 'smart', animated: true, data: { label: 'Pull Request (Frontend)' } },
  { id: 'sdlc-e5-6', source: 'sdlc-5', target: 'sdlc-6', type: 'smart', animated: true, data: { label: 'Pull Request (Backend)' } },

  // Linear: Code Review → Testing → QA Gate
  { id: 'sdlc-e6-7', source: 'sdlc-6', target: 'sdlc-7', type: 'smart', animated: true, data: { label: 'Merged Code' } },
  { id: 'sdlc-e7-8', source: 'sdlc-7', target: 'sdlc-8', type: 'smart', animated: true, data: { label: 'Test Results' } },

  // Branch: QA Gate splits into Canary + Feature Flags
  { id: 'sdlc-e8-9', source: 'sdlc-8', target: 'sdlc-9', type: 'smart', animated: true, data: { label: 'Release Approved' } },

  // Canary → Full Rollout
  { id: 'sdlc-e9-10', source: 'sdlc-9', target: 'sdlc-10', type: 'smart', animated: true, data: { label: 'Canary Healthy' } },

  // Full Rollout → Post-Deployment Monitoring
  { id: 'sdlc-e10-11', source: 'sdlc-10', target: 'sdlc-11', type: 'smart', animated: true, data: { label: 'Production Live' } },

  // Branch from monitoring: Hotfix path (incident detected)
  { id: 'sdlc-e11-12', source: 'sdlc-11', target: 'sdlc-12', type: 'smart', animated: true, data: { label: 'Incident Detected' } },

  // Feature Flag management after deployment
  { id: 'sdlc-e10-13', source: 'sdlc-10', target: 'sdlc-13', type: 'smart', animated: true, data: { label: 'Feature Flags Active' } },

  // Hotfix feeds back to monitoring
  { id: 'sdlc-e12-11', source: 'sdlc-12', target: 'sdlc-11', type: 'smart', animated: true, data: { label: 'Hotfix Deployed' } },

  // Monitoring + Feature Flags → Retrospective
  { id: 'sdlc-e11-14', source: 'sdlc-11', target: 'sdlc-14', type: 'smart', animated: true, data: { label: 'Deployment Health Report' } },
  { id: 'sdlc-e13-14', source: 'sdlc-13', target: 'sdlc-14', type: 'smart', animated: true, data: { label: 'Feature Adoption Metrics' } },

  // Retrospective → Customer Feedback
  { id: 'sdlc-e14-15', source: 'sdlc-14', target: 'sdlc-15', type: 'smart', animated: true, data: { label: 'Improvement Actions' } },

  // Feedback loop: Customer Analytics feeds back to Ideation
  { id: 'sdlc-e15-1', source: 'sdlc-15', target: 'sdlc-1', type: 'smart', animated: true, data: { label: 'Product Insights' } },
];
