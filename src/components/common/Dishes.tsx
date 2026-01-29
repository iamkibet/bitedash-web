import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Spinner } from "./Spinner";
import { Input } from "./Input";
import { DishCard } from "./DishCard";
import { LoginModal } from "./LoginModal";
import {
  UtensilsCrossed,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ratingsApi } from "../../api/ratings";
import { useAuthStore } from "../../store/authStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { toast } from "sonner";
import type { MenuItem } from "../../types/order.types";
import type { Restaurant } from "../../types/restaurant.types";

interface MenuItemWithRestaurant extends MenuItem {
  restaurant?: Restaurant;
}

interface DishesProps {
  allMenuItems: MenuItemWithRestaurant[];
  restaurants: Restaurant[];
  isLoading: boolean;
  quantities: Record<number, number>;
  onQuantityChange: (itemId: number, delta: number) => void;
  onAddToCart: (item: MenuItemWithRestaurant) => void;
}

export const Dishes = ({
  allMenuItems,
  restaurants,
  isLoading,
  quantities,
  onQuantityChange,
  onAddToCart,
}: DishesProps) => {
  const { isAuthenticated, user, role } = useAuthStore();
  const {
    favoriteIds,
    fetchFavorites,
    addFavorite,
    removeFavorite,
  } = useFavoritesStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<number[]>(
    [],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [ratings, setRatings] = useState<
    Record<number, { average: number; count: number }>
  >({});
  const [userRatings, setUserRatings] = useState<
    Record<number, { rating: number; id: number }>
  >({});
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingFavoriteItemId, setPendingFavoriteItemId] = useState<
    number | null
  >(null);
  const itemsPerPage = 8;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterDropdownOpen(false);
      }
    };

    if (isFilterDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterDropdownOpen]);


  const fetchRatings = useCallback(async () => {
    try {
      const ratingsMap: Record<number, { average: number; count: number }> = {};
      const userRatingsMap: Record<number, { rating: number; id: number }> = {};

      // Fetch ratings for unique menu items
      const uniqueItemIds = [...new Set(allMenuItems.map((item) => item.id))];

      await Promise.all(
        uniqueItemIds.map(async (itemId) => {
          try {
            const response = await ratingsApi.getByMenuItem(itemId);
            const ratings = response.data || [];
            
            // Find user's rating if authenticated
            if (isAuthenticated && user?.id) {
              const userRating = ratings.find((r) => r.user_id === user.id);
              if (userRating) {
                userRatingsMap[itemId] = {
                  rating: userRating.rating,
                  id: userRating.id,
                };
              }
            }
            
            // Calculate stats from ratings array if server doesn't provide stats
            let average = 0;
            let count = ratings.length;
            
            if (response.stats) {
              // Use server-provided stats if available
              average = response.stats.average_rating;
              count = response.stats.total_ratings;
            } else if (ratings.length > 0) {
              // Calculate average from ratings array
              const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
              average = sum / ratings.length;
            }
            
            if (count > 0) {
              ratingsMap[itemId] = {
                average,
                count,
              };
            }
          } catch (error) {
            // Ignore errors for individual items
            console.error(`Failed to fetch rating for item ${itemId}:`, error);
          }
        }),
      );

      setRatings(ratingsMap);
      setUserRatings(userRatingsMap);
    } catch (error) {
      console.error("Failed to fetch ratings:", error);
    }
  }, [allMenuItems, isAuthenticated, user]);

  // Fetch favorites only for customers (API returns 403 for other roles)
  useEffect(() => {
    if (isAuthenticated && role === 'customer' && allMenuItems.length > 0) {
      void fetchFavorites();
    }
  }, [isAuthenticated, role, allMenuItems.length, fetchFavorites]);

  // Fetch ratings when authenticated
  useEffect(() => {
    if (!isAuthenticated || allMenuItems.length === 0) {
      return;
    }

    // Defer async call to avoid synchronous setState
    const timer = setTimeout(() => {
      void fetchRatings();
    }, 0);

    return () => clearTimeout(timer);
  }, [isAuthenticated, allMenuItems.length, fetchRatings]);

  // Handle adding pending favorite after login
  useEffect(() => {
    if (isAuthenticated && pendingFavoriteItemId !== null) {
      const addPendingFavorite = async () => {
        try {
          await addFavorite(pendingFavoriteItemId);
          setPendingFavoriteItemId(null);
        } catch (error) {
          console.error("Failed to add pending favorite:", error);
        }
      };
      addPendingFavorite();
    }
  }, [isAuthenticated, pendingFavoriteItemId, addFavorite]);

  const handleToggleFavorite = async (menuItemId: number) => {
    if (!isAuthenticated) {
      // Show login modal and store the pending favorite item
      setPendingFavoriteItemId(menuItemId);
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const isFavorite = favoriteIds.has(menuItemId);
      if (isFavorite) {
        await removeFavorite(menuItemId);
      } else {
        await addFavorite(menuItemId);
      }
    } catch (error: unknown) {
      console.error("Failed to toggle favorite:", error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to update favorite";
      toast.error(errorMessage);
    }
  };

  // Filter menu items based on search query and restaurant filter
  const filteredMenuItems = useMemo(() => {
    return allMenuItems.filter((item) => {
      // Restaurant filter - check if item's restaurant is in selected list
      if (
        selectedRestaurantIds.length > 0 &&
        !selectedRestaurantIds.includes(item.restaurant_id)
      ) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.restaurant?.name.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [allMenuItems, searchQuery, selectedRestaurantIds]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredMenuItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredMenuItems.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleRestaurantToggle = (restaurantId: number) => {
    setSelectedRestaurantIds((prev) => {
      if (prev.includes(restaurantId)) {
        return prev.filter((id) => id !== restaurantId);
      } else {
        return [...prev, restaurantId];
      }
    });
    setCurrentPage(1);
  };

  const removeRestaurantFilter = (restaurantId: number) => {
    setSelectedRestaurantIds((prev) =>
      prev.filter((id) => id !== restaurantId),
    );
    setCurrentPage(1);
  };

  const selectedRestaurants = restaurants.filter((r) =>
    selectedRestaurantIds.includes(r.id),
  );

  const hasActiveFilters =
    searchQuery.trim() !== "" || selectedRestaurantIds.length > 0;

  return (
    <>
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          // Clear pending favorite if user closes modal without logging in
          if (!isAuthenticated) {
            setPendingFavoriteItemId(null);
          }
        }}
        onLoginSuccess={() => {
          // The useEffect will handle adding the pending favorite
        }}
      />
      {/* Search and Filter Section */}
      <div className="mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Discover Your Favorites
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Search for your favorite dishes and explore restaurants. Find
              exactly what you're craving with our powerful search and filter
              tools.
            </p>
          </div>

          {/* Search and Filter Bar - Same Line */}
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search dishes, restaurants..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-12 pr-4 py-3 h-auto text-base"
                />
              </div>

              {/* Restaurant Filter - Clickable icon with dropdown */}
              <div className="relative" ref={filterDropdownRef}>
                <button
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className={`flex items-center justify-center gap-2 px-6 py-3 h-auto text-base border rounded-lg transition-all whitespace-nowrap ${
                    selectedRestaurantIds.length > 0
                      ? "bg-primary-50 border-primary-300 text-primary-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                  }`}
                  aria-label="Filter by restaurant"
                >
                  <Filter
                    className={`h-5 w-5 ${selectedRestaurantIds.length > 0 ? "text-primary-600" : "text-gray-400"}`}
                  />
                  <span className="hidden sm:inline">
                    {selectedRestaurantIds.length > 0
                      ? `Filters (${selectedRestaurantIds.length})`
                      : "Filter"}
                  </span>
                  {selectedRestaurantIds.length > 0 && (
                    <span className="sm:hidden bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {selectedRestaurantIds.length}
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isFilterDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Filter by Restaurant
                      </h3>
                      {selectedRestaurantIds.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedRestaurantIds.length} restaurant
                          {selectedRestaurantIds.length !== 1 ? "s" : ""}{" "}
                          selected
                        </p>
                      )}
                    </div>
                    <div className="overflow-y-auto max-h-64">
                      {restaurants.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <p className="text-sm text-gray-500">
                            No restaurants available
                          </p>
                        </div>
                      ) : (
                        <div className="py-2">
                          {restaurants.map((restaurant) => (
                            <label
                              key={restaurant.id}
                              className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedRestaurantIds.includes(
                                  restaurant.id,
                                )}
                                onChange={() =>
                                  handleRestaurantToggle(restaurant.id)
                                }
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700 flex-1">
                                {restaurant.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-4 justify-center md:justify-start">
                {searchQuery.trim() && (
                  <Badge
                    variant="default"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm"
                  >
                    <span>Search: "{searchQuery}"</span>
                    <button
                      onClick={() => handleSearchChange("")}
                      className="ml-1 hover:text-gray-700 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                {selectedRestaurants.map((restaurant) => (
                  <Badge
                    key={restaurant.id}
                    variant="default"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm"
                  >
                    <span>Restaurant: {restaurant.name}</span>
                    <button
                      onClick={() => removeRestaurantFilter(restaurant.id)}
                      className="ml-1 hover:text-gray-700 transition-colors"
                      aria-label={`Remove ${restaurant.name} filter`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Available Goodies Section */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-normal text-gray-700">
            {hasActiveFilters
              ? `Search Results (${filteredMenuItems.length})`
              : `Available Goodies (${filteredMenuItems.length})`}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Spinner size="lg" />
          </div>
        ) : filteredMenuItems.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <UtensilsCrossed className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-600 mb-2">
                {hasActiveFilters
                  ? "No items found matching your filters"
                  : "No items available at the moment"}
              </p>
              <p className="text-gray-500">
                {hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "Check back later for new items"}
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedItems.map((item) => (
                <div key={item.id} id={`dish-${item.id}`}>
                  <DishCard
                    item={item}
                    quantity={quantities[item.id] || 1}
                    isFavorite={favoriteIds.has(item.id)}
                    rating={ratings[item.id]}
                    userRating={userRatings[item.id]}
                    onQuantityChange={onQuantityChange}
                    onAddToCart={onAddToCart}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-gray-600">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(endIndex, filteredMenuItems.length)} of{" "}
                  {filteredMenuItems.length} items
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => {
                        // Show first page, last page, current page, and pages around current
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`px-2.5 py-1 text-sm rounded-md border transition-colors ${
                                currentPage === page
                                  ? "bg-primary-600 text-white border-primary-600"
                                  : "border-gray-300 hover:bg-gray-50 text-gray-700"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return (
                            <span key={page} className="px-1 text-xs text-gray-400">
                              ...
                            </span>
                          );
                        }
                        return null;
                      },
                    )}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
