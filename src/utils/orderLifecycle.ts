import type { Order } from '../types/order.types';
import type { OrderStatus } from '../types/order.types';
import { ORDER_STATUS_TRANSITIONS } from './constants';

/** Order is unpaid: either payment_status is unpaid/pending, or status is pending and not paid. */
export function isUnpaid(order: Order | null | undefined): boolean {
  if (!order) return false;
  const ps = (order.payment_status ?? '').toLowerCase();
  if (ps === 'paid') return false;
  if (ps === 'unpaid' || ps === 'pending') return true;
  return order.status === 'pending';
}

/** Order can be cancelled from pending, preparing, or on_the_way. Not delivered/cancelled. */
export function canCancelOrder(order: Order | null | undefined): boolean {
  if (!order) return false;
  return ['pending', 'preparing', 'on_the_way'].includes(order.status);
}

/** Next allowed status transitions for manual updates (store/rider). */
export function getNextStatusTransitions(order: Order | null | undefined): OrderStatus[] {
  if (!order) return [];
  return (ORDER_STATUS_TRANSITIONS[order.status] ?? []) as OrderStatus[];
}

/** Whether store/rider can update status (preparing→on_the_way or on_the_way→delivered). */
export function canUpdateOrderStatus(order: Order | null | undefined): boolean {
  return getNextStatusTransitions(order).length > 0;
}
