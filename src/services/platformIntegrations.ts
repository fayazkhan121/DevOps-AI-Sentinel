import axios from 'axios';
import { KubernetesClient } from './platforms/kubernetes';
import { DockerClient } from './platforms/docker';
import { JenkinsClient } from './platforms/jenkins';
import { AzureDevOpsClient } from './platforms/azureDevOps';
import type { PlatformMetrics, VulnerabilityReport, BuildStatus } from '../types/platforms';

export class PlatformIntegrationService {
  private k8sClient: KubernetesClient;
  private dockerClient: DockerClient;
  private jenkinsClient: JenkinsClient;
  private azureClient: AzureDevOpsClient;

  constructor(config: any) {
    this.k8sClient = new KubernetesClient(config.kubernetes);
    this.dockerClient = new DockerClient(config.docker);
    this.jenkinsClient = new JenkinsClient(config.jenkins);
    this.azureClient = new AzureDevOpsClient(config.azure);
  }

  // Kubernetes Monitoring
  async getClusterHealth() {
    return await this.k8sClient.getClusterHealth();
  }

  async getPodMetrics() {
    return await this.k8sClient.getPodMetrics();
  }

  async getNodeUtilization() {
    return await this.k8sClient.getNodeUtilization();
  }

  // Docker Monitoring
  async getContainerMetrics() {
    return await this.dockerClient.getContainerMetrics();
  }

  async scanContainerVulnerabilities() {
    return await this.dockerClient.scanVulnerabilities();
  }

  async getImageHistory() {
    return await this.dockerClient.getImageHistory();
  }

  // Jenkins Integration
  async getPipelineStatus() {
    return await this.jenkinsClient.getPipelineStatus();
  }

  async getBuildLogs() {
    return await this.jenkinsClient.getBuildLogs();
  }

  async triggerPipelineRun() {
    return await this.jenkinsClient.triggerPipeline();
  }

  // Azure DevOps Integration
  async getAzurePipelineMetrics() {
    return await this.azureClient.getPipelineMetrics();
  }

  async getAzureReleaseStatus() {
    return await this.azureClient.getReleaseStatus();
  }

  async getAzureTestResults() {
    return await this.azureClient.getTestResults();
  }
}