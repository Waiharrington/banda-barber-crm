import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const AstroDatePicker = ({ value, onChange, placeholder = "Seleccionar fecha", className = "", style = {}, min, max }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      // Need to handle timezone offset if value is yyyy-mm-dd
      if (!isNaN(d.getTime())) {
        setCurrentMonth(new Date(d.getUTCFullYear(), d.getUTCMonth(), 1));
      }
    }
  }, [value]);

  const [popDirection, setPopDirection] = useState('down');

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 320) {
        setPopDirection('up');
      } else {
        setPopDirection('down');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const newDate = `${year}-${month}-${dayStr}`;
    
    onChange({ target: { value: newDate } });
    setIsOpen(false);
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    return `${day}/${month}/${year}`;
  };

  const daysOfWeek = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className={`astro-datepicker-container ${className}`} style={{ position: 'relative', zIndex: isOpen ? 9999 : 1, ...style }} ref={containerRef}>
      <div 
        className="form-input focus-ring" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer',
          padding: '0 16px',
          height: '48px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          color: value ? 'white' : 'rgba(255,255,255,0.4)',
          fontSize: '15px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          ...style
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{value ? formatDateDisplay(value) : placeholder}</span>
        <CalendarIcon size={18} color={value ? "var(--gold-primary)" : "rgba(255,255,255,0.4)"} />
      </div>

      {isOpen && (
        <div 
          className="glass-card animate-scale-in" 
          style={{ 
            position: 'absolute', 
            top: popDirection === 'down' ? 'calc(100% + 8px)' : 'auto', 
            bottom: popDirection === 'up' ? 'calc(100% + 8px)' : 'auto',
            left: 0, 
            zIndex: 9999,
            width: '280px',
            padding: '16px',
            backgroundColor: 'rgba(22, 22, 22, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 15px rgba(212, 175, 55, 0.15)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button onClick={handlePrevMonth} className="action-btn" style={{ width: '32px', height: '32px' }}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ fontWeight: '700', fontSize: '15px', color: 'white' }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button onClick={handleNextMonth} className="action-btn" style={{ width: '32px', height: '32px' }}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {daysOfWeek.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--gold-primary)', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              // Basic min/max validation
              let isDisabled = false;
              if (min && dateStr < min) isDisabled = true;
              if (max && dateStr > max) isDisabled = true;

              return (
                <button
                  key={day}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isDisabled) handleDateClick(day);
                  }}
                  disabled={isDisabled}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    border: isSelected ? 'none' : (isToday ? '1px solid var(--gold-primary)' : 'none'),
                    background: isSelected ? 'var(--gold-gradient)' : 'transparent',
                    color: isSelected ? '#000' : (isDisabled ? 'rgba(255,255,255,0.2)' : 'white'),
                    fontWeight: isSelected ? '800' : '500',
                    fontSize: '13px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    margin: '0 auto'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AstroDatePicker;
