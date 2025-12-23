import { OperatingHours, DayHours } from '@/components/store/OperatingHoursEditor';

const DAY_KEYS: (keyof OperatingHours)[] = [
  'sunday',
  'monday', 
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

interface StoreOpenStatus {
  isOpen: boolean;
  reason: 'manual_closed' | 'outside_hours' | 'day_closed' | 'open';
  currentDayHours: DayHours | null;
  nextOpenTime: string | null;
}

export function checkStoreOpen(
  isManuallyOpen: boolean,
  openingHours: OperatingHours | null | undefined
): StoreOpenStatus {
  // If manually closed, store is closed
  if (!isManuallyOpen) {
    return {
      isOpen: false,
      reason: 'manual_closed',
      currentDayHours: null,
      nextOpenTime: null,
    };
  }

  // If no operating hours configured, use manual toggle only
  if (!openingHours) {
    return {
      isOpen: true,
      reason: 'open',
      currentDayHours: null,
      nextOpenTime: null,
    };
  }

  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentDayKey = DAY_KEYS[currentDayIndex];
  const currentDayHours = openingHours[currentDayKey];

  // Check if today is enabled
  if (!currentDayHours?.enabled) {
    const nextOpen = findNextOpenTime(openingHours, currentDayIndex);
    return {
      isOpen: false,
      reason: 'day_closed',
      currentDayHours,
      nextOpenTime: nextOpen,
    };
  }

  // Check current time against opening hours
  const currentTime = now.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  const openTime = currentDayHours.open;
  const closeTime = currentDayHours.close;

  // Handle overnight hours (e.g., 18:00 - 02:00)
  const isOvernight = closeTime < openTime;
  
  let isWithinHours: boolean;
  if (isOvernight) {
    // For overnight hours: open if current >= open OR current < close
    isWithinHours = currentTime >= openTime || currentTime < closeTime;
  } else {
    // Normal hours: open if current >= open AND current < close
    isWithinHours = currentTime >= openTime && currentTime < closeTime;
  }

  if (!isWithinHours) {
    // Determine if we're before opening or after closing
    let nextOpen: string;
    if (currentTime < openTime) {
      nextOpen = `Abre às ${openTime}`;
    } else {
      const nextOpenDay = findNextOpenTime(openingHours, currentDayIndex);
      nextOpen = nextOpenDay || `Abre amanhã`;
    }

    return {
      isOpen: false,
      reason: 'outside_hours',
      currentDayHours,
      nextOpenTime: nextOpen,
    };
  }

  return {
    isOpen: true,
    reason: 'open',
    currentDayHours,
    nextOpenTime: null,
  };
}

function findNextOpenTime(hours: OperatingHours, currentDayIndex: number): string | null {
  // Look for the next open day within the week
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7;
    const nextDayKey = DAY_KEYS[nextDayIndex];
    const nextDayHours = hours[nextDayKey];

    if (nextDayHours?.enabled) {
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      if (i === 1) {
        return `Abre amanhã às ${nextDayHours.open}`;
      }
      return `Abre ${dayNames[nextDayIndex]} às ${nextDayHours.open}`;
    }
  }

  return null;
}

export function formatTodayHours(openingHours: OperatingHours | null | undefined): string | null {
  if (!openingHours) return null;

  const now = new Date();
  const currentDayIndex = now.getDay();
  const currentDayKey = DAY_KEYS[currentDayIndex];
  const currentDayHours = openingHours[currentDayKey];

  if (!currentDayHours?.enabled) {
    return 'Fechado hoje';
  }

  return `${currentDayHours.open} - ${currentDayHours.close}`;
}
