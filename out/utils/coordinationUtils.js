"use strict";
// Coordination monitoring utilities for Helix VSCode Extension
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoordinationMonitor = void 0;
class CoordinationMonitor {
    constructor(apiService, updateMetrics) {
        this.monitoringActive = false;
        this.monitoringInterval = null;
        this.apiService = apiService;
        this.updateMetrics = updateMetrics;
    }
    startMonitoring() {
        if (this.monitoringActive) {
            return;
        }
        this.monitoringActive = true;
        // Fetch immediately on start, then on every interval tick.
        void this.checkCoordinationMetrics();
        this.monitoringInterval = setInterval(() => {
            void this.checkCoordinationMetrics();
        }, CoordinationMonitor.INTERVAL_MS);
    }
    stopMonitoring() {
        if (!this.monitoringActive) {
            return;
        }
        this.monitoringActive = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
    async checkCoordinationMetrics() {
        try {
            const response = await this.apiService.getCoordinationMetrics();
            const data = response.data;
            if (data &&
                typeof data.harmony === 'number' &&
                typeof data.resilience === 'number') {
                await this.updateMetrics({
                    harmony: data.harmony,
                    resilience: data.resilience,
                    throughput: data.throughput ?? 0,
                    friction: data.friction ?? 0,
                    focus: data.focus ?? 0,
                    velocity: data.velocity ?? 0,
                });
            }
        }
        catch (err) {
            // Non-critical background poll — log debug only, never surface to the user.
            console.debug('CoordinationMonitor: metrics fetch skipped:', err);
        }
    }
    isMonitoring() {
        return this.monitoringActive;
    }
}
exports.CoordinationMonitor = CoordinationMonitor;
/** Polling interval in ms (30 s by default). */
CoordinationMonitor.INTERVAL_MS = 30000;
//# sourceMappingURL=coordinationUtils.js.map