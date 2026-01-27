import { useState, useEffect, useRef, useCallback } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { MenuItemImage } from './MenuItemImage';
import { Button } from './Button';
import { Modal } from './Modal';
import { formatCurrency } from '../../utils/formatters';
import { ShoppingCart, ChevronLeft, ChevronRight,  UtensilsCrossed, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import { MAX_CART_ITEM_QUANTITY } from '../../utils/constants';
import type { Restaurant } from '../../types/restaurant.types';
import type { MenuItem } from '../../types/order.types';

interface MenuItemWithRestaurant extends MenuItem {
  restaurant?: Restaurant;
}

interface MealWheelProps {
  restaurants: Restaurant[];
  menuItems: MenuItemWithRestaurant[];
  onRestaurantChange?: (restaurantId: number | null) => void;
}

export const MealWheel = ({ restaurants, menuItems, onRestaurantChange }: MealWheelProps) => {
  const { addItem, restaurantId: cartRestaurantId } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(() => 
    restaurants.length > 0 ? restaurants[0].id : null
  );
  const [currentDishIndex, setCurrentDishIndex] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isWheelDragging, setIsWheelDragging] = useState(false);
  const [dragStartAngle, setDragStartAngle] = useState(0);
  const [dragStartRotation, setDragStartRotation] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [lastAngle, setLastAngle] = useState(0);
  const [lastTime, setLastTime] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const momentumStartTimeRef = useRef<number | null>(null);
  const momentumTimeoutRef = useRef<number | null>(null);
  const applyMomentumRef = useRef<(() => void) | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  const [sliderDragStart, setSliderDragStart] = useState(0);
  const [sliderDragOffset, setSliderDragOffset] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItemWithRestaurant | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Get menu items for selected restaurant
  const selectedRestaurantItems = selectedRestaurantId
    ? menuItems.filter((item) => item.restaurant_id === selectedRestaurantId && item.is_available)
    : [];

  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId);

  // Auto-select first restaurant if none selected and restaurants change
  useEffect(() => {
    if (!selectedRestaurantId && restaurants.length > 0) {
      const firstRestaurant = restaurants[0];
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setSelectedRestaurantId(firstRestaurant.id);
        if (onRestaurantChange) {
          onRestaurantChange(firstRestaurant.id);
        }
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurants]);

  useEffect(() => {
    if (onRestaurantChange) {
      onRestaurantChange(selectedRestaurantId);
    }
  }, [selectedRestaurantId, onRestaurantChange]);

  // Reset dish index when restaurant changes
  useEffect(() => {
    setCurrentDishIndex(0);
    setSliderDragOffset(0);
  }, [selectedRestaurantId]);

  // Restaurant selection is now only through auto-selection when reaching top position
  // Removed handleRestaurantClick as restaurants are no longer clickable

  const handleDishClick = useCallback((item: MenuItemWithRestaurant) => {
    setSelectedItem(item);
    setQuantity(1);
    setIsModalOpen(true);
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedItem) return;
    
    if (!isAuthenticated && cartRestaurantId && cartRestaurantId !== selectedItem.restaurant_id) {
      if (window.confirm('Your cart contains items from another restaurant. Clear cart and add this item?')) {
        addItem(selectedItem, quantity);
        toast.success(`${selectedItem.name} added to cart`);
        setIsModalOpen(false);
      }
    } else {
      addItem(selectedItem, quantity);
      toast.success(`${selectedItem.name} added to cart`);
      setIsModalOpen(false);
    }
  }, [selectedItem, quantity, isAuthenticated, cartRestaurantId, addItem]);

  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity((prev) => {
      const newQuantity = prev + delta;
      if (newQuantity < 1) return 1;
      if (newQuantity > MAX_CART_ITEM_QUANTITY) return MAX_CART_ITEM_QUANTITY;
      return newQuantity;
    });
  }, []);

  // Snap to nearest restaurant when momentum stops - puts the closest restaurant at top (-90 degrees)
  const snapToNearestRestaurant = useCallback((currentRotation: number) => {
    if (restaurants.length === 0) return currentRotation;
    
    const angleStep = 360 / restaurants.length;
    
    // Find which restaurant is currently closest to the top position
    let closestIndex = 0;
    let minAngleDiff = Infinity;
    
    for (let i = 0; i < restaurants.length; i++) {
      // Calculate the absolute angle of this restaurant after current rotation
      const restaurantBaseAngle = i * angleStep - 90; // Base position (0-based)
      const restaurantCurrentAngle = (restaurantBaseAngle + currentRotation) % 360;
      const normalizedAngle = ((restaurantCurrentAngle % 360) + 360) % 360;
      
      // Calculate distance to top (-90 degrees = 270 degrees)
      const angleDiff = Math.min(
        Math.abs(normalizedAngle - 270),
        360 - Math.abs(normalizedAngle - 270)
      );
      
      if (angleDiff < minAngleDiff) {
        minAngleDiff = angleDiff;
        closestIndex = i;
      }
    }
    
    // Calculate the rotation needed to put the closest restaurant exactly at top (-90 degrees)
    const closestRestaurantBaseAngle = closestIndex * angleStep - 90;
    // We want: closestRestaurantBaseAngle + targetRotation = -90
    // So: targetRotation = -90 - closestRestaurantBaseAngle
    const targetRotation = -90 - closestRestaurantBaseAngle;
    
    return targetRotation;
  }, [restaurants]);

  // Smooth momentum-based wheel spinning with snap - 2 second max duration
  const applyMomentum = useCallback(() => {
    const now = Date.now();
    const elapsed = momentumStartTimeRef.current ? now - momentumStartTimeRef.current : 0;
    
    // Force stop after 2 seconds
    if (elapsed >= 2000 || Math.abs(velocity) < 0.2) {
      setVelocity(0);
      momentumStartTimeRef.current = null;
      if (momentumTimeoutRef.current) {
        clearTimeout(momentumTimeoutRef.current);
        momentumTimeoutRef.current = null;
      }
      // Snap to nearest restaurant when momentum stops - this will select the one at top
      const snappedRotation = snapToNearestRestaurant(wheelRotation);
      setWheelRotation(snappedRotation);
      
      // Immediately select the restaurant that will be at top after snap
      // We calculate which restaurant will be at top with the snapped rotation
      if (restaurants.length > 0) {
        const angleStep = 360 / restaurants.length;
        let minAngleDiff = Infinity;
        let closestRestaurant: Restaurant | null = null;
        
        for (let index = 0; index < restaurants.length; index++) {
          const restaurant = restaurants[index];
          const restaurantBaseAngle = index * angleStep - 90;
          const restaurantCurrentAngle = (restaurantBaseAngle + snappedRotation) % 360;
          const normalizedAngle = ((restaurantCurrentAngle % 360) + 360) % 360;
          const angleDiff = Math.min(
            Math.abs(normalizedAngle - 270),
            360 - Math.abs(normalizedAngle - 270)
          );
          
          if (angleDiff < minAngleDiff) {
            minAngleDiff = angleDiff;
            closestRestaurant = restaurant;
          }
        }
        
        if (closestRestaurant) {
          setSelectedRestaurantId(closestRestaurant.id);
        }
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Smooth deceleration using ease-out curve
    // Progress from 0 to 1 over 2 seconds
    const progress = elapsed / 2000;
    // Ease-out cubic: 1 - (1 - t)^3
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    // Apply smooth deceleration
    setWheelRotation((prev) => prev + velocity);
    // Gradually reduce velocity with smooth easing
    setVelocity((prev) => {
      const initialVelocity = prev;
      // Calculate target velocity (0) and interpolate
      return initialVelocity * (1 - easeOut * 0.15); // Smooth deceleration
    });
    
    if (applyMomentumRef.current) {
      animationFrameRef.current = requestAnimationFrame(applyMomentumRef.current);
    }
  }, [velocity, wheelRotation, snapToNearestRestaurant, restaurants, selectedRestaurantId]);

  // Store the function in a ref to avoid the "accessed before declaration" error
  useEffect(() => {
    applyMomentumRef.current = applyMomentum;
  }, [applyMomentum]);

  // Wheel spin handlers with momentum
  const handleWheelMouseDown = (e: React.MouseEvent) => {
    if (!wheelRef.current) return;
    setIsWheelDragging(true);
    setVelocity(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    setDragStartAngle(angle);
    setDragStartRotation(wheelRotation);
    setLastAngle(angle);
    setLastTime(Date.now());
  };

  const handleWheelMouseMove = useCallback((e: MouseEvent) => {
    if (!isWheelDragging || !wheelRef.current) return;
    const now = Date.now();
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const deltaAngle = angle - dragStartAngle;
    
    // Calculate velocity for momentum (only update if enough time has passed)
    const timeDelta = now - lastTime;
    if (timeDelta > 0 && timeDelta < 100) { // Only calculate if reasonable time delta
      const angleDelta = angle - lastAngle;
      // Normalize angle delta to handle wrap-around
      let normalizedDelta = angleDelta;
      if (normalizedDelta > 180) normalizedDelta -= 360;
      if (normalizedDelta < -180) normalizedDelta += 360;
      // Smooth velocity calculation with better averaging
      const rawVelocity = (normalizedDelta / timeDelta) * 2.5; // Reduced multiplier for smoother motion
      // Cap and smooth the velocity
      const newVelocity = Math.max(-8, Math.min(8, rawVelocity));
      // Smooth velocity changes to prevent jerky motion
      setVelocity((prev) => prev * 0.3 + newVelocity * 0.7); // Weighted average for smoothness
    }
    
    setWheelRotation(dragStartRotation + deltaAngle);
    setLastAngle(angle);
    setLastTime(now);
  }, [isWheelDragging, dragStartAngle, dragStartRotation, lastAngle, lastTime]);

  const handleWheelMouseUp = useCallback(() => {
    setIsWheelDragging(false);
    // Only apply momentum if there's significant velocity, otherwise snap immediately
    if (Math.abs(velocity) > 1.5) {
      momentumStartTimeRef.current = Date.now();
      // Force stop after 2 seconds as backup
      if (momentumTimeoutRef.current) {
        clearTimeout(momentumTimeoutRef.current);
      }
      momentumTimeoutRef.current = setTimeout(() => {
        setVelocity(0);
        const snappedRotation = snapToNearestRestaurant(wheelRotation);
        setWheelRotation(snappedRotation);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        momentumStartTimeRef.current = null;
      }, 2000);
      if (applyMomentumRef.current) {
        animationFrameRef.current = requestAnimationFrame(applyMomentumRef.current);
      }
    } else {
      setVelocity(0);
      momentumStartTimeRef.current = null;
      const snappedRotation = snapToNearestRestaurant(wheelRotation);
      setWheelRotation(snappedRotation);
      
      // Select the restaurant that will be at top after snap
      if (restaurants.length > 0) {
        const angleStep = 360 / restaurants.length;
        let minAngleDiff = Infinity;
        let closestRestaurant: Restaurant | null = null;
        
        for (let index = 0; index < restaurants.length; index++) {
          const restaurant = restaurants[index];
          const restaurantBaseAngle = index * angleStep - 90;
          const restaurantCurrentAngle = (restaurantBaseAngle + snappedRotation) % 360;
          const normalizedAngle = ((restaurantCurrentAngle % 360) + 360) % 360;
          const angleDiff = Math.min(
            Math.abs(normalizedAngle - 270),
            360 - Math.abs(normalizedAngle - 270)
          );
          
          if (angleDiff < minAngleDiff) {
            minAngleDiff = angleDiff;
            closestRestaurant = restaurant;
          }
        }
        
        if (closestRestaurant) {
          setSelectedRestaurantId(closestRestaurant.id);
        }
      }
    }
  }, [velocity, applyMomentum, wheelRotation, snapToNearestRestaurant, restaurants, selectedRestaurantId]);

  useEffect(() => {
    if (isWheelDragging) {
      document.addEventListener('mousemove', handleWheelMouseMove);
      document.addEventListener('mouseup', handleWheelMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleWheelMouseMove);
        document.removeEventListener('mouseup', handleWheelMouseUp);
      };
    }
  }, [isWheelDragging, handleWheelMouseMove, handleWheelMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (momentumTimeoutRef.current) {
        clearTimeout(momentumTimeoutRef.current);
      }
    };
  }, []);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Touch handlers for wheel with momentum
  const handleWheelTouchStart = (e: React.TouchEvent) => {
    if (!wheelRef.current) return;
    setIsWheelDragging(true);
    setVelocity(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.touches[0].clientY - centerY, e.touches[0].clientX - centerX) * (180 / Math.PI);
    setDragStartAngle(angle);
    setDragStartRotation(wheelRotation);
    setLastAngle(angle);
    setLastTime(Date.now());
  };

  const handleWheelTouchMove = (e: React.TouchEvent) => {
    if (!isWheelDragging || !wheelRef.current) return;
    const now = Date.now();
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.touches[0].clientY - centerY, e.touches[0].clientX - centerX) * (180 / Math.PI);
    const deltaAngle = angle - dragStartAngle;
    
    // Calculate velocity for momentum (only update if enough time has passed)
    const timeDelta = now - lastTime;
    if (timeDelta > 0 && timeDelta < 100) {
      const angleDelta = angle - lastAngle;
      let normalizedDelta = angleDelta;
      if (normalizedDelta > 180) normalizedDelta -= 360;
      if (normalizedDelta < -180) normalizedDelta += 360;
      // Smooth velocity calculation with better averaging
      const rawVelocity = (normalizedDelta / timeDelta) * 2.5; // Reduced multiplier for smoother motion
      // Cap and smooth the velocity
      const newVelocity = Math.max(-8, Math.min(8, rawVelocity));
      // Smooth velocity changes to prevent jerky motion
      setVelocity((prev) => prev * 0.3 + newVelocity * 0.7); // Weighted average for smoothness
    }
    
    setWheelRotation(dragStartRotation + deltaAngle);
    setLastAngle(angle);
    setLastTime(now);
  };

  const handleWheelTouchEnd = () => {
    setIsWheelDragging(false);
    // Only apply momentum if there's significant velocity, otherwise snap immediately
    if (Math.abs(velocity) > 1.5) {
      momentumStartTimeRef.current = Date.now();
      // Force stop after 2 seconds as backup
      if (momentumTimeoutRef.current) {
        clearTimeout(momentumTimeoutRef.current);
      }
      momentumTimeoutRef.current = setTimeout(() => {
        setVelocity(0);
        const snappedRotation = snapToNearestRestaurant(wheelRotation);
        setWheelRotation(snappedRotation);
        
        // Select the restaurant that will be at top after snap
        if (restaurants.length > 0) {
          const angleStep = 360 / restaurants.length;
          let minAngleDiff = Infinity;
          let closestRestaurant: Restaurant | null = null;
          
          for (let index = 0; index < restaurants.length; index++) {
            const restaurant = restaurants[index];
            const restaurantBaseAngle = index * angleStep - 90;
            const restaurantCurrentAngle = (restaurantBaseAngle + snappedRotation) % 360;
            const normalizedAngle = ((restaurantCurrentAngle % 360) + 360) % 360;
            const angleDiff = Math.min(
              Math.abs(normalizedAngle - 270),
              360 - Math.abs(normalizedAngle - 270)
            );
            
            if (angleDiff < minAngleDiff) {
              minAngleDiff = angleDiff;
              closestRestaurant = restaurant;
            }
          }
          
          if (closestRestaurant) {
            setSelectedRestaurantId(closestRestaurant.id);
          }
        }
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        momentumStartTimeRef.current = null;
      }, 2000);
      if (applyMomentumRef.current) {
        animationFrameRef.current = requestAnimationFrame(applyMomentumRef.current);
      }
    } else {
      setVelocity(0);
      momentumStartTimeRef.current = null;
      const snappedRotation = snapToNearestRestaurant(wheelRotation);
      setWheelRotation(snappedRotation);
      
      // Select the restaurant that will be at top after snap
      if (restaurants.length > 0) {
        const angleStep = 360 / restaurants.length;
        let minAngleDiff = Infinity;
        let closestRestaurant: Restaurant | null = null;
        
        for (let index = 0; index < restaurants.length; index++) {
          const restaurant = restaurants[index];
          const restaurantBaseAngle = index * angleStep - 90;
          const restaurantCurrentAngle = (restaurantBaseAngle + snappedRotation) % 360;
          const normalizedAngle = ((restaurantCurrentAngle % 360) + 360) % 360;
          const angleDiff = Math.min(
            Math.abs(normalizedAngle - 270),
            360 - Math.abs(normalizedAngle - 270)
          );
          
          if (angleDiff < minAngleDiff) {
            minAngleDiff = angleDiff;
            closestRestaurant = restaurant;
          }
        }
        
        if (closestRestaurant) {
          setSelectedRestaurantId(closestRestaurant.id);
        }
      }
    }
  };

  // Slider drag handlers
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    setIsSliderDragging(true);
    setSliderDragStart(e.clientX);
  };

  const handleSliderMouseMove = useCallback((e: MouseEvent) => {
    if (!isSliderDragging) return;
    const diff = e.clientX - sliderDragStart;
    setSliderDragOffset(diff);
  }, [isSliderDragging, sliderDragStart]);

  const handleSliderMouseUp = useCallback(() => {
    if (!isSliderDragging) return;
    
    const threshold = 60; // Lower threshold for easier swiping
    const wasDragging = Math.abs(sliderDragOffset) > threshold;
    
    if (wasDragging) {
      if (sliderDragOffset > 0 && currentDishIndex > 0) {
        setCurrentDishIndex(currentDishIndex - 1);
      } else if (sliderDragOffset < 0 && currentDishIndex < selectedRestaurantItems.length - 1) {
        setCurrentDishIndex(currentDishIndex + 1);
      }
    }
    
    setIsSliderDragging(false);
    setSliderDragOffset(0);
  }, [isSliderDragging, sliderDragOffset, currentDishIndex, selectedRestaurantItems.length]);

  useEffect(() => {
    if (isSliderDragging) {
      document.addEventListener('mousemove', handleSliderMouseMove);
      document.addEventListener('mouseup', handleSliderMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleSliderMouseMove);
        document.removeEventListener('mouseup', handleSliderMouseUp);
      };
    }
  }, [isSliderDragging, handleSliderMouseMove, handleSliderMouseUp]);

  // Touch handlers for slider
  const handleSliderTouchStart = (e: React.TouchEvent) => {
    setIsSliderDragging(true);
    setSliderDragStart(e.touches[0].clientX);
  };

  const handleSliderTouchMove = (e: React.TouchEvent) => {
    if (!isSliderDragging) return;
    const diff = e.touches[0].clientX - sliderDragStart;
    setSliderDragOffset(diff);
  };

  const handleSliderTouchEnd = () => {
    handleSliderMouseUp();
  };

  const goToNextDish = () => {
    if (currentDishIndex < selectedRestaurantItems.length - 1) {
      setCurrentDishIndex(currentDishIndex + 1);
    }
  };

  const goToPrevDish = () => {
    if (currentDishIndex > 0) {
      setCurrentDishIndex(currentDishIndex - 1);
    }
  };

  // Calculate positions for restaurants in circle
  const restaurantCount = restaurants.length;
  const angleStep = restaurantCount > 0 ? 360 / restaurantCount : 0;
  // Calculate radius to center restaurants between outer circle edge (50%) and inner circle edge
  // Inner circle: w-48 (60% of 320px) to w-72 (56% of 512px) = ~28-30% radius from center
  // Outer circle edge: 50% from center
  // Midpoint: (50% + 29%) / 2 = 39.5% from center
  // Position at 39% to center the restaurant buttons in the ring
  const radius = 39; // Percentage from center - centered between outer and inner circles

  // Find which restaurant is at the top (closest to -90 degrees / top position)
  const getRestaurantAtTop = useCallback(() => {
    if (restaurants.length === 0) return null;
    
    const angleStep = 360 / restaurants.length;
    let minAngleDiff = Infinity;
    let closestRestaurant: Restaurant | null = null;
    
    for (let index = 0; index < restaurants.length; index++) {
      const restaurant = restaurants[index];
      // Calculate the absolute angle of this restaurant after rotation
      const restaurantBaseAngle = index * angleStep - 90; // Base position
      const restaurantCurrentAngle = (restaurantBaseAngle + wheelRotation) % 360;
      const normalizedAngle = ((restaurantCurrentAngle % 360) + 360) % 360;
      
      // Calculate distance to top (-90 degrees = 270 degrees)
      const angleDiff = Math.min(
        Math.abs(normalizedAngle - 270),
        360 - Math.abs(normalizedAngle - 270)
      );
      
      if (angleDiff < minAngleDiff) {
        minAngleDiff = angleDiff;
        closestRestaurant = restaurant;
      }
    }
    
    return closestRestaurant;
  }, [restaurants, wheelRotation]);

  // Auto-select restaurant when it reaches the top position (real-time during drag and after)
  useEffect(() => {
    const topRestaurant = getRestaurantAtTop();
    if (topRestaurant && topRestaurant.id !== selectedRestaurantId) {
      // Use a debounce for smoother selection during dragging
      const timer = setTimeout(() => {
        setSelectedRestaurantId(topRestaurant.id);
      }, isWheelDragging ? 100 : 200);
      return () => clearTimeout(timer);
    }
  }, [wheelRotation, getRestaurantAtTop, selectedRestaurantId, isWheelDragging]);

  if (restaurants.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <p className="text-gray-500">No restaurants available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4">
      {/* Selection Indicator at Top */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
        <div className="flex flex-col items-center">
          <div className="w-16 h-1 bg-primary-600 rounded-full shadow-lg mb-1" />
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-primary-600" />
        </div>
      </div>

      {/* Main Wheel Container */}
      <div
        ref={wheelRef}
        className="relative w-full aspect-square max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto mt-8"
        onMouseDown={handleWheelMouseDown}
        onTouchStart={handleWheelTouchStart}
        onTouchMove={handleWheelTouchMove}
        onTouchEnd={handleWheelTouchEnd}
        style={{ cursor: isWheelDragging ? 'grabbing' : 'grab' }}
      >
        {/* Outer Circle - Spinnable Restaurant Wheel */}
        <div className="absolute inset-0 rounded-full border-3 sm:border-4 border-primary-300 bg-gradient-to-br from-primary-50 via-white to-primary-50 shadow-2xl overflow-hidden">
          {/* Rotating Container for Restaurants */}
          <div
            className="absolute inset-0"
            style={{
              transform: `rotate(${wheelRotation}deg)`,
              transition: isWheelDragging || Math.abs(velocity) > 0.2 ? 'none' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              willChange: isWheelDragging || Math.abs(velocity) > 0.2 ? 'transform' : 'auto',
            }}
          >
            {restaurants.map((restaurant, index) => {
              const angle = index * angleStep - 90; // Start from top
              const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
              const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
              const isSelected = selectedRestaurantId === restaurant.id;
              
              // Calculate if this restaurant is at the top position
              const restaurantCurrentAngle = (index * angleStep - 90 + wheelRotation) % 360;
              const normalizedAngle = ((restaurantCurrentAngle % 360) + 360) % 360;
              const distanceToTop = Math.min(
                Math.abs(normalizedAngle - 270),
                360 - Math.abs(normalizedAngle - 270)
              );
              const isAtTop = distanceToTop < 15; // Within 15 degrees of top

              return (
                <div
                  key={restaurant.id}
                  className={cn(
                    'absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none',
                    'rounded-full z-10'
                  )}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${-wheelRotation}deg)`, // Counter-rotate to keep text upright
                  }}
                >
                  <div
                    className={cn(
                      'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white rounded-full shadow-xl border-2 sm:border-3 transition-all duration-200',
                      isSelected || isAtTop
                        ? 'border-primary-600 shadow-2xl ring-2 sm:ring-4 ring-primary-200 ring-offset-1 sm:ring-offset-2'
                        : 'border-gray-300'
                    )}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 relative">
                      {restaurant.image_url ? (
                        <img
                          src={restaurant.image_url}
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UtensilsCrossed className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary-600" />
                      )}
                      {(isSelected || isAtTop) && (
                        <div className="absolute inset-0 bg-primary-600/20 rounded-full" />
                      )}
                    </div>
                  </div>
                  {/* Restaurant name label */}
                  <div className="absolute -bottom-8 sm:-bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <div className={cn(
                      'bg-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg shadow-lg border-2 text-xs font-semibold transition-all',
                      (isSelected || isAtTop) ? 'border-primary-600 text-primary-700' : 'border-gray-200 text-gray-700'
                    )}>
                      {restaurant.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Circle - Dish Slider */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 bg-white rounded-full shadow-2xl border-3 sm:border-4 border-primary-500 overflow-hidden relative pointer-events-auto">
              {selectedRestaurantItems.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <UtensilsCrossed className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium mb-2">No dishes available</p>
                  <p className="text-sm text-gray-400">
                    {selectedRestaurant?.name || 'Select a restaurant'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Dish Slider Container */}
                  <div
                    ref={sliderRef}
                    className="absolute inset-0 overflow-hidden"
                    style={{ 
                      paddingTop: '0.5rem',
                      paddingBottom: '2rem',
                      cursor: isSliderDragging ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={handleSliderMouseDown}
                    onTouchStart={handleSliderTouchStart}
                    onTouchMove={handleSliderTouchMove}
                    onTouchEnd={handleSliderTouchEnd}
                  >
                    {/* Dish Items */}
                    <div
                      className="flex h-full"
                      style={{
                        transform: `translateX(calc(-${currentDishIndex * 100}% + ${sliderDragOffset}px))`,
                        transition: isSliderDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        willChange: isSliderDragging ? 'transform' : 'auto',
                      }}
                    >
                      {selectedRestaurantItems.map((item) => (
                        <div
                          key={item.id}
                          className="w-full h-full flex-shrink-0 flex flex-col items-center justify-center px-2 sm:px-3 py-2 cursor-pointer"
                          onClick={() => {
                            // Only trigger click if it wasn't a drag
                            if (!isSliderDragging && Math.abs(sliderDragOffset) < 10) {
                              handleDishClick(item);
                            }
                          }}
                        >
                          {/* Dish Image */}
                          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mb-1.5 sm:mb-2 rounded-full overflow-hidden shadow-lg border-2 border-primary-200 hover:border-primary-400 transition-all hover:scale-105 flex-shrink-0">
                            <MenuItemImage
                              src={item.image_url}
                              alt={item.name}
                              className="rounded-full"
                              aspectRatio={1}
                            />
                          </div>

                          {/* Dish Name */}
                          <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-900 mb-1 line-clamp-2 text-center px-1 leading-tight">
                            {item.name}
                          </h3>

                          {/* Price */}
                          <div className="flex items-center justify-center">
                            <span className="text-sm sm:text-base md:text-lg font-bold text-primary-600">
                              {formatCurrency(item.price)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Slider Navigation Arrows */}
                  {selectedRestaurantItems.length > 1 && (
                    <>
                      <button
                        onClick={goToPrevDish}
                        disabled={currentDishIndex === 0}
                        className={cn(
                          'absolute left-1 sm:left-1.5 top-1/2 -translate-y-1/2 bg-white rounded-full p-1 sm:p-1.5 shadow-lg',
                          'hover:bg-gray-50 transition-all z-20',
                          'disabled:opacity-30 disabled:cursor-not-allowed',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500',
                          'active:scale-95'
                        )}
                        aria-label="Previous dish"
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700" />
                      </button>
                      <button
                        onClick={goToNextDish}
                        disabled={currentDishIndex === selectedRestaurantItems.length - 1}
                        className={cn(
                          'absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 bg-white rounded-full p-1 sm:p-1.5 shadow-lg',
                          'hover:bg-gray-50 transition-all z-20',
                          'disabled:opacity-30 disabled:cursor-not-allowed',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500',
                          'active:scale-95'
                        )}
                        aria-label="Next dish"
                      >
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700" />
                      </button>
                    </>
                  )}

                  {/* Dish Indicators */}
                  {selectedRestaurantItems.length > 1 && (
                    <div className="absolute bottom-1 sm:bottom-1.5 left-1/2 transform -translate-x-1/2 flex gap-1 z-20">
                      {selectedRestaurantItems.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentDishIndex(index)}
                          className={cn(
                            'h-1 sm:h-1.5 rounded-full transition-all duration-200',
                            index === currentDishIndex
                              ? 'bg-primary-600 w-4 sm:w-6'
                              : 'bg-gray-300 hover:bg-gray-400 w-1 sm:w-1.5'
                          )}
                          aria-label={`Go to dish ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Spin Instructions */}
        <div className="absolute -bottom-8 sm:-bottom-10 md:-bottom-12 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            <span className="hidden sm:inline">Click and drag to spin the wheel</span>
            <span className="sm:hidden">Swipe to spin</span>
          </p>
        </div>
      </div>

      {/* Add to Cart Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem?.name}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button
              onClick={() => setIsModalOpen(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToCart}
              className="flex-1"
              disabled={!selectedItem?.is_available}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        }
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* Item Image */}
            <div className="w-full h-48 sm:h-64 rounded-lg overflow-hidden">
              <MenuItemImage
                src={selectedItem.image_url}
                alt={selectedItem.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Item Description */}
            {selectedItem.description && (
              <p className="text-gray-600 text-sm sm:text-base">
                {selectedItem.description}
              </p>
            )}

            {/* Price */}
            <div className="flex items-center justify-between py-4 border-t border-b">
              <span className="text-lg font-semibold text-gray-900">Price:</span>
              <span className="text-2xl font-bold text-primary-600">
                {formatCurrency(selectedItem.price)}
              </span>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-900">
                Quantity
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className={cn(
                    "p-2 rounded-lg border-2 transition-all",
                    quantity <= 1
                      ? "border-gray-200 text-gray-300 cursor-not-allowed"
                      : "border-primary-300 text-primary-600 hover:bg-primary-50 hover:border-primary-400"
                  )}
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="px-6 py-2 min-w-[4rem] text-center text-xl font-bold text-gray-900 border-2 border-gray-200 rounded-lg">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= MAX_CART_ITEM_QUANTITY}
                  className={cn(
                    "p-2 rounded-lg border-2 transition-all",
                    quantity >= MAX_CART_ITEM_QUANTITY
                      ? "border-gray-200 text-gray-300 cursor-not-allowed"
                      : "border-primary-300 text-primary-600 hover:bg-primary-50 hover:border-primary-400"
                  )}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Total: <span className="font-semibold text-primary-600">
                  {formatCurrency(selectedItem.price * quantity)}
                </span>
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
