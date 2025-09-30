import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import api from './api';
import ManageVehiclesModal from './components/ManageVehiclesModal';
import ManageDriversModal from './components/ManageDriversModal';
import BookingScheduler from './components/BookingScheduler';

const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000');

const initialMeta = {
  openTime: '08:00',
  closeTime: '18:00',
  bookedRanges: [],
  bookedSingleDates: [],
  daySlots: {},
};

const initialSelection = { startAt: null, endAt: null, valid: false, messages: [] };

function formatRange(startISO, endISO) {
  if (!startISO || !endISO) return '—';
  const start = new Date(startISO);
  const end = new Date(endISO);
  const optsDate = { day: '2-digit', month: '2-digit', year: 'numeric' };
  const optsTime = { hour: '2-digit', minute: '2-digit' };
  const sameDay = start.toDateString() === end.toDateString();
  const datePart = start.toLocaleDateString('pt-BR', optsDate);
  if (sameDay) {
    return `${datePart} (${start.toLocaleTimeString('pt-BR', optsTime)} → ${end.toLocaleTimeString('pt-BR', optsTime)})`;
  }
  return `${start.toLocaleString('pt-BR', { ...optsDate, ...optsTime })} → ${end.toLocaleString('pt-BR', { ...optsDate, ...optsTime })}`;
}

function translateStatus(status) {
  switch (status) {
    case 'APPROVED':
      return 'Aprovado';
    case 'REJECTED':
      return 'Rejeitado';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return 'Pendente';
  }
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin');
  const [password, setPassword] = useState('12345');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao autenticar');
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 320, margin: '40px auto' }}>
      <h2>Login</h2>
      <input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button>Entrar</button>
    </form>
  );
}

function FirstChange({ onDone }) {
  const [currentPassword, setCurrent] = useState('123');
  const [newPassword, setNew] = useState('123A!');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      await api.post('/auth/first-change', { currentPassword, newPassword });
      onDone();
    } catch (err) {
      setError(err?.response?.data?.error || 'Erro ao trocar senha');
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 320, margin: '40px auto' }}>
      <h2>Trocar senha (primeiro acesso)</h2>
      <input placeholder="Senha atual" type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
      <input placeholder="Nova senha" type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button>Trocar</button>
    </form>
  );
}

function Dashboard({ user, onLogout }) {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [targetUserId, setTargetUserId] = useState(user.id);
  const [message, setMessage] = useState('');
  const [calendarMeta, setCalendarMeta] = useState(initialMeta);
  const [selection, setSelection] = useState(initialSelection);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  const [openManageVehicles, setOpenManageVehicles] = useState(false);
  const [openManageDrivers, setOpenManageDrivers] = useState(false);

  const isManager = useMemo(() => ['MANAGER', 'ADMIN'].includes(user.role), [user.role]);

  const refreshBookings = async () => {
    const mine = await api.get('/bookings/mine');
    setBookings(mine.data);
  };

  const loadVehicles = async () => {
    const { data } = await api.get('/catalog/vehicles');
    setVehicles(data);
  };

  const loadDrivers = async () => {
    const { data } = await api.get('/catalog/drivers');
    setDrivers(data);
  };

  const loadCalendar = async (vehicleId = selectedVehicle) => {
    setLoadingCalendar(true);
    try {
      const params = {};
      if (vehicleId) params.vehicleId = vehicleId;
      const { data } = await api.get('/bookings/calendar-meta', { params });
      setCalendarMeta({
        openTime: data.openTime || '08:00',
        closeTime: data.closeTime || '18:00',
        bookedRanges: data.bookedRanges || [],
        bookedSingleDates: data.bookedSingleDates || [],
        daySlots: data.daySlots || {},
      });
    } catch (err) {
      console.error('Falha ao carregar calendário', err);
      setMessage('Não foi possível carregar as indisponibilidades do calendário.');
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadVehicles();
      await loadDrivers();
      await refreshBookings();
      await loadCalendar();
    })();

    const refresh = () => {
      refreshBookings();
      loadCalendar();
    };

    socket.on('booking:new', refresh);
    socket.on('booking:driver_assigned', refresh);
    socket.on('booking:vehicle_assigned', refresh);
    socket.on('booking:status_change', refresh);

    return () => {
      socket.off('booking:new', refresh);
      socket.off('booking:driver_assigned', refresh);
      socket.off('booking:vehicle_assigned', refresh);
      socket.off('booking:status_change', refresh);
    };
  }, []);

  useEffect(() => {
    loadCalendar(selectedVehicle);
  }, [selectedVehicle]);

  const resetSelection = () => setSelection(initialSelection);

  const submitBooking = async () => {
    if (!selection.startAt || !selection.endAt) {
      alert('Selecione saída e entrada válidas.');
      return;
    }
    if (!selection.valid) {
      alert(selection.messages.join('\n') || 'Intervalo inválido.');
      return;
    }
    try {
      const payload = {
        startAt: selection.startAt,
        endAt: selection.endAt,
      };
      if (isManager && selectedVehicle) {
        payload.vehicleId = selectedVehicle;
      }
      if (isManager && targetUserId !== user.id) {
        payload.requestedForId = targetUserId;
      }
      const { data } = await api.post('/bookings', payload);
      const assignedNow = Boolean(payload.vehicleId);
      setMessage(`${assignedNow ? 'Agendamento concluído' : 'Solicitação registrada'}! Ticket: ${data.ticket}`);
      resetSelection();
      await refreshBookings();
      await loadCalendar();
    } catch (err) {
      alert(err?.response?.data?.error || 'Falha ao registrar agendamento');
    }
  };

  const assignDriver = async (bookingId, driverId) => {
    if (!Number.isInteger(driverId) || driverId <= 0) return;
    try {
      await api.post('/bookings/assign-driver', { bookingId, driverId });
      setMessage('Motorista atribuído!');
      await refreshBookings();
    } catch (err) {
      alert(err?.response?.data?.error || 'Falha ao atribuir motorista');
    }
  };

  const assignVehicle = async (bookingId, vehicleId) => {
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) return;
    try {
      await api.post('/bookings/assign-vehicle', { bookingId, vehicleId });
      setMessage('Veículo atribuído!');
      await refreshBookings();
      await loadCalendar(vehicleId);
    } catch (err) {
      alert(err?.response?.data?.error || 'Falha ao atribuir veículo');
    }
  };

  const approveBooking = async (bookingId) => {
    try {
      await api.post(`/bookings/${bookingId}/approve`);
      setMessage('Agendamento aprovado!');
      await refreshBookings();
      await loadCalendar();
    } catch (err) {
      alert(err?.response?.data?.error || 'Erro ao aprovar agendamento');
    }
  };

  const rejectBooking = async (bookingId) => {
    const reason = prompt('Motivo da rejeição (opcional):');
    if (reason === null) return;
    try {
      await api.post(`/bookings/${bookingId}/reject`, { reason });
      setMessage('Agendamento rejeitado.');
      await refreshBookings();
      await loadCalendar();
    } catch (err) {
      alert(err?.response?.data?.error || 'Erro ao rejeitar agendamento');
    }
  };

  const translateRole = (role) => ({
    ADMIN: 'ADMIN',
    MANAGER: 'GESTOR',
    USER: 'USUÁRIO',
  }[role] || role);

  return (
    <div style={{ display: 'grid', gap: 16, padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          Olá, <strong>{user.name}</strong> ({translateRole(user.role)})
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isManager && <button onClick={() => setOpenManageVehicles(true)}>Gerenciar Veículos</button>}
          {isManager && <button onClick={() => setOpenManageDrivers(true)}>Gerenciar Motoristas</button>}
          <button onClick={onLogout}>Sair</button>
        </div>
      </div>

      {message && <div style={{ background: '#e7ffe7', border: '1px solid #b2e5b2', padding: 8 }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 12 }}>
          <h3>Solicitar horário</h3>
          {isManager ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <label>Veículo (opcional no momento do cadastro):</label>
              <select
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedVehicle(value ? Number(value) : null);
                }}
                value={selectedVehicle ?? ''}
              >
                <option value="">Sem veículo — atribuir depois</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} - {v.model}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ background: '#f5f7ff', border: '1px dashed #c7d2ff', padding: 8, fontSize: 13, marginBottom: 8 }}>
              O gestor definirá qual veículo atenderá sua solicitação após a análise.
            </div>
          )}

          {isManager && (
            <div style={{ marginTop: 8 }}>
              <label>Agendar para (ID do usuário): </label>
              <input type="number" value={targetUserId} onChange={(e) => setTargetUserId(Number(e.target.value) || user.id)} />
              <div style={{ fontSize: 12, opacity: 0.7 }}>Sugestão: UI de busca de usuários futuramente.</div>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <BookingScheduler
              openTime={calendarMeta.openTime}
              closeTime={calendarMeta.closeTime}
              bookedRanges={calendarMeta.bookedRanges}
              bookedSingleDates={calendarMeta.bookedSingleDates}
              daySlots={calendarMeta.daySlots}
              value={{ startAt: selection.startAt, endAt: selection.endAt }}
              onChange={setSelection}
            />
          </div>

          <button style={{ marginTop: 12 }} onClick={submitBooking} disabled={loadingCalendar}>
            {loadingCalendar ? 'Atualizando disponibilidade...' : 'Registrar solicitação'}
          </button>
        </div>

        <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 12 }}>
          <h3>Meus agendamentos</h3>
          <ul style={{ paddingLeft: 16 }}>
            {bookings.map((b) => (
              <li key={b.id} style={{ marginBottom: 12 }}>
                <div>
                  <strong>{formatRange(b.startAt, b.endAt)}</strong>
                </div>
                <div>Status: {translateStatus(b.status)}</div>
                <div>Ticket: {b.ticket}</div>
                <div>Veículo: {b.Vehicle ? `${b.Vehicle.plate} — ${b.Vehicle.model}` : 'Pendente (aguardando gestor)'}</div>
                <div>Motorista: {b.Driver ? b.Driver.name : '—'}</div>
                {b.rejectReason && <div>Motivo da rejeição: {b.rejectReason}</div>}

                {isManager && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <select defaultValue="" onChange={(e) => assignVehicle(b.id, Number(e.target.value))}>
                      <option value="" disabled>
                        Atribuir veículo
                      </option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.plate} - {v.model}
                        </option>
                      ))}
                    </select>
                    <select defaultValue="" onChange={(e) => assignDriver(b.id, Number(e.target.value))}>
                      <option value="" disabled>
                        Atribuir motorista
                      </option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {b.status === 'PENDING' && (
                      <>
                        <button onClick={() => approveBooking(b.id)}>Aprovar</button>
                        <button onClick={() => rejectBooking(b.id)}>Rejeitar</button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ManageVehiclesModal
        open={openManageVehicles}
        onClose={() => setOpenManageVehicles(false)}
        vehicles={vehicles}
        onAdd={async (plate, model) => {
          await api.post('/admin/vehicles', { plate, model });
          setMessage('Veículo cadastrado!');
          await loadVehicles();
          await loadCalendar();
        }}
        onRemove={async (id) => {
          if (!confirm('Deseja excluir (desativar) este veículo?')) return;
          await api.delete(`/admin/vehicles/${id}`);
          setMessage('Veículo excluído (desativado).');
          await loadVehicles();
          if (selectedVehicle === id) setSelectedVehicle(null);
          await loadCalendar();
        }}
      />

      <ManageDriversModal
        open={openManageDrivers}
        onClose={() => setOpenManageDrivers(false)}
        drivers={drivers}
        onAdd={async (name, cnh) => {
          await api.post('/admin/drivers', { name, cnh });
          setMessage('Motorista cadastrado!');
          await loadDrivers();
        }}
        onRemove={async (id) => {
          if (!confirm('Deseja excluir (desativar) este motorista?')) return;
          await api.delete(`/admin/drivers/${id}`);
          setMessage('Motorista excluído (desativado).');
          await loadDrivers();
        }}
      />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // future: restore token
  }, []);

  if (!user) return <Login onLogin={setUser} />;
  if (user.mustChangePassword) return <FirstChange onDone={() => setUser({ ...user, mustChangePassword: false })} />;
  return <Dashboard user={user} onLogout={() => { localStorage.removeItem('token'); setUser(null); }} />;
}
