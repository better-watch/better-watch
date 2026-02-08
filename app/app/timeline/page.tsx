import { TimeMachine } from '../components/time-machine';
import { mockSREEvents } from '@/lib/sre-events';
import { TimelineHeader } from './timeline-header';

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <TimelineHeader />
      <TimeMachine events={mockSREEvents} />
    </div>
  );
}
