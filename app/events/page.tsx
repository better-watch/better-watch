import { TimeMachine } from '../components/time-machine';
import { mockSREEvents } from '@/lib/sre-events';

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <TimeMachine events={mockSREEvents} />
    </div>
  );
}
