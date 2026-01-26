export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Payment {
  id: number;
  order_id: number;
  reference: string;
  amount: number;
  status: PaymentStatus;
  phone_number: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface InitiatePaymentData {
  phone_number: string;
}

export interface PaymentResponse {
  message: string;
  data: Payment;
}

export interface VerifyPaymentResponse {
  message: string;
  data: {
    status: PaymentStatus;
    reference: string;
  };
}
