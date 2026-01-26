import apiClient from './client';
import type {
  InitiatePaymentData,
  PaymentResponse,
  VerifyPaymentResponse,
} from '../types/payment.types';

export const paymentsApi = {
  initiate: async (orderId: number, data: InitiatePaymentData): Promise<PaymentResponse> => {
    const response = await apiClient.post<PaymentResponse>(
      `/orders/${orderId}/payments/initiate`,
      data
    );
    return response.data;
  },

  verify: async (reference: string): Promise<VerifyPaymentResponse> => {
    const response = await apiClient.get<VerifyPaymentResponse>(`/payments/${reference}/verify`);
    return response.data;
  },
};
