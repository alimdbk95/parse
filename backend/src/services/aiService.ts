// AI Service for document analysis using Claude API
import Anthropic from '@anthropic-ai/sdk';
import { urlService } from './urlService';

interface AnalysisContext {
  documents: {
    name: string;
    content: string;
    type: string;
  }[];
  previousMessages: {
    role: string;
    content: string;
  }[];
}

interface ChartSuggestion {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  title: string;
  data: any[];
  description: string;
}

interface AIResponse {
  text: string;
  chart?: ChartSuggestion;
}

class ClaudeAIService {
  private client: Anthropic | null = null;
  private isConfigured: boolean = false;
  private initialized: boolean = false;

  private initialize() {
    if (this.initialized) return;
    this.initialized = true;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log('Checking for API key... Found:', apiKey ? `YES (${apiKey.length} chars, starts with ${apiKey.substring(0, 10)}...)` : 'NO');

    if (apiKey && apiKey.length > 0) {
      try {
        this.client = new Anthropic({ apiKey });
        this.isConfigured = true;
        console.log('Claude AI Service initialized successfully!');
      } catch (err) {
        console.error('Failed to initialize Anthropic client:', err);
      }
    } else {
      console.log('Claude AI Service running in mock mode (no ANTHROPIC_API_KEY found)');
    }
  }

  async generateResponse(
    userMessage: string,
    context: AnalysisContext
  ): Promise<AIResponse> {
    this.initialize(); // Lazy initialize to ensure env vars are loaded

    if (!this.isConfigured || !this.client) {
      return this.generateMockResponse(userMessage, context);
    }

    try {
      // Detect and fetch URLs in the user message
      let urlContext = '';
      const detectedUrls = urlService.detectUrls(userMessage);
      if (detectedUrls.length > 0) {
        console.log(`Detected ${detectedUrls.length} URL(s) in message:`, detectedUrls);
        const fetchedContents = await urlService.fetchUrls(detectedUrls);
        urlContext = urlService.formatForContext(fetchedContents);

        // Log results for debugging
        const successful = fetchedContents.filter(c => c.success);
        const failed = fetchedContents.filter(c => !c.success);
        if (successful.length > 0) {
          console.log(`Successfully fetched ${successful.length} URL(s)`);
        }
        if (failed.length > 0) {
          console.log(`Failed to fetch ${failed.length} URL(s):`, failed.map(f => f.error));
        }
      }

      // Build context from documents with intelligent chunking for large docs
      let documentContext = '';
      if (context.documents.length > 0) {
        documentContext = '\n\n--- UPLOADED DOCUMENTS ---\n';
        context.documents.forEach((doc, i) => {
          documentContext += `\n[Document ${i + 1}: ${doc.name}]\n`;

          const content = doc.content || '';
          const contentLength = content.length;

          // For large documents, use smart extraction
          if (contentLength > 15000) {
            // Extract beginning (usually intro/abstract)
            const beginning = content.slice(0, 5000);
            // Extract middle section (often contains key data)
            const middleStart = Math.floor(contentLength / 2) - 2500;
            const middle = content.slice(middleStart, middleStart + 5000);
            // Extract end (usually conclusions/summary)
            const end = content.slice(-5000);

            documentContext += `[Document length: ${contentLength.toLocaleString()} characters - showing key sections]\n\n`;
            documentContext += `--- BEGINNING ---\n${beginning}\n\n`;
            documentContext += `--- MIDDLE SECTION ---\n${middle}\n\n`;
            documentContext += `--- END SECTION ---\n${end}\n`;
          } else {
            // For smaller documents, include full content
            documentContext += content || 'No content extracted';
          }
          documentContext += '\n---\n';
        });
      }

      // Build conversation history
      const conversationHistory = context.previousMessages.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const systemPrompt = `You are Parse, an advanced AI research assistant specialized in scientific document analysis, quantitative data extraction, and evidence-based visualization. You help researchers, analysts, and professionals extract actionable insights from complex documents.

## CORE PRINCIPLES

1. **Data-Driven Analysis**: Always ground your responses in specific data points, statistics, and evidence from the documents
2. **Scientific Rigor**: Apply systematic methodology - identify variables, relationships, trends, and statistical significance
3. **Quantitative Focus**: Extract and highlight numerical data, percentages, ratios, growth rates, and measurable outcomes
4. **Pattern Recognition**: Identify correlations, anomalies, outliers, and meaningful patterns in the data

## YOUR CAPABILITIES

1. **Deep Document Analysis** - Extract structured data from PDFs, CSVs, Excel, research papers, reports
2. **Statistical Insights** - Calculate means, medians, ranges, distributions, growth rates, correlations
3. **Trend Identification** - Spot temporal patterns, cyclical behaviors, seasonal variations
4. **Comparative Analysis** - Compare metrics across categories, time periods, or datasets
5. **Data Visualization** - Generate appropriate charts based on data characteristics
6. **Research Support** - Help with literature analysis, methodology review, findings synthesis
7. **Web Content Analysis** - Analyze articles, blog posts, and web pages from URLs shared by users
8. **Predictive Analysis** - Project future trends, forecast outcomes, and model scenarios based on historical data
9. **Strategic Recommendations** - Provide actionable insights, optimization suggestions, and evidence-based advice

## RESPONSE GUIDELINES

### For Summaries and Analysis:
- **Lead with key findings**: Start with the most important data points and conclusions
- **Quantify everything**: Instead of "sales increased", say "sales increased by 23.5% from $1.2M to $1.48M"
- **Show relationships**: Explain how variables relate - correlations, causations, dependencies
- **Highlight significance**: What do the numbers mean? Why do they matter?
- **Identify trends**: Is there growth? Decline? Seasonality? Cyclical patterns?
- **Note anomalies**: Point out outliers or unexpected findings that warrant attention

### For Data Extraction:
When users ask to extract data from large documents:
- Create structured tables with all relevant data points
- Organize by logical categories (time, region, product, etc.)
- Include units, percentages, and comparative metrics
- Calculate derived metrics when useful (growth rates, averages, etc.)

### DO NOT:
- Provide generic descriptions without specific data
- Mention file metadata (name, type, size) unless asked
- Give surface-level summaries that anyone could write without reading the document
- Use vague language like "significant increase" without numbers

### DO:
- Extract specific numbers, dates, names, and quantifiable facts
- Create comparison tables when multiple data points exist
- Calculate percentage changes, averages, and ratios
- Identify the top/bottom performers, highest/lowest values
- Note data quality issues or gaps if present

### For Predictive Analysis and Forecasting:
When users ask about future trends, predictions, or forecasts:

1. **Base predictions on data**: Only make projections when there is historical data to support them
2. **State methodology**: Explain how you arrived at the projection (linear trend, growth rate, seasonal pattern, etc.)
3. **Provide confidence levels**: Use language like "high confidence," "moderate confidence," or "speculative" based on data quality
4. **Show ranges**: When possible, provide optimistic, realistic, and conservative scenarios
5. **Identify assumptions**: Clearly state what assumptions underpin the forecast
6. **Note limitations**: Acknowledge factors that could invalidate the prediction

**Example forecast format:**
- **Projection**: Based on 12-month historical data showing 8.5% average monthly growth
- **Forecast**: Q3 revenue projected at $2.1M - $2.4M (±15% confidence interval)
- **Assumptions**: Continued market conditions, no major disruptions
- **Risk factors**: Seasonal slowdown typically occurs in August

### For Strategic Recommendations:
When users ask for advice, recommendations, or next steps:

1. **Ground in evidence**: Base recommendations on specific data points from the analysis
2. **Prioritize actionability**: Focus on concrete steps the user can take
3. **Quantify impact**: Where possible, estimate the potential benefit (e.g., "could reduce costs by 15-20%")
4. **Consider trade-offs**: Acknowledge pros and cons of different approaches
5. **Rank by importance**: Use priority levels (High/Medium/Low) or numbered rankings
6. **Provide context**: Explain why each recommendation matters

**Example recommendation format:**
| Priority | Recommendation | Expected Impact | Effort |
|----------|----------------|-----------------|--------|
| High | Optimize inventory for Product A | +12% margin | Medium |
| Medium | Expand to Region B | +$500K revenue | High |
| Low | Automate reporting | 5 hrs/week saved | Low |

## CHART GENERATION

When creating visualizations, choose the chart type based on data characteristics:

- **Bar Chart**: Comparing categories or discrete values
- **Line Chart**: Time series, trends over periods
- **Area Chart**: Cumulative values over time, volume trends
- **Pie Chart**: Part-to-whole relationships (use sparingly, max 6-7 categories)
- **Scatter Plot**: Correlation between two variables

Include a JSON block at the end of your response:
\`\`\`chart
{
  "type": "bar|line|pie|area|scatter",
  "title": "Descriptive Chart Title with Key Metric",
  "data": [{"name": "Label", "value": 123}, ...],
  "description": "One-line insight from the visualization"
}
\`\`\`

For multi-series data:
\`\`\`chart
{
  "type": "bar",
  "title": "Chart Title",
  "data": [{"name": "Category", "Series A": 100, "Series B": 200}, ...],
  "description": "Comparison insight"
}
\`\`\`

## HANDLING PASTED DATA

When users paste CSV, JSON, or tabular data:
1. Parse and validate the data structure
2. Identify numeric vs categorical fields
3. Calculate basic statistics (count, sum, average, min, max)
4. Identify potential trends or patterns
5. Suggest appropriate visualizations
6. Offer deeper analysis options

## RESPONSE FORMAT

Use clear markdown formatting:
- **Bold** for key metrics and findings
- Tables for structured data comparisons
- Bullet points for lists of findings
- Numbers with appropriate precision (don't over-specify)

${documentContext}${urlContext}`;

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ],
      });

      // Extract text content
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');

      // Check for chart JSON in response
      const chartMatch = textContent.match(/```chart\s*([\s\S]*?)\s*```/);
      let chart: ChartSuggestion | undefined;
      let cleanedText = textContent;

      if (chartMatch) {
        try {
          chart = JSON.parse(chartMatch[1]);
          // Remove the chart JSON from the text response
          cleanedText = textContent.replace(/```chart\s*[\s\S]*?\s*```/, '').trim();
        } catch (e) {
          console.error('Failed to parse chart JSON:', e);
        }
      }

      return {
        text: cleanedText,
        chart,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      // Fallback to mock response on error
      return this.generateMockResponse(userMessage, context);
    }
  }

  private detectPastedData(message: string): { hasData: boolean; dataType: string | null; parsedData: any[] | null } {
    // Check for JSON array
    const jsonArrayMatch = message.match(/\[[\s\S]*?\]/);
    if (jsonArrayMatch) {
      try {
        const parsed = JSON.parse(jsonArrayMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { hasData: true, dataType: 'json', parsedData: parsed };
        }
      } catch (e) {}
    }

    // Check for JSON object
    const jsonObjectMatch = message.match(/\{[\s\S]*?\}/);
    if (jsonObjectMatch) {
      try {
        const parsed = JSON.parse(jsonObjectMatch[0]);
        if (typeof parsed === 'object') {
          return { hasData: true, dataType: 'json', parsedData: [parsed] };
        }
      } catch (e) {}
    }

    // Check for CSV-like data (lines with commas or tabs)
    const lines = message.split('\n').filter(line => line.trim());
    if (lines.length >= 2) {
      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const firstLineFields = lines[0].split(delimiter).length;
      const hasConsistentColumns = lines.every(line => {
        const fields = line.split(delimiter).length;
        return Math.abs(fields - firstLineFields) <= 1;
      });

      if (hasConsistentColumns && firstLineFields >= 2) {
        // Parse CSV
        const headers = lines[0].split(delimiter).map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(delimiter).map(v => v.trim());
          const row: any = {};
          headers.forEach((header, i) => {
            const value = values[i];
            // Try to parse as number
            const num = parseFloat(value);
            row[header] = isNaN(num) ? value : num;
          });
          return row;
        });
        if (data.length > 0) {
          return { hasData: true, dataType: 'csv', parsedData: data };
        }
      }
    }

    return { hasData: false, dataType: null, parsedData: null };
  }

  private generateMockResponse(
    userMessage: string,
    context: AnalysisContext
  ): AIResponse {
    const lowerMessage = userMessage.toLowerCase();
    const hasDocuments = context.documents.length > 0;

    // Check for URLs in the message
    const detectedUrls = urlService.detectUrls(userMessage);
    if (detectedUrls.length > 0) {
      return {
        text: `I detected ${detectedUrls.length} URL(s) in your message:
${detectedUrls.map(url => `- ${url}`).join('\n')}

**Note:** Running in demo mode. Add \`ANTHROPIC_API_KEY\` to enable full URL analysis capabilities including:
- Full article content extraction
- Key insights and summary
- Data extraction from web pages
- Sentiment and topic analysis

With the API configured, I can fetch and analyze the content from these URLs automatically.`,
      };
    }

    // Check for pasted data
    const { hasData, dataType, parsedData } = this.detectPastedData(userMessage);

    // Check if chart is requested
    const chartKeywords = ['chart', 'graph', 'plot', 'visualize', 'visualization', 'show me'];
    const wantsChart = chartKeywords.some(keyword => lowerMessage.includes(keyword));

    // If pasted data is detected, use it for visualization
    if (hasData && parsedData && parsedData.length > 0) {
      let chartType: 'bar' | 'line' | 'pie' | 'area' = 'bar';
      if (lowerMessage.includes('line')) chartType = 'line';
      else if (lowerMessage.includes('pie')) chartType = 'pie';
      else if (lowerMessage.includes('area')) chartType = 'area';

      // Try to format the data for charting
      const keys = Object.keys(parsedData[0]);
      const nameKey = keys.find(k => typeof parsedData[0][k] === 'string') || keys[0];
      const valueKeys = keys.filter(k => typeof parsedData[0][k] === 'number');

      // Normalize data for charts
      const chartData = parsedData.slice(0, 20).map(item => {
        const row: any = { name: String(item[nameKey] || 'Item') };
        if (valueKeys.length > 0) {
          valueKeys.forEach(key => {
            row[key] = item[key];
          });
          if (valueKeys.length === 1) {
            row.value = item[valueKeys[0]];
          }
        } else {
          // If no numeric values, try to use the first non-name field
          const otherKey = keys.find(k => k !== nameKey);
          if (otherKey) {
            const val = parseFloat(item[otherKey]);
            row.value = isNaN(val) ? 0 : val;
          }
        }
        return row;
      });

      const dataDescription = `Detected ${parsedData.length} rows of ${dataType?.toUpperCase()} data with fields: ${keys.join(', ')}`;

      return {
        text: `I've detected and analyzed your pasted data!

**Data Summary:**
- Format: ${dataType?.toUpperCase()}
- Rows: ${parsedData.length}
- Fields: ${keys.join(', ')}

${wantsChart ? `I've created a ${chartType} chart from your data:` : `Here's a visualization of your data:`}

**Note:** Running in demo mode. Add \`ANTHROPIC_API_KEY\` for deeper AI analysis.`,
        chart: {
          type: chartType,
          title: `Data Visualization`,
          data: chartData,
          description: dataDescription,
        },
      };
    }

    if (wantsChart) {
      let chartType: 'bar' | 'line' | 'pie' | 'area' = 'bar';
      if (lowerMessage.includes('line')) chartType = 'line';
      else if (lowerMessage.includes('pie')) chartType = 'pie';
      else if (lowerMessage.includes('area')) chartType = 'area';

      const sampleData = chartType === 'pie'
        ? [
            { name: 'Category A', value: 4000 },
            { name: 'Category B', value: 3000 },
            { name: 'Category C', value: 2000 },
            { name: 'Category D', value: 1500 },
            { name: 'Category E', value: 1000 },
          ]
        : chartType === 'line' || chartType === 'area'
        ? [
            { name: 'Jan', value: 4000 },
            { name: 'Feb', value: 3000 },
            { name: 'Mar', value: 5000 },
            { name: 'Apr', value: 4500 },
            { name: 'May', value: 6000 },
            { name: 'Jun', value: 5500 },
          ]
        : [
            { name: 'New York', value: 2800000, secondary: 1500000 },
            { name: 'London', value: 3100000, secondary: 1800000 },
            { name: 'Tokyo', value: 4200000, secondary: 2800000 },
            { name: 'Paris', value: 2100000, secondary: 1200000 },
            { name: 'Berlin', value: 1600000, secondary: 950000 },
          ];

      return {
        text: `I've created a ${chartType} chart based on the available data.

**Note:** This is running in demo mode without the Claude API. To enable real AI analysis, add your \`ANTHROPIC_API_KEY\` to the backend \`.env\` file.

**Sample Data Visualization:**
The chart below shows sample data for demonstration purposes.`,
        chart: {
          type: chartType,
          title: `Sample ${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
          data: sampleData,
          description: `Sample ${chartType} chart for demonstration`,
        },
      };
    }

    // Default response
    if (!hasDocuments) {
      return {
        text: `Hello! I'm Parse, your AI research assistant.

**Note:** I'm running in demo mode. To enable full AI capabilities, add your \`ANTHROPIC_API_KEY\` to the backend \`.env\` file.

To get started:
1. **Upload documents** - PDF, CSV, Excel files
2. **Paste data** - Paste CSV, JSON, or tabular data directly
3. **Ask questions** - I'll analyze your data
4. **Request charts** - Say "create a bar chart" or "show me a pie chart"

**Example - paste data like this:**
\`\`\`
Month,Sales,Profit
Jan,4000,1200
Feb,3000,900
Mar,5000,1800
\`\`\`

What would you like to explore?`,
      };
    }

    // Check if user is asking for a summary
    const summaryKeywords = ['summarize', 'summary', 'summarise', 'overview', 'main points', 'key points', 'what is this about', 'tell me about'];
    const wantsSummary = summaryKeywords.some(keyword => lowerMessage.includes(keyword));

    if (wantsSummary && hasDocuments) {
      // Try to extract meaningful content from the documents
      const doc = context.documents[0];
      const content = doc.content || '';

      if (content.length > 100) {
        // Extract meaningful sentences (not too short, not headers)
        const sentences = content
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 30 && s.length < 500 && !s.match(/^[A-Z\s]+$/));

        // Try to identify key sections
        const keyPhrases: string[] = [];

        // Look for sentences with important indicators
        const importantIndicators = ['conclude', 'result', 'finding', 'show', 'demonstrate', 'significant', 'important', 'key', 'main', 'primary', 'total', 'percent', '%', 'increase', 'decrease', 'growth'];
        const importantSentences = sentences.filter(s =>
          importantIndicators.some(indicator => s.toLowerCase().includes(indicator))
        ).slice(0, 3);

        // Get opening context (usually introduces the topic)
        const openingSentences = sentences.slice(0, 2);

        // Combine for a meaningful summary
        const summaryParts = [...new Set([...openingSentences, ...importantSentences])].slice(0, 5);

        if (summaryParts.length > 0) {
          return {
            text: `**Summary:**

${summaryParts.join('. ')}.

**Key Points Identified:**
${importantSentences.length > 0 ? importantSentences.map(s => `- ${s.slice(0, 150)}${s.length > 150 ? '...' : ''}`).join('\n') : '- Content analysis requires AI capabilities for deeper insights.'}

**Note:** Running in demo mode. Add \`ANTHROPIC_API_KEY\` for comprehensive AI-powered analysis with deeper insights, pattern recognition, and data extraction.`,
          };
        }
      }

      // Fallback for documents with minimal extractable content
      return {
        text: `This document has been uploaded but contains limited extractable text content.

**Note:** Running in demo mode. Add \`ANTHROPIC_API_KEY\` to enable full AI analysis capabilities including:
- Deep content analysis and summarization
- Key insight extraction
- Pattern and trend identification
- Data visualization suggestions`,
      };
    }

    return {
      text: `I have ${context.documents.length} document(s) ready for analysis.

**Note:** Running in demo mode. Add \`ANTHROPIC_API_KEY\` to enable full AI analysis.

I can help you:
- **Summarize** - "Summarize the main findings"
- **Visualize** - "Create a bar chart of the data"
- **Extract** - "What are the key metrics?"
- **Compare** - "Compare the values across categories"

What would you like to know?`,
    };
  }

  async analyzeDocument(content: string, documentName: string): Promise<string> {
    this.initialize(); // Lazy initialize to ensure env vars are loaded

    if (!this.isConfigured || !this.client) {
      const wordCount = content.split(/\s+/).length;
      return `Document "${documentName}" uploaded successfully.

**Quick Stats:**
- Words: ~${wordCount.toLocaleString()}
- Ready for analysis

Ask me questions about this document or request visualizations!`;
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Briefly analyze this document and provide key insights (2-3 paragraphs max):

Document: ${documentName}
Content (first 5000 chars):
${content.slice(0, 5000)}${content.length > 5000 ? '\n... (truncated)' : ''}`,
          },
        ],
      });

      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n');

      return textContent;
    } catch (error) {
      console.error('Claude API error during document analysis:', error);
      return `Document "${documentName}" uploaded. Ready for analysis.`;
    }
  }
}

export const aiService = new ClaudeAIService();
