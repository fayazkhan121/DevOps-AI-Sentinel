import axios from 'axios';
import type { Integration, CloudProvider } from '../types';
import { WebClient } from '@slack/web-api';
import * as nodemailer from 'nodemailer';

export class IntegrationService {
  private baseUrl: string;
  private apiKey: string;
  private slackClient: WebClient;
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.baseUrl = process.env.VITE_API_URL || '';
    this.apiKey = process.env.VITE_API_KEY || '';
    this.slackClient = new WebClient(process.env.VITE_SLACK_TOKEN);
    
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.VITE_SMTP_HOST,
      port: parseInt(process.env.VITE_SMTP_PORT || '587'),
      secure: process.env.VITE_SMTP_SECURE === 'true',
      auth: {
        user: process.env.VITE_SMTP_USER,
        pass: process.env.VITE_SMTP_PASS
      }
    });
  }

  async connectCloudProvider(type: 'aws' | 'azure' | 'gcp', credentials: any): Promise<CloudProvider> {
    const response = await axios.post(`${this.baseUrl}/cloud/${type}/connect`, credentials, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  async sendSlackNotification(channel: string, message: string): Promise<void> {
    await this.slackClient.chat.postMessage({
      channel,
      text: message,
      unfurl_links: false
    });
  }

  async sendEmailNotification(to: string[], subject: string, html: string): Promise<void> {
    await this.emailTransporter.sendMail({
      from: process.env.VITE_SMTP_FROM,
      to: to.join(', '),
      subject,
      html
    });
  }

  async connectKubernetes(config: any): Promise<Integration> {
    const response = await axios.post(`${this.baseUrl}/kubernetes/connect`, config, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  async connectDocker(config: any): Promise<Integration> {
    const response = await axios.post(`${this.baseUrl}/docker/connect`, config, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  async connectJenkins(config: any): Promise<Integration> {
    const response = await axios.post(`${this.baseUrl}/jenkins/connect`, config, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  async connectAzureDevOps(config: any): Promise<Integration> {
    const response = await axios.post(`${this.baseUrl}/azure-devops/connect`, config, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }
}