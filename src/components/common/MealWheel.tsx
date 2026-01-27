import { useState, useEffect, useRef, useCallback } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { MenuItemImage } from './MenuItemImage';
import { Button } from './Button';
import { Modal } from './Modal';
import { formatCurrency } from '../../utils/formatters';
import { ShoppingCart, ChevronLeft, ChevronRight, UtensilsCrossed, Plus, Minus } from 'lucide-react';
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
  selectedRestaurantId?: number | null; // Allow parent to control selection
  onInnerMenuHoverChange?: (isHovering: boolean) => void; // Notify parent when hovering inner menu
}

export const MealWheel = ({ restaurants, menuItems, onRestaurantChange, selectedRestaurantId: externalSelectedRestaurantId, onInnerMenuHoverChange }: MealWheelProps) => {
  const { addItem, restaurantId: cartRestaurantId } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [internalSelectedRestaurantId, setInternalSelectedRestaurantId] = useState<number | null>(() => 
    restaurants.length > 0 ? restaurants[0].id : null
  );
  
  // Use external selectedRestaurantId if provided, otherwise use internal state
  const selectedRestaurantId = externalSelectedRestaurantId !== undefined ? externalSelectedRestaurantId : internalSelectedRestaurantId;
  
  const setSelectedRestaurantId = useCallback((id: number | null) => {
    if (externalSelectedRestaurantId !== undefined) {
      // External control - notify parent
      if (onRestaurantChange) {
        onRestaurantChange(id);
      }
    } else {
      // Internal control
      setInternalSelectedRestaurantId(id);
      if (onRestaurantChange) {
        onRestaurantChange(id);
      }
    }
  }, [externalSelectedRestaurantId, onRestaurantChange]);
  const [currentDishIndex, setCurrentDishIndex] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0); // Unbounded rotation for seamless scrolling
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
  const cumulativeRotationRef = useRef<number>(0);
  const lastWheelRotationRef = useRef<number>(0);
  const autoSlideIntervalRef = useRef<number | null>(null);
  const [isHoveringInnerMenu, setIsHoveringInnerMenu] = useState(false);

  // Get menu items for selected restaurant
  const selectedRestaurantItems = selectedRestaurantId
    ? menuItems.filter((item) => item.restaurant_id === selectedRestaurantId && item.is_available)
    : [];

  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId);

  // Auto-select first restaurant when restaurants are loaded and none selected yet
  useEffect(() => {
    if (!selectedRestaurantId && restaurants.length > 0) {
      const firstRestaurant = restaurants[0];
      setTimeout(() => {
        setSelectedRestaurantId(firstRestaurant.id);
        if (onRestaurantChange) {
          onRestaurantChange(firstRestaurant.id);
        }
      }, 0);
    }
  }, [restaurants, selectedRestaurantId, onRestaurantChange, setSelectedRestaurantId]);

  // Notify parent when selected restaurant changes
  useEffect(() => {
    if (selectedRestaurantId && onRestaurantChange) {
      onRestaurantChange(selectedRestaurantId);
    }
  }, [selectedRestaurantId, onRestaurantChange]);

  // Auto-slide dishes based on wheel rotation
  useEffect(() => {
    if (selectedRestaurantItems.length === 0 || isSliderDragging || isWheelDragging) {
      return;
    }

    // Track cumulative rotation to handle negative values and snapping
    const rotationDelta = wheelRotation - lastWheelRotationRef.current;
    
    // Handle wrap-around (e.g., from 359 to -1)
    let adjustedDelta = rotationDelta;
    if (Math.abs(rotationDelta) > 180) {
      if (rotationDelta > 0) {
        adjustedDelta = rotationDelta - 360;
      } else {
        adjustedDelta = rotationDelta + 360;
      }
    }
    
    cumulativeRotationRef.current += adjustedDelta;
    lastWheelRotationRef.current = wheelRotation;

    // Calculate dish index based on cumulative rotation
    // Each 360 degrees of rotation cycles through all dishes
    if (selectedRestaurantItems.length > 0 && Math.abs(adjustedDelta) > 1) {
      const normalizedRotation = ((cumulativeRotationRef.current % 360) + 360) % 360;
      const rotationPerDish = 360 / selectedRestaurantItems.length;
      const dishIndex = Math.floor(normalizedRotation / rotationPerDish) % selectedRestaurantItems.length;
      
      if (dishIndex !== currentDishIndex && dishIndex >= 0 && dishIndex < selectedRestaurantItems.length) {
        setCurrentDishIndex(dishIndex);
      }
    }
  }, [wheelRotation, selectedRestaurantItems.length, currentDishIndex, isSliderDragging, isWheelDragging, setSelectedRestaurantId]);

  // Reset cumulative rotation when restaurant changes
  useEffect(() => {
    cumulativeRotationRef.current = 0;
    lastWheelRotationRef.current = wheelRotation;
    setTimeout(() => {
      setCurrentDishIndex(0);
    }, 0);
  }, [selectedRestaurantId, wheelRotation]);

  // Auto-slide dishes continuously (both rotation-based and timer-based)
  useEffect(() => {
    if (selectedRestaurantItems.length === 0 || isSliderDragging) {
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current);
        autoSlideIntervalRef.current = null;
      }
      return;
    }

    // Clear any existing interval
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current);
    }

    // Set up interval to auto-slide dishes every 3 seconds
    autoSlideIntervalRef.current = window.setInterval(() => {
      if (selectedRestaurantItems.length > 0 && !isSliderDragging) {
        setCurrentDishIndex((prev) => {
          const next = (prev + 1) % selectedRestaurantItems.length;
          return next;
        });
      }
    }, 3000);

    return () => {
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current);
        autoSlideIntervalRef.current = null;
      }
    };
  }, [selectedRestaurantItems.length, isSliderDragging]);

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

  // Get normalized rotation (0-360) for calculations while keeping actual rotation unbounded
  const getNormalizedRotation = useCallback((rotation: number) => {
    return ((rotation % 360) + 360) % 360;
  }, []);

  // Enhanced snap function with smoother physics
  const snapToNearestRestaurant = useCallback((currentRotation: number) => {
    if (restaurants.length === 0) return currentRotation;
    
    const angleStep = 360 / restaurants.length;
    let closestIndex = 0;
    let minAngleDiff = Infinity;
    
    // Normalize rotation for calculation
    const normalizedRotation = getNormalizedRotation(currentRotation);
    
    for (let i = 0; i < restaurants.length; i++) {
      const restaurantBaseAngle = i * angleStep - 90;
      const restaurantCurrentAngle = (restaurantBaseAngle + normalizedRotation) % 360;
      const normalizedAngle = ((restaurantCurrentAngle % 360) + 360) % 360;
      const angleDiff = Math.min(
        Math.abs(normalizedAngle - 270),
        360 - Math.abs(normalizedAngle - 270)
      );
      
      if (angleDiff < minAngleDiff) {
        minAngleDiff = angleDiff;
        closestIndex = i;
      }
    }
    
    const closestRestaurantBaseAngle = closestIndex * angleStep - 90;
    const targetNormalized = -90 - closestRestaurantBaseAngle;
    
    // Calculate the closest equivalent rotation that maintains continuity
    // Find how many full rotations we've done
    const fullRotations = Math.floor(currentRotation / 360);
    const remainder = currentRotation % 360;
    
    // Find the closest equivalent target rotation
    let targetRotation = targetNormalized + (fullRotations * 360);
    
    // Adjust if we need to go to next/prev rotation for closest match
    const diff = targetNormalized - getNormalizedRotation(remainder);
    if (Math.abs(diff) > 180) {
      if (diff > 0) {
        targetRotation -= 360;
      } else {
        targetRotation += 360;
      }
    }
    
    return targetRotation;
  }, [restaurants, getNormalizedRotation]);

  // Smoother momentum function
  const applyMomentum = useCallback(() => {
    const now = Date.now();
    const elapsed = momentumStartTimeRef.current ? now - momentumStartTimeRef.current : 0;
    
    if (elapsed >= 1500 || Math.abs(velocity) < 0.1) {
      setVelocity(0);
      momentumStartTimeRef.current = null;
      if (momentumTimeoutRef.current) {
        clearTimeout(momentumTimeoutRef.current);
        momentumTimeoutRef.current = null;
      }
      
      // Snap to nearest restaurant while maintaining rotation continuity
      const snappedRotation = snapToNearestRestaurant(wheelRotation);
      const normalizedSnapped = getNormalizedRotation(snappedRotation);
      setWheelRotation(snappedRotation);
      
      if (restaurants.length > 0) {
        const angleStep = 360 / restaurants.length;
        let minAngleDiff = Infinity;
        let closestRestaurant: Restaurant | null = null;
        
        for (let index = 0; index < restaurants.length; index++) {
          const restaurant = restaurants[index];
          const restaurantBaseAngle = index * angleStep - 90;
          const restaurantCurrentAngle = (restaurantBaseAngle + normalizedSnapped) % 360;
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

    const progress = elapsed / 1500;
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    // Allow rotation to grow unbounded for seamless scrolling
    setWheelRotation((prev) => prev + velocity);
    setVelocity((prev) => prev * (1 - easeOut * 0.12));
    
    if (applyMomentumRef.current) {
      animationFrameRef.current = requestAnimationFrame(applyMomentumRef.current);
    }
  }, [velocity, wheelRotation, snapToNearestRestaurant, restaurants, setSelectedRestaurantId, getNormalizedRotation]);

  useEffect(() => {
    applyMomentumRef.current = applyMomentum;
  }, [applyMomentum]);

  // Wheel handlers
  const handleWheelMouseDown = (e: React.MouseEvent) => {
    if (!wheelRef.current || isHoveringInnerMenu) return;
    // Check if clicking on a restaurant avatar or inner menu
    const target = e.target as HTMLElement;
    if (target.closest('[data-restaurant-avatar]') || target.closest('[data-inner-menu]')) {
      return; // Let those components handle the interaction
    }
    e.preventDefault();
    e.stopPropagation();
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
    if (!isWheelDragging || !wheelRef.current || isHoveringInnerMenu) return;
    e.preventDefault();
    const now = Date.now();
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    
    // Handle angle wrapping for delta calculation
    let deltaAngle = angle - dragStartAngle;
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;
    
    const timeDelta = now - lastTime;
    if (timeDelta > 0 && timeDelta < 100) {
      let angleDelta = angle - lastAngle;
      if (angleDelta > 180) angleDelta -= 360;
      if (angleDelta < -180) angleDelta += 360;
      const rawVelocity = (angleDelta / timeDelta) * 2.2;
      const newVelocity = Math.max(-6, Math.min(6, rawVelocity));
      setVelocity((prev) => prev * 0.4 + newVelocity * 0.6);
    }
    
    // Allow rotation to grow unbounded for seamless scrolling
    const newRotation = dragStartRotation + deltaAngle;
    setWheelRotation(newRotation);
    
    setLastAngle(angle);
    setLastTime(now);
  }, [isWheelDragging, dragStartAngle, dragStartRotation, lastAngle, lastTime, isHoveringInnerMenu]);

  const handleWheelMouseUp = useCallback(() => {
    setIsWheelDragging(false);
    if (Math.abs(velocity) > 1.2) {
      momentumStartTimeRef.current = Date.now();
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
      }, 1500);
      if (applyMomentumRef.current) {
        animationFrameRef.current = requestAnimationFrame(applyMomentumRef.current);
      }
    } else {
      setVelocity(0);
      momentumStartTimeRef.current = null;
      const snappedRotation = snapToNearestRestaurant(wheelRotation);
      setWheelRotation(snappedRotation);
      
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
  }, [velocity, wheelRotation, snapToNearestRestaurant, restaurants, setSelectedRestaurantId, getNormalizedRotation]);

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

  // Touch handlers for wheel
  const handleWheelTouchStart = (e: React.TouchEvent) => {
    if (!wheelRef.current) return;
    // Check if touching inner menu
    const target = e.target as HTMLElement;
    if (target.closest('[data-inner-menu]')) {
      return; // Let inner menu handle touch
    }
    e.preventDefault();
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
    if (!isWheelDragging || !wheelRef.current || isHoveringInnerMenu) return;
    e.preventDefault();
    const now = Date.now();
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.touches[0].clientY - centerY, e.touches[0].clientX - centerX) * (180 / Math.PI);
    const deltaAngle = angle - dragStartAngle;
    
    const timeDelta = now - lastTime;
    if (timeDelta > 0 && timeDelta < 100) {
      const angleDelta = angle - lastAngle;
      let normalizedDelta = angleDelta;
      if (normalizedDelta > 180) normalizedDelta -= 360;
      if (normalizedDelta < -180) normalizedDelta += 360;
      const rawVelocity = (normalizedDelta / timeDelta) * 2.2;
      const newVelocity = Math.max(-6, Math.min(6, rawVelocity));
      setVelocity((prev) => prev * 0.4 + newVelocity * 0.6);
    }
    
    // Allow rotation to grow unbounded for seamless scrolling
    const newRotation = dragStartRotation + deltaAngle;
    setWheelRotation(newRotation);
    
    setLastAngle(angle);
    setLastTime(now);
  };

  const handleWheelTouchEnd = () => {
    setIsWheelDragging(false);
    if (Math.abs(velocity) > 1.2) {
      momentumStartTimeRef.current = Date.now();
      if (momentumTimeoutRef.current) {
        clearTimeout(momentumTimeoutRef.current);
      }
      momentumTimeoutRef.current = setTimeout(() => {
        setVelocity(0);
        const snappedRotation = snapToNearestRestaurant(wheelRotation);
        const normalizedSnapped = getNormalizedRotation(snappedRotation);
        setWheelRotation(snappedRotation);
        
        if (restaurants.length > 0) {
          const angleStep = 360 / restaurants.length;
          let minAngleDiff = Infinity;
          let closestRestaurant: Restaurant | null = null;
          
          for (let index = 0; index < restaurants.length; index++) {
            const restaurant = restaurants[index];
            const restaurantBaseAngle = index * angleStep - 90;
            const restaurantCurrentAngle = (restaurantBaseAngle + normalizedSnapped) % 360;
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
      }, 1500);
      if (applyMomentumRef.current) {
        animationFrameRef.current = requestAnimationFrame(applyMomentumRef.current);
      }
    } else {
      setVelocity(0);
      momentumStartTimeRef.current = null;
      const snappedRotation = snapToNearestRestaurant(wheelRotation);
      setWheelRotation(snappedRotation);
      
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

  // Slider handlers
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
    
    const threshold = 60;
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

  // Calculate positions
  const restaurantCount = restaurants.length;
  const angleStep = restaurantCount > 0 ? 360 / restaurantCount : 0;
  const radius = 39;

  // Get normalized rotation for calculations (0-360) while keeping actual rotation unbounded
  const normalizedRotation = getNormalizedRotation(wheelRotation);

  const getRestaurantAtTop = useCallback(() => {
    if (restaurants.length === 0) return null;
    
    const angleStep = 360 / restaurants.length;
    let minAngleDiff = Infinity;
    let closestRestaurant: Restaurant | null = null;
    
    for (let index = 0; index < restaurants.length; index++) {
      const restaurant = restaurants[index];
      const restaurantBaseAngle = index * angleStep - 90;
      // Use normalized rotation for calculation
      const restaurantCurrentAngle = (restaurantBaseAngle + normalizedRotation) % 360;
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
    
    return closestRestaurant;
  }, [restaurants, normalizedRotation]);

  // Auto-select restaurant when it reaches top position
  useEffect(() => {
    const topRestaurant = getRestaurantAtTop();
    if (topRestaurant && topRestaurant.id !== selectedRestaurantId) {
      const timer = setTimeout(() => {
        setSelectedRestaurantId(topRestaurant.id);
        if (onRestaurantChange) {
          onRestaurantChange(topRestaurant.id);
        }
      }, isWheelDragging ? 100 : 200);
      return () => clearTimeout(timer);
    }
  }, [wheelRotation, getRestaurantAtTop, selectedRestaurantId, isWheelDragging, onRestaurantChange, setSelectedRestaurantId]);

  // Track previous external selectedRestaurantId to detect changes
  const prevExternalSelectedRestaurantIdRef = useRef<number | null | undefined>(externalSelectedRestaurantId);
  
  // Rotate wheel when selectedRestaurantId changes externally - maintain seamless scrolling
  useEffect(() => {
    // Only react to actual changes in externalSelectedRestaurantId, not wheelRotation changes
    if (
      externalSelectedRestaurantId !== undefined && 
      externalSelectedRestaurantId !== null && 
      restaurants.length > 0 &&
      externalSelectedRestaurantId !== prevExternalSelectedRestaurantIdRef.current &&
      !isWheelDragging // Don't interfere with active dragging
    ) {
      prevExternalSelectedRestaurantIdRef.current = externalSelectedRestaurantId;
      const restaurantIndex = restaurants.findIndex(r => r.id === externalSelectedRestaurantId);
      if (restaurantIndex !== -1) {
        const angleStep = 360 / restaurants.length;
        const restaurantBaseAngle = restaurantIndex * angleStep - 90;
        const targetNormalized = -90 - restaurantBaseAngle;
        
        // Calculate the closest equivalent rotation that maintains continuity
        // Find how many full rotations we've done
        const fullRotations = Math.floor(wheelRotation / 360);
        const remainder = wheelRotation % 360;
        
        // Find the closest equivalent target rotation
        let targetRotation = targetNormalized + (fullRotations * 360);
        
        // Adjust if we need to go to next/prev rotation for closest match
        const diff = targetNormalized - getNormalizedRotation(remainder);
        if (Math.abs(diff) > 180) {
          if (diff > 0) {
            targetRotation -= 360;
          } else {
            targetRotation += 360;
          }
        }
        
        // Stop any current momentum immediately
        setTimeout(() => {
          setVelocity(0);
          setIsWheelDragging(false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          if (momentumTimeoutRef.current) {
            clearTimeout(momentumTimeoutRef.current);
            momentumTimeoutRef.current = null;
          }
          
          // Smoothly rotate to target position maintaining continuity
          setWheelRotation(targetRotation);
        }, 0);
      }
    }
  }, [externalSelectedRestaurantId, restaurants, wheelRotation, getNormalizedRotation, isWheelDragging]);

  // Cleanup
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

  if (restaurants.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <p className="text-gray-500">No restaurants available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Wheel Container */}
      <div className="relative">
        {/* Main Wheel */}
        <div
          ref={wheelRef}
          className="relative w-full aspect-square max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto touch-action-manipulation no-select"
          onMouseDown={handleWheelMouseDown}
          onTouchStart={handleWheelTouchStart}
          onTouchMove={handleWheelTouchMove}
          onTouchEnd={handleWheelTouchEnd}
          style={{ cursor: isWheelDragging ? 'grabbing' : 'grab' }}
        >
          {/* Outer Wheel - Clean design */}
          <div className="absolute inset-0 rounded-full bg-white/80 backdrop-blur-sm overflow-visible">
            {/* Rotating Restaurants */}
            <div
              className={cn(
                "absolute inset-0",
                (!isWheelDragging && Math.abs(velocity) <= 0.2) && "wheel-transition"
              )}
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                willChange: 'transform',
                transition: (!isWheelDragging && Math.abs(velocity) <= 0.2) ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              }}
            >
              {restaurants.map((restaurant, index) => {
                const angle = index * angleStep - 90;
                const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
                const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
                // Use normalized rotation for calculation
                const restaurantCurrentAngle = (index * angleStep - 90 + normalizedRotation) % 360;
                const normalizedAngle = ((restaurantCurrentAngle % 360) + 360) % 360;
                const distanceToTop = Math.min(
                  Math.abs(normalizedAngle - 270),
                  360 - Math.abs(normalizedAngle - 270)
                );
                const isAtTop = distanceToTop < 10;

                return (
                  <div
                    key={restaurant.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: `translate(-50%, -50%) rotate(${-wheelRotation}deg)`,
                    }}
                  >
                    <div className="relative flex flex-col items-center">
                      {/* Restaurant Name - Only show for top restaurant */}
                      {isAtTop && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-20">
                          <div className="px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-md text-xs font-medium text-gray-700 whitespace-nowrap shadow-sm">
                            {restaurant.name}
                          </div>
                        </div>
                      )}
                      
                      {/* Restaurant Avatar */}
                      <div
                        data-restaurant-avatar
                        className={cn(
                          'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 transition-all duration-300',
                          'cursor-pointer overflow-hidden relative z-10 bg-white shadow-md',
                          isAtTop
                            ? 'scale-110 border-2 border-primary-500 shadow-lg'
                            : 'border border-gray-900 hover:scale-105 hover:shadow-lg'
                        )}
                        style={{
                          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                          transform: isAtTop ? 'scale(1.1)' : 'scale(1)',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          // Snap wheel to this restaurant with smooth animation
                          const angleStep = 360 / restaurants.length;
                          const restaurantBaseAngle = index * angleStep - 90;
                          const targetNormalized = -90 - restaurantBaseAngle;
                          
                          // Calculate the closest equivalent rotation that maintains continuity
                          const fullRotations = Math.floor(wheelRotation / 360);
                          const remainder = wheelRotation % 360;
                          
                          // Find the closest equivalent target rotation
                          let targetRotation = targetNormalized + (fullRotations * 360);
                          
                          // Adjust if we need to go to next/prev rotation for closest match
                          const diff = targetNormalized - getNormalizedRotation(remainder);
                          if (Math.abs(diff) > 180) {
                            if (diff > 0) {
                              targetRotation -= 360;
                            } else {
                              targetRotation += 360;
                            }
                          }
                          
                          // Stop any current momentum
                          setVelocity(0);
                          setIsWheelDragging(false);
                          if (animationFrameRef.current) {
                            cancelAnimationFrame(animationFrameRef.current);
                            animationFrameRef.current = null;
                          }
                          
                          // Smoothly rotate to target position
                          setWheelRotation(targetRotation);
                          setSelectedRestaurantId(restaurant.id);
                        }}
                      >
                        <div className="w-full h-full overflow-hidden flex items-center justify-center" style={{
                          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                        }}>
                          {restaurant.image_url ? (
                            <img
                              src={restaurant.image_url}
                              alt={restaurant.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UtensilsCrossed className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Center Dish Display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 bg-white rounded-full border border-gray-200 overflow-hidden relative">
                {/* Dish Display */}
                {selectedRestaurantItems.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                      <UtensilsCrossed className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 text-sm">No dishes</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedRestaurant?.name || 'Select restaurant'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Dish Slider */}
                    <div
                      data-inner-menu
                      ref={sliderRef}
                      className="absolute inset-0 overflow-hidden"
                      style={{ cursor: isSliderDragging ? 'grabbing' : 'grab' }}
                      onMouseDown={handleSliderMouseDown}
                      onTouchStart={handleSliderTouchStart}
                      onTouchMove={handleSliderTouchMove}
                      onTouchEnd={handleSliderTouchEnd}
                      onMouseEnter={() => {
                        setIsHoveringInnerMenu(true);
                        if (onInnerMenuHoverChange) {
                          onInnerMenuHoverChange(true);
                        }
                      }}
                      onMouseLeave={() => {
                        setIsHoveringInnerMenu(false);
                        if (onInnerMenuHoverChange) {
                          onInnerMenuHoverChange(false);
                        }
                      }}
                      onWheel={(e) => {
                        // Prevent wheel scrolling from affecting the outer wheel
                        e.stopPropagation();
                      }}
                    >
                      <div
                        className="flex h-full"
                        style={{
                          transform: `translateX(calc(-${currentDishIndex * 100}% + ${sliderDragOffset}px))`,
                          transition: isSliderDragging ? 'none' : 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                          willChange: isSliderDragging ? 'transform' : 'auto',
                        }}
                      >
                        {selectedRestaurantItems.map((item) => (
                          <div
                            key={item.id}
                            className="w-full h-full flex-shrink-0 flex flex-col items-center justify-center px-4 cursor-pointer"
                            onClick={() => {
                              if (!isSliderDragging && Math.abs(sliderDragOffset) < 10) {
                                handleDishClick(item);
                              }
                            }}
                          >
                            {/* Dish Image */}
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-4">
                              <div className="w-full h-full rounded-full overflow-hidden shadow-sm border border-gray-100">
                                <MenuItemImage
                                  src={item.image_url}
                                  alt={item.name}
                                  className="rounded-full"
                                  aspectRatio={1}
                                />
                              </div>
                            </div>

                            {/* Dish Info */}
                            <div className="text-center px-2">
                              <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2 line-clamp-2 leading-tight">
                                {item.name}
                              </h3>
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-base sm:text-lg font-bold text-gray-900">
                                  {formatCurrency(item.price)}
                                </span>
                                {item.is_available ? (
                                  <span className="text-xs text-green-600">• Available</span>
                                ) : (
                                  <span className="text-xs text-red-600">• Sold Out</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Navigation Indicators */}
                    {selectedRestaurantItems.length > 1 && (
                      <>
                        {/* Arrows */}
                        <button
                          onClick={goToPrevDish}
                          disabled={currentDishIndex === 0}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-sm hover:bg-white transition-all z-20 disabled:opacity-30"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={goToNextDish}
                          disabled={currentDishIndex === selectedRestaurantItems.length - 1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-sm hover:bg-white transition-all z-20 disabled:opacity-30"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        </button>

                        {/* Dots */}
                        <div className="absolute bottom-4 left-0 right-0 z-20">
                          <div className="flex justify-center gap-1.5">
                            {selectedRestaurantItems.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentDishIndex(index)}
                                className={cn(
                                  'h-1.5 rounded-full transition-all duration-200',
                                  index === currentDishIndex
                                    ? 'bg-gray-800 w-6'
                                    : 'bg-gray-300 hover:bg-gray-400 w-1.5'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Dish Navigation */}
        <div className="lg:hidden mt-8">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedRestaurant?.name || 'Select Restaurant'}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedRestaurantItems.length > 0 
                    ? `${currentDishIndex + 1} of ${selectedRestaurantItems.length} dishes`
                    : 'No dishes available'}
                </p>
              </div>
              {selectedRestaurantItems.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={goToPrevDish}
                    disabled={currentDishIndex === 0}
                    className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={goToNextDish}
                    disabled={currentDishIndex === selectedRestaurantItems.length - 1}
                    className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Quick Add to Cart */}
            {selectedRestaurantItems.length > 0 && (
              <button
                onClick={() => handleDishClick(selectedRestaurantItems[currentDishIndex])}
                disabled={!selectedRestaurantItems[currentDishIndex]?.is_available}
                className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clean Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem?.name}
        size="sm"
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* Item Image */}
            <div className="relative h-40 rounded-lg overflow-hidden bg-gray-50">
              <MenuItemImage
                src={selectedItem.image_url}
                alt={selectedItem.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(selectedItem.price)}
                </span>
                {selectedItem.is_available ? (
                  <span className="text-sm text-green-600 font-medium">Available</span>
                ) : (
                  <span className="text-sm text-red-600 font-medium">Sold Out</span>
                )}
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                  <p className="text-gray-600 text-sm">{selectedItem.description}</p>
                </div>
              )}

              {/* Quantity */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-gray-900">Quantity</label>
                  <span className="text-sm text-gray-500">Max {MAX_CART_ITEM_QUANTITY}</span>
                </div>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-30"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="text-3xl font-bold text-gray-900 min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= MAX_CART_ITEM_QUANTITY}
                    className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-30"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(selectedItem.price * quantity)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setIsModalOpen(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddToCart}
                className="flex-1 bg-gray-900 hover:bg-gray-800"
                disabled={!selectedItem?.is_available}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};