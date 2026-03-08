const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('parse_token', token);
    } else {
      localStorage.removeItem('parse_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('parse_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body && !(body instanceof FormData)) {
      config.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
      delete (config.headers as any)['Content-Type'];
      config.body = body;
    }

    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async register(email: string, password: string, name: string) {
    const data = await this.request<{ user: any; token: string; workspace: any }>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
    });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{ user: any; token: string; workspaces: any[] }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    this.setToken(data.token);
    return data;
  }

  async logout() {
    this.setToken(null);
  }

  async getMe() {
    return this.request<{ user: any; workspaces: any[] }>('/auth/me');
  }

  async updateProfile(data: { name?: string; avatar?: string }) {
    return this.request<{ user: any }>('/auth/profile', {
      method: 'PATCH',
      body: data,
    });
  }

  async completeOnboarding() {
    return this.request<{ success: boolean; user: any }>('/auth/complete-onboarding', {
      method: 'POST',
    });
  }

  // Password reset
  async forgotPassword(email: string) {
    return this.request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  }

  async verifyResetToken(token: string) {
    return this.request<{ valid: boolean; email: string }>(`/auth/verify-reset-token?token=${token}`);
  }

  async resetPassword(token: string, password: string) {
    return this.request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    });
  }

  // Email verification
  async sendVerificationEmail() {
    return this.request<{ success: boolean; message: string }>('/auth/send-verification', {
      method: 'POST',
    });
  }

  async verifyEmail(token: string) {
    return this.request<{ success: boolean; message: string }>('/auth/verify-email', {
      method: 'POST',
      body: { token },
    });
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  }

  // Documents
  async getDocuments(workspaceId?: string) {
    const query = workspaceId ? `?workspaceId=${workspaceId}` : '';
    return this.request<{ documents: any[] }>(`/documents${query}`);
  }

  async uploadDocument(file: File, workspaceId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (workspaceId) {
      formData.append('workspaceId', workspaceId);
    }
    return this.request<{ document: any }>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getDocument(id: string) {
    return this.request<{ document: any }>(`/documents/${id}`);
  }

  async getDocumentContent(id: string) {
    return this.request<{ content: string; metadata: any }>(`/documents/${id}/content`);
  }

  async deleteDocument(id: string) {
    return this.request<{ message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async downloadDocument(id: string, filename: string) {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/documents/${id}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    // Check if response is JSON (S3 signed URL) or binary (local file)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      // S3 download - get signed URL and redirect
      const data = await response.json();
      window.open(data.downloadUrl, '_blank');
    } else {
      // Local file download - create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  }

  // Analyses
  async getAnalyses(workspaceId?: string) {
    const query = workspaceId ? `?workspaceId=${workspaceId}` : '';
    return this.request<{ analyses: any[] }>(`/analyses${query}`);
  }

  async createAnalysis(data: { title?: string; description?: string; workspaceId?: string; documentIds?: string[] }) {
    return this.request<{ analysis: any }>('/analyses', {
      method: 'POST',
      body: data,
    });
  }

  async getAnalysis(id: string) {
    return this.request<{ analysis: any; userRole: string }>(`/analyses/${id}`);
  }

  async exportAnalysisPdf(id: string) {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/analyses/${id}/export/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export PDF');
    }

    return response.blob();
  }

  async sendMessage(analysisId: string, content: string) {
    return this.request<{ userMessage: any; assistantMessage: any; chart?: any }>(`/analyses/${analysisId}/messages`, {
      method: 'POST',
      body: { content },
    });
  }

  async addDocumentToAnalysis(analysisId: string, documentId: string) {
    return this.request<{ analysisDocument: any }>(`/analyses/${analysisId}/documents`, {
      method: 'POST',
      body: { documentId },
    });
  }

  async removeDocumentFromAnalysis(analysisId: string, documentId: string) {
    return this.request<{ message: string }>(`/analyses/${analysisId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  async updateAnalysis(id: string, data: { title?: string; description?: string; outputFormat?: string }) {
    return this.request<{ analysis: any }>(`/analyses/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteAnalysis(id: string) {
    return this.request<{ message: string }>(`/analyses/${id}`, {
      method: 'DELETE',
    });
  }

  // Charts
  async getCharts(params?: { workspaceId?: string; analysisId?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ charts: any[] }>(`/charts${query ? `?${query}` : ''}`);
  }

  async createChart(data: any) {
    return this.request<{ chart: any }>('/charts', {
      method: 'POST',
      body: data,
    });
  }

  async getChart(id: string) {
    return this.request<{ chart: any }>(`/charts/${id}`);
  }

  async updateChart(id: string, data: any) {
    return this.request<{ chart: any }>(`/charts/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async duplicateChart(id: string) {
    return this.request<{ chart: any }>(`/charts/${id}/duplicate`, {
      method: 'POST',
    });
  }

  async deleteChart(id: string) {
    return this.request<{ message: string }>(`/charts/${id}`, {
      method: 'DELETE',
    });
  }

  // Workspaces
  async getWorkspaces() {
    return this.request<{ workspaces: any[] }>('/workspaces');
  }

  async createWorkspace(data: { name: string; description?: string }) {
    return this.request<{ workspace: any }>('/workspaces', {
      method: 'POST',
      body: data,
    });
  }

  async getWorkspace(id: string) {
    return this.request<{ workspace: any; role: string }>(`/workspaces/${id}`);
  }

  async updateWorkspace(id: string, data: { name?: string; description?: string }) {
    return this.request<{ workspace: any }>(`/workspaces/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async inviteToWorkspace(workspaceId: string, email: string, role?: string) {
    return this.request<{ member?: any; invitation?: any; message: string }>(`/workspaces/${workspaceId}/invite`, {
      method: 'POST',
      body: { email, role },
    });
  }

  async acceptInvitation(token: string) {
    return this.request<{ membership: any }>(`/workspaces/invitations/${token}/accept`, {
      method: 'POST',
    });
  }

  async getInvitationByToken(token: string) {
    return this.request<{ invitation: any }>(`/workspaces/invitations/${token}`);
  }

  async getWorkspaceInvitations(workspaceId: string) {
    return this.request<{ invitations: any[] }>(`/workspaces/${workspaceId}/invitations`);
  }

  async resendInvitation(workspaceId: string, invitationId: string) {
    return this.request<{ invitation: any; message: string }>(`/workspaces/${workspaceId}/invitations/${invitationId}/resend`, {
      method: 'POST',
    });
  }

  async revokeInvitation(workspaceId: string, invitationId: string) {
    return this.request<{ message: string }>(`/workspaces/${workspaceId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  }

  async updateMemberRole(workspaceId: string, userId: string, role: string) {
    return this.request<{ message: string }>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'PATCH',
      body: { role },
    });
  }

  async removeMember(workspaceId: string, userId: string) {
    return this.request<{ message: string }>(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async getWorkspaceMembers(workspaceId: string) {
    return this.request<{ members: any[] }>(`/workspaces/${workspaceId}/members`);
  }

  async deleteWorkspace(id: string) {
    return this.request<{ message: string }>(`/workspaces/${id}`, {
      method: 'DELETE',
    });
  }

  // Settings
  async getBranding() {
    return this.request<{ branding: any }>('/settings/branding');
  }

  async updateBranding(data: {
    colors?: string[];
    font?: string;
    theme?: string;
    fontSize?: string;
    primaryColor?: string;
    accentColor?: string;
    textColor?: string;
    backgroundColor?: string;
    chartBackground?: string;
    logo?: string;
  }) {
    return this.request<{ branding: any }>('/settings/branding', {
      method: 'PATCH',
      body: data,
    });
  }

  async uploadLogo(file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    return this.request<{ logo: string }>('/settings/branding/logo', {
      method: 'POST',
      body: formData,
    });
  }

  async getFonts() {
    return this.request<{ fonts: any[] }>('/settings/fonts');
  }

  async getPalettes() {
    return this.request<{ palettes: any[] }>('/settings/palettes');
  }

  async getPreferences() {
    return this.request<{ preferences: any }>('/settings/preferences');
  }

  async updatePreferences(data: { theme?: string }) {
    return this.request<{ preferences: any }>('/settings/preferences', {
      method: 'PATCH',
      body: data,
    });
  }

  // Compare Sessions
  async getCompareSessions() {
    return this.request<{ sessions: any[] }>('/compare/sessions');
  }

  async createCompareSession(data: { title?: string; workspaceId?: string; items?: any[] }) {
    return this.request<{ session: any }>('/compare/sessions', {
      method: 'POST',
      body: data,
    });
  }

  async getCompareSession(id: string) {
    return this.request<{ session: any }>(`/compare/sessions/${id}`);
  }

  async addCompareItem(sessionId: string, item: { type: string; title: string; content?: string; data?: any; documentId?: string; chartId?: string }) {
    return this.request<{ item: any }>(`/compare/sessions/${sessionId}/items`, {
      method: 'POST',
      body: item,
    });
  }

  async removeCompareItem(sessionId: string, itemId: string) {
    return this.request<{ message: string }>(`/compare/sessions/${sessionId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async addCompareComment(sessionId: string, content: string, itemId?: string) {
    return this.request<{ comment: any }>(`/compare/sessions/${sessionId}/comments`, {
      method: 'POST',
      body: { content, itemId },
    });
  }

  async updateComment(commentId: string, content: string) {
    return this.request<{ comment: any }>(`/compare/comments/${commentId}`, {
      method: 'PATCH',
      body: { content },
    });
  }

  async deleteComment(commentId: string) {
    return this.request<{ message: string }>(`/compare/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  async deleteCompareSession(id: string) {
    return this.request<{ message: string }>(`/compare/sessions/${id}`, {
      method: 'DELETE',
    });
  }

  async fetchLinkMetadata(url: string) {
    return this.request<{ url: string; title: string; description: string; image: string; type: string }>('/compare/fetch-link', {
      method: 'POST',
      body: { url },
    });
  }

  // Message editing
  async updateMessage(analysisId: string, messageId: string, content: string) {
    return this.request<{ message: any }>(`/analyses/${analysisId}/messages/${messageId}`, {
      method: 'PATCH',
      body: { content },
    });
  }

  async updateMessageMetadata(analysisId: string, messageId: string, metadata: any) {
    return this.request<{ message: any }>(`/analyses/${analysisId}/messages/${messageId}/metadata`, {
      method: 'PATCH',
      body: { metadata },
    });
  }

  async addMessageComment(analysisId: string, messageId: string, content: string) {
    return this.request<{ comment: any }>(`/analyses/${analysisId}/messages/${messageId}/comments`, {
      method: 'POST',
      body: { content },
    });
  }

  async getMessageComments(analysisId: string, messageId: string) {
    return this.request<{ comments: any[] }>(`/analyses/${analysisId}/messages/${messageId}/comments`);
  }

  async updateMessageComment(analysisId: string, messageId: string, commentId: string, content: string) {
    return this.request<{ comment: any }>(`/analyses/${analysisId}/messages/${messageId}/comments/${commentId}`, {
      method: 'PATCH',
      body: { content },
    });
  }

  async deleteMessageComment(analysisId: string, messageId: string, commentId: string) {
    return this.request<{ message: string }>(`/analyses/${analysisId}/messages/${messageId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // Repositories
  async getRepositories() {
    return this.request<{ repositories: any[] }>('/repositories');
  }

  async createRepository(data: { name: string; description?: string; color?: string; icon?: string }) {
    return this.request<{ repository: any }>('/repositories', {
      method: 'POST',
      body: data,
    });
  }

  async getRepository(id: string) {
    return this.request<{ repository: any }>(`/repositories/${id}`);
  }

  async updateRepository(id: string, data: { name?: string; description?: string; color?: string; icon?: string }) {
    return this.request<{ repository: any }>(`/repositories/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteRepository(id: string) {
    return this.request<{ message: string }>(`/repositories/${id}`, {
      method: 'DELETE',
    });
  }

  async addAnalysisToRepository(repositoryId: string, analysisId: string) {
    return this.request<{ repositoryAnalysis: any }>(`/repositories/${repositoryId}/analyses`, {
      method: 'POST',
      body: { analysisId },
    });
  }

  async removeAnalysisFromRepository(repositoryId: string, analysisId: string) {
    return this.request<{ message: string }>(`/repositories/${repositoryId}/analyses/${analysisId}`, {
      method: 'DELETE',
    });
  }

  async addDocumentToRepository(repositoryId: string, documentId: string) {
    return this.request<{ repositoryDocument: any }>(`/repositories/${repositoryId}/documents`, {
      method: 'POST',
      body: { documentId },
    });
  }

  async removeDocumentFromRepository(repositoryId: string, documentId: string) {
    return this.request<{ message: string }>(`/repositories/${repositoryId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  async addComparisonToRepository(repositoryId: string, comparisonId: string) {
    return this.request<{ repositoryComparison: any }>(`/repositories/${repositoryId}/comparisons`, {
      method: 'POST',
      body: { comparisonId },
    });
  }

  async removeComparisonFromRepository(repositoryId: string, comparisonId: string) {
    return this.request<{ message: string }>(`/repositories/${repositoryId}/comparisons/${comparisonId}`, {
      method: 'DELETE',
    });
  }

  // Search
  async search(
    query: string,
    options?: {
      types?: string[];
      limit?: number;
      offset?: number;
      dateFrom?: Date;
      dateTo?: Date;
      workspaceId?: string;
      includeContent?: boolean;
    }
  ) {
    const params = new URLSearchParams({ q: query });
    if (options?.types?.length) params.set('types', options.types.join(','));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.dateFrom) params.set('dateFrom', options.dateFrom.toISOString());
    if (options?.dateTo) params.set('dateTo', options.dateTo.toISOString());
    if (options?.workspaceId) params.set('workspaceId', options.workspaceId);
    if (options?.includeContent !== undefined) params.set('includeContent', String(options.includeContent));

    return this.request<{
      results: Array<{
        id: string;
        type: 'analysis' | 'document' | 'repository' | 'experiment' | 'chart' | 'template';
        title: string;
        subtitle?: string;
        content?: string;
        highlights?: Array<{ field: string; snippet: string }>;
        score: number;
        url: string;
        updatedAt?: string;
        createdAt?: string;
      }>;
      totalCount: number;
      fromCache: boolean;
      duration: number;
      searchQueryId: string;
    }>(`/search?${params.toString()}`);
  }

  async getSearchSuggestions(query: string, limit?: number) {
    const params = new URLSearchParams({ q: query });
    if (limit) params.set('limit', String(limit));

    return this.request<{
      suggestions: Array<{
        text: string;
        type: 'recent' | 'popular' | 'autocomplete';
        count?: number;
      }>;
    }>(`/search/suggestions?${params.toString()}`);
  }

  async recordSearchClick(searchQueryId: string, resultId: string, resultType: string) {
    return this.request<{ success: boolean }>('/search/click', {
      method: 'POST',
      body: { searchQueryId, resultId, resultType },
    });
  }

  async getSearchAnalytics(days?: number) {
    const params = new URLSearchParams();
    if (days) params.set('days', String(days));
    const queryString = params.toString();

    return this.request<{
      analytics: {
        totalSearches: number;
        uniqueQueries: number;
        averageResultCount: number;
        clickThroughRate: number;
        topQueries: Array<{ query: string; count: number; clickRate: number }>;
        searchesByDay: Array<{ date: string; count: number }>;
        resultTypeDistribution: Record<string, number>;
        noResultQueries: Array<{ query: string; count: number }>;
      };
    }>(`/search/analytics${queryString ? `?${queryString}` : ''}`);
  }

  // Notifications
  async getNotifications() {
    return this.request<{
      notifications: Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        read: boolean;
        createdAt: string;
        analysisId?: string;
        messageId?: string;
        workspaceId?: string;
        commentId?: string;
        actorId?: string;
        actorName?: string;
      }>;
      unreadCount: number;
    }>('/notifications');
  }

  async markNotificationRead(notificationId: string) {
    return this.request<{ notification: any }>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ message: string }>('/notifications/read-all', {
      method: 'PATCH',
    });
  }

  async deleteNotification(notificationId: string) {
    return this.request<{ message: string }>(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  // Templates
  async getTemplates() {
    return this.request<{ templates: any[] }>('/templates');
  }

  async getTemplate(id: string) {
    return this.request<{ template: any }>(`/templates/${id}`);
  }

  async createTemplate(data: {
    name: string;
    description?: string;
    workspaceId?: string;
    isPublic?: boolean;
    sections?: Array<{
      type: string;
      content?: any;
      position?: number;
      width?: string;
      chartId?: string;
    }>;
  }) {
    return this.request<{ template: any }>('/templates', {
      method: 'POST',
      body: data,
    });
  }

  async updateTemplate(
    id: string,
    data: {
      name?: string;
      description?: string;
      isPublic?: boolean;
      sections?: Array<{
        type: string;
        content?: any;
        position?: number;
        width?: string;
        chartId?: string;
      }>;
    }
  ) {
    return this.request<{ template: any }>(`/templates/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteTemplate(id: string) {
    return this.request<{ message: string }>(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  async duplicateTemplate(id: string) {
    return this.request<{ template: any }>(`/templates/${id}/duplicate`, {
      method: 'POST',
    });
  }

  async addTemplateSection(
    templateId: string,
    section: { type: string; content?: any; position?: number; width?: string; chartId?: string }
  ) {
    return this.request<{ section: any }>(`/templates/${templateId}/sections`, {
      method: 'POST',
      body: section,
    });
  }

  async updateTemplateSection(templateId: string, sectionId: string, data: any) {
    return this.request<{ section: any }>(`/templates/${templateId}/sections/${sectionId}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteTemplateSection(templateId: string, sectionId: string) {
    return this.request<{ message: string }>(`/templates/${templateId}/sections/${sectionId}`, {
      method: 'DELETE',
    });
  }

  async reorderTemplateSections(templateId: string, sectionIds: string[]) {
    return this.request<{ sections: any[] }>(`/templates/${templateId}/sections/reorder`, {
      method: 'PUT',
      body: { sectionIds },
    });
  }

  // Chart Annotations
  async getChartAnnotations(chartId: string) {
    return this.request<{ annotations: any[] }>(`/annotations/charts/${chartId}`);
  }

  async createChartAnnotation(
    chartId: string,
    data: {
      content: string;
      dataIndex?: number;
      dataKey?: string;
      x?: number;
      y?: number;
      color?: string;
    }
  ) {
    return this.request<{ annotation: any }>(`/annotations/charts/${chartId}`, {
      method: 'POST',
      body: data,
    });
  }

  async updateChartAnnotation(annotationId: string, data: { content?: string; color?: string }) {
    return this.request<{ annotation: any }>(`/annotations/${annotationId}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteChartAnnotation(annotationId: string) {
    return this.request<{ message: string }>(`/annotations/${annotationId}`, {
      method: 'DELETE',
    });
  }

  // Semantic Analysis
  async getDocumentInsights(documentId: string) {
    return this.request<{
      insights: {
        themes: any[];
        entities: any[];
        keyphrases: any[];
        sentiment: any;
        summary: any;
      };
      documentName: string;
    }>(`/semantics/documents/${documentId}`);
  }

  async analyzeDocument(documentId: string, analysisId?: string) {
    return this.request<{
      insights: {
        themes: any[];
        entities: any[];
        keyphrases: any[];
        sentiment: any;
        summary: any;
      };
      documentName: string;
    }>(`/semantics/documents/${documentId}/analyze`, {
      method: 'POST',
      body: { analysisId },
    });
  }

  async getAnalysisInsights(analysisId: string) {
    return this.request<{
      insights: {
        themes: any[];
        entities: any[];
        keyphrases: any[];
        sentiments: any[];
        summaries: any[];
      };
      aggregated: {
        themes: Array<{ label: string; count: number; confidence: number; contexts: string[] }>;
        documentCount: number;
      };
      documents: Array<{ id: string; name: string }>;
    }>(`/semantics/analyses/${analysisId}`);
  }

  async analyzeAllDocuments(analysisId: string) {
    return this.request<{
      results: Array<{ documentId: string; documentName: string; result: any }>;
      documentsAnalyzed: number;
    }>(`/semantics/analyses/${analysisId}/analyze`, {
      method: 'POST',
    });
  }

  async getInsightsDashboard(workspaceId?: string) {
    const params = workspaceId ? `?workspaceId=${workspaceId}` : '';
    return this.request<{
      sentiments: { positive: number; negative: number; neutral: number; mixed: number };
      themes: Array<{ label: string; count: number; confidence: number }>;
      entities: Array<{ type: string; count: number; unique: number; examples: string[] }>;
      keyphrases: Array<{ label: string; frequency: number }>;
      timeline: Array<{
        date: string;
        analyzed: number;
        sentiments: { positive: number; negative: number; neutral: number; mixed: number };
      }>;
      totalDocuments: number;
      analyzedDocuments: number;
    }>(`/semantics/dashboard${params}`);
  }

  // Semantic Search
  async semanticSearch(
    query: string,
    options?: { workspaceId?: string; limit?: number; includeUnanalyzed?: boolean }
  ) {
    const params = new URLSearchParams({ q: query });
    if (options?.workspaceId) params.set('workspaceId', options.workspaceId);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.includeUnanalyzed !== undefined) {
      params.set('includeUnanalyzed', String(options.includeUnanalyzed));
    }

    return this.request<{
      results: Array<{
        id: string;
        type: 'document' | 'insight';
        documentId: string;
        documentName: string;
        title: string;
        snippet: string;
        relevanceScore: number;
        matchType: 'semantic' | 'keyword' | 'theme' | 'entity' | 'keyphrase';
        metadata?: {
          themes?: string[];
          entities?: string[];
          sentiment?: string;
        };
      }>;
      query: {
        original: string;
        expanded: string[];
        intent: string;
        entities: string[];
        themes: string[];
      };
      totalMatches: number;
    }>(`/semantics/search?${params.toString()}`);
  }

  async findSimilarDocuments(documentId: string, options?: { workspaceId?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (options?.workspaceId) params.set('workspaceId', options.workspaceId);
    if (options?.limit) params.set('limit', String(options.limit));

    const queryString = params.toString();
    return this.request<{
      similar: Array<{
        id: string;
        type: 'document';
        documentId: string;
        documentName: string;
        title: string;
        snippet: string;
        relevanceScore: number;
        matchType: string;
        metadata?: {
          themes?: string[];
          entities?: string[];
          sentiment?: string;
        };
      }>;
    }>(`/semantics/documents/${documentId}/similar${queryString ? `?${queryString}` : ''}`);
  }

  async searchWithinDocument(documentId: string, query: string) {
    return this.request<{
      matches: Array<{
        type: 'content' | 'theme' | 'entity' | 'keyphrase';
        text: string;
        context?: string;
        position?: number;
      }>;
      documentName: string;
    }>(`/semantics/documents/${documentId}/search?q=${encodeURIComponent(query)}`);
  }

  // Smart Highlights
  async getDocumentHighlights(documentId: string) {
    return this.request<{
      highlights: Array<{
        id: string;
        type: string;
        text: string;
        startOffset: number;
        endOffset: number;
        importance: string;
        category?: string;
        explanation?: string;
        confidence?: number;
        isUserAdded: boolean;
        createdAt: string;
        createdBy?: { id: string; name: string };
      }>;
      stats: {
        total: number;
        aiGenerated: number;
        userAdded: number;
        byType: Record<string, number>;
        byImportance: Record<string, number>;
        byCategory: Record<string, number>;
      };
      documentName: string;
    }>(`/highlights/documents/${documentId}`);
  }

  async extractHighlights(documentId: string) {
    return this.request<{
      highlights: Array<{
        type: string;
        text: string;
        startOffset: number;
        endOffset: number;
        importance: string;
        category?: string;
        explanation?: string;
        confidence?: number;
      }>;
      summary: string;
      documentName: string;
    }>(`/highlights/documents/${documentId}/extract`, {
      method: 'POST',
    });
  }

  async addHighlight(
    documentId: string,
    data: {
      text: string;
      startOffset: number;
      endOffset: number;
      type?: string;
      importance?: string;
      category?: string;
      explanation?: string;
    }
  ) {
    return this.request<{
      highlight: {
        id: string;
        type: string;
        text: string;
        startOffset: number;
        endOffset: number;
        importance: string;
        category?: string;
        explanation?: string;
        isUserAdded: boolean;
        createdBy?: { id: string; name: string };
      };
    }>(`/highlights/documents/${documentId}`, {
      method: 'POST',
      body: data,
    });
  }

  async updateHighlight(
    highlightId: string,
    data: { type?: string; importance?: string; category?: string; explanation?: string }
  ) {
    return this.request<{ highlight: any }>(`/highlights/${highlightId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteHighlight(highlightId: string) {
    return this.request<{ message: string }>(`/highlights/${highlightId}`, {
      method: 'DELETE',
    });
  }

  // Version History
  async getVersionHistory(analysisId: string, options?: { limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    const queryString = params.toString();

    return this.request<{
      versions: Array<{
        id: string;
        version: number;
        title: string;
        changeType: string;
        changeSummary: string;
        createdAt: string;
        createdBy: { id: string; name: string; avatar?: string };
      }>;
      total: number;
      hasMore: boolean;
    }>(`/versions/analyses/${analysisId}${queryString ? `?${queryString}` : ''}`);
  }

  async getVersion(versionId: string) {
    return this.request<{
      version: {
        id: string;
        version: number;
        title: string;
        description?: string;
        changeType: string;
        changeSummary: string;
        createdAt: string;
        createdBy: { id: string; name: string; avatar?: string };
        snapshot: {
          title: string;
          description: string | null;
          messages: Array<{
            id: string;
            role: string;
            content: string;
            metadata: string | null;
            createdAt: string;
          }>;
          documents: Array<{ id: string; name: string; type: string }>;
          charts: Array<{ id: string; title: string; type: string }>;
        };
      };
    }>(`/versions/${versionId}`);
  }

  async compareVersions(versionId1: string, versionId2: string) {
    return this.request<{
      version1: { id: string; version: number; createdAt: string; createdBy: any };
      version2: { id: string; version: number; createdAt: string; createdBy: any };
      changes: Array<{
        type: 'added' | 'removed' | 'modified';
        category: 'message' | 'document' | 'chart' | 'metadata';
        description: string;
        before?: any;
        after?: any;
      }>;
      summary: { added: number; removed: number; modified: number };
    }>(`/versions/compare/${versionId1}/${versionId2}`);
  }

  async restoreVersion(analysisId: string, versionId: string) {
    return this.request<{ message: string }>(`/versions/analyses/${analysisId}/restore/${versionId}`, {
      method: 'POST',
    });
  }

  async getVersionStats(analysisId: string) {
    return this.request<{
      totalVersions: number;
      byChangeType: Record<string, number>;
      byDate: Record<string, number>;
      firstVersion: string | null;
      latestVersion: string | null;
    }>(`/versions/analyses/${analysisId}/stats`);
  }

  // Knowledge Graphs
  async getKnowledgeGraphs(options?: { workspaceId?: string; analysisId?: string }) {
    const params = new URLSearchParams();
    if (options?.workspaceId) params.set('workspaceId', options.workspaceId);
    if (options?.analysisId) params.set('analysisId', options.analysisId);
    const queryString = params.toString();

    return this.request<{
      graphs: Array<{
        id: string;
        name: string;
        description?: string;
        createdAt: string;
        updatedAt: string;
        _count: { nodes: number; edges: number };
        createdBy: { id: string; name: string };
      }>;
    }>(`/knowledge-graphs${queryString ? `?${queryString}` : ''}`);
  }

  async getKnowledgeGraph(graphId: string) {
    return this.request<{
      graph: {
        id: string;
        name: string;
        description?: string;
        nodes: Array<{
          id: string;
          label: string;
          type: string;
          properties?: string;
          x?: number;
          y?: number;
          color?: string;
          size: number;
        }>;
        edges: Array<{
          id: string;
          label: string;
          weight: number;
          sourceId: string;
          targetId: string;
          source: { id: string; label: string };
          target: { id: string; label: string };
        }>;
        createdBy: { id: string; name: string };
      };
    }>(`/knowledge-graphs/${graphId}`);
  }

  async createKnowledgeGraph(data: {
    name: string;
    description?: string;
    workspaceId?: string;
    analysisId?: string;
  }) {
    return this.request<{ graph: any }>('/knowledge-graphs', {
      method: 'POST',
      body: data,
    });
  }

  async buildGraphFromDocument(documentId: string, name?: string) {
    return this.request<{ graph: any }>(`/knowledge-graphs/from-document/${documentId}`, {
      method: 'POST',
      body: { name },
    });
  }

  async addGraphNode(graphId: string, data: {
    label: string;
    type: string;
    x?: number;
    y?: number;
    color?: string;
    properties?: Record<string, any>;
  }) {
    return this.request<{ node: any }>(`/knowledge-graphs/${graphId}/nodes`, {
      method: 'POST',
      body: data,
    });
  }

  async updateGraphNode(nodeId: string, data: {
    label?: string;
    type?: string;
    color?: string;
    size?: number;
    properties?: Record<string, any>;
  }) {
    return this.request<{ node: any }>(`/knowledge-graphs/nodes/${nodeId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async updateNodePosition(nodeId: string, x: number, y: number) {
    return this.request<{ node: any }>(`/knowledge-graphs/nodes/${nodeId}/position`, {
      method: 'PATCH',
      body: { x, y },
    });
  }

  async deleteGraphNode(nodeId: string) {
    return this.request<{ message: string }>(`/knowledge-graphs/nodes/${nodeId}`, {
      method: 'DELETE',
    });
  }

  async addGraphEdge(graphId: string, data: {
    sourceId: string;
    targetId: string;
    label: string;
    weight?: number;
  }) {
    return this.request<{ edge: any }>(`/knowledge-graphs/${graphId}/edges`, {
      method: 'POST',
      body: data,
    });
  }

  async deleteGraphEdge(edgeId: string) {
    return this.request<{ message: string }>(`/knowledge-graphs/edges/${edgeId}`, {
      method: 'DELETE',
    });
  }

  async deleteKnowledgeGraph(graphId: string) {
    return this.request<{ message: string }>(`/knowledge-graphs/${graphId}`, {
      method: 'DELETE',
    });
  }

  // Data Tables
  async getDataTables(options?: { workspaceId?: string; analysisId?: string }) {
    const params = new URLSearchParams();
    if (options?.workspaceId) params.set('workspaceId', options.workspaceId);
    if (options?.analysisId) params.set('analysisId', options.analysisId);
    const queryString = params.toString();

    return this.request<{
      tables: Array<{
        id: string;
        name: string;
        description?: string;
        columns: Array<{ name: string; type: string; formula?: string }>;
        rowCount: number;
        createdAt: string;
        updatedAt: string;
        createdBy: { id: string; name: string };
      }>;
    }>(`/data-tables${queryString ? `?${queryString}` : ''}`);
  }

  async getDataTable(tableId: string) {
    return this.request<{
      table: {
        id: string;
        name: string;
        description?: string;
        columns: Array<{ name: string; type: string; formula?: string; width?: number }>;
        data: any[][];
        calculatedData: any[][];
        config?: {
          sortColumn?: string;
          sortDirection?: 'asc' | 'desc';
          frozenColumns?: number;
        };
        createdBy: { id: string; name: string };
      };
    }>(`/data-tables/${tableId}`);
  }

  async createDataTable(data: {
    name: string;
    description?: string;
    columns: Array<{ name: string; type: string; formula?: string }>;
    data?: any[][];
    workspaceId?: string;
    analysisId?: string;
  }) {
    return this.request<{ table: any }>('/data-tables', {
      method: 'POST',
      body: data,
    });
  }

  async createTableFromDocument(documentId: string, name?: string) {
    return this.request<{ table: any }>(`/data-tables/from-document/${documentId}`, {
      method: 'POST',
      body: { name },
    });
  }

  async updateTableData(tableId: string, data: any[][]) {
    return this.request<{ table: any }>(`/data-tables/${tableId}/data`, {
      method: 'PATCH',
      body: { data },
    });
  }

  async updateTableColumns(tableId: string, columns: Array<{ name: string; type: string; formula?: string }>) {
    return this.request<{ table: any }>(`/data-tables/${tableId}/columns`, {
      method: 'PATCH',
      body: { columns },
    });
  }

  async addTableRow(tableId: string, rowData?: any[]) {
    return this.request<{ table: any }>(`/data-tables/${tableId}/rows`, {
      method: 'POST',
      body: { data: rowData },
    });
  }

  async deleteTableRow(tableId: string, rowIndex: number) {
    return this.request<{ table: any }>(`/data-tables/${tableId}/rows/${rowIndex}`, {
      method: 'DELETE',
    });
  }

  async addTableColumn(tableId: string, column: { name: string; type: string; formula?: string }, position?: number) {
    return this.request<{ table: any }>(`/data-tables/${tableId}/columns`, {
      method: 'POST',
      body: { column, position },
    });
  }

  async deleteTableColumn(tableId: string, columnIndex: number) {
    return this.request<{ table: any }>(`/data-tables/${tableId}/columns/${columnIndex}`, {
      method: 'DELETE',
    });
  }

  async exportTableCSV(tableId: string): Promise<Blob> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/data-tables/${tableId}/export/csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.blob();
  }

  async deleteDataTable(tableId: string) {
    return this.request<{ message: string }>(`/data-tables/${tableId}`, {
      method: 'DELETE',
    });
  }

  // Timelines
  async getTimelines(options?: { workspaceId?: string; analysisId?: string }) {
    const params = new URLSearchParams();
    if (options?.workspaceId) params.set('workspaceId', options.workspaceId);
    if (options?.analysisId) params.set('analysisId', options.analysisId);
    const queryString = params.toString();

    return this.request<{
      timelines: Array<{
        id: string;
        name: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        _count: { events: number };
        createdAt: string;
        updatedAt: string;
        createdBy: { id: string; name: string };
      }>;
    }>(`/timelines${queryString ? `?${queryString}` : ''}`);
  }

  async getTimeline(timelineId: string) {
    return this.request<{
      timeline: {
        id: string;
        name: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        events: Array<{
          id: string;
          title: string;
          description?: string;
          date: string;
          endDate?: string;
          type: string;
          category?: string;
          color?: string;
          icon?: string;
          importance: string;
          metadata?: string;
        }>;
        createdBy: { id: string; name: string };
      };
    }>(`/timelines/${timelineId}`);
  }

  async createTimeline(data: {
    name: string;
    description?: string;
    workspaceId?: string;
    analysisId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.request<{ timeline: any }>('/timelines', {
      method: 'POST',
      body: data,
    });
  }

  async buildTimelineFromDocument(documentId: string, name?: string) {
    return this.request<{ timeline: any }>(`/timelines/from-document/${documentId}`, {
      method: 'POST',
      body: { name },
    });
  }

  async addTimelineEvent(timelineId: string, event: {
    title: string;
    description?: string;
    date: string;
    endDate?: string;
    type?: string;
    category?: string;
    color?: string;
    icon?: string;
    importance?: string;
    metadata?: Record<string, any>;
  }) {
    return this.request<{ event: any }>(`/timelines/${timelineId}/events`, {
      method: 'POST',
      body: event,
    });
  }

  async updateTimelineEvent(eventId: string, data: {
    title?: string;
    description?: string;
    date?: string;
    endDate?: string;
    type?: string;
    category?: string;
    color?: string;
    importance?: string;
  }) {
    return this.request<{ event: any }>(`/timelines/events/${eventId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteTimelineEvent(eventId: string) {
    return this.request<{ message: string }>(`/timelines/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  async deleteTimeline(timelineId: string) {
    return this.request<{ message: string }>(`/timelines/${timelineId}`, {
      method: 'DELETE',
    });
  }

  // Media Files (Audio/Video)
  async getMediaFiles(options?: { workspaceId?: string; analysisId?: string; type?: 'audio' | 'video' }) {
    const params = new URLSearchParams();
    if (options?.workspaceId) params.set('workspaceId', options.workspaceId);
    if (options?.analysisId) params.set('analysisId', options.analysisId);
    if (options?.type) params.set('type', options.type);
    const queryString = params.toString();

    return this.request<{
      files: Array<{
        id: string;
        name: string;
        type: 'audio' | 'video';
        mimeType: string;
        size: number;
        duration?: number;
        transcriptionStatus: string;
        _count: { segments: number };
        createdAt: string;
        uploadedBy: { id: string; name: string };
      }>;
    }>(`/media${queryString ? `?${queryString}` : ''}`);
  }

  async getMediaFile(mediaId: string) {
    return this.request<{
      media: {
        id: string;
        name: string;
        type: 'audio' | 'video';
        mimeType: string;
        size: number;
        path: string;
        duration?: number;
        transcriptionStatus: string;
        transcription?: string;
        segments: Array<{
          id: string;
          startTime: number;
          endTime: number;
          text: string;
          speaker?: string;
          confidence?: number;
          isEdited: boolean;
          notes?: string;
        }>;
        uploadedBy: { id: string; name: string };
      };
    }>(`/media/${mediaId}`);
  }

  async uploadMedia(file: File, options?: { workspaceId?: string; analysisId?: string; duration?: number }) {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.workspaceId) formData.append('workspaceId', options.workspaceId);
    if (options?.analysisId) formData.append('analysisId', options.analysisId);
    if (options?.duration) formData.append('duration', String(options.duration));

    return this.request<{ media: any }>('/media/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async startTranscription(mediaId: string) {
    return this.request<{ status: string; message: string }>(`/media/${mediaId}/transcribe`, {
      method: 'POST',
    });
  }

  async getTranscription(mediaId: string) {
    return this.request<{
      status: string;
      transcription?: string;
      segments: Array<{
        id: string;
        startTime: number;
        endTime: number;
        text: string;
        speaker?: string;
        confidence?: number;
      }>;
      meta?: {
        wordCount: number;
        segmentCount: number;
        speakers: string[];
      };
    }>(`/media/${mediaId}/transcription`);
  }

  async searchTranscription(mediaId: string, query: string) {
    return this.request<{
      segments: Array<{
        id: string;
        startTime: number;
        endTime: number;
        text: string;
        speaker?: string;
      }>;
      matches: number;
    }>(`/media/${mediaId}/search?q=${encodeURIComponent(query)}`);
  }

  async analyzeTranscript(mediaId: string) {
    return this.request<{
      analysis: {
        summary: string;
        topics: string[];
        keyPoints: string[];
        actionItems: string[];
        sentiment: string;
      };
    }>(`/media/${mediaId}/analyze`);
  }

  async updateMediaSegment(segmentId: string, data: {
    text?: string;
    speaker?: string;
    notes?: string;
    tags?: string[];
  }) {
    return this.request<{ segment: any }>(`/media/segments/${segmentId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async addMediaSegment(mediaId: string, segment: {
    startTime: number;
    endTime: number;
    text: string;
    speaker?: string;
  }) {
    return this.request<{ segment: any }>(`/media/${mediaId}/segments`, {
      method: 'POST',
      body: segment,
    });
  }

  async deleteMediaSegment(segmentId: string) {
    return this.request<{ message: string }>(`/media/segments/${segmentId}`, {
      method: 'DELETE',
    });
  }

  async deleteMediaFile(mediaId: string) {
    return this.request<{ message: string }>(`/media/${mediaId}`, {
      method: 'DELETE',
    });
  }

  // ============ EXPERIMENTS (Design of Experiments) ============

  async getExperiments(options?: { workspaceId?: string; status?: string; type?: string }) {
    const params = new URLSearchParams();
    if (options?.workspaceId) params.set('workspaceId', options.workspaceId);
    if (options?.status) params.set('status', options.status);
    if (options?.type) params.set('type', options.type);
    const queryString = params.toString();

    return this.request<{
      experiments: Array<{
        id: string;
        name: string;
        description?: string;
        hypothesis?: string;
        type: 'ab_test' | 'full_factorial' | 'parameter_matrix' | 'custom';
        status: 'draft' | 'running' | 'paused' | 'completed';
        confidenceLevel: number;
        startedAt?: string;
        completedAt?: string;
        createdAt: string;
        updatedAt: string;
        createdBy: { id: string; name: string; avatar?: string };
        _count: { factors: number; variations: number; runs: number; results: number; metrics: number };
      }>;
    }>(`/experiments${queryString ? `?${queryString}` : ''}`);
  }

  async createExperiment(data: {
    name: string;
    description?: string;
    hypothesis?: string;
    type: 'ab_test' | 'full_factorial' | 'parameter_matrix' | 'custom';
    confidenceLevel?: number;
    workspaceId?: string;
    analysisId?: string;
  }) {
    return this.request<{ experiment: any }>('/experiments', {
      method: 'POST',
      body: data,
    });
  }

  async getExperiment(id: string) {
    return this.request<{
      experiment: {
        id: string;
        name: string;
        description?: string;
        hypothesis?: string;
        type: string;
        status: string;
        confidenceLevel: number;
        startedAt?: string;
        completedAt?: string;
        conclusion?: string;
        resultSummary?: string;
        createdAt: string;
        updatedAt: string;
        createdBy: { id: string; name: string; avatar?: string };
        factors: Array<{
          id: string;
          name: string;
          type: string;
          unit?: string;
          description?: string;
          levels?: string;
          levelValues: Array<{ id: string; value: string; label?: string; isControl: boolean }>;
        }>;
        variations: Array<{
          id: string;
          name: string;
          description?: string;
          isControl: boolean;
          factorValues: string;
          trafficWeight?: number;
        }>;
        metrics: Array<{
          id: string;
          name: string;
          type: string;
          unit?: string;
          isPrimary: boolean;
          higherIsBetter: boolean;
          baselineValue?: number;
          targetValue?: number;
        }>;
        runs: Array<{
          id: string;
          runNumber: number;
          status: string;
          startedAt?: string;
          completedAt?: string;
          notes?: string;
          variation: { id: string; name: string };
        }>;
        results: Array<{
          id: string;
          value: number;
          sampleSize: number;
          standardError?: number;
          measuredAt: string;
          variation: { id: string; name: string };
          metric: { id: string; name: string; unit?: string };
        }>;
      };
    }>(`/experiments/${id}`);
  }

  async updateExperiment(id: string, data: {
    name?: string;
    description?: string;
    hypothesis?: string;
    confidenceLevel?: number;
    conclusion?: string;
  }) {
    return this.request<{ experiment: any }>(`/experiments/${id}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteExperiment(id: string) {
    return this.request<{ message: string }>(`/experiments/${id}`, {
      method: 'DELETE',
    });
  }

  async startExperiment(id: string) {
    return this.request<{ experiment: any }>(`/experiments/${id}/start`, {
      method: 'POST',
    });
  }

  async pauseExperiment(id: string) {
    return this.request<{ experiment: any }>(`/experiments/${id}/pause`, {
      method: 'POST',
    });
  }

  async completeExperiment(id: string, conclusion?: string) {
    return this.request<{ experiment: any; summary: any }>(`/experiments/${id}/complete`, {
      method: 'POST',
      body: { conclusion },
    });
  }

  // Factors
  async addExperimentFactor(experimentId: string, data: {
    name: string;
    type?: string;
    unit?: string;
    description?: string;
    minValue?: number;
    maxValue?: number;
    levels?: string[];
  }) {
    return this.request<{ factor: any }>(`/experiments/${experimentId}/factors`, {
      method: 'POST',
      body: data,
    });
  }

  async updateExperimentFactor(experimentId: string, factorId: string, data: {
    name?: string;
    type?: string;
    unit?: string;
    description?: string;
    levels?: string[];
  }) {
    return this.request<{ factor: any }>(`/experiments/${experimentId}/factors/${factorId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteExperimentFactor(experimentId: string, factorId: string) {
    return this.request<{ message: string }>(`/experiments/${experimentId}/factors/${factorId}`, {
      method: 'DELETE',
    });
  }

  async addFactorLevel(experimentId: string, factorId: string, data: {
    value: string;
    label?: string;
    isControl?: boolean;
  }) {
    return this.request<{ level: any }>(`/experiments/${experimentId}/factors/${factorId}/levels`, {
      method: 'POST',
      body: data,
    });
  }

  // Variations
  async addExperimentVariation(experimentId: string, data: {
    name: string;
    description?: string;
    isControl?: boolean;
    factorValues?: Record<string, string>;
    trafficWeight?: number;
  }) {
    return this.request<{ variation: any }>(`/experiments/${experimentId}/variations`, {
      method: 'POST',
      body: data,
    });
  }

  async generateExperimentVariations(experimentId: string) {
    return this.request<{ variations: any[]; count: number }>(`/experiments/${experimentId}/variations/generate`, {
      method: 'POST',
    });
  }

  async updateExperimentVariation(experimentId: string, variationId: string, data: {
    name?: string;
    description?: string;
    isControl?: boolean;
    trafficWeight?: number;
  }) {
    return this.request<{ variation: any }>(`/experiments/${experimentId}/variations/${variationId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteExperimentVariation(experimentId: string, variationId: string) {
    return this.request<{ message: string }>(`/experiments/${experimentId}/variations/${variationId}`, {
      method: 'DELETE',
    });
  }

  // Metrics
  async addExperimentMetric(experimentId: string, data: {
    name: string;
    type?: string;
    unit?: string;
    isPrimary?: boolean;
    higherIsBetter?: boolean;
    baselineValue?: number;
    targetValue?: number;
  }) {
    return this.request<{ metric: any }>(`/experiments/${experimentId}/metrics`, {
      method: 'POST',
      body: data,
    });
  }

  async updateExperimentMetric(experimentId: string, metricId: string, data: {
    name?: string;
    type?: string;
    unit?: string;
    isPrimary?: boolean;
    higherIsBetter?: boolean;
    baselineValue?: number;
    targetValue?: number;
  }) {
    return this.request<{ metric: any }>(`/experiments/${experimentId}/metrics/${metricId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async deleteExperimentMetric(experimentId: string, metricId: string) {
    return this.request<{ message: string }>(`/experiments/${experimentId}/metrics/${metricId}`, {
      method: 'DELETE',
    });
  }

  // Runs
  async createExperimentRun(experimentId: string, variationId: string, data?: {
    inputParams?: Record<string, any>;
    notes?: string;
  }) {
    return this.request<{ run: any }>(`/experiments/${experimentId}/runs`, {
      method: 'POST',
      body: { variationId, ...data },
    });
  }

  async updateExperimentRun(experimentId: string, runId: string, data: {
    status?: string;
    notes?: string;
    startedAt?: string;
    completedAt?: string;
    duration?: number;
  }) {
    return this.request<{ run: any }>(`/experiments/${experimentId}/runs/${runId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async completeExperimentRun(experimentId: string, runId: string, data: {
    results: Array<{ metricId: string; value: number; rawValue?: string; sampleSize?: number; standardError?: number }>;
    notes?: string;
  }) {
    return this.request<{ run: any; results: any[] }>(`/experiments/${experimentId}/runs/${runId}/complete`, {
      method: 'POST',
      body: data,
    });
  }

  // Results
  async recordExperimentResult(experimentId: string, data: {
    variationId: string;
    metricId: string;
    value: number;
    rawValue?: string;
    sampleSize?: number;
    standardError?: number;
    runId?: string;
  }) {
    return this.request<{ result: any }>(`/experiments/${experimentId}/results`, {
      method: 'POST',
      body: data,
    });
  }

  async recordExperimentResultsBulk(experimentId: string, results: Array<{
    variationId: string;
    metricId: string;
    value: number;
    rawValue?: string;
    sampleSize?: number;
    standardError?: number;
    runId?: string;
  }>) {
    return this.request<{ results: any[]; count: number }>(`/experiments/${experimentId}/results/bulk`, {
      method: 'POST',
      body: { results },
    });
  }

  async deleteExperimentResult(experimentId: string, resultId: string) {
    return this.request<{ message: string }>(`/experiments/${experimentId}/results/${resultId}`, {
      method: 'DELETE',
    });
  }

  // Statistics
  async getExperimentStatistics(experimentId: string) {
    return this.request<{
      descriptive: Record<string, Record<string, {
        mean: number;
        median: number;
        standardDeviation: number;
        variance: number;
        sampleSize: number;
        min: number;
        max: number;
        standardError: number;
        confidenceInterval: { lower: number; upper: number };
      }>>;
      hypothesisTests: Record<string, {
        testType: string;
        statistic: number;
        pValue: number;
        degreesOfFreedom?: number;
        significant: boolean;
        effectSize?: number;
        interpretation: string;
        confidenceLevel: number;
        effectSizeInterpretation: string;
        variations: Array<{ id: string; name: string; isControl: boolean }>;
      }>;
      powerAnalysis?: {
        requiredSampleSize: number;
        achievedPower: number;
        effectSize: number;
        alpha: number;
      };
      totalResults: number;
      variationCount: number;
      metricCount: number;
    }>(`/experiments/${experimentId}/statistics`);
  }

  async calculateExperimentPower(experimentId: string, data: {
    effectSize?: number;
    desiredPower?: number;
    alpha?: number;
  }) {
    return this.request<{
      requiredSampleSize: number;
      achievedPower: number;
      effectSize: number;
      alpha: number;
      desiredPower: number;
    }>(`/experiments/${experimentId}/statistics/power`, {
      method: 'POST',
      body: data,
    });
  }

  // Analytics
  async trackEvent(eventType: string, eventData?: Record<string, any>) {
    // Fire and forget - don't await
    this.request('/analytics/track', {
      method: 'POST',
      body: {
        eventType,
        eventData,
        sessionId: typeof window !== 'undefined' ? sessionStorage.getItem('session_id') : undefined,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      },
    }).catch(() => {
      // Silently ignore analytics errors
    });
  }

  async getAnalyticsOverview(workspaceId?: string) {
    const params = workspaceId ? `?workspaceId=${workspaceId}` : '';
    return this.request<{
      totals: {
        analyses: number;
        documents: number;
        charts: number;
        users: number;
      };
      thisMonth: {
        analyses: number;
        documents: number;
        messages: number;
        analysesChange: number;
        documentsChange: number;
      };
      todayActiveUsers: number;
      recentActivity: {
        type: string;
        data: any;
        userId: string;
        timestamp: string;
      }[];
    }>(`/analytics/overview${params}`);
  }

  async getUsageStats(options: {
    startDate?: string;
    endDate?: string;
    workspaceId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const params = new URLSearchParams();
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.workspaceId) params.append('workspaceId', options.workspaceId);
    if (options.groupBy) params.append('groupBy', options.groupBy);

    return this.request<{
      eventCounts: { eventType: string; count: number }[];
      uniqueUsers: number;
      dailyActiveUsers: { date: string; count: number }[];
      topPages: { path: string; count: number }[];
    }>(`/analytics/usage?${params.toString()}`);
  }

  async getFeatureUsage(workspaceId?: string) {
    const params = workspaceId ? `?workspaceId=${workspaceId}` : '';
    return this.request<{
      features: { feature: string; count: number }[];
    }>(`/analytics/features${params}`);
  }
}

export const api = new ApiClient();
