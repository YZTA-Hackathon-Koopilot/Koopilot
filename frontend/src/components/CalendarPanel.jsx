import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Circle, Plus, Trash2, X } from 'lucide-react';

const WEEK_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const BADGE_COLORS = ['#52B788', '#F4A261', '#E76F51', '#2A9D8F', '#E9C46A'];

const formatDateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const CalendarPanel = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('koopilot_calendar_tasks')) || [];
    } catch {
      return [];
    }
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    localStorage.setItem('koopilot_calendar_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const nativeFirstDay = new Date(year, month, 1).getDay();
  const firstDay = nativeFirstDay === 0 ? 6 : nativeFirstDay - 1;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayClick = (day) => {
    setSelectedDate(formatDateKey(year, month, day));
    setIsModalOpen(true);
  };

  const handleAddTask = (event) => {
    event.preventDefault();
    if (!newTaskTitle.trim()) return;

    setTasks((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        date: selectedDate,
        color: BADGE_COLORS[Math.floor(Math.random() * BADGE_COLORS.length)],
        completed: false
      }
    ]);
    setNewTaskTitle('');
  };

  const toggleTask = (id) => {
    setTasks((prev) => prev.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const renderCells = () => {
    const cells = [];

    for (let index = 0; index < firstDay; index += 1) {
      cells.push(<div key={`empty-${index}`} style={{ minHeight: '120px', backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border-color)', borderRadius: '12px' }} />);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const formattedDate = formatDateKey(year, month, day);
      const dayTasks = tasks.filter((task) => task.date === formattedDate);
      const today = new Date();
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      cells.push(
        <button
          type="button"
          key={day}
          onClick={() => handleDayClick(day)}
          style={{
            minHeight: '120px',
            backgroundColor: isToday ? 'rgba(82, 183, 136, 0.1)' : 'var(--surface)',
            border: isToday ? '2px solid var(--primary-mid)' : '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            textAlign: 'left',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}
        >
          <span style={{
            fontWeight: 800,
            fontSize: '14px',
            color: isToday ? 'var(--on-primary)' : 'var(--text-dark)',
            backgroundColor: isToday ? 'var(--primary-mid)' : 'transparent',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%'
          }}>
            {day}
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1, width: '100%' }}>
            {dayTasks.map((task) => (
              <span key={task.id} style={{
                backgroundColor: task.completed ? 'var(--surface-soft)' : task.color,
                color: task.completed ? 'var(--text-light)' : 'white',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                textDecoration: task.completed ? 'line-through' : 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                opacity: task.completed ? 0.6 : 1
              }}>
                {task.title}
              </span>
            ))}
          </div>
        </button>
      );
    }

    return cells;
  };

  const selectedTasks = selectedDate ? tasks.filter((task) => task.date === selectedDate) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <h2 style={{ margin: 0, color: 'var(--primary-dark)', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CalendarIcon size={28} /> Görev Takvimi
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--surface-soft)', padding: '8px 16px', borderRadius: '16px' }}>
          <button type="button" onClick={prevMonth} style={{ background: 'none', display: 'flex', alignItems: 'center', color: 'var(--primary-dark)' }}>
            <ChevronLeft size={24} />
          </button>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select
              value={month}
              onChange={(event) => setCurrentDate(new Date(year, Number(event.target.value), 1))}
              style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-dark)', backgroundColor: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', padding: '0 4px' }}
            >
              {MONTHS.map((monthName, index) => (
                <option key={monthName} value={index}>{monthName}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(event) => setCurrentDate(new Date(Number(event.target.value), month, 1))}
              style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-dark)', backgroundColor: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', padding: '0 4px' }}
            >
              {Array.from({ length: 20 }, (_, index) => 2023 + index).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={nextMonth} style={{ background: 'none', display: 'flex', alignItems: 'center', color: 'var(--primary-dark)' }}>
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '12px' }}>
          {WEEK_DAYS.map((day) => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-light)', fontSize: '14px', textTransform: 'uppercase' }}>
              {day}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '12px' }}>
          {renderCells()}
        </div>
      </div>

      {isModalOpen && selectedDate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-dark)' }}>
                {selectedDate.split('-')[2]} {MONTHS[Number(selectedDate.split('-')[1]) - 1]} {selectedDate.split('-')[0]} Görevleri
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'none', color: 'var(--text-light)' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="Yeni görev veya etkinlik ekle..."
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                autoFocus
                style={{ flex: 1, padding: '12px 16px', borderRadius: '12px' }}
              />
              <button type="submit" style={{ padding: '0 20px', borderRadius: '12px', backgroundColor: 'var(--primary-mid)', color: 'var(--on-primary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} /> Ekle
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              {selectedTasks.length === 0 ? (
                <p style={{ color: 'var(--text-light)', textAlign: 'center', margin: '20px 0' }}>Bu güne ait görev bulunmuyor.</p>
              ) : (
                selectedTasks.map((task) => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: task.completed ? 'rgba(82, 183, 136, 0.1)' : 'var(--surface)', border: '1px solid', borderColor: task.completed ? 'var(--success)' : 'var(--border-color)', borderRadius: '12px' }}>
                    <button type="button" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, background: 'transparent', color: 'var(--text-dark)', textAlign: 'left' }} onClick={() => toggleTask(task.id)}>
                      {task.completed ? <CheckCircle2 size={20} color="var(--success)" /> : <Circle size={20} color="var(--text-light)" />}
                      <span style={{ color: task.completed ? 'var(--text-light)' : 'var(--text-dark)', textDecoration: task.completed ? 'line-through' : 'none', fontWeight: 600 }}>{task.title}</span>
                    </button>
                    <button type="button" onClick={() => deleteTask(task.id)} style={{ background: 'none', color: 'var(--error)', opacity: 0.8 }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPanel;
