import React, { useState } from 'react';
import { BookingConfig, BookingService } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { saveBooking } from '../api';

interface BookingProps {
  config: BookingConfig;
  onClose: () => void;
  whatsappNumber: string;
  pin: string;
}

const Booking: React.FC<BookingProps> = ({ config, onClose, whatsappNumber, pin }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const services = config.services || [];

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 1. Salva no Firestore
      await saveBooking(pin, {
        service: selectedService?.name,
        date,
        time,
        clientName: name,
        clientPhone: phone,
      });

      // 2. Se habilitado, envia para WhatsApp ou Link
      const message = `*SOLICITAÇÃO DE AGENDAMENTO*\n\n` +
                      `*${config.itemLabel || 'Serviço'}:* ${selectedService?.name}\n` +
                      `*Data:* ${date}\n` +
                      `*Horário:* ${time}\n\n` +
                      `*Cliente:* ${name}\n` +
                      `*Telefone:* ${phone}\n\n` +
                      `_Enviado via Plataforma Digital_`;

      if (config.successActionType === 'whatsapp') {
        const whatsappNumberClean = whatsappNumber.replace(/\D/g, '');
        const whatsappLink = `https://wa.me/${whatsappNumberClean}?text=${encodeURIComponent(message)}`;
        window.open(whatsappLink, '_blank');
      } else if (config.successActionType === 'telegram' && config.telegramUsername) {
        const telegramLink = `https://t.me/${config.telegramUsername.replace('@', '')}?text=${encodeURIComponent(message)}`;
        window.open(telegramLink, '_blank');
      } else if (config.successActionType === 'external_link' && config.successLink) {
        window.open(config.successLink, '_blank');
      }
      
      setIsSuccess(true);
    } catch (error) {
      alert('Erro ao processar agendamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
              <i className={`fas ${config.icon || 'fa-calendar-alt'} text-gold-500`}></i>
            </div>
            <div>
              <h3 className="font-cinzel text-lg text-gold-500 font-bold tracking-wider">{config.sectionTitle}</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Passo {step} de 3</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-zinc-500 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-check text-3xl text-emerald-500"></i>
                </div>
                <h3 className="font-cinzel text-xl text-white font-black uppercase tracking-widest mb-4">SOLICITADO COM SUCESSO!</h3>
                <p className="text-zinc-400 text-sm mb-8 px-4 font-bold uppercase tracking-widest">Recebemos seu agendamento. Entraremos em contato em breve para confirmar os detalhes.</p>
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="w-full py-4 rounded-xl bg-white text-black font-black text-xs uppercase tracking-[0.3em]"
                >
                  FECHAR JANELA
                </button>
              </motion.div>
            ) : step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Selecione o {config.itemLabel || 'Serviço'}</label>
                <div className="grid gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {services.map(service => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => { setSelectedService(service); handleNext(); }}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                        selectedService?.id === service.id 
                        ? 'bg-gold-500/10 border-gold-500/50 text-gold-500' 
                        : 'bg-zinc-950 border-white/5 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-bold text-sm tracking-wide">{service.name}</p>
                        <p className="text-[10px] opacity-60 uppercase">{service.duration}</p>
                      </div>
                      {service.price && <span className="font-bold text-sm">{service.price}</span>}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : step === 2 ? (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Selecione a Data/Dia</label>
                  {config.availableDays && config.availableDays.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                       {config.availableDays.map(day => (
                         <button
                           key={day}
                           type="button"
                           onClick={() => setDate(day)}
                           className={`py-3 px-1 rounded-lg border text-[10px] font-black uppercase transition-all ${
                             date === day 
                             ? 'bg-gold-500 border-gold-400 text-black' 
                             : 'bg-zinc-950 border-white/5 text-zinc-500 hover:border-white/20'
                           }`}
                         >
                           {day}
                         </button>
                       ))}
                       <div className="col-span-3">
                         <input 
                           type="date" 
                           value={date.includes('-') ? date : ''}
                           onChange={(e) => setDate(e.target.value)}
                           className="premium-input mt-2"
                         />
                       </div>
                    </div>
                  ) : (
                    <input 
                      type="date" 
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="premium-input"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Selecione o Horário</label>
                  {config.timeSlots && config.timeSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                       {config.timeSlots.map(slot => (
                         <button
                           key={slot}
                           type="button"
                           onClick={() => setTime(slot)}
                           className={`py-2 px-1 rounded-lg border text-[10px] font-black transition-all ${
                             time === slot 
                             ? 'bg-gold-500 border-gold-400 text-black' 
                             : 'bg-zinc-950 border-white/5 text-zinc-500 hover:border-white/20'
                           }`}
                         >
                           {slot}
                         </button>
                       ))}
                       <div className="col-span-4">
                         <input 
                           type="time" 
                           value={time.includes(':') && !config.timeSlots.includes(time) ? time : ''}
                           onChange={(e) => setTime(e.target.value)}
                           className="premium-input mt-2"
                         />
                       </div>
                    </div>
                  ) : (
                    <input 
                      type="time" 
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="premium-input"
                    />
                  )}
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={handleBack} className="flex-1 py-3 rounded-lg border border-white/10 text-zinc-400 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all">Voltar</button>
                  <button type="button" onClick={handleNext} disabled={!date || !time} className="flex-[2] py-3 rounded-lg bg-gold-500 text-black font-black text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all disabled:opacity-50">Continuar</button>
                </div>
              </motion.div>
            ) : step === 3 ? (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Seu Nome Completo</label>
                  <input 
                    type="text" 
                    placeholder="Ex: João Silva"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="premium-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Seu WhatsApp</label>
                  <input 
                    type="tel" 
                    placeholder="Ex: (11) 99999-9999"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="premium-input"
                  />
                </div>
                <div className="p-4 bg-zinc-950 rounded-xl border border-white/5 space-y-2">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Resumo</p>
                  <p className="text-zinc-300 text-sm font-bold">{selectedService?.name}</p>
                  <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">{date} • {time}</p>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={handleBack} disabled={isSubmitting} className="flex-1 py-3 rounded-lg border border-white/10 text-zinc-400 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all">Voltar</button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] py-3 rounded-lg bg-gold-500 text-black font-black text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all">
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fas fa-spinner fa-spin"></i> PROCESSANDO
                      </span>
                    ) : 'Confirmar Agendamento'}
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </form>

        <div className="px-6 py-4 bg-zinc-900/30 text-center border-t border-white/5">
           <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest leading-relaxed whitespace-pre-wrap">
             {config.workingHours}
           </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Booking;
