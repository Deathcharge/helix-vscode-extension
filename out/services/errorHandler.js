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
exports.errorHandler = exports.ErrorHandler = void 0;
const vscode = __importStar(require("vscode"));
const notificationService_1 = require("./notificationService");
class ErrorHandler {
    constructor() {
        this.errorHistory = [];
        this.maxErrorHistory = 100;
        this.outputChannel = vscode.window.createOutputChannel('Helix');
    }
    static getInstance() {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }
    /**
     * Handles an error and shows appropriate user feedback
     */
    handleError(error, context = {}) {
        const errorContext = {
            source: context.source || 'Unknown',
            ...(context.operation !== undefined && { operation: context.operation }),
            details: context.details,
            timestamp: new Date(),
        };
        // Add to error history
        this.addToHistory(errorContext);
        // Log the error
        this.logError(error, errorContext);
        // Show user notification
        this.showUserNotification(error, errorContext);
        // Handle specific error types
        this.handleSpecificErrorTypes(error, errorContext);
    }
    /**
     * Handles async errors with proper context
     */
    handleAsyncError(error, source, operation) {
        return new Promise(resolve => {
            this.handleError(error, {
                source,
                ...(operation !== undefined && { operation }),
            });
            resolve();
        });
    }
    /**
     * Handles API errors with retry logic
     */
    async handleApiError(error, retryFunction, maxRetries = 3) {
        const isNetworkError = this.isNetworkError(error);
        const isAuthError = this.isAuthError(error);
        if (isAuthError) {
            this.handleAuthError(error);
            return;
        }
        if (isNetworkError && retryFunction) {
            await this.handleRetryableError(error, retryFunction, maxRetries);
            return;
        }
        this.handleError(error, { source: 'API', operation: 'Request' });
    }
    /**
     * Gets error history
     */
    getErrorHistory() {
        return [...this.errorHistory];
    }
    /**
     * Clears error history
     */
    clearErrorHistory() {
        this.errorHistory = [];
    }
    /**
     * Logs error to console and VSCode output channel
     */
    logError(error, context) {
        const logMessage = `[${context.source}] ${context.operation ? `${context.operation}: ` : ''}${error.message}`;
        console.error(logMessage, {
            error: error.stack,
            context,
            details: context.details,
        });
        // Log to VSCode output channel
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ERROR: ${logMessage}`);
        this.outputChannel.appendLine(`Stack: ${error.stack}`);
        if (context.details) {
            this.outputChannel.appendLine(`Details: ${JSON.stringify(context.details, null, 2)}`);
        }
        this.outputChannel.appendLine('---');
    }
    /**
     * Shows user notification for error
     */
    showUserNotification(error, context) {
        const userMessage = this.getUserFriendlyMessage(error, context);
        const notificationType = this.getNotificationType(error, context);
        notificationService_1.notificationService.showNotification({
            type: notificationType,
            message: userMessage,
            showInStatusBar: true,
            statusBarItemText: `Error: ${context.source}`,
        });
    }
    /**
     * Handles specific error types
     */
    handleSpecificErrorTypes(error, context) {
        if (this.isAuthError(error)) {
            this.handleAuthError(error);
        }
        else if (this.isNetworkError(error)) {
            this.handleNetworkError(error);
        }
        else if (this.isValidationError(error)) {
            this.handleValidationError(error);
        }
    }
    /**
     * Handles authentication errors
     */
    handleAuthError(error) {
        notificationService_1.notificationService.showNotification({
            type: 'error',
            message: 'Authentication failed. Please log in again.',
            actions: [
                {
                    title: 'Login',
                    command: 'helix.login',
                },
            ],
        });
    }
    /**
     * Handles network errors
     */
    handleNetworkError(error) {
        notificationService_1.notificationService.showNotification({
            type: 'warning',
            message: 'Network connection issue. Please check your internet connection.',
            duration: 5000,
        });
    }
    /**
     * Handles validation errors
     */
    handleValidationError(error) {
        notificationService_1.notificationService.showNotification({
            type: 'warning',
            message: `Invalid input: ${error.message}`,
        });
    }
    /**
     * Handles retryable errors
     */
    async handleRetryableError(error, retryFunction, maxRetries) {
        let retries = 0;
        while (retries < maxRetries) {
            try {
                await retryFunction();
                return; // Success, exit retry loop
            }
            catch (retryError) {
                retries++;
                if (retries >= maxRetries) {
                    this.handleError(retryError, {
                        source: 'Retry',
                        operation: `Attempt ${retries}`,
                        details: { originalError: error.message },
                    });
                    break;
                }
                // Wait before retrying (exponential backoff)
                await this.sleep(Math.pow(2, retries) * 1000);
            }
        }
    }
    /**
     * Adds error to history
     */
    addToHistory(context) {
        this.errorHistory.push(context);
        // Limit history size
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory.shift();
        }
    }
    /**
     * Gets user-friendly error message
     */
    getUserFriendlyMessage(error, context) {
        // Map specific error messages to user-friendly ones
        const messageMap = {
            'Network Error': 'Unable to connect to the server. Please check your internet connection.',
            timeout: 'Request timed out. Please try again.',
            '401': 'Authentication required. Please log in.',
            '403': 'Access denied. You do not have permission to perform this action.',
            '404': 'Resource not found.',
            '500': 'Server error. Please try again later.',
            ECONNREFUSED: 'Unable to connect to the server. Please check if the server is running.',
        };
        // Check for mapped messages
        for (const [key, message] of Object.entries(messageMap)) {
            if (error.message.toLowerCase().includes(key.toLowerCase())) {
                return message;
            }
        }
        // Default message
        return `An error occurred in ${context.source}: ${error.message}`;
    }
    /**
     * Gets appropriate notification type for error
     */
    getNotificationType(error, context) {
        if (this.isAuthError(error)) {
            return 'error';
        }
        else if (this.isNetworkError(error)) {
            return 'warning';
        }
        else if (this.isValidationError(error)) {
            return 'warning';
        }
        return 'error';
    }
    /**
     * Checks if error is an authentication error
     */
    isAuthError(error) {
        return (error.message.toLowerCase().includes('unauthorized') ||
            error.message.toLowerCase().includes('401') ||
            error.message.toLowerCase().includes('token') ||
            error.message.toLowerCase().includes('auth'));
    }
    /**
     * Checks if error is a network error
     */
    isNetworkError(error) {
        return (error.message.toLowerCase().includes('network') ||
            error.message.toLowerCase().includes('timeout') ||
            error.message.toLowerCase().includes('connection') ||
            error.message.toLowerCase().includes('econnrefused') ||
            error.message.toLowerCase().includes('fetch'));
    }
    /**
     * Checks if error is a validation error
     */
    isValidationError(error) {
        return (error.message.toLowerCase().includes('validation') ||
            error.message.toLowerCase().includes('invalid') ||
            error.message.toLowerCase().includes('400'));
    }
    /**
     * Sleep utility for retry logic
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.ErrorHandler = ErrorHandler;
// Global error handler instance
exports.errorHandler = ErrorHandler.getInstance();
//# sourceMappingURL=errorHandler.js.map