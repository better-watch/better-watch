import { TimeMachine } from '../components/time-machine';
import { mockSREEvents } from '@/lib/sre-events';
import { EventsHeader } from './events-header';

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <EventsHeader />
      <TimeMachine events={mockSREEvents} />
    </div>
  );
}
