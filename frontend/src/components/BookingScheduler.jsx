import React, { useEffect, useMemo, useRef, useState } from 'react';
import flatpickr from 'flatpickr';
import { Portuguese } from 'flatpickr/dist/l10n/pt.js';
import 'flatpickr/dist/flatpickr.min.css';
import 'flatpickr/dist/themes/dark.css';
import './BookingScheduler.css';

const pad2 = (n) => String(n).padStart(2, '0');
const toYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const applyTime = (date, hhmm) => {
  const [hh, mm] = hhmm.split(':').map(Number);
  const next = new Date(date);
  next.setHours(hh, mm, 0, 0);
  return next;
};

const clampToWindow = (d, openTime, closeTime) => {
  const open = applyTime(d, openTime);
  const close = applyTime(d, closeTime);
  if (d < open) return open;
  if (d > close) return close;
  return d;
};

const calcDurationLabel = (startISO, endISO) => {
  if (!startISO || !endISO) return '';
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return '';
  }
  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.round(diffMs / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  const parts = [];
  if (days) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  if (minutes) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
  return parts.length ? `Duração: ${parts.join(' ')}` : 'Duração: menor que 1 minuto';
};

const emptyInfo = { messages: [], valid: false, duration: '' };

export default function BookingScheduler({
  openTime = '08:00',
  closeTime = '18:00',
  bookedRanges = [],
  bookedSingleDates = [],
  daySlots = {},
  value,
  onChange,
  className,
}) {
  const saidaRef = useRef(null);
  const entradaRef = useRef(null);
  const saidaPickerRef = useRef(null);
  const entradaPickerRef = useRef(null);

  const [saidaISO, setSaidaISO] = useState(value?.startAt ?? null);
  const [entradaISO, setEntradaISO] = useState(value?.endAt ?? null);
  const [saidaSlots, setSaidaSlots] = useState([]);
  const [entradaSlots, setEntradaSlots] = useState([]);
  const [info, setInfo] = useState(emptyInfo);

  useEffect(() => {
    setSaidaISO(value?.startAt ?? null);
    setEntradaISO(value?.endAt ?? null);
  }, [value?.startAt, value?.endAt]);

  const disableOptions = useMemo(() => {
    return [...bookedSingleDates, ...bookedRanges];
  }, [bookedSingleDates, bookedRanges]);

  useEffect(() => {
    const updateSummary = (nextSaida, nextEntrada) => {
      const messages = [];
      let valid = true;
      if (!nextSaida) {
        messages.push('Selecione a saída.');
        valid = false;
      }
      if (!nextEntrada) {
        messages.push('Selecione a Retorno.');
        valid = false;
      }
      let duration = '';
      if (nextSaida && nextEntrada) {
        const start = new Date(nextSaida);
        const end = new Date(nextEntrada);
        if (end <= start) {
          messages.push('Retorno deve ser após a saída.');
          valid = false;
        } else {
          duration = calcDurationLabel(nextSaida, nextEntrada);
        }
      }
      setInfo({ messages, valid, duration });
      if (onChange) {
        onChange({ startAt: nextSaida, endAt: nextEntrada, valid, messages });
      }
    };
    updateSummary(saidaISO, entradaISO);
  }, [saidaISO, entradaISO, onChange]);

  useEffect(() => {
    if (!saidaRef.current || !entradaRef.current) return;

    const handleSaidaChange = (selectedDates, dateStr, instance) => {
      let dt = selectedDates[0];
      if (!dt) {
        setSaidaISO(null);
        setSaidaSlots([]);
        return;
      }

      const key = toYmd(dt);
      const slotsForDay = daySlots[key] || [];
      setSaidaSlots(slotsForDay);

      if (slotsForDay.length) {
        const hhmm = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
        if (!slotsForDay.includes(hhmm)) {
          const clamped = applyTime(dt, slotsForDay[0]);
          instance.setDate(clamped, true);
          return;
        }
      } else {
        const clamped = clampToWindow(dt, openTime, closeTime);
        if (clamped.getTime() !== dt.getTime()) {
          instance.setDate(clamped, true);
          return;
        }
      }

      const iso = dt.toISOString();
      setSaidaISO(iso);
      if (entradaISO && new Date(entradaISO) <= dt) {
        entradaPickerRef.current?.clear();
        setEntradaISO(null);
      }
      entradaPickerRef.current?.set('minDate', new Date(dt));
    };

    const handleEntradaChange = (selectedDates, dateStr, instance) => {
      let dt = selectedDates[0];
      if (!dt) {
        setEntradaISO(null);
        setEntradaSlots([]);
        return;
      }

      const key = toYmd(dt);
      const slotsForDay = daySlots[key] || [];
      setEntradaSlots(slotsForDay);

      if (slotsForDay.length) {
        const hhmm = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
        if (!slotsForDay.includes(hhmm)) {
          const clamped = applyTime(dt, slotsForDay[0]);
          instance.setDate(clamped, true);
          return;
        }
      } else {
        const clamped = clampToWindow(dt, openTime, closeTime);
        if (clamped.getTime() !== dt.getTime()) {
          instance.setDate(clamped, true);
          return;
        }
      }

      setEntradaISO(dt.toISOString());
    };

    const saidaPicker = flatpickr(saidaRef.current, {
      locale: Portuguese,
      enableTime: true,
      time_24hr: true,
      minuteIncrement: 15,
      dateFormat: 'd/m/Y H:i',
      minDate: 'today',
      disable: disableOptions,
      onChange: handleSaidaChange,
      onOpen: (_selectedDates, _str, instance) => {
        if (instance.selectedDates[0]) {
          const d = instance.selectedDates[0];
          const key = toYmd(d);
          setSaidaSlots(daySlots[key] || []);
        }
      }
    });

    const entradaPicker = flatpickr(entradaRef.current, {
      locale: Portuguese,
      enableTime: true,
      time_24hr: true,
      minuteIncrement: 15,
      dateFormat: 'd/m/Y H:i',
      minDate: 'today',
      disable: disableOptions,
      onChange: handleEntradaChange,
      onOpen: (_selectedDates, _str, instance) => {
        if (instance.selectedDates[0]) {
          const d = instance.selectedDates[0];
          const key = toYmd(d);
          setEntradaSlots(daySlots[key] || []);
        }
      }
    });

    saidaPickerRef.current = saidaPicker;
    entradaPickerRef.current = entradaPicker;

    if (saidaISO) {
      saidaPicker.setDate(new Date(saidaISO), false);
    }
    if (entradaISO) {
      entradaPicker.setDate(new Date(entradaISO), false);
    }

    return () => {
      saidaPicker.destroy();
      entradaPicker.destroy();
      saidaPickerRef.current = null;
      entradaPickerRef.current = null;
    };
  }, [disableOptions, daySlots, openTime, closeTime, saidaISO, entradaISO]);

  useEffect(() => {
    if (saidaPickerRef.current) {
      saidaPickerRef.current.set('disable', disableOptions);
    }
    if (entradaPickerRef.current) {
      entradaPickerRef.current.set('disable', disableOptions);
    }
  }, [disableOptions]);

  return (
    <div className={`booking-scheduler ${className || ''}`}>
      <div className="card">
        <div className="card-body">
          <h3 className="card-title">Selecione Saída e Retorno</h3>
          <div className="columns">
            <div className="column">
              <label htmlFor="saida" className="form-label">Data/Hora de Saída</label>
              <input ref={saidaRef} id="saida" className="text-input" placeholder="Escolha data e hora de saída" />
              <small className="helper-text">
                Funcionamento: {openTime}–{closeTime}. Se houver horários pré-definidos, escolha um abaixo.
              </small>
              {saidaSlots.length > 0 && (
                <div className="slot-area">
                  <div className="slot-title">Horários disponíveis:</div>
                  <div className="slot-grid">
                    {saidaSlots.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        className={`slot-btn${saidaISO && new Date(saidaISO).toTimeString().startsWith(slot) ? ' active' : ''}`}
                        onClick={() => {
                          if (!saidaPickerRef.current) return;
                          const base = saidaPickerRef.current.selectedDates[0] || new Date();
                          const next = applyTime(base, slot);
                          saidaPickerRef.current.setDate(next, true);
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="column">
              <label htmlFor="entrada" className="form-label">Data/Hora de Retorno</label>
              <input ref={entradaRef} id="entrada" className="text-input" placeholder="Escolha data e hora de Retorno" />
              <small className="helper-text">Retorno não pode ser antes da saída.</small>
              {entradaSlots.length > 0 && (
                <div className="slot-area">
                  <div className="slot-title">Horários disponíveis:</div>
                  <div className="slot-grid">
                    {entradaSlots.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        className={`slot-btn${entradaISO && new Date(entradaISO).toTimeString().startsWith(slot) ? ' active' : ''}`}
                        onClick={() => {
                          if (!entradaPickerRef.current) return;
                          const base = entradaPickerRef.current.selectedDates[0] || new Date();
                          const next = applyTime(base, slot);
                          entradaPickerRef.current.setDate(next, true);
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <h3 className="card-title">Resumo</h3>
          {info.valid && <div className="duration-ok">{info.duration}</div>}
          {!info.valid && info.messages.map((msg) => (
            <div key={msg} className="duration-warning">{msg}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
