import { getProducts, getStats } from '@/lib/data';
import { ProductCard } from '@/components/ProductCard';
import { StatsPanel } from '@/components/StatsPanel';
import { TraceDemo } from '@/components/TraceDemo';
import styles from './page.module.css';

export default async function Home() {
  // These function calls will be traced by TraceInject
  const products = await getProducts();
  const stats = await getStats();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoAccent}>Trace</span>Inject
        </div>
        <p className={styles.tagline}>Remote Debugging Demo</p>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.title}>
          Build-time Instrumentation
          <span className={styles.gradient}> Made Simple</span>
        </h1>
        <p className={styles.description}>
          This Next.js app demonstrates TraceInject's remote debugging capabilities.
          All function calls are automatically traced and sent to the trace server.
        </p>
      </section>

      <TraceDemo />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Live Stats</h2>
        <StatsPanel stats={stats} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Products</h2>
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          View traces in real-time by running <code>npm run trace-server</code>
        </p>
      </footer>
    </main>
  );
}
