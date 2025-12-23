import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  isPushSupported, 
  subscribeToPush, 
  getNotificationPermissionStatus,
  unsubscribeFromPush 
} from '@/lib/pushNotifications';
import { toast } from 'sonner';

interface PushNotificationButtonProps {
  orderId?: string;
  companyId?: string;
  userId?: string;
  userType: 'customer' | 'driver' | 'store_owner';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function PushNotificationButton({
  orderId,
  companyId,
  userId,
  userType,
  variant = 'outline',
  size = 'sm',
  className = '',
}: PushNotificationButtonProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const supported = isPushSupported();
      setIsSupported(supported);

      if (supported) {
        const perm = await getNotificationPermissionStatus();
        setPermission(perm);
        setIsSubscribed(perm === 'granted');
      }
    };

    checkStatus();
  }, []);

  const handleToggleNotifications = useCallback(async () => {
    setIsLoading(true);

    try {
      if (isSubscribed) {
        await unsubscribeFromPush();
        setIsSubscribed(false);
        toast.info('Notificações desativadas');
      } else {
        const success = await subscribeToPush({
          orderId,
          companyId,
          userId,
          userType,
        });

        if (success) {
          setIsSubscribed(true);
          toast.success('Notificações ativadas!', {
            description: 'Você receberá atualizações mesmo com o app fechado',
          });
        } else {
          toast.error('Não foi possível ativar notificações', {
            description: 'Verifique as permissões do navegador',
          });
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast.error('Erro ao configurar notificações');
    } finally {
      setIsLoading(false);
    }
  }, [isSubscribed, orderId, companyId, userId, userType]);

  if (!isSupported) {
    return null;
  }

  if (permission === 'denied') {
    return (
      <Button
        variant="ghost"
        size={size}
        className={`text-muted-foreground ${className}`}
        disabled
        title="Notificações bloqueadas nas configurações do navegador"
      >
        <BellOff className="h-4 w-4 mr-2" />
        Bloqueado
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleToggleNotifications}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4 mr-2 text-primary" />
      ) : (
        <BellOff className="h-4 w-4 mr-2" />
      )}
      {isSubscribed ? 'Notificações ativas' : 'Ativar notificações'}
    </Button>
  );
}
