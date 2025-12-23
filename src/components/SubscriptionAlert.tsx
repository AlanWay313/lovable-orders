import { AlertTriangle, TrendingUp, Crown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';

interface SubscriptionAlertProps {
  plan: string;
  orderLimit: number;
  monthlyOrderCount: number;
  displayName: string;
  isNearLimit: boolean;
  isAtLimit: boolean;
  usagePercentage: number;
}

export function SubscriptionAlert({
  plan,
  orderLimit,
  monthlyOrderCount,
  displayName,
  isNearLimit,
  isAtLimit,
  usagePercentage,
}: SubscriptionAlertProps) {
  // Don't show alert for enterprise (unlimited) or if usage is normal
  if (orderLimit === -1 || (!isNearLimit && !isAtLimit)) {
    return null;
  }

  return (
    <Alert
      variant={isAtLimit ? 'destructive' : 'default'}
      className={isAtLimit ? 'border-destructive/50 bg-destructive/10' : 'border-warning/50 bg-warning/10'}
    >
      <AlertTriangle className={`h-4 w-4 ${isAtLimit ? 'text-destructive' : 'text-warning'}`} />
      <AlertTitle className="flex items-center gap-2">
        {isAtLimit ? 'Limite de pedidos atingido!' : 'Você está próximo do limite!'}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>
            {monthlyOrderCount.toLocaleString()} / {orderLimit.toLocaleString()} pedidos usados
          </span>
          <span className="font-medium">{displayName}</span>
        </div>
        
        <Progress
          value={Math.min(usagePercentage, 100)}
          className={`h-2 ${isAtLimit ? '[&>div]:bg-destructive' : '[&>div]:bg-warning'}`}
        />
        
        {isAtLimit ? (
          <p className="text-sm">
            Sua loja não pode receber novos pedidos até que você faça upgrade do plano.
          </p>
        ) : (
          <p className="text-sm">
            Você usou {usagePercentage.toFixed(0)}% do seu limite mensal. Considere fazer upgrade para evitar interrupções.
          </p>
        )}
        
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link to="/dashboard/plans">
            <Crown className="h-4 w-4 mr-2" />
            Ver planos e fazer upgrade
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
