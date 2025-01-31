import { IntegrationConfig } from "@/types/integrations";
import {
  AWSIcon,
  AzureIcon,
  GCPIcon,
  GitHubIcon,
  GitLabIcon,
  DockerIcon,
  KubernetesIcon,
  TerraformIcon,
  PrometheusIcon,
  JenkinsIcon,
  AnsibleIcon
} from "@/components/icons/IntegrationIcons";
import React from 'react';

export const INTEGRATION_CONFIGS: IntegrationConfig[] = [
  // Cloud Platforms
  {
    id: 'aws',
    title: "AWS",
    description: "Connect your AWS cloud services and resources",
    type: 'api_key',
    fields: [
      {
        name: 'aws_access_key_id',
        label: 'AWS Access Key ID',
        type: 'text',
        required: true,
        placeholder: 'Enter your AWS Access Key ID'
      },
      {
        name: 'aws_secret_access_key',
        label: 'AWS Secret Access Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your AWS Secret Access Key'
      },
      {
        name: 'aws_region',
        label: 'AWS Region',
        type: 'text',
        required: true,
        placeholder: 'e.g., us-east-1'
      }
    ],
    connected: false,
    icon: <AWSIcon />
  },
  {
    id: 'azure',
    title: "Microsoft Azure",
    description: "Connect your Azure cloud services and resources",
    type: 'oauth2',
    fields: [
      {
        name: 'tenant_id',
        label: 'Azure Tenant ID',
        type: 'text',
        required: true,
        placeholder: 'Enter your Azure Tenant ID'
      },
      {
        name: 'client_id',
        label: 'Azure Client ID',
        type: 'text',
        required: true,
        placeholder: 'Enter your Azure Client ID'
      },
      {
        name: 'client_secret',
        label: 'Azure Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter your Azure Client Secret'
      }
    ],
    connected: false,
    icon: <AzureIcon />
  },
  {
    id: 'gcp',
    title: "Google Cloud Platform",
    description: "Connect your Google Cloud Platform services",
    type: 'oauth2',
    fields: [
      {
        name: 'project_id',
        label: 'GCP Project ID',
        type: 'text',
        required: true,
        placeholder: 'Enter your GCP Project ID'
      },
      {
        name: 'client_id',
        label: 'OAuth Client ID',
        type: 'text',
        required: true,
        placeholder: 'Enter your OAuth Client ID'
      },
      {
        name: 'client_secret',
        label: 'OAuth Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter your OAuth Client Secret'
      }
    ],
    connected: false,
    icon: <GCPIcon />
  },
  // DevOps Tools
  {
    id: 'github',
    title: "GitHub",
    description: "Connect your GitHub repositories and workflows",
    type: 'oauth2',
    fields: [
      {
        name: 'client_id',
        label: 'GitHub OAuth Client ID',
        type: 'text',
        required: true,
        placeholder: 'Enter your GitHub OAuth Client ID'
      },
      {
        name: 'client_secret',
        label: 'GitHub OAuth Client Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter your GitHub OAuth Client Secret'
      }
    ],
    connected: false,
    icon: <GitHubIcon />
  },
  {
    id: 'gitlab',
    title: "GitLab",
    description: "Connect your GitLab repositories and CI/CD pipelines",
    type: 'oauth2',
    fields: [
      {
        name: 'application_id',
        label: 'GitLab Application ID',
        type: 'text',
        required: true,
        placeholder: 'Enter your GitLab Application ID'
      },
      {
        name: 'secret',
        label: 'GitLab Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter your GitLab Secret'
      }
    ],
    connected: false,
    icon: <GitLabIcon />
  },
  {
    id: 'docker',
    title: "Docker",
    description: "Connect to Docker registries and manage containers",
    type: 'api_key',
    fields: [
      {
        name: 'username',
        label: 'Docker Username',
        type: 'text',
        required: true,
        placeholder: 'Enter your Docker username'
      },
      {
        name: 'password',
        label: 'Docker Password/Token',
        type: 'password',
        required: true,
        placeholder: 'Enter your Docker password or access token'
      },
      {
        name: 'registry',
        label: 'Registry URL',
        type: 'text',
        required: false,
        placeholder: 'Optional: Enter custom registry URL'
      }
    ],
    connected: false,
    icon: <DockerIcon />
  },
  // Container Orchestration
  {
    id: 'kubernetes',
    title: "Kubernetes",
    description: "Connect and manage your Kubernetes clusters",
    type: 'api_key',
    fields: [
      {
        name: 'kube_config',
        label: 'Kubeconfig File',
        type: 'text',
        required: true,
        placeholder: 'Paste your kubeconfig content'
      },
      {
        name: 'context',
        label: 'Context',
        type: 'text',
        required: false,
        placeholder: 'Optional: Specify Kubernetes context'
      }
    ],
    connected: false,
    icon: <KubernetesIcon />
  },
  // Infrastructure as Code
  {
    id: 'terraform',
    title: "Terraform",
    description: "Manage your infrastructure as code with Terraform",
    type: 'api_key',
    fields: [
      {
        name: 'token',
        label: 'API Token',
        type: 'password',
        required: true,
        placeholder: 'Enter your Terraform Cloud API token'
      },
      {
        name: 'organization',
        label: 'Organization',
        type: 'text',
        required: true,
        placeholder: 'Enter your Terraform organization name'
      }
    ],
    connected: false,
    icon: <TerraformIcon />
  },
  // Monitoring & Observability
  {
    id: 'prometheus',
    title: "Prometheus",
    description: "Connect to your Prometheus monitoring system",
    type: 'api_key',
    fields: [
      {
        name: 'url',
        label: 'Prometheus URL',
        type: 'text',
        required: true,
        placeholder: 'Enter your Prometheus server URL'
      },
      {
        name: 'token',
        label: 'Access Token',
        type: 'password',
        required: false,
        placeholder: 'Optional: Enter access token if required'
      }
    ],
    connected: false,
    icon: <PrometheusIcon />
  },
  // CI/CD
  {
    id: 'jenkins',
    title: "Jenkins",
    description: "Connect to your Jenkins CI/CD pipelines",
    type: 'basic_auth',
    fields: [
      {
        name: 'url',
        label: 'Jenkins URL',
        type: 'text',
        required: true,
        placeholder: 'Enter your Jenkins server URL'
      },
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        required: true,
        placeholder: 'Enter your Jenkins username'
      },
      {
        name: 'token',
        label: 'API Token',
        type: 'password',
        required: true,
        placeholder: 'Enter your Jenkins API token'
      }
    ],
    connected: false,
    icon: <JenkinsIcon />
  },
  // Configuration Management
  {
    id: 'ansible',
    title: "Ansible",
    description: "Connect to your Ansible automation platform",
    type: 'api_key',
    fields: [
      {
        name: 'url',
        label: 'Ansible Tower URL',
        type: 'text',
        required: true,
        placeholder: 'Enter your Ansible Tower URL'
      },
      {
        name: 'token',
        label: 'API Token',
        type: 'password',
        required: true,
        placeholder: 'Enter your Ansible Tower token'
      }
    ],
    connected: false,
    icon: <AnsibleIcon />
  }
];
