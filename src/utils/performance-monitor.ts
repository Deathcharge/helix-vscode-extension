import * as vscode from 'vscode';

export interface PerformanceMetrics {
  extensionLoadTime: number;
  commandExecutionTime: Map<string, number[]>;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: Map<string, number[]>;
  agentResponseTime: Map<string, number[]>;
  lastUpdated: Date;
}

export interface PerformanceThreshold {
  metric: string;
  warningThreshold: number;
  criticalThreshold: number;
  unit: string;
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  actionable: boolean;
  action?: () => void;
}

export interface PerformanceReport {
  summary: {
    averageLoadTime: number;
    averageMemoryUsage: number;
    averageCpuUsage: number;
    totalCommandsExecuted: number;
    averageCommandExecutionTime: number;
    totalNetworkRequests: number;
    averageNetworkLatency: number;
    totalAgentRequests: number;
    averageAgentResponseTime: number;
  };
  alerts: PerformanceAlert[];
  recommendations: string[];
  bottlenecks: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThreshold[];
  private alerts: PerformanceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private commandTimings: Map<string, number> = new Map();
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.metrics = {
      extensionLoadTime: 0,
      commandExecutionTime: new Map(),
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: new Map(),
      agentResponseTime: new Map(),
      lastUpdated: new Date(),
    };

    this.thresholds = [
      {
        metric: 'memoryUsage',
        warningThreshold: 100,
        criticalThreshold: 200,
        unit: 'MB',
      },
      {
        metric: 'cpuUsage',
        warningThreshold: 50,
        criticalThreshold: 80,
        unit: '%',
      },
      {
        metric: 'commandExecutionTime',
        warningThreshold: 1000,
        criticalThreshold: 5000,
        unit: 'ms',
      },
      {
        metric: 'networkLatency',
        warningThreshold: 500,
        criticalThreshold: 2000,
        unit: 'ms',
      },
      {
        metric: 'agentResponseTime',
        warningThreshold: 3000,
        criticalThreshold: 10000,
        unit: 'ms',
      },
    ];

    this.setupEventListeners();
  }

  /**
   * Starts performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('Performance monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('Starting performance monitoring');

    // Start monitoring interval (every 30 seconds)
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Initial metrics collection
    this.collectMetrics();
  }

  /**
   * Stops performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('Stopped performance monitoring');
  }

  /**
   * Records command execution start time
   */
  startCommandTiming(commandName: string): void {
    this.commandTimings.set(commandName, Date.now());
  }

  /**
   * Records command execution end time and calculates duration
   */
  endCommandTiming(commandName: string): number {
    const startTime = this.commandTimings.get(commandName);
    if (!startTime) {
      return 0;
    }

    const duration = Date.now() - startTime;
    this.commandTimings.delete(commandName);

    // Store the timing
    const timings = this.metrics.commandExecutionTime.get(commandName) || [];
    timings.push(duration);

    // Keep only last 100 timings
    if (timings.length > 100) {
      timings.shift();
    }

    this.metrics.commandExecutionTime.set(commandName, timings);
    this.metrics.lastUpdated = new Date();

    // Check thresholds
    this.checkThreshold('commandExecutionTime', duration);

    return duration;
  }

  /**
   * Records network request latency
   */
  recordNetworkLatency(endpoint: string, latency: number): void {
    const latencies = this.metrics.networkLatency.get(endpoint) || [];
    latencies.push(latency);

    // Keep only last 50 latencies
    if (latencies.length > 50) {
      latencies.shift();
    }

    this.metrics.networkLatency.set(endpoint, latencies);
    this.metrics.lastUpdated = new Date();

    // Check thresholds
    this.checkThreshold('networkLatency', latency);
  }

  /**
   * Records agent response time
   */
  recordAgentResponseTime(agentId: string, responseTime: number): void {
    const responseTimes = this.metrics.agentResponseTime.get(agentId) || [];
    responseTimes.push(responseTime);

    // Keep only last 50 response times
    if (responseTimes.length > 50) {
      responseTimes.shift();
    }

    this.metrics.agentResponseTime.set(agentId, responseTimes);
    this.metrics.lastUpdated = new Date();

    // Check thresholds
    this.checkThreshold('agentResponseTime', responseTime);
  }

  /**
   * Sets extension load time
   */
  setExtensionLoadTime(loadTime: number): void {
    this.metrics.extensionLoadTime = loadTime;
    this.metrics.lastUpdated = new Date();
  }

  /**
   * Gets current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Gets performance alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Generates performance report
   */
  generateReport(): PerformanceReport {
    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    // Calculate averages
    const commandTimes = Array.from(
      this.metrics.commandExecutionTime.values()
    ).flat();
    const networkTimes = Array.from(
      this.metrics.networkLatency.values()
    ).flat();
    const agentTimes = Array.from(
      this.metrics.agentResponseTime.values()
    ).flat();

    const summary = {
      averageLoadTime: this.metrics.extensionLoadTime,
      averageMemoryUsage: this.calculateAverage(this.getMemoryHistory()),
      averageCpuUsage: this.calculateAverage(this.getCpuHistory()),
      totalCommandsExecuted: commandTimes.length,
      averageCommandExecutionTime: this.calculateAverage(commandTimes),
      totalNetworkRequests: networkTimes.length,
      averageNetworkLatency: this.calculateAverage(networkTimes),
      totalAgentRequests: agentTimes.length,
      averageAgentResponseTime: this.calculateAverage(agentTimes),
    };

    const recommendations = this.generateRecommendations(summary);
    const bottlenecks = this.identifyBottlenecks(summary);

    return {
      summary,
      alerts: this.alerts,
      recommendations,
      bottlenecks,
      timeRange: {
        start: startTime,
        end: now,
      },
    };
  }

  /**
   * Clears all performance data
   */
  clearMetrics(): void {
    this.metrics = {
      extensionLoadTime: 0,
      commandExecutionTime: new Map(),
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: new Map(),
      agentResponseTime: new Map(),
      lastUpdated: new Date(),
    };
    this.alerts = [];
  }

  /**
   * Exports performance data
   */
  exportData(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        alerts: this.alerts,
        thresholds: this.thresholds,
        exportTime: new Date(),
      },
      null,
      2
    );
  }

  /**
   * Imports performance data
   */
  importData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.metrics) {
        this.metrics = parsed.metrics;
      }
      if (parsed.alerts) {
        this.alerts = parsed.alerts;
      }
      if (parsed.thresholds) {
        this.thresholds = parsed.thresholds;
      }
    } catch (error) {
      console.error('Failed to import performance data:', error);
    }
  }

  /**
   * Sets custom performance thresholds
   */
  setThresholds(thresholds: PerformanceThreshold[]): void {
    this.thresholds = thresholds;
  }

  /**
   * Gets performance recommendations
   */
  getRecommendations(): string[] {
    return this.generateRecommendations(this.metrics);
  }

  private setupEventListeners(): void {
    // Listen for VSCode events that might affect performance
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.collectMetrics();
      })
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(() => {
        this.collectMetrics();
      })
    );
  }

  private collectMetrics(): void {
    if (!this.isMonitoring) return;

    // Collect memory usage
    const memoryUsage = process.memoryUsage();
    this.metrics.memoryUsage = memoryUsage.heapUsed / 1024 / 1024; // Convert to MB

    // Collect CPU usage (approximation)
    const startCpu = process.cpuUsage();
    setTimeout(() => {
      const endCpu = process.cpuUsage(startCpu);
      this.metrics.cpuUsage = (endCpu.user + endCpu.system) / 1000000; // Convert to milliseconds
    }, 100);

    this.metrics.lastUpdated = new Date();
  }

  private checkThreshold(metric: string, value: number): void {
    const threshold = this.thresholds.find(t => t.metric === metric);
    if (!threshold) return;

    let severity: 'warning' | 'critical' = 'warning';
    let thresholdValue = threshold.warningThreshold;

    if (value >= threshold.criticalThreshold) {
      severity = 'critical';
      thresholdValue = threshold.criticalThreshold;
    } else if (value >= threshold.warningThreshold) {
      severity = 'warning';
      thresholdValue = threshold.warningThreshold;
    } else {
      return; // No alert needed
    }

    const alert: PerformanceAlert = {
      id: `${metric}-${Date.now()}`,
      metric,
      value,
      threshold: thresholdValue,
      severity,
      message: this.generateAlertMessage(
        metric,
        value,
        thresholdValue,
        threshold.unit
      ),
      timestamp: new Date(),
      actionable: true,
      action: () => this.handleAlertAction(metric, value),
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Show notification for critical alerts
    if (severity === 'critical') {
      vscode.window.showErrorMessage(alert.message);
    }
  }

  private generateAlertMessage(
    metric: string,
    value: number,
    threshold: number,
    unit: string
  ): string {
    switch (metric) {
      case 'memoryUsage':
        return `High memory usage detected: ${value.toFixed(
          2
        )}${unit} (threshold: ${threshold}${unit})`;
      case 'cpuUsage':
        return `High CPU usage detected: ${value.toFixed(
          2
        )}% (threshold: ${threshold}%)`;
      case 'commandExecutionTime':
        return `Slow command execution: ${value.toFixed(
          2
        )}ms (threshold: ${threshold}ms)`;
      case 'networkLatency':
        return `High network latency: ${value.toFixed(
          2
        )}ms (threshold: ${threshold}ms)`;
      case 'agentResponseTime':
        return `Slow agent response: ${value.toFixed(
          2
        )}ms (threshold: ${threshold}ms)`;
      default:
        return `Performance threshold exceeded: ${value.toFixed(
          2
        )}${unit} (threshold: ${threshold}${unit})`;
    }
  }

  private handleAlertAction(metric: string, value: number): void {
    switch (metric) {
      case 'memoryUsage':
        vscode.window.showInformationMessage(
          'Consider restarting VSCode to free up memory'
        );
        break;
      case 'cpuUsage':
        vscode.window.showInformationMessage(
          'High CPU usage detected. Check for resource-intensive extensions'
        );
        break;
      case 'commandExecutionTime':
        vscode.window.showInformationMessage(
          'Command execution is slow. Consider optimizing the command'
        );
        break;
      case 'networkLatency':
        vscode.window.showInformationMessage(
          'Network latency is high. Check your internet connection'
        );
        break;
      case 'agentResponseTime':
        vscode.window.showInformationMessage(
          'Agent response time is slow. Check agent status'
        );
        break;
    }
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private getMemoryHistory(): number[] {
    // Return current memory usage for now
    // In a real implementation, you'd store historical data
    return [this.metrics.memoryUsage];
  }

  private getCpuHistory(): number[] {
    // Return current CPU usage for now
    // In a real implementation, you'd store historical data
    return [this.metrics.cpuUsage];
  }

  private generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.averageMemoryUsage > 150) {
      recommendations.push(
        'Memory usage is high. Consider restarting VSCode or reducing the number of open files'
      );
    }

    if (summary.averageCpuUsage > 60) {
      recommendations.push(
        'CPU usage is elevated. Check for resource-intensive extensions or processes'
      );
    }

    if (summary.averageCommandExecutionTime > 2000) {
      recommendations.push(
        'Command execution is slow. Consider optimizing frequently used commands'
      );
    }

    if (summary.averageNetworkLatency > 1000) {
      recommendations.push(
        'Network latency is high. Check your internet connection or consider using local services'
      );
    }

    if (summary.averageAgentResponseTime > 5000) {
      recommendations.push(
        'Agent response times are slow. Check agent availability and network connectivity'
      );
    }

    if (summary.totalCommandsExecuted < 10) {
      recommendations.push(
        'Low command usage detected. Explore available commands to improve productivity'
      );
    }

    return recommendations;
  }

  private identifyBottlenecks(summary: any): string[] {
    const bottlenecks: string[] = [];

    if (summary.averageCommandExecutionTime > 3000) {
      bottlenecks.push('Command execution is a performance bottleneck');
    }

    if (summary.averageNetworkLatency > 1500) {
      bottlenecks.push('Network latency is causing performance issues');
    }

    if (summary.averageAgentResponseTime > 8000) {
      bottlenecks.push('Agent response times are causing delays');
    }

    if (summary.averageMemoryUsage > 200) {
      bottlenecks.push('High memory usage may be impacting performance');
    }

    return bottlenecks;
  }

  dispose(): void {
    this.stopMonitoring();
    this.disposables.forEach(d => d.dispose());
  }
}
