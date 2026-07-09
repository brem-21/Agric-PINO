import { ListingDetailClient } from "./listing-detail-client";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingDetailClient id={id} />;
}
