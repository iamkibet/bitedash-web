import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { ratingsApi, type Rating } from '../../api/ratings';
import { toast } from 'sonner';

interface RatingFormProps {
  menuItemId: number;
  menuItemName: string;
  existingRating?: Rating;
  onRatingSubmitted?: () => void;
  onCancel?: () => void;
}

export const RatingForm = ({
  menuItemId,
  menuItemName,
  existingRating,
  onRatingSubmitted,
  onCancel,
}: RatingFormProps) => {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingRating?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setIsSubmitting(true);
      if (existingRating) {
        await ratingsApi.update(existingRating.id, { rating, comment });
        toast.success('Rating updated successfully');
      } else {
        await ratingsApi.create({ 
          menu_item_id: menuItemId,
          rating, 
          comment 
        });
        toast.success('Thank you for your rating!');
      }
      onRatingSubmitted?.();
    } catch (error: any) {
      console.error('Failed to submit rating:', error);
      toast.error(error?.response?.data?.message || 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingRating) return;
    if (!window.confirm('Are you sure you want to delete your rating?')) return;

    try {
      setIsSubmitting(true);
      await ratingsApi.delete(existingRating.id);
      toast.success('Rating deleted');
      onRatingSubmitted?.();
    } catch (error: any) {
      console.error('Failed to delete rating:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{menuItemName}</h4>
          <p className="text-sm text-gray-600">
            {existingRating ? 'Update your rating' : 'Rate this item'}
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none"
              disabled={isSubmitting}
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
          )}
        </div>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
        rows={3}
        disabled={isSubmitting}
      />

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {isSubmitting ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
        </button>
        {existingRating && (
          <button
            onClick={handleDelete}
            disabled={isSubmitting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};
