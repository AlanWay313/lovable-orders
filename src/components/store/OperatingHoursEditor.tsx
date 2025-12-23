import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Segunda-feira', shortLabel: 'Seg' },
  { key: 'tuesday', label: 'Terça-feira', shortLabel: 'Ter' },
  { key: 'wednesday', label: 'Quarta-feira', shortLabel: 'Qua' },
  { key: 'thursday', label: 'Quinta-feira', shortLabel: 'Qui' },
  { key: 'friday', label: 'Sexta-feira', shortLabel: 'Sex' },
  { key: 'saturday', label: 'Sábado', shortLabel: 'Sáb' },
  { key: 'sunday', label: 'Domingo', shortLabel: 'Dom' },
];

export interface DayHours {
  enabled: boolean;
  open: string;
  close: string;
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

const DEFAULT_HOURS: OperatingHours = {
  monday: { enabled: true, open: '08:00', close: '18:00' },
  tuesday: { enabled: true, open: '08:00', close: '18:00' },
  wednesday: { enabled: true, open: '08:00', close: '18:00' },
  thursday: { enabled: true, open: '08:00', close: '18:00' },
  friday: { enabled: true, open: '08:00', close: '18:00' },
  saturday: { enabled: true, open: '08:00', close: '14:00' },
  sunday: { enabled: false, open: '08:00', close: '14:00' },
};

// Helper to ensure all days have valid data by merging with defaults
function ensureValidHours(input: Partial<OperatingHours> | null | undefined): OperatingHours {
  if (!input || typeof input !== 'object') {
    return DEFAULT_HOURS;
  }
  
  return {
    monday: { ...DEFAULT_HOURS.monday, ...(input.monday || {}) },
    tuesday: { ...DEFAULT_HOURS.tuesday, ...(input.tuesday || {}) },
    wednesday: { ...DEFAULT_HOURS.wednesday, ...(input.wednesday || {}) },
    thursday: { ...DEFAULT_HOURS.thursday, ...(input.thursday || {}) },
    friday: { ...DEFAULT_HOURS.friday, ...(input.friday || {}) },
    saturday: { ...DEFAULT_HOURS.saturday, ...(input.saturday || {}) },
    sunday: { ...DEFAULT_HOURS.sunday, ...(input.sunday || {}) },
  };
}

interface OperatingHoursEditorProps {
  value: OperatingHours | null;
  onChange: (hours: OperatingHours) => void;
}

export function OperatingHoursEditor({ value, onChange }: OperatingHoursEditorProps) {
  const hours = ensureValidHours(value);

  const updateDay = (dayKey: keyof OperatingHours, field: keyof DayHours, fieldValue: boolean | string) => {
    onChange({
      ...hours,
      [dayKey]: {
        ...hours[dayKey],
        [field]: fieldValue,
      },
    });
  };

  const copyToAll = (sourceDay: keyof OperatingHours) => {
    const sourceHours = hours[sourceDay];
    const newHours = { ...hours };
    DAYS_OF_WEEK.forEach((day) => {
      if (day.key !== sourceDay) {
        newHours[day.key as keyof OperatingHours] = { ...sourceHours };
      }
    });
    onChange(newHours);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Horários de Funcionamento
        </CardTitle>
        <CardDescription>
          Configure os dias e horários que sua loja está aberta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day, index) => {
            const dayHours = hours[day.key as keyof OperatingHours];
            return (
              <div
                key={day.key}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                {/* Day name and toggle */}
                <div className="flex items-center gap-3 min-w-[140px]">
                  <Switch
                    checked={dayHours.enabled}
                    onCheckedChange={(checked) => updateDay(day.key as keyof OperatingHours, 'enabled', checked)}
                  />
                  <Label className={`font-medium ${!dayHours.enabled ? 'text-muted-foreground' : ''}`}>
                    <span className="hidden sm:inline">{day.label}</span>
                    <span className="sm:hidden">{day.shortLabel}</span>
                  </Label>
                </div>

                {/* Time inputs */}
                <div className={`flex items-center gap-2 flex-1 ${!dayHours.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Abre:</Label>
                    <Input
                      type="time"
                      value={dayHours.open}
                      onChange={(e) => updateDay(day.key as keyof OperatingHours, 'open', e.target.value)}
                      className="w-[120px]"
                    />
                  </div>
                  <span className="text-muted-foreground">–</span>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Fecha:</Label>
                    <Input
                      type="time"
                      value={dayHours.close}
                      onChange={(e) => updateDay(day.key as keyof OperatingHours, 'close', e.target.value)}
                      className="w-[120px]"
                    />
                  </div>
                </div>

                {/* Copy to all button (only on first day) */}
                {index === 0 && (
                  <button
                    type="button"
                    onClick={() => copyToAll(day.key as keyof OperatingHours)}
                    className="text-xs text-primary hover:underline whitespace-nowrap"
                  >
                    Copiar para todos
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Estes horários são apenas informativos. Use o botão "Loja Aberta/Fechada" para controlar se você está recebendo pedidos.
        </p>
      </CardContent>
    </Card>
  );
}

export { DEFAULT_HOURS };
