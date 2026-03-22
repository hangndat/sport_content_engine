export interface PublishResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface IPublisher {
  publish(content: string, options?: Record<string, unknown>): Promise<PublishResult>;
}
