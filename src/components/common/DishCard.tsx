import { Link } from "react-router-dom";
import { Card } from "./Card";
import { MenuItemImage } from "./MenuItemImage";
import {
  UtensilsCrossed,
  ShoppingCart,
  Plus,
  Minus,
  Heart,
  Star,
} from "lucide-react";
import type { MenuItem } from "../../types/order.types";
import type { Restaurant } from "../../types/restaurant.types";

interface MenuItemWithRestaurant extends MenuItem {
  restaurant?: Restaurant;
}

interface DishCardProps {
  item: MenuItemWithRestaurant;
  quantity: number;
  isFavorite: boolean;
  rating?: { average: number; count: number };
  userRating?: { rating: number; id: number };
  onQuantityChange: (itemId: number, delta: number) => void;
  onAddToCart: (item: MenuItemWithRestaurant) => void;
  onToggleFavorite: (itemId: number) => void;
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-KE", { minimumFractionDigits: 0 }).format(n);

export const DishCard = ({
  item,
  quantity,
  isFavorite,
  rating,
  userRating,
  onQuantityChange,
  onAddToCart,
  onToggleFavorite,
}: DishCardProps) => {
  return (
    <Card
      padding="none"
      className="overflow-hidden flex flex-col hover:shadow-md transition-shadow border border-gray-100"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] max-h-40 bg-gray-100">
        <MenuItemImage
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        {!item.is_available && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-500/95 text-white text-xs font-semibold">
            Out of Stock
          </div>
        )}
        <button
          type="button"
          onClick={() => onToggleFavorite(item.id)}
          className={`absolute top-2 right-2 p-1.5 rounded-full shadow-md transition-colors ${
            isFavorite ? "bg-red-500 text-white" : "bg-white/90 text-gray-700 hover:bg-white"
          }`}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1 min-w-0">
        <Link
          to={`/stores/${item.restaurant_id}/menu`}
          className="text-xs font-medium text-primary-600 hover:text-primary-700 mb-0.5"
        >
          View store
        </Link>
        <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h3>

        {/* Rating: stars + count (e.g. 1, 5, 10) */}
        <div className="flex items-center gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-3 w-3 ${
                userRating
                  ? star <= userRating.rating
                    ? "text-amber-500 fill-amber-500"
                    : "text-gray-300"
                  : rating && rating.count > 0
                    ? star <= Math.round(rating.average)
                      ? "text-amber-500 fill-amber-500"
                      : "text-gray-300"
                    : "text-gray-300"
              }`}
            />
          ))}
          {(rating?.count != null && rating.count > 0) || userRating ? (
            <span className="text-xs text-gray-500 ml-0.5">
              {rating?.count ?? (userRating ? 1 : 0)}
            </span>
          ) : null}
        </div>

        <p className="text-xs text-gray-500 line-clamp-1 flex-1 mt-0.5">{item.description}</p>

        {/* Price and total (when qty > 1) on same row */}
        <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-primary-600">KSH {formatPrice(item.price)}</span>
            {quantity > 1 && (
              <span className="text-xs text-gray-500">
                · Total: <span className="font-semibold text-gray-700">KSH {formatPrice(item.price * quantity)}</span>
              </span>
            )}
          </div>
          {!item.is_available && (
            <span className="text-xs text-red-600 font-medium">Unavailable</span>
          )}
        </div>

        {item.is_available && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => onQuantityChange(item.id, -1)}
                className="p-1.5 hover:bg-gray-100 rounded-l-lg disabled:opacity-50"
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 min-w-[2rem] text-center text-sm font-medium">{quantity}</span>
              <button
                type="button"
                onClick={() => onQuantityChange(item.id, 1)}
                className="p-1.5 hover:bg-gray-100 rounded-r-lg disabled:opacity-50"
                disabled={quantity >= 50}
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium"
              aria-label={`Add ${quantity} to cart`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </div>
        )}

        {!item.is_available && (
          <div className="mt-2">
            <button
              type="button"
              className="w-full py-2 border border-gray-300 text-gray-500 rounded-lg text-xs flex items-center justify-center gap-1.5"
              disabled
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Notify when available
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};
