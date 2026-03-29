// Coordination monitoring utilities for Helix VSCode Extension

import type { ApiService, UCFFullMetrics } from '../services/apiService';

type MetricsUpdater = (metrics: UCFFullMetrics) => Promise<void>;

export class CoordinationMonitor {
  private monitoringActive: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private readonly apiService: ApiService;
  private readonly updateMetrics: MetricsUpdater;

  /** Polling interval in ms (30 s by default). */
  private static readonly INTERVAL_MS = 30_000;

  constructor(apiService: ApiService, updateMetrics: MetricsUpdater) {
    this.apiService = apiService;
    this.updateMetrics = updateMetrics;
  }

  startMonitoring(): void {
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

  stopMonitoring(): void {
    if (!this.monitoringActive) {
      return;
    }

    this.monitoringActive = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async checkCoordinationMetrics(): Promise<void> {
    try {
      const response = await this.apiService.getCoordinationMetrics();
      const data = response.data;
      if (
        data &&
        typeof data.harmony === 'number' &&
        typeof data.resilience === 'number'
      ) {
        await this.updateMetrics({
          harmony: data.harmony,
          resilience: data.resilience,
          throughput: data.throughput ?? 0,
          friction: data.friction ?? 0,
          focus: data.focus ?? 0,
          velocity: data.velocity ?? 0,
        });
      }
    } catch (err) {
      // Non-critical background poll — log debug only, never surface to the user.
      console.debug('CoordinationMonitor: metrics fetch skipped:', err);
    }
  }

  isMonitoring(): boolean {
    return this.monitoringActive;
  }
}
