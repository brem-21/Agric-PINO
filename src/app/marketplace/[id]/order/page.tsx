import { OrderPageClient } from "./order-page-client";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderPageClient listingId={id} />;
}
