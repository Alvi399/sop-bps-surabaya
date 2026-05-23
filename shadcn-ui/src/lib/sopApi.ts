import apiClient from './api';
import { SOPDocument } from '@/types';

export class SOPApi {
  // Get all SOPs
  static async getAllSOPs(): Promise<SOPDocument[]> {
    const response = await apiClient.get('/sops');
    return response.data;
  }

  // Get SOP by ID
  static async getSOPById(id: string): Promise<SOPDocument> {
    const response = await apiClient.get(`/sops/${id}`);
    return response.data;
  }

  // Create SOP
  static async createSOP(data: Partial<SOPDocument>): Promise<SOPDocument> {
    const response = await apiClient.post('/sops', data);
    return response.data;
  }

  // Update SOP
  static async updateSOP(id: string, data: Partial<SOPDocument>): Promise<SOPDocument> {
    const response = await apiClient.put(`/sops/${id}`, data);
    return response.data;
  }

  // Delete SOP
  static async deleteSOP(id: string): Promise<void> {
    await apiClient.delete(`/sops/${id}`);
  }

  // Search SOPs
  static async searchSOPs(query: string): Promise<SOPDocument[]> {
    const response = await apiClient.get(`/sops/search/${encodeURIComponent(query)}`);
    return response.data;
  }
}