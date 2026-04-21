// Pre-built analysis workflow templates

export interface AnalysisTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'business' | 'research' | 'general';
  prompts: TemplatePrompt[];
}

export interface TemplatePrompt {
  id: string;
  label: string;
  prompt: string;
  order: number;
}

export const analysisTemplates: AnalysisTemplate[] = [
  {
    id: 'swot',
    name: 'SWOT Analysis',
    description: 'Analyze Strengths, Weaknesses, Opportunities, and Threats',
    icon: '🎯',
    color: '#7C9FF5',
    category: 'business',
    prompts: [
      {
        id: 'swot-strengths',
        label: 'Identify Strengths',
        prompt: 'Analyze the document and identify all internal strengths. What are the key advantages, capabilities, resources, or competitive edges mentioned? Provide specific examples from the document.',
        order: 1,
      },
      {
        id: 'swot-weaknesses',
        label: 'Identify Weaknesses',
        prompt: 'Analyze the document and identify internal weaknesses or limitations. What are the gaps, resource constraints, or areas needing improvement? Be specific with examples from the document.',
        order: 2,
      },
      {
        id: 'swot-opportunities',
        label: 'Find Opportunities',
        prompt: 'Based on the document, identify external opportunities. What market trends, emerging needs, or favorable conditions could be leveraged? Include specific opportunities mentioned or implied.',
        order: 3,
      },
      {
        id: 'swot-threats',
        label: 'Assess Threats',
        prompt: 'Identify external threats from the document. What challenges, competitive pressures, or risks are present? List specific threats with supporting evidence from the document.',
        order: 4,
      },
      {
        id: 'swot-summary',
        label: 'SWOT Summary',
        prompt: 'Create a comprehensive SWOT summary table with all findings organized into the four quadrants. Then provide strategic recommendations based on the analysis.',
        order: 5,
      },
    ],
  },
  {
    id: 'competitive',
    name: 'Competitive Analysis',
    description: 'Evaluate market position, competitors, and differentiators',
    icon: '⚔️',
    color: '#E879B9',
    category: 'business',
    prompts: [
      {
        id: 'comp-overview',
        label: 'Market Overview',
        prompt: 'Provide an overview of the market or industry described in the document. What is the market size, growth trends, and key segments?',
        order: 1,
      },
      {
        id: 'comp-players',
        label: 'Key Players',
        prompt: 'Identify all competitors or key players mentioned in the document. For each, summarize their market position, strengths, and key offerings.',
        order: 2,
      },
      {
        id: 'comp-differentiators',
        label: 'Differentiators',
        prompt: 'What are the key differentiators and unique value propositions identified? How do the offerings compare in terms of features, pricing, and positioning?',
        order: 3,
      },
      {
        id: 'comp-gaps',
        label: 'Market Gaps',
        prompt: 'Identify any market gaps, unmet needs, or underserved segments mentioned in the document. What opportunities exist for differentiation?',
        order: 4,
      },
      {
        id: 'comp-strategy',
        label: 'Strategic Recommendations',
        prompt: 'Based on the competitive analysis, provide strategic recommendations. How can competitive advantages be strengthened? What positioning strategies would be most effective?',
        order: 5,
      },
    ],
  },
  {
    id: 'literature-review',
    name: 'Literature Review',
    description: 'Systematic analysis of research papers and academic sources',
    icon: '📚',
    color: '#10B981',
    category: 'research',
    prompts: [
      {
        id: 'lit-summary',
        label: 'Source Summary',
        prompt: 'Provide a summary of each source in the document. Include the main thesis, methodology, and key findings for each piece of literature.',
        order: 1,
      },
      {
        id: 'lit-themes',
        label: 'Key Themes',
        prompt: 'Identify the major themes and topics that emerge across the literature. Group related findings and show how different sources address similar questions.',
        order: 2,
      },
      {
        id: 'lit-methodology',
        label: 'Methodological Analysis',
        prompt: 'Analyze the research methodologies used across the sources. What approaches were most common? What are the strengths and limitations of the methods used?',
        order: 3,
      },
      {
        id: 'lit-gaps',
        label: 'Research Gaps',
        prompt: 'Identify gaps in the existing research. What questions remain unanswered? What areas need further investigation? Note any contradictions between sources.',
        order: 4,
      },
      {
        id: 'lit-synthesis',
        label: 'Synthesis & Conclusions',
        prompt: 'Synthesize the findings across all sources into a coherent narrative. What is the current state of knowledge on this topic? What conclusions can be drawn?',
        order: 5,
      },
    ],
  },
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'Create a concise overview for stakeholders',
    icon: '📋',
    color: '#F59E0B',
    category: 'business',
    prompts: [
      {
        id: 'exec-overview',
        label: 'Overview',
        prompt: 'Provide a high-level overview of the document in 2-3 sentences. What is the main purpose and scope?',
        order: 1,
      },
      {
        id: 'exec-findings',
        label: 'Key Findings',
        prompt: 'List the top 5-7 most important findings or insights from the document. Each point should be concise and actionable.',
        order: 2,
      },
      {
        id: 'exec-recommendations',
        label: 'Recommendations',
        prompt: 'What are the key recommendations or next steps suggested by the document? Prioritize by impact and urgency.',
        order: 3,
      },
      {
        id: 'exec-metrics',
        label: 'Key Metrics',
        prompt: 'Extract and highlight the most important numbers, statistics, and metrics from the document. Present them in a clear, digestible format.',
        order: 4,
      },
      {
        id: 'exec-final',
        label: 'Executive Summary',
        prompt: 'Create a polished executive summary (300-400 words) suitable for senior stakeholders. Include context, key findings, and recommended actions.',
        order: 5,
      },
    ],
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis',
    description: 'Extract and visualize data patterns and trends',
    icon: '📊',
    color: '#8B5CF6',
    category: 'general',
    prompts: [
      {
        id: 'data-overview',
        label: 'Data Overview',
        prompt: 'Describe the data contained in the document. What types of data are present? What is the time range, sample size, or scope?',
        order: 1,
      },
      {
        id: 'data-trends',
        label: 'Identify Trends',
        prompt: 'Identify the main trends and patterns in the data. What are the most significant changes or movements over time?',
        order: 2,
      },
      {
        id: 'data-chart',
        label: 'Create Visualization',
        prompt: 'Create a chart showing the most important data trend. Use the most appropriate chart type (bar, line, or pie) for the data.',
        order: 3,
      },
      {
        id: 'data-outliers',
        label: 'Notable Outliers',
        prompt: 'Identify any outliers, anomalies, or unexpected values in the data. What might explain these deviations?',
        order: 4,
      },
      {
        id: 'data-insights',
        label: 'Key Insights',
        prompt: 'Summarize the most actionable insights from the data analysis. What decisions could be informed by these findings?',
        order: 5,
      },
    ],
  },
  {
    id: 'risk-assessment',
    name: 'Risk Assessment',
    description: 'Identify and evaluate potential risks and mitigations',
    icon: '⚠️',
    color: '#EF4444',
    category: 'business',
    prompts: [
      {
        id: 'risk-identify',
        label: 'Identify Risks',
        prompt: 'List all risks, challenges, or potential issues mentioned in the document. Categorize them by type (financial, operational, strategic, compliance, etc.).',
        order: 1,
      },
      {
        id: 'risk-assess',
        label: 'Assess Impact & Likelihood',
        prompt: 'For each identified risk, assess the potential impact (high/medium/low) and likelihood of occurrence. Explain your reasoning.',
        order: 2,
      },
      {
        id: 'risk-prioritize',
        label: 'Priority Matrix',
        prompt: 'Create a risk priority matrix organizing risks by impact and likelihood. Identify the top 5 risks that require immediate attention.',
        order: 3,
      },
      {
        id: 'risk-mitigate',
        label: 'Mitigation Strategies',
        prompt: 'For each high-priority risk, suggest specific mitigation strategies or controls. What actions can reduce the impact or likelihood?',
        order: 4,
      },
      {
        id: 'risk-summary',
        label: 'Risk Summary',
        prompt: 'Provide an overall risk assessment summary including total risk exposure, critical risks, and recommended immediate actions.',
        order: 5,
      },
    ],
  },
];

export const templateCategories = [
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'research', name: 'Research', icon: '🔬' },
  { id: 'general', name: 'General', icon: '📁' },
];

export function getTemplateById(id: string): AnalysisTemplate | undefined {
  return analysisTemplates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): AnalysisTemplate[] {
  return analysisTemplates.filter(t => t.category === category);
}
