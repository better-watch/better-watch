import { notFound } from "next/navigation";
import { getEventById } from "@/lib/sre-events";
import { EventDetailView } from "@/app/components/event-detail-view";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();
  return <EventDetailView event={event} />;
}
