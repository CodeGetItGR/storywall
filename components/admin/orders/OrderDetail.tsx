'use client';

import { OrderActivitySection } from '@/components/admin/orders/OrderActivitySection';
import { OrderBuyerSection } from '@/components/admin/orders/OrderBuyerSection';
import { OrderPaymentSection } from '@/components/admin/orders/OrderPaymentSection';
import { OrderPriceSection } from '@/components/admin/orders/OrderPriceSection';
import { OrderRecordSection } from '@/components/admin/orders/OrderRecordSection';
import { OrderSummaryHeader } from '@/components/admin/orders/OrderSummaryHeader';
import type { AdminOrderDetailDto } from '@/lib/api/types';

// The story of the order on the left (price, then what happened); reference facts
// on the right, always in the same place. Below lg the right column drops underneath.
export function OrderDetail({ order }: { order: AdminOrderDetailDto }) {
    return (
        <div className="max-w-6xl space-y-5">
            {/* Summary */}
            <OrderSummaryHeader order={order} />

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                {/* Story */}
                <div className="space-y-5">
                    <OrderPriceSection pricing={order.pricing} />
                    <OrderActivitySection order={order} />
                </div>

                {/* Reference */}
                <div className="space-y-5">
                    <OrderBuyerSection buyer={order.buyer} />
                    <OrderPaymentSection payment={order.payment} />
                    <OrderRecordSection order={order} />
                </div>
            </div>
        </div>
    );
}
