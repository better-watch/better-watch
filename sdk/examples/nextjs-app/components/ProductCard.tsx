import type { Product } from '@/lib/data';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const isLowStock = product.stock < 10;

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <span className={styles.category}>{product.category}</span>
        {isLowStock && <span className={styles.lowStock}>Low Stock</span>}
      </div>
      <h3 className={styles.name}>{product.name}</h3>
      <div className={styles.footer}>
        <span className={styles.price}>
          ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        <span className={styles.stock}>{product.stock} in stock</span>
      </div>
    </article>
  );
}
