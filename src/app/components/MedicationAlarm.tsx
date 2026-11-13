import { Clock, Check, Timer as Snooze, Pill, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

interface MedicationAlarmProps {
  isOpen: boolean;
  onClose: () => void;
  medication: {
    id?: number;
    name: string;
    dosage: string;
    time: string;
  };
  onConfirm: () => void;
  onSnooze: (minutes?: number) => void;
}

export function MedicationAlarm({ isOpen, onClose, medication, onConfirm, onSnooze }: MedicationAlarmProps) {
  const [delayMinutes, setDelayMinutes] = useState(0);

  // CRONÔMETRO: Calcula o atraso em tempo real enquanto o modal está aberto
  useEffect(() => {
    if (!isOpen || !medication?.time) return;

    const calculateDelay = () => {
      const [hours, minutes] = medication.time.split(':').map(Number);
      const now = new Date();
      const alarmTime = new Date();
      alarmTime.setHours(hours, minutes, 0, 0);

      // Proteção: se o relógio disparou alguns segundos adiantado, o atraso é 0
      if (now.getTime() < alarmTime.getTime()) {
        setDelayMinutes(0);
        return;
      }

      // Calcula o atraso real em minutos
      const diff = Math.floor((now.getTime() - alarmTime.getTime()) / 60000);
      setDelayMinutes(diff);
    };

    calculateDelay(); // Roda na hora que abre
    const interval = setInterval(calculateDelay, 60000); // Atualiza a cada 1 minuto
    
    return () => clearInterval(interval);
  }, [isOpen, medication]);

  // MOTOR DE URGÊNCIA: Define as cores e textos baseado no atraso
  let config = {
    themeColor: '#3B82F6', // Azul (Normal)
    rgbColor: '59, 130, 246',
    title: 'HORA DA MEDICAÇÃO',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-500',
    pulse: false
  };

  if (delayMinutes > 15) {
    config = {
      themeColor: '#D32F2F', // Vermelho (Crítico)
      rgbColor: '211, 47, 47',
      title: 'MUITO ATRASADO!',
      bgClass: 'bg-red-50',
      borderClass: 'border-[#D32F2F]',
      pulse: true
    };
  } else if (delayMinutes > 5) {
    config = {
      themeColor: '#F97316', // Laranja (Atrasado)
      rgbColor: '249, 115, 22',
      title: 'MEDICAÇÃO ATRASADA',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-500',
      pulse: false
    };
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Alarm Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md"
          >
            <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden border-4 ${config.borderClass} relative transition-colors duration-500`}>
              
              {/* Pulsing Border Animation (Apenas no crítico) */}
              {config.pulse && (
                <motion.div
                  animate={{
                    boxShadow: [
                      `0 0 0 0 rgba(${config.rgbColor}, 0.7)`,
                      `0 0 0 20px rgba(${config.rgbColor}, 0)`,
                      `0 0 0 0 rgba(${config.rgbColor}, 0)`,
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                />
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              <div className="p-8 text-center">
                {/* Animated Icon */}
                <motion.div
                  animate={{
                    rotate: config.pulse ? [0, -10, 10, -10, 10, 0] : 0,
                    scale: config.pulse ? [1, 1.1, 1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  }}
                  style={{ backgroundColor: config.themeColor }}
                  className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl transition-colors duration-500"
                >
                  {delayMinutes > 5 ? (
                    <AlertTriangle className="w-12 h-12 text-white" />
                  ) : (
                    <Clock className="w-14 h-14 text-white" />
                  )}
                </motion.div>

                {/* Title */}
                <h2 
                  style={{ color: config.themeColor }}
                  className="text-3xl font-bold mb-2 transition-colors duration-500"
                >
                  {config.title}
                </h2>
                
                {/* Indicador de minutos atrasados (Oculto se for <= 0) */}
                {delayMinutes > 0 && (
                  <p className="text-gray-500 font-medium mb-4">
                    Passaram-se <span className="font-bold text-gray-800">{delayMinutes} minutos</span> da hora marcada.
                  </p>
                )}

                {/* Medication Info */}
                <div className={`${config.bgClass} rounded-xl p-6 mb-6 border-2 border-gray-200 transition-colors duration-500`}>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Pill className="w-8 h-8 text-gray-700" />
                    <p className="text-2xl font-bold text-gray-900">{medication.name}</p>
                  </div>
                  <p className="text-xl text-gray-700 mb-2 font-medium">{medication.dosage}</p>
                  <div className="flex items-center justify-center gap-2 text-gray-500 bg-white w-fit mx-auto px-4 py-1.5 rounded-full shadow-sm">
                    <Clock className="w-4 h-4" />
                    <p className="text-lg font-semibold">{medication.time}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={onConfirm}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-xl font-bold text-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 min-h-[60px]"
                  >
                    <Check className="w-7 h-7" />
                    Confirmar Ingestão
                  </button>

                  <button
                    onClick={() => onSnooze(10)}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3"
                  >
                    <Snooze className="w-6 h-6" />
                    Adiar 10 minutos
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}