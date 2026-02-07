import { EventList } from "./event-list";
import { mockSREEvents } from "@/lib/sre-events";
import { EventsNewHeader } from "./events-header";

export default function EventsNewPage() {
  return (
    <div className="relative min-h-screen">
      <EventsNewHeader />
      <EventList events={mockSREEvents} />
    </div>
  );
}
