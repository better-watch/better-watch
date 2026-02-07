'use client';

import { useState } from 'react';
import styles from './TraceDemo.module.css';

export function TraceDemo() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(`Found ${data.results.length} products`);
    } catch {
      setResults('Search failed - check trace server for details');
    } finally {
      setLoading(false);
    }
  };

  const triggerTrace = async () => {
    setLoading(true);
    try {
      await fetch('/api/demo-trace', { method: 'POST' });
      setResults('Trace triggered! Check the trace server console.');
    } catch {
      setResults('Failed to trigger trace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>Interactive Trace Demo</h2>
      <p className={styles.description}>
        Trigger traces and watch them appear in the trace server terminal
      </p>

      <div className={styles.actions}>
        <div className={styles.searchBox}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className={styles.input}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className={styles.button}
          >
            Search
          </button>
        </div>

        <button
          onClick={triggerTrace}
          disabled={loading}
          className={`${styles.button} ${styles.primary}`}
        >
          {loading ? 'Sending...' : 'Trigger Demo Trace'}
        </button>
      </div>

      {results && (
        <div className={styles.results}>
          <span className={styles.indicator}>●</span>
          {results}
        </div>
      )}
    </section>
  );
}
