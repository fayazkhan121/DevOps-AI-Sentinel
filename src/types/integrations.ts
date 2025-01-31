export type IntegrationType = 
  | 'api_key' 
  | 'oauth2' 
  | 'basic_auth' 
  | 'certificate' 
  | 'token';

export interface IntegrationConfig {
  id: string;
  title: string;
  description: string;
  type: IntegrationType;
  fields: IntegrationField[];
  connected: boolean;
  icon: React.ReactNode;
}

export interface IntegrationField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface IntegrationCredentials {
  [key: string]: string;
}