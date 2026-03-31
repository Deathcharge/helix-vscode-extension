"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const vscode = __importStar(require("vscode"));
const ProviderStatusView_1 = require("../providers/ProviderStatusView");
class AuthService {
    constructor(apiService, context) {
        this.currentToken = null;
        this.tokenRefreshTimer = null;
        this.apiService = apiService;
        this.context = context;
        this.loadStoredToken();
    }
    /**
     * Authenticates a user with username and password
     */
    async login(credentials) {
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
                await this.context.globalState.update('helix.authTokenValue', this.currentToken.token);
                void this._fetchAndStoreTier(this.currentToken.token);
                vscode.window.showInformationMessage('Successfully logged in to Helix');
                return true;
            }
            else {
                vscode.window.showErrorMessage(`Login failed: ${response.error}`);
                return false;
            }
        }
        catch (error) {
            console.error('Login error:', error);
            vscode.window.showErrorMessage('Login failed. Please check your credentials.');
            return false;
        }
    }
    /**
     * Initiates OAuth login flow
     */
    async initiateOAuthLogin(provider) {
        try {
            const config = vscode.workspace.getConfiguration('helix');
            const apiEndpoint = config.get('apiEndpoint', 'https://api.helixcollective.io');
            // The backend will redirect to this URI after OAuth completes.
            // VS Code intercepts vscode:// URIs via registerUriHandler (see extension.ts).
            const callbackUri = `vscode://helix-collective.helix-vscode-extension/auth/callback`;
            const oauthUrl = `${apiEndpoint}/auth/oauth/authorize/${provider}` +
                `?vscode_callback=${encodeURIComponent(callbackUri)}`;
            await vscode.env.openExternal(vscode.Uri.parse(oauthUrl));
            vscode.window.showInformationMessage(`Helix: complete the ${provider} sign-in in your browser — VS Code will update automatically.`);
        }
        catch (error) {
            console.warn('OAuth initiation error:', error);
            vscode.window.showErrorMessage(`Failed to open ${provider} sign-in. Check your internet connection.`);
        }
    }
    /**
     * Handles OAuth callback with authorization code
     */
    async handleOAuthCallback(provider, code, state) {
        try {
            const config = vscode.workspace.getConfiguration('helix');
            const apiEndpoint = config.get('apiEndpoint', 'http://localhost:8000');
            const response = await fetch(`${apiEndpoint}/auth/oauth/callback/${provider}?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
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
                await this.context.globalState.update('helix.authTokenValue', this.currentToken.token);
                void this._fetchAndStoreTier(this.currentToken.token);
                vscode.window.showInformationMessage(`Successfully logged in to Helix with ${provider}`);
                return true;
            }
            else {
                throw new Error('No access token received');
            }
        }
        catch (error) {
            console.error('OAuth callback error:', error);
            vscode.window.showErrorMessage(`OAuth authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
    /**
     * Logs out the current user
     */
    async logout() {
        try {
            if (this.currentToken) {
                await this.apiService.logout();
            }
        }
        catch (error) {
            console.error('Logout error:', error);
        }
        finally {
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
    isAuthenticated() {
        return this.currentToken !== null && !this.isTokenExpired();
    }
    /**
     * Gets the current authentication token
     */
    getAuthToken() {
        if (this.currentToken && !this.isTokenExpired()) {
            return this.currentToken.token;
        }
        return null;
    }
    /**
     * Refreshes the authentication token
     */
    async refreshToken() {
        if (!this.currentToken?.refreshToken) {
            return false;
        }
        try {
            const response = await this.apiService.refreshToken(this.currentToken.refreshToken);
            if (response.success && response.data) {
                this.currentToken = {
                    token: response.data.token,
                    expiresAt: new Date(Date.now() + 3600000), // 1 hour
                    refreshToken: response.data.refreshToken || this.currentToken.refreshToken,
                };
                await this.storeToken();
                this.apiService.setAuthToken(this.currentToken.token);
                // Expose refreshed token to other providers
                await this.context.globalState.update('helix.authTokenValue', this.currentToken.token);
                return true;
            }
            else {
                this.logout();
                return false;
            }
        }
        catch (error) {
            console.error('Token refresh error:', error);
            this.logout();
            return false;
        }
    }
    /**
     * Shows login dialog to user
     */
    async showLoginDialog() {
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
    isTokenExpired() {
        if (!this.currentToken) {
            return true;
        }
        return new Date() >= this.currentToken.expiresAt;
    }
    /**
     * Schedules automatic token refresh
     */
    scheduleTokenRefresh() {
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
        }
        if (this.currentToken) {
            const timeUntilExpiry = this.currentToken.expiresAt.getTime() - Date.now();
            const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0); // Refresh 5 minutes before expiry
            this.tokenRefreshTimer = setTimeout(async () => {
                await this.refreshToken();
            }, refreshTime);
        }
    }
    /**
     * Cancels the token refresh timer
     */
    cancelTokenRefresh() {
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
    }
    /**
     * Stores the token in VS Code's SecretStorage (OS keychain).
     * SecretStorage is encrypted at rest — safer than globalState for auth tokens.
     */
    async storeToken() {
        if (this.currentToken) {
            await this.context.secrets.store('helix.authToken', JSON.stringify(this.currentToken));
        }
    }
    /**
     * Loads the stored token from SecretStorage.
     */
    async loadStoredToken() {
        const raw = await this.context.secrets.get('helix.authToken');
        if (!raw)
            return;
        try {
            const storedToken = JSON.parse(raw);
            storedToken.expiresAt = new Date(storedToken.expiresAt);
            if (new Date() < storedToken.expiresAt) {
                this.currentToken = storedToken;
                this.apiService.setAuthToken(this.currentToken.token);
                await this.context.globalState.update('helix.authTokenValue', this.currentToken.token);
                this.scheduleTokenRefresh();
            }
        }
        catch {
            await this.context.secrets.delete('helix.authToken');
        }
    }
    /**
     * Clears the stored token from SecretStorage.
     */
    async clearStoredToken() {
        await this.context.secrets.delete('helix.authToken');
    }
    /**
     * Fetches /auth/me and stores the user's subscription tier so the
     * status bar can show "Helix · PRO · claude-sonnet-4-6".
     */
    async _fetchAndStoreTier(token) {
        try {
            const config = vscode.workspace.getConfiguration('helix');
            const apiEndpoint = config.get('apiEndpoint', 'https://api.helixcollective.io');
            const res = await fetch(`${apiEndpoint}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: AbortSignal.timeout(8000),
            });
            if (!res.ok)
                return;
            const data = (await res.json());
            const tier = data.tier ?? 'free';
            await this.context.globalState.update('helix.accountTier', tier);
            if (data.username) {
                await this.context.globalState.update('helix.username', data.username);
            }
            ProviderStatusView_1.ProviderStatusView.setAccountTier(this.context, tier);
        }
        catch {
            // Non-critical — tier display is a nice-to-have
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map