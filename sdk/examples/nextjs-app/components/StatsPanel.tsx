import type { Stats } from '@/lib/data';
import styles from './StatsPanel.module.css';

interface StatsPanelProps {
  stats: Stats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.stat}>
        <span className={styles.value}>{stats.totalProducts}</span>
        <span className={styles.label}>Total Products</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={styles.value}>
          ${stats.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
        <span className={styles.label}>Inventory Value</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={`${styles.value} ${stats.lowStockCount > 0 ? styles.warning : ''}`}>
          {stats.lowStockCount}
        </span>
        <span className={styles.label}>Low Stock Items</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={styles.value}>{stats.categories.length}</span>
        <span className={styles.label}>Categories</span>
      </div>
    </div>
  );
}
