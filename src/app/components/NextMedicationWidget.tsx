import { Clock, Pill } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface NextMedicationWidgetProps {
  nextMedication: {
    name: string;
    time: string;
    minutesUntil: number; // Mantido por compatibilidade, mas ignoraremos para ter precisão
  };
  onTimerComplete?: () => void;
}

export function NextMedicationWidget({ nextMedication, onTimerComplete }: NextMedicationWidgetProps) {
  
  // Função para calcular os SEGUNDOS EXATOS diretamente do horário marcado, ignorando arredondamentos
  const getExactSecondsLeft = () => {
    if (!nextMedication.time || nextMedication.time === '--:--') return 0;
    const [hours, minutes] = nextMedication.time.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    
    const diff = target.getTime() - now.getTime();
    return diff > 0 ? Math.floor(diff / 1000) : 0;
  };

  const [timeLeft, setTimeLeft] = useState(getExactSecondsLeft());
  const [completed, setCompleted] = useState(false);
  const initialSecondsRef = useRef<number>(getExactSecondsLeft());
  const prevTimeLeftRef = useRef<number>(getExactSecondsLeft());
  const hasTickedRef = useRef<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Reseta o contador regressivo sempre que o medicamento mudar
  useEffect(() => {
    const exactSeconds = getExactSecondsLeft();
    setTimeLeft(exactSeconds);
    setCompleted(false);
    initialSecondsRef.current = exactSeconds;
    prevTimeLeftRef.current = exactSeconds;
    hasTickedRef.current = false; // Garante o reset do gatilho de tick
  }, [nextMedication.name, nextMedication.time]);

  // Dispara o callback apenas na transição exata de >0 para 0
  useEffect(() => {
    if (!completed && timeLeft === 0 && prevTimeLeftRef.current > 0 && initialSecondsRef.current > 0 && hasTickedRef.current) {
      setCompleted(true);
      onTimerComplete?.();
    }
    prevTimeLeftRef.current = timeLeft;
  }, [timeLeft, completed, onTimerComplete]);

  useEffect(() => {
    if (timeLeft !== initialSecondsRef.current) hasTickedRef.current = true;
  }, [timeLeft]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const formatTime = () => {
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getUrgencyColor = () => {
    if (timeLeft === 0 && !nextMedication.time) return 'border-gray-200 bg-gray-50';
    if (timeLeft < 300) return 'border-[#cc0000] bg-red-50'; // < 5 min
    if (timeLeft < 1800) return 'border-[#ff914d] bg-orange-50'; // < 30 min
    return 'border-blue-400 bg-blue-50';
  };

  // Previne divisão por zero na barra de progresso caso minutesUntil venha zerado inicialmente
  const totalSeconds = nextMedication.minutesUntil > 0 ? nextMedication.minutesUntil * 60 : initialSecondsRef.current || 1;

  return (
    <div className={`bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 border-l-4 ${getUrgencyColor()} transition-all`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
          <Clock className="w-7 h-7 text-gray-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Próximo Medicamento</h3>
      </div>

      <div className="space-y-4">
        {/* Countdown Display */}
        <div className="text-center p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600 mb-2">Tempo restante</p>
          <p className="text-4xl font-bold text-[#cc0000] font-mono">{formatTime()}</p>
        </div>

        {/* Medication Info */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
          <Pill className="w-6 h-6 text-[#ff914d] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">{nextMedication.name}</p>
            <p className="text-sm text-gray-600">Horário: {nextMedication.time}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-[#cc0000] transition-all duration-1000 ease-linear"
            style={{
              width: `${Math.max(0, 100 - (timeLeft / totalSeconds) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}