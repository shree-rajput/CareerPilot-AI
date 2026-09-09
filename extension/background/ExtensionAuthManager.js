/**
 * CareerPilot AI - Centralized Extension Authentication Manager
 * Maintains the single source of truth for the extension's authentication state.
 */

const AUTH_STATES = {
  UNKNOWN: "UNKNOWN",
  CHECKING: "CHECKING",
  AUTHENTICATED: "AUTHENTICATED",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  OFFLINE: "OFFLINE",
  ERROR: "ERROR"
};

class AuthManager {
  constructor() {
    this.state = AUTH_STATES.UNKNOWN;
    this.user = null;
    this.token = null;
    this.apiUrl = "http://localhost:5000/api";
    this._validationPromise = null;
  }

  async initialize() {
    const data = await chrome.storage.local.get(["apiUrl", "token", "user"]);
    if (data.apiUrl) this.apiUrl = data.apiUrl;
    this.token = data.token || null;
    this.user = data.user || null;
    
    if (this.token) {
      // Optimistically assume authenticated if we have a token, then validate
      this.state = AUTH_STATES.AUTHENTICATED;
      this.validateSession(true);
    } else {
      this.state = AUTH_STATES.AUTH_REQUIRED;
    }
  }

  async getAuthState() {
    // If we've never validated or we're completely unknown, trigger a validation
    if (this.state === AUTH_STATES.UNKNOWN) {
      await this.validateSession();
    }
    return {
      state: this.state,
      isAuthenticated: this.state === AUTH_STATES.AUTHENTICATED || this.state === AUTH_STATES.OFFLINE,
      user: this.user,
      isOffline: this.state === AUTH_STATES.OFFLINE
    };
  }

  /**
   * Called by the content script (authSync.js) when a token is found in the web app
   */
  async syncToken(newToken) {
    if (!newToken) {
      await this.logout();
      return;
    }

    if (this.token !== newToken) {
      this.token = newToken;
      await chrome.storage.local.set({ token: newToken });
      await this.validateSession(true);
    }
  }

  /**
   * Called by API client interceptors or explicitly to log out
   */
  async logout() {
    this.token = null;
    this.user = null;
    this.state = AUTH_STATES.AUTH_REQUIRED;
    await chrome.storage.local.remove(["token", "user"]);
  }

  /**
   * Validates the session with the backend. Deduplicates concurrent calls.
   */
  async validateSession(background = false) {
    if (!this.token) {
      await this.logout();
      return this.getAuthState();
    }

    if (this._validationPromise) {
      return this._validationPromise;
    }

    if (!background && this.state !== AUTH_STATES.AUTHENTICATED) {
      this.state = AUTH_STATES.CHECKING;
    }

    this._validationPromise = this._performValidation();
    try {
      await this._validationPromise;
    } finally {
      this._validationPromise = null;
    }
    
    return this.getAuthState();
  }

  async _performValidation() {
    try {
      const response = await fetch(`${this.apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${this.token}` },
        // Short timeout for fast validation
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        this.state = AUTH_STATES.AUTHENTICATED;
        await chrome.storage.local.set({ user: data.user });
      } else if (response.status === 401) {
        await this.logout();
      } else {
        // 500s or other errors should not log the user out
        this.state = AUTH_STATES.OFFLINE;
      }
    } catch (err) {
      // Network errors should not log the user out
      if (this.token) {
        this.state = AUTH_STATES.OFFLINE;
      } else {
        this.state = AUTH_STATES.ERROR;
      }
    }
  }

  /**
   * Transitions the state to AUTH_REQUIRED when the API client explicitly receives a 401
   */
  async handleAuthFailure() {
    await this.logout();
  }
}

export const ExtensionAuthManager = new AuthManager();
