import { Link } from "react-router-dom";
import { Card } from "./Card";
import { MenuItemImage } from "./MenuItemImage";
import {
  UtensilsCrossed,
  ShoppingCart,
  Plus,
  Minus,
  ChevronRight,
  Heart,
  Star,
  Info,
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
    <Card className="group relative overflow-hidden border border-gray-100 bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Image with overlay and quick actions */}
      <div className="relative overflow-hidden">
        <div className="aspect-square">
          <MenuItemImage
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Image overlay with gradient and quick actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top badges */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1">
          {!item.is_available && (
            <div className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-500/95 backdrop-blur-sm text-white text-[10px] sm:text-xs font-semibold rounded-full shadow-lg">
              Out of Stock
            </div>
          )}
        </div>

        {/* Quick actions (appears on hover) */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-1.5 sm:gap-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <button
            onClick={() => onToggleFavorite(item.id)}
            className={`p-1.5 sm:p-2 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 ${
              isFavorite
                ? "bg-red-500/95 text-white"
                : "bg-white/90 text-gray-800 hover:bg-white"
            }`}
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Heart
              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isFavorite ? "fill-current" : ""}`}
            />
          </button>
          {item.is_available && (
            <button
              onClick={() => onAddToCart(item)}
              className="p-1.5 sm:p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-300"
              aria-label={`Quick add ${item.name} to cart`}
            >
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-800" />
            </button>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
        {/* Restaurant link with subtle styling */}
        <div className="mb-1">
          <Link
            to={`/stores/${item.restaurant_id}/menu`}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-primary-600 transition-colors group/link"
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
              <UtensilsCrossed className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-gray-400" />
            </div>
            <span className="truncate text-xs">
              {item.restaurant?.name || "Restaurant"}
            </span>
            <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </Link>
        </div>

        {/* Item name */}
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1 flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-primary-700 transition-colors flex-1">
                {item.name}
              </h3>
              {item.description && (
                <div className="relative group/info shrink-0 mt-0.5">
                  <button
                    className="p-0.5 text-gray-400 hover:text-primary-600 transition-colors rounded-full hover:bg-primary-50"
                    aria-label="Show description"
                  >
                    <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-b from-gray-800 to-gray-900 text-white text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible group-hover/info:translate-y-0 translate-y-1 transition-all duration-300 pointer-events-none z-20 max-w-[240px] border border-gray-700/50 backdrop-blur-sm">
                    <p className="whitespace-normal leading-relaxed text-gray-100">
                      {item.description}
                    </p>
                    {/* Arrow */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-800 drop-shadow-lg"></div>
                  </div>
                </div>
              )}
            </div>
            {isFavorite && (
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 fill-current shrink-0" />
            )}
          </div>
        </div>

        {/* Price and Add to Cart Section */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between gap-3">
            {/* Price - Centered */}
            <div className="flex-1 flex justify-center">
              <span className="flex items-center gap-1 text-lg sm:text-xl text-gray-900">
                <span className="text-xs sm:text-sm">KSH</span>{' '}
                <span className="font-bold">
                  {new Intl.NumberFormat('en-KE', {
                    minimumFractionDigits: 0,
                  }).format(item.price)}
                </span>
              </span>
            </div>

            {/* Quantity Selector with Cart Icon - Inline */}
            {item.is_available && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5 sm:p-1">
                  <button
                    onClick={() => onQuantityChange(item.id, -1)}
                    disabled={quantity <= 1}
                    className="p-1 sm:p-1.5 rounded-md hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-700" />
                  </button>

                  <div className="min-w-[1.75rem] sm:min-w-[2rem] text-center">
                    <span className="text-sm sm:text-base font-bold text-gray-900">
                      {quantity}
                    </span>
                  </div>

                  <button
                    onClick={() => onQuantityChange(item.id, 1)}
                    disabled={quantity >= 50}
                    className="p-1 sm:p-1.5 rounded-md hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-700" />
                  </button>
                </div>

                {/* Cart Icon Button */}
                <button
                  onClick={() => onAddToCart(item)}
                  className="p-2 sm:p-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center"
                  aria-label={`Add ${quantity} ${item.name} to cart`}
                  title={`Add ${quantity} to cart`}
                >
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            )}
          </div>
          {/* Total Price Display - Centered at bottom */}
          {quantity > 1 && (
            <div className="text-center mt-1.5">
              <span className="text-xs text-gray-500">
                Total: KSH{' '}
                <span className="font-semibold text-gray-700">
                  {new Intl.NumberFormat('en-KE', {
                    minimumFractionDigits: 0,
                  }).format(item.price * quantity)}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Out of Stock Alternative */}
        {!item.is_available && (
          <div className="pt-2">
            <button
              className="w-full py-2 sm:py-2.5 border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
              disabled
            >
              <UtensilsCrossed className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
              <span className="text-xs sm:text-sm">Notify When Available</span>
            </button>
            <p className="text-xs text-gray-500 text-center mt-1.5">
              Get notified when this item is back in stock
            </p>
          </div>
        )}

        {/* Rating Display - Bottom of card */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-center gap-2">
            {/* Display user's rating if exists, otherwise show average */}
            {userRating ? (
              <>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-colors ${
                        star <= userRating.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  Your rating
                </span>
              </>
            ) : (
              <>
                {/* Display filled stars based on average rating */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    if (rating && rating.count > 0) {
                      const filled = star <= Math.floor(rating.average);
                      const halfFilled = star === Math.ceil(rating.average) && rating.average % 1 >= 0.5;
                      return (
                        <Star
                          key={star}
                          className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-colors ${
                            filled
                              ? 'text-yellow-400 fill-current'
                              : halfFilled
                              ? 'text-yellow-400 fill-current opacity-50'
                              : 'text-gray-200'
                          }`}
                        />
                      );
                    }
                    return (
                      <Star
                        key={star}
                        className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-200"
                      />
                    );
                  })}
                </div>
                {/* Show count badge only if ratings exist */}
                {rating && rating.count > 0 && (
                  <span className="text-xs text-gray-500 font-medium">
                    {rating.count}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
