import * as vscode from 'vscode';
import { ApiService } from './apiService';
import { ProviderStatusView } from '../providers/ProviderStatusView';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  token: string;
  expiresAt: Date;
  refreshToken: string;
}

export class AuthService {
  private apiService: ApiService;
  private context: vscode.ExtensionContext;
  private currentToken: AuthToken | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  constructor(apiService: ApiService, context: vscode.ExtensionContext) {
    this.apiService = apiService;
    this.context = context;
    this.loadStoredToken();
  }

  /**
   * Authenticates a user with username and password
   */
  async login(credentials: AuthCredentials): Promise<boolean> {
    try {
      const response = await this.apiService.authenticate(credentials);

      if (response.success && response.data) {
        this.currentToken = {
          token: response.data.token,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
          refreshToken: response.data.refreshToken,
        };

        await this.storeToken();
        this.scheduleTokenRefresh();
        this.apiService.setAuthToken(this.currentToken.token);
        await this.context.globalState.update(
          'helix.authTokenValue',
          this.currentToken.token
        );
        void this._fetchAndStoreTier(this.currentToken.token);

        vscode.window.showInformationMessage('Successfully logged in to Helix');
        return true;
      } else {
        vscode.window.showErrorMessage(`Login failed: ${response.error}`);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      vscode.window.showErrorMessage(
        'Login failed. Please check your credentials.'
      );
      return false;
    }
  }

  /**
   * Initiates OAuth login flow
   */
  async initiateOAuthLogin(provider: 'google' | 'github'): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('helix');
      const apiEndpoint = config.get(
        'apiEndpoint',
        'https://api.helixcollective.io'
      );

      // The backend will redirect to this URI after OAuth completes.
      // VS Code intercepts vscode:// URIs via registerUriHandler (see extension.ts).
      const callbackUri = `vscode://helix-collective.helix-vscode-extension/auth/callback`;
      const oauthUrl =
        `${apiEndpoint}/auth/oauth/authorize/${provider}` +
        `?vscode_callback=${encodeURIComponent(callbackUri)}`;

      await vscode.env.openExternal(vscode.Uri.parse(oauthUrl));

      vscode.window.showInformationMessage(
        `Helix: complete the ${provider} sign-in in your browser — VS Code will update automatically.`
      );
    } catch (error) {
      console.warn('OAuth initiation error:', error);
      vscode.window.showErrorMessage(
        `Failed to open ${provider} sign-in. Check your internet connection.`
      );
    }
  }

  /**
   * Handles OAuth callback with authorization code
   */
  async handleOAuthCallback(
    provider: 'google' | 'github',
    code: string,
    state?: string
  ): Promise<boolean> {
    try {
      const config = vscode.workspace.getConfiguration('helix');
      const apiEndpoint = config.get('apiEndpoint', 'http://localhost:8000');

      const response = await fetch(
        `${apiEndpoint}/auth/oauth/callback/${provider}?code=${encodeURIComponent(
          code
        )}${state ? `&state=${encodeURIComponent(state)}` : ''}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'OAuth authentication failed');
      }

      const data = await response.json();

      if (data.access_token) {
        this.currentToken = {
          token: data.access_token,
          expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
          refreshToken: data.refresh_token || '',
        };

        await this.storeToken();
        this.scheduleTokenRefresh();
        this.apiService.setAuthToken(this.currentToken.token);
        await this.context.globalState.update(
          'helix.authTokenValue',
          this.currentToken.token
        );
        void this._fetchAndStoreTier(this.currentToken.token);

        vscode.window.showInformationMessage(
          `Successfully logged in to Helix with ${provider}`
        );
        return true;
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      vscode.window.showErrorMessage(
        `OAuth authentication failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      return false;
    }
  }

  /**
   * Logs out the current user
   */
  async logout(): Promise<void> {
    try {
      if (this.currentToken) {
        await this.apiService.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.currentToken = null;
      await this.clearStoredToken();
      this.cancelTokenRefresh();
      this.apiService.removeAuthToken();
      await this.context.globalState.update('helix.authTokenValue', undefined);
      vscode.window.showInformationMessage('Logged out from Helix');
    }
  }

  /**
   * Checks if the user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.currentToken !== null && !this.isTokenExpired();
  }

  /**
   * Gets the current authentication token
   */
  getAuthToken(): string | null {
    if (this.currentToken && !this.isTokenExpired()) {
      return this.currentToken.token;
    }
    return null;
  }

  /**
   * Refreshes the authentication token
   */
  async refreshToken(): Promise<boolean> {
    if (!this.currentToken?.refreshToken) {
      return false;
    }

    try {
      const response = await this.apiService.refreshToken(
        this.currentToken.refreshToken
      );

      if (response.success && response.data) {
        this.currentToken = {
          token: response.data.token,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
          refreshToken:
            response.data.refreshToken || this.currentToken.refreshToken,
        };

        await this.storeToken();
        this.apiService.setAuthToken(this.currentToken.token);
        // Expose refreshed token to other providers
        await this.context.globalState.update(
          'helix.authTokenValue',
          this.currentToken.token
        );
        return true;
      } else {
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Shows login dialog to user
   */
  async showLoginDialog(): Promise<boolean> {
    const username = await vscode.window.showInputBox({
      prompt: 'Enter your Helix username',
      placeHolder: 'username',
      ignoreFocusOut: true,
    });

    if (!username) {
      return false;
    }

    const password = await vscode.window.showInputBox({
      prompt: 'Enter your Helix password',
      placeHolder: 'password',
      password: true,
      ignoreFocusOut: true,
    });

    if (!password) {
      return false;
    }

    return this.login({ username, password });
  }

  /**
   * Checks if the current token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.currentToken) {
      return true;
    }
    return new Date() >= this.currentToken.expiresAt;
  }

  /**
   * Schedules automatic token refresh
   */
  private scheduleTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    if (this.currentToken) {
      const timeUntilExpiry =
        this.currentToken.expiresAt.getTime() - Date.now();
      const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0); // Refresh 5 minutes before expiry

      this.tokenRefreshTimer = setTimeout(async () => {
        await this.refreshToken();
      }, refreshTime);
    }
  }

  /**
   * Cancels the token refresh timer
   */
  private cancelTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Stores the token in VS Code's SecretStorage (OS keychain).
   * SecretStorage is encrypted at rest — safer than globalState for auth tokens.
   */
  private async storeToken(): Promise<void> {
    if (this.currentToken) {
      await this.context.secrets.store(
        'helix.authToken',
        JSON.stringify(this.currentToken)
      );
    }
  }

  /**
   * Loads the stored token from SecretStorage.
   */
  private async loadStoredToken(): Promise<void> {
    const raw = await this.context.secrets.get('helix.authToken');
    if (!raw) return;
    try {
      const storedToken = JSON.parse(raw) as AuthToken;
      storedToken.expiresAt = new Date(storedToken.expiresAt);
      if (new Date() < storedToken.expiresAt) {
        this.currentToken = storedToken;
        this.apiService.setAuthToken(this.currentToken.token);
        await this.context.globalState.update(
          'helix.authTokenValue',
          this.currentToken.token
        );
        this.scheduleTokenRefresh();
      }
    } catch {
      await this.context.secrets.delete('helix.authToken');
    }
  }

  /**
   * Clears the stored token from SecretStorage.
   */
  private async clearStoredToken(): Promise<void> {
    await this.context.secrets.delete('helix.authToken');
  }

  /**
   * Fetches /auth/me and stores the user's subscription tier so the
   * status bar can show "Helix · PRO · claude-sonnet-4-6".
   */
  private async _fetchAndStoreTier(token: string): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('helix');
      const apiEndpoint = config.get<string>(
        'apiEndpoint',
        'https://api.helixcollective.io'
      );
      const res = await fetch(`${apiEndpoint}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { tier?: string; username?: string };
      const tier = data.tier ?? 'free';
      await this.context.globalState.update('helix.accountTier', tier);
      if (data.username) {
        await this.context.globalState.update('helix.username', data.username);
      }
      ProviderStatusView.setAccountTier(this.context, tier);
    } catch {
      // Non-critical — tier display is a nice-to-have
    }
  }
}
