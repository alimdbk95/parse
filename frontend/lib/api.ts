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

  async updateAnalysis(id: string, data: { title?: string; description?: string }) {
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
}

export const api = new ApiClient();
