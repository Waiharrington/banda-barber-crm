import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight, Coins, Droplets, Loader2, ReceiptText, Scissors } from 'lucide-react';
import { dataService } from '../services/dataService';
import {
  businessDateEnd,
  businessDateStart,
  getBusinessMonthStart,
  getBusinessWeekStart
} from '../utils/dateTime';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES = ['do','lu','ma','mi','ju','vi','sá'];

const toDateStr = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const todayStr = () => {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
};

const DatePicker = ({ value, onChange, placeholder, min }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [view, setView] = useState(() => {
    if (value) { const [y, m] = value.split('-'); return new Date(+y, +m - 1, 1); }
    return new Date();
  });
  const btnRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (value) { const [y, m] = value.split('-'); setView(new Date(+y, +m - 1, 1)); }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const calWidth = 252;
      const left = Math.min(r.left, window.innerWidth - calWidth - 8);
      setPos({ top: r.bottom + 8, left: Math.max(8, left), width: r.width });
    };
    updatePos();
    const onOutside = (e) => {
      if (btnRef.current?.contains(e.target) || dropRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = todayStr();

  const formatDisplay = (v) => {
    if (!v) return placeholder || 'dd/mm/aaaa';
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dropdown = open && createPortal(
    <div ref={dropRef} className="datepicker-dropdown" style={{
      position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999,
      background: '#161616', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '18px', padding: '16px', width: '252px',
      boxShadow: '0 24px 64px rgba(0,0,0,0.9)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <button onClick={() => setView(new Date(year, month - 1, 1))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '8px' }}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={() => setView(new Date(year, month + 1, 1))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '8px' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} />;
          const dateStr = toDateStr(year, month, day);
          const isSelected = value === dateStr;
          const isToday = dateStr === today;
          const disabled = min ? dateStr < min : false;
          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => { onChange(dateStr); setOpen(false); }}
              style={{
                padding: '7px 0', borderRadius: '8px', border: 'none',
                background: isSelected ? 'var(--gold-primary)' : isToday ? 'rgba(212,175,55,0.12)' : 'transparent',
                color: disabled ? 'rgba(255,255,255,0.15)' : isSelected ? '#080808' : isToday ? 'var(--gold-primary)' : 'white',
                fontSize: '12px', fontWeight: isSelected || isToday ? '900' : '600',
                cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'center',
                outline: isToday && !isSelected ? '1px solid rgba(212,175,55,0.4)' : 'none'
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => { onChange(''); setOpen(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
          Borrar
        </button>
        <button onClick={() => { onChange(today); setOpen(false); setView(new Date()); }} style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: '800' }}>
          Hoy
        </button>
      </div>
    </div>,
    document.body
  );

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
          background: 'rgba(0,0,0,0.3)', border: `1px solid ${open ? 'var(--gold-primary)' : 'rgba(255,255,255,0.1)'}`,
          color: value ? 'white' : 'var(--text-muted)', fontSize: '13px', fontWeight: '700',
          textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px'
        }}
      >
        <span>{formatDisplay(value)}</span>
        <CalendarRange size={14} color="var(--gold-primary)" />
      </button>
      {dropdown}
    </div>
  );
};

const FILTERS = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'custom', label: 'Rango' },
  { id: 'all', label: 'Todo' }
];

const getStaffAmounts = (transaction, staffId) => {
  const member = (transaction.metadata?.staffInvolved || []).find(
    item => String(item.staffId || item.id) === String(staffId)
  );
  const commission = Number(member?.commissionEarned ?? member?.commission_earned ?? 0);
  const productCommission = Number(member?.productCommissionEarned ?? member?.product_commission ?? 0);
  const tips = Number(member?.tip ?? member?.tip_amount ?? 0);
  return {
    commission,
    productCommission,
    tips,
    earnings: commission + productCommission + tips
  };
};

const getQueryRange = (filter, customRange) => {
  if (filter === 'week') return { start: getBusinessWeekStart().toISOString(), end: null };
  if (filter === 'month') return { start: getBusinessMonthStart().toISOString(), end: null };
  if (filter === 'custom' && customRange.start && customRange.end) {
    return {
      start: businessDateStart(customRange.start).toISOString(),
      end: businessDateEnd(customRange.end).toISOString()
    };
  }
  return { start: null, end: null };
};

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '7px', fontSize: '12px' }}>
    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ color: 'white', fontWeight: '800', textAlign: 'right' }}>{value}</span>
  </div>
);

const MoneyRow = ({ label, usd, transactionRate, accent = false, strong = false }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px', paddingBottom: strong ? '8px' : 0, borderBottom: strong ? '1px dashed rgba(255,255,255,0.08)' : 'none' }}>
    <span style={{ color: accent ? '#32d74b' : 'var(--text-secondary)', fontSize: '12px', fontWeight: accent || strong ? '850' : '650' }}>{label}</span>
    <span style={{ textAlign: 'right', color: accent ? '#32d74b' : strong ? 'var(--gold-primary)' : 'white', fontSize: strong ? '14px' : '12px', fontWeight: '900' }}>
      {Math.round(Number(usd || 0) * transactionRate).toLocaleString('es-VE')} Bs.
      <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '9px', marginTop: '2px' }}>Ref: ${Number(usd || 0).toFixed(2)}</small>
    </span>
  </div>
);

const getPaymentMethod = metadata => {
  const cashUsd = Number(metadata.cash_usd ?? metadata.cashUsd ?? 0);
  const transferBs = Number(metadata.transfer_bs ?? metadata.transferBs ?? 0);
  const usdMethod = metadata.methodUsd || metadata.method_usd;
  const bsMethod = metadata.methodBs || metadata.method_bs;
  const methods = [];

  if (cashUsd > 0 && usdMethod && usdMethod !== 'N/A') methods.push(usdMethod);
  if (transferBs > 0 && bsMethod && bsMethod !== 'N/A') methods.push(bsMethod);
  if (methods.length === 0) {
    [metadata.paymentMethod, bsMethod, usdMethod]
      .filter(method => method && method !== 'N/A')
      .forEach(method => methods.push(method));
  }
  return [...new Set(methods)].join(' + ') || 'Método no registrado';
};

const getTransactionRate = (transaction, fallbackRate) => {
  const savedRate = Number(
    transaction.exchange_rate
      || transaction.metadata?.fixedRate
      || transaction.metadata?.bcvRate
      || transaction.metadata?.exchange_rate
  );
  return savedRate > 0 ? savedRate : fallbackRate;
};

const StaffTransactionHistory = ({ staffMember, rates, isMobile }) => {
  const [filter, setFilter] = useState('week');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [transactions, setTransactions] = useState([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAssistant = /asistente|lavado|operaciones/i.test(staffMember?.role || '');
  const customStart = customRange.start;
  const customEnd = customRange.end;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!staffMember?.id) return;
      if (filter === 'custom' && (!customStart || !customEnd)) {
        setTransactions([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const range = getQueryRange(filter, { start: customStart, end: customEnd });
        const data = await dataService.getStaffTransactions(staffMember.id, range.start, range.end);
        if (!cancelled) setTransactions(data);
      } catch (loadError) {
        console.error('Error loading staff transaction history:', loadError);
        if (!cancelled) {
          setTransactions([]);
          setError('No se pudo cargar el historial.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [staffMember?.id, filter, customStart, customEnd]);

  const rows = useMemo(
    () => transactions.map(transaction => ({
      ...transaction,
      staffAmounts: getStaffAmounts(transaction, staffMember.id)
    })),
    [transactions, staffMember.id]
  );

  const rate = Number(rates?.usd || 550);

  const totals = useMemo(
    () => rows.reduce((summary, transaction) => ({
      earnings: summary.earnings + transaction.staffAmounts.earnings,
      earningsBs: summary.earningsBs + (transaction.staffAmounts.earnings * getTransactionRate(transaction, rate)),
      tips: summary.tips + transaction.staffAmounts.tips,
      tipsBs: summary.tipsBs + (transaction.staffAmounts.tips * getTransactionRate(transaction, rate))
    }), { earnings: 0, earningsBs: 0, tips: 0, tipsBs: 0 }),
    [rows, rate]
  );

  const formatUsd = value => Number(value || 0).toFixed(2);
  const formatBs = value => Math.round(Number(value || 0)).toLocaleString('es-VE');

  return (
    <section className={'animate-fade-in'} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className={'glass-card'} style={{ padding: isMobile ? '18px' : '24px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <ReceiptText size={19} color={'var(--gold-primary)'} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>Mi historial de transacciones</h3>
            </div>
            <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '12px' }}>
              Solo se muestran operaciones asociadas a {staffMember.name}.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '5px', padding: '3px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', flexWrap: 'wrap' }}>
            {FILTERS.map(option => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                style={{
                  padding: '7px 12px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '850',
                  fontSize: '11px',
                  color: filter === option.id ? '#080808' : 'var(--text-secondary)',
                  background: filter === option.id ? 'var(--gold-primary)' : 'transparent'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {filter === 'custom' && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: '150px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800' }}>
              DESDE
              <div style={{ marginTop: '6px' }}>
                <DatePicker
                  value={customRange.start}
                  onChange={v => setCustomRange(c => ({ ...c, start: v }))}
                  placeholder="dd/mm/aaaa"
                />
              </div>
            </label>
            <label style={{ flex: 1, minWidth: '150px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800' }}>
              HASTA
              <div style={{ marginTop: '6px' }}>
                <DatePicker
                  value={customRange.end}
                  onChange={v => setCustomRange(c => ({ ...c, end: v }))}
                  placeholder="dd/mm/aaaa"
                  min={customRange.start || undefined}
                />
              </div>
            </label>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { label: isAssistant ? 'Comisiones y propinas' : 'Ganancia personal', value: totals.earnings, valueBs: totals.earningsBs, icon: <Coins size={18} color={'#32d74b'} /> },
          { label: 'Propinas', value: totals.tips, valueBs: totals.tipsBs, icon: <Coins size={18} color={'#ff9f0a'} /> },
          { label: isAssistant ? 'Lavados registrados' : 'Servicios cobrados', count: rows.length, icon: isAssistant ? <Droplets size={18} color={'#007aff'} /> : <Scissors size={18} color={'var(--gold-primary)'} /> }
        ].map(card => (
          <div key={card.label} className={'glass-card'} style={{ padding: '18px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '850', textTransform: 'uppercase' }}>
              {card.icon} {card.label}
            </div>
            <div style={{ marginTop: '10px', fontSize: '23px', fontWeight: '950', color: 'white' }}>
              {card.count !== undefined ? card.count : `${formatBs(card.valueBs)} Bs.`}
            </div>
            {card.count === undefined && (
              <div style={{ marginTop: '3px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700' }}>Ref: ${formatUsd(card.value)}</div>
            )}
          </div>
        ))}
      </div>

      <div className={'glass-card'} style={{ padding: isMobile ? '16px' : '22px', borderRadius: '24px' }}>
        {loading ? (
          <div style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
            <Loader2 size={20} className={'animate-spin'} /> Cargando historial...
          </div>
        ) : error ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#ff6b6b' }}>{error}</div>
        ) : filter === 'custom' && (!customRange.start || !customRange.end) ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Selecciona las fechas del rango.
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay transacciones personales en este período.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rows.map(transaction => {
              const metadata = transaction.metadata || {};
              const method = getPaymentMethod(metadata);
              const appointment = transaction.appointments?.[0] || null;
              const descriptionClient = transaction.description?.match(/Cliente:\s*(.*?)(?:\s+-\s+(?:Servi|Servicio):|$)/i)?.[1];
              const clientName = transaction.client?.name || appointment?.clients?.name || metadata.clientName || metadata.client_name || metadata.originalClientName || descriptionClient || 'Cliente no identificado';
              const serviceName = appointment?.services?.name || metadata.serviceName || metadata.service_name || (isAssistant ? 'Lavado' : 'Servicio');
              const transactionRate = getTransactionRate(transaction, rate);
              const personalBs = transaction.staffAmounts.earnings * transactionRate;
              const totalBs = Number(transaction.amount || 0) * transactionRate;
              const cashUsd = Number(metadata.cash_usd ?? metadata.cashUsd ?? 0);
              const transferBs = Number(metadata.transfer_bs ?? metadata.transferBs ?? 0);
              const selected = selectedTransactionId === transaction.id;
              const appointmentExtras = transaction.appointments?.flatMap(item => item.appointment_extras || []) || [];
              const appointmentProducts = transaction.appointments?.flatMap(item => item.appointment_products || []) || [];
              const extras = appointmentExtras.length > 0 ? appointmentExtras : (metadata.extras || []);
              const products = appointmentProducts.length > 0 ? appointmentProducts : (metadata.products_sold || []);
              const clientCedula = transaction.client?.id_card || appointment?.clients?.id_card || metadata.clientCedula || 'No registrada';
              const clientPhone = transaction.client?.phone || appointment?.clients?.phone || 'No registrado';
              return (
                <article
                  key={transaction.id}
                  onClick={() => setSelectedTransactionId(selected ? null : transaction.id)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') setSelectedTransactionId(selected ? null : transaction.id);
                  }}
                  role={'button'}
                  tabIndex={0}
                  aria-expanded={selected}
                  style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(150px, 0.8fr) minmax(180px, 1.6fr) minmax(170px, 0.8fr)', gap: '12px', alignItems: 'center', padding: '15px', borderRadius: '16px', background: selected ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.025)', border: selected ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--gold-primary)', fontWeight: '850', fontSize: '12px' }}>
                      <CalendarRange size={14} />
                      {new Date(transaction.created_at).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '11px' }}>
                      {new Date(transaction.created_at).toLocaleTimeString('es-VE', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'white', fontWeight: '900', fontSize: '14px' }}>{clientName}</div>
                    <div style={{ marginTop: '3px', color: 'var(--text-secondary)', fontSize: '12px' }}>{serviceName}</div>
                    <div style={{ marginTop: '3px', color: 'var(--text-muted)', fontSize: '10px' }}>{method}</div>
                  </div>
                  <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: '10px' }}>
                      <div>
                        <div style={{ color: '#32d74b', fontSize: '16px', fontWeight: '950' }}>+{Math.round(personalBs).toLocaleString('es-VE')} Bs.</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '3px' }}>Ref: +${formatUsd(transaction.staffAmounts.earnings)}</div>
                      </div>
                      <ChevronDown size={16} color={'var(--text-muted)'} style={{ transform: selected ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                  </div>
                  {selected && (
                    <div className={'animate-history-expand'} onClick={event => event.stopPropagation()} style={{ gridColumn: '1 / -1', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                        <div style={{ padding: '15px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', borderLeft: '3px solid var(--gold-primary)' }}>
                          <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Cliente y servicio</div>
                          <DetailRow label={'Cliente'} value={clientName} />
                          <DetailRow label={'Cédula'} value={clientCedula} />
                          <DetailRow label={'Teléfono'} value={clientPhone} />
                          <DetailRow label={'Servicio'} value={serviceName} />
                          {appointment?.staff?.name && <DetailRow label={'Barbero'} value={appointment.staff.name} />}
                        </div>

                        <div style={{ padding: '15px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', borderLeft: '3px solid #32d74b' }}>
                          <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Resumen del cobro</div>
                          <MoneyRow label={'Total de la transacción'} usd={transaction.amount} transactionRate={transactionRate} strong />
                          <MoneyRow label={'Tu ganancia'} usd={transaction.staffAmounts.commission + transaction.staffAmounts.productCommission} transactionRate={transactionRate} accent />
                          {transaction.staffAmounts.tips > 0 && <MoneyRow label={'Tu propina'} usd={transaction.staffAmounts.tips} transactionRate={transactionRate} />}
                          <DetailRow label={'Método de pago'} value={method} />
                          {cashUsd > 0 && <MoneyRow label={`Parte en ${metadata.methodUsd || metadata.method_usd || 'USD'}`} usd={cashUsd} transactionRate={transactionRate} />}
                          {transferBs > 0 && <MoneyRow label={`Parte en ${metadata.methodBs || metadata.method_bs || 'bolívares'}`} usd={transferBs / transactionRate} transactionRate={transactionRate} />}
                          <DetailRow label={'Tasa de la operación'} value={`${transactionRate.toLocaleString('es-VE')} Bs./USD`} />
                        </div>

                        {(extras.length > 0 || products.length > 0) && (
                          <div style={{ padding: '15px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)' }}>
                            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Extras y productos</div>
                            {extras.map((extra, index) => (
                              <MoneyRow key={extra.id || `extra-${index}`} label={`+ ${extra.service_extras?.name || extra.name || 'Extra'}`} usd={Number(extra.price || 0)} transactionRate={transactionRate} />
                            ))}
                            {products.map((product, index) => (
                              <MoneyRow key={product.id || `product-${index}`} label={`+ ${product.inventory?.name || product.name || 'Producto'} x${product.quantity || 1}`} usd={Number(product.price || 0) * Number(product.quantity || 1)} transactionRate={transactionRate} />
                            ))}
                          </div>
                        )}

                        <div style={{ padding: '15px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)' }}>
                          <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Distribución al personal</div>
                          {(metadata.staffInvolved || []).map((member, index) => {
                            const memberUsd = Number(member.commissionEarned ?? member.commission_earned ?? 0)
                              + Number(member.productCommissionEarned ?? member.product_commission ?? 0)
                              + Number(member.tip ?? member.tip_amount ?? 0);
                            return (
                              <MoneyRow key={member.staffId || member.id || index} label={`${member.name || 'Personal'} (${member.role?.split('|')[0] || 'Equipo'})`} usd={memberUsd} transactionRate={transactionRate} />
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', padding: '13px 15px', borderRadius: '13px', background: 'rgba(212,175,55,0.07)', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '750' }}>Transacción completa</span>
                        <span style={{ color: 'var(--gold-primary)', fontSize: '16px', fontWeight: '950' }}>{Math.round(totalBs).toLocaleString('es-VE')} Bs. <small style={{ color: 'var(--text-muted)', fontSize: '10px' }}>· Ref: ${formatUsd(transaction.amount)}</small></span>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default StaffTransactionHistory;
