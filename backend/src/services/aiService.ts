// AI Service for document analysis using Claude API
import Anthropic from '@anthropic-ai/sdk';

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
      // Build context from documents
      let documentContext = '';
      if (context.documents.length > 0) {
        documentContext = '\n\n--- UPLOADED DOCUMENTS ---\n';
        context.documents.forEach((doc, i) => {
          documentContext += `\n[Document ${i + 1}: ${doc.name} (${doc.type})]\n`;
          // Limit content to avoid token limits
          const truncatedContent = doc.content?.slice(0, 8000) || 'No content extracted';
          documentContext += truncatedContent;
          if (doc.content && doc.content.length > 8000) {
            documentContext += '\n... (content truncated)';
          }
          documentContext += '\n---\n';
        });
      }

      // Build conversation history
      const conversationHistory = context.previousMessages.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const systemPrompt = `You are Parse, an AI research assistant specialized in document analysis, data extraction, and visualization. You help researchers analyze documents, extract insights, and create visualizations.

Your capabilities:
1. Analyze uploaded documents (PDF, CSV, Excel, etc.)
2. Extract key data points and patterns
3. Generate charts and visualizations
4. Compare data across documents
5. Answer questions about the content

When the user asks for a chart or visualization, respond with your analysis AND include a JSON block at the end of your response in this exact format:
\`\`\`chart
{
  "type": "bar|line|pie|area|scatter",
  "title": "Chart Title",
  "data": [{"name": "Label", "value": 123}, ...],
  "description": "Brief description"
}
\`\`\`

For multi-series charts (grouped bars), use this format:
\`\`\`chart
{
  "type": "bar",
  "title": "Chart Title",
  "data": [{"name": "Label", "series1": 100, "series2": 200}, ...],
  "description": "Brief description"
}
\`\`\`

Important guidelines:
- Be concise but thorough in your analysis
- Use markdown formatting (bold, lists, tables) for clarity
- When you don't have real data, clearly state you're using sample data
- Always explain what the chart shows and key insights
- If no documents are uploaded, guide the user on how to get started

${documentContext}`;

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
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

  private generateMockResponse(
    userMessage: string,
    context: AnalysisContext
  ): AIResponse {
    const lowerMessage = userMessage.toLowerCase();
    const hasDocuments = context.documents.length > 0;

    // Check if chart is requested
    const chartKeywords = ['chart', 'graph', 'plot', 'visualize', 'visualization', 'show me'];
    const wantsChart = chartKeywords.some(keyword => lowerMessage.includes(keyword));

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
2. **Ask questions** - I'll analyze your documents
3. **Request charts** - Say "create a bar chart" or "show me a pie chart"
4. **Compare data** - Upload multiple documents to compare

What would you like to explore?`,
      };
    }

    return {
      text: `I see you have ${context.documents.length} document(s) uploaded: ${context.documents.map(d => d.name).join(', ')}.

**Note:** Running in demo mode. Add \`ANTHROPIC_API_KEY\` to enable full AI analysis.

I can help you:
- **Summarize** - "Summarize the main findings"
- **Visualize** - "Create a bar chart of the data"
- **Extract** - "What are the key metrics?"
- **Compare** - "Compare the values across categories"

What would you like to know about your documents?`,
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
