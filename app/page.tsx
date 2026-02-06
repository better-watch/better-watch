import { TimeMachine } from './components/time-machine';
import { mockSREEvents } from '@/lib/sre-events';

export default function Home() {
  return (
    <div
      className="relative min-h-screen"
      style={{
        backgroundImage:
          'radial-gradient(circle, var(--border-color) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <TimeMachine events={mockSREEvents} />
    </div>
  );
}
