import { useState } from 'react';
import { Star, Send, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderReviewFormProps {
  orderId: string;
  companyId: string;
  companyName: string;
  onReviewSubmitted?: () => void;
}

interface StarRatingProps {
  rating: number;
  onRate: (rating: number) => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

function StarRating({ rating, onRate, label, size = 'md' }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-9 w-9',
  };

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="transition-transform hover:scale-110 focus:outline-none"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => onRate(star)}
          >
            <Star
              className={`${sizeClasses[size]} transition-colors ${
                (hoverRating || rating) >= star
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function OrderReviewForm({ orderId, companyId, companyName, onReviewSubmitted }: OrderReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Por favor, selecione uma avaliação geral');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('order_reviews').insert({
        order_id: orderId,
        company_id: companyId,
        rating,
        food_rating: foodRating || null,
        delivery_rating: deliveryRating || null,
        comment: comment.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Você já avaliou este pedido');
          setSubmitted(true);
        } else {
          throw error;
        }
        return;
      }

      toast.success('Avaliação enviada com sucesso!');
      setSubmitted(true);
      onReviewSubmitted?.();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="py-6 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
          <p className="font-medium text-green-800 dark:text-green-200">
            Obrigado pela sua avaliação!
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            Sua opinião é muito importante para nós
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Avalie seu pedido
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Como foi sua experiência com {companyName}?
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Main Rating */}
        <div className="text-center pb-4 border-b">
          <p className="text-sm font-medium mb-3">Avaliação Geral</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-transform hover:scale-110 focus:outline-none"
                onClick={() => setRating(star)}
              >
                <Star
                  className={`h-10 w-10 transition-colors ${
                    rating >= star
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/30 hover:text-yellow-300'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {rating === 1 && 'Muito ruim'}
              {rating === 2 && 'Ruim'}
              {rating === 3 && 'Regular'}
              {rating === 4 && 'Bom'}
              {rating === 5 && 'Excelente!'}
            </p>
          )}
        </div>

        {/* Detailed Ratings */}
        <div className="grid grid-cols-2 gap-4">
          <StarRating
            rating={foodRating}
            onRate={setFoodRating}
            label="Qualidade da comida"
            size="sm"
          />
          <StarRating
            rating={deliveryRating}
            onRate={setDeliveryRating}
            label="Entrega"
            size="sm"
          />
        </div>

        {/* Comment */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Deixe um comentário (opcional)
          </p>
          <Textarea
            placeholder="Conte-nos sobre sua experiência..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {comment.length}/500
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || rating === 0}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar Avaliação
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
