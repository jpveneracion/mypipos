'use client';

import * as React from 'react';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  quantity?: number;
  onAdd?: (product: Product) => void;
  onClick?: (product: Product) => void;
  className?: string;
}

const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(({ product, quantity = 0, onAdd, onClick, className }, ref) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  const handleClick = () => { onClick?.(product); };
  const handleAddToCart = (e: React.MouseEvent) => { e.stopPropagation(); onAdd?.(product); };

  const stockStatus = React.useMemo(() => {
    if (product.stock <= 0) return { label: 'Out of Stock', color: 'text-error-600' };
    if (product.stock <= product.minStock) return { label: 'Low Stock', color: 'text-warning-600' };
    return { label: 'In Stock', color: 'text-success-600' };
  }, [product.stock, product.minStock]);

  return (
    <Card
      ref={ref}
      className={cn(
        'cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-medium',
        'group relative overflow-hidden',
        quantity > 0 && 'ring-2 ring-primary-500 ring-offset-2',
        className
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        <div className="aspect-square bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 rounded-xl mb-3 flex items-center justify-center overflow-hidden relative">
          {!imageError && product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" onError={() => setImageError(true)} />
          ) : (
            <div className="text-6xl">🛍️</div>
          )}

          {isHovered && product.stock > 0 && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in">
              <Button size="sm" onClick={handleAddToCart} className="transform scale-110">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          )}

          {quantity > 0 && (
            <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-medium animate-scale-in">
              {quantity}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="font-semibold text-neutral-900 dark:text-white text-sm line-clamp-1 group-hover:text-primary-600 transition-colors">
            {product.name}
          </h3>

          <div className="flex items-center justify-between">
            <p className="text-primary-600 dark:text-primary-400 font-bold text-lg">{product.price.toFixed(7)} Test-π</p>
            <span className={cn('text-xs font-medium', stockStatus.color)}>{stockStatus.label}</span>
          </div>

          {product.sku && <p className="text-xs text-neutral-500 dark:text-neutral-400">SKU: {product.sku}</p>}
          {product.stock > 0 && <p className="text-xs text-neutral-600 dark:text-neutral-400">Stock: {product.stock}</p>}
        </div>
      </CardContent>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';

export { ProductCard };
