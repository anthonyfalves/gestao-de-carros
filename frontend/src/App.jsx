import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api from './api';
import dayjs from 'dayjs';
import ManageVehiclesModal from './components/ManageVehiclesModal';
import ManageDriversModal from './components/ManageDriversModal';

const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000');

function Login({ onLogin }) {
  const [email,setEmail] = useState('admin@local');
  const [password,setPassword] = useState('1a6');
  const [error,setError] = useState('');
  async function submit(e){
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (e) {
      setError(e?.response?.data?.error || 'Erro ao autenticar');
    }
  }
  return (
    <form onSubmit={submit} style={{display:'grid', gap:8, maxWidth:320, margin:'40px auto'}}>
      <h2>Login</h2>
      <input placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="Senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      {error && <div style={{color:'red'}}>{error}</div>}
      <button>Entrar</button>
    </form>
  )
}

function FirstChange({ onDone }) {
  const [currentPassword,setCurrent] = useState('1a6');
  const [newPassword,setNew] = useState('1a6A!');
  const [error,setError] = useState('');
  async function submit(e){
    e.preventDefault();
    try {
      await api.post('/auth/first-change', { currentPassword, newPassword });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.error || 'Erro ao trocar senha');
    }
  }
  return (
    <form onSubmit={submit} style={{display:'grid', gap:8, maxWidth:320, margin:'40px auto'}}>
      <h2>Trocar senha (primeiro acesso)</h2>
      <input placeholder="Senha atual" type="password" value={currentPassword} onChange={e=>setCurrent(e.target.value)} />
      <input placeholder="Nova senha" type="password" value={newPassword} onChange={e=>setNew(e.target.value)} />
      {error && <div style={{color:'red'}}>{error}</div>}
      <button>Trocar</button>
    </form>
  );
}

function Calendar({ vehicleId, onSelect }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [busy, setBusy] = useState([]);
  const base = dayjs().add(monthOffset,'month');
  const start = base.startOf('month');
  const end = base.endOf('month');

  useEffect(() => {
    (async () => {
      if (!vehicleId) {
        setBusy([]);
        return;
      }
      const { data } = await api.get('/bookings/availability', {
        params: { vehicleId, from: start.format('YYYY-MM-DD'), to: end.format('YYYY-MM-DD') }
      });
      setBusy(data);
    })();
  }, [vehicleId, monthOffset]);

  function isBusy(date, period) {
    const d = dayjs(date).format('YYYY-MM-DD');
    return busy.some(b => b.date === d && (b.period === period || b.period === 'FULL'));
  }

  const days = [];
  for (let d = 0; d < end.date(); d++) {
    const cur = start.date(d+1);
    days.push(cur);
  }

  return (
    <div>
      <div style={{display:'flex', gap:8, alignItems:'center', justifyContent:'center'}}>
        <button onClick={()=>setMonthOffset(v=>v-1)}>◀</button>
        <strong>{base.format('MMMM YYYY')}</strong>
        <button onClick={()=>setMonthOffset(v=>v+1)}>▶</button>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6, marginTop:10}}>
        {days.map(d => {
          const dateStr = d.format('YYYY-MM-DD');
          const fullBusy = isBusy(dateStr,'AM') && isBusy(dateStr,'PM');
          return (
            <div key={dateStr} style={{border:'1px solid #ddd', padding:6, opacity: fullBusy ? 0.4 : 1}}>
              <div style={{fontSize:12, marginBottom:4}}>{d.date()}</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:4}}>
                <button disabled={isBusy(dateStr,'AM')} onClick={()=>onSelect(dateStr,'AM')} style={{opacity:isBusy(dateStr,'AM')?0.4:1}}>AM</button>
                <button disabled={isBusy(dateStr,'PM')} onClick={()=>onSelect(dateStr,'PM')} style={{opacity:isBusy(dateStr,'PM')?0.4:1}}>PM</button>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{marginTop:8, fontSize:12, opacity:0.8}}>Datas ocupadas aparecem esmaecidas .</div>
    </div>
  )
}

function Dashboard({ user, onLogout }){
  const [vehicles,setVehicles] = useState([]);
  const [drivers,setDrivers] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [message, setMessage] = useState('');
  const [bookings, setBookings] = useState([]);
  const [targetUserId, setTargetUserId] = useState(user.id);

  // modal de gestão
  const [openManage, setOpenManage] = useState(false);
  const [openDrivers, setOpenDrivers] = useState(false);


  async function loadVehicles() {
    const { data } = await api.get('/catalog/vehicles'); // apenas ativos
    setVehicles(data);
  }

  useEffect(() => {
    (async () => {
      await loadVehicles();
      const drv = await api.get('/catalog/drivers');
      setDrivers(drv.data);
      const mine = await api.get('/bookings/mine');
      setBookings(mine.data);
    })();

    const refresh = () => { api.get('/bookings/mine').then(r => setBookings(r.data)); };
    socket.on('booking:new', refresh);
    socket.on('booking:driver_assigned', refresh);
    socket.on('booking:vehicle_assigned', refresh);
    return () => {
      socket.off('booking:new', refresh);
      socket.off('booking:driver_assigned', refresh);
      socket.off('booking:vehicle_assigned', refresh);
    };
  }, []);

  async function handleSelect(date, period){
    try {
      const isManager = ['MANAGER','ADMIN'].includes(user.role);
      const payload = { date, period };
      if (isManager && targetUserId !== user.id) {
        payload.requestedForId = targetUserId;
      }
      if (isManager && selectedVehicle) {
        payload.vehicleId = selectedVehicle;
      }
      const { data } = await api.post('/bookings', payload);
      const assignedNow = Boolean(payload.vehicleId);
      setMessage(`${assignedNow ? 'Agendamento concluído' : 'Solicitação registrada'}! Ticket: ${data.ticket}`);
      const mine = await api.get('/bookings/mine');
      setBookings(mine.data);
    } catch (e) {
      alert(e?.response?.data?.error || 'Falha ao agendar');
    }
  }

  async function assignDriver(bookingId, driverId){
    if (!Number.isInteger(driverId) || driverId <= 0) return;
    try{
      await api.post('/bookings/assign-driver', { bookingId, driverId });
      setMessage('Motorista atribuído!');
      const mine = await api.get('/bookings/mine');
      setBookings(mine.data);
    }catch(e){
      alert(e?.response?.data?.error || 'Falha ao atribuir motorista');
    }
  }

  async function assignVehicle(bookingId, vehicleId){
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) return;
    try{
      await api.post('/bookings/assign-vehicle', { bookingId, vehicleId });
      setMessage('Veículo atribuído!');
      const mine = await api.get('/bookings/mine');
      setBookings(mine.data);
    }catch(e){
      alert(e?.response?.data?.error || 'Falha ao atribuir veículo');
    }
  }

  // handlers do modal
  async function addVehicle(plate, model){
    try{
      await api.post('/admin/vehicles', { plate, model });
      setMessage('Veículo cadastrado!');
      await loadVehicles();
    }catch(e){
      alert(e?.response?.data?.error || 'Falha ao cadastrar veículo');
    }
  }
  async function removeVehicle(id){
    if (!confirm('Deseja excluir (desativar) este veículo?')) return;
    try{
      await api.delete(`/admin/vehicles/${id}`);
      setMessage('Veículo excluído (desativado).');
      await loadVehicles();
      if (selectedVehicle === id) setSelectedVehicle(null);
    }catch(e){
      alert(e?.response?.data?.error || 'Falha ao excluir veículo');
    }
  }

  async function addDriver(name, cnh){
  try{
    await api.post('/admin/drivers', { name, cnh });
    setMessage('Motorista cadastrado!');
    // recarrega lista de motoristas ativos
    const drv = await api.get('/catalog/drivers');
    setDrivers(drv.data);
  }catch(e){
    alert(e?.response?.data?.error || 'Falha ao cadastrar motorista');
  }
}
async function removeDriver(id){
  if (!confirm('Deseja excluir (desativar) este motorista?')) return;
  try{
    await api.delete(`/admin/drivers/${id}`);
    setMessage('Motorista excluído (desativado).');
    const drv = await api.get('/catalog/drivers');
    setDrivers(drv.data);
  }catch(e){
    alert(e?.response?.data?.error || 'Falha ao excluir motorista');
  }
}


  return (
    <div style={{display:'grid', gap:16, padding:16}}>
      <div style={{display:'flex', gap:8, alignItems:'center', justifyContent:'space-between'}}>
        <div>Olá, <strong>{user.name}</strong> &nbsp;({user.role})</div>
        <div style={{display:'flex', gap:8}}>
          {['MANAGER','ADMIN'].includes(user.role) && (
            <button onClick={()=>setOpenManage(true)}>Gerenciar Veículos</button>
          )}

          {['MANAGER','ADMIN'].includes(user.role) && (
  <>
   
    <button onClick={()=>setOpenDrivers(true)}>Gerenciar Motoristas</button>
  </>
)}

          <button onClick={onLogout}>Sair</button>
        </div>
      </div>

      {message && <div style={{background:'#e7ffe7', border:'1px solid #b2e5b2', padding:8}}>{message}</div>}

      <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:16}}>
        {/* Agendamento */}
        <div style={{border:'1px solid #ddd', padding:12}}>
          <h3>Solicitar horário</h3>

          {['MANAGER','ADMIN'].includes(user.role) ? (
            <div style={{display:'grid', gap:6}}>
              <label>Veículo (opcional no momento do cadastro):</label>
              <select
                onChange={e=>{
                  const value = e.target.value;
                  setSelectedVehicle(value ? Number(value) : null);
                }}
                value={selectedVehicle ?? ''}
              >
                <option value="">Sem veículo — atribuir depois</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
              </select>
            </div>
          ) : (
            <div style={{background:'#f5f7ff', border:'1px dashed #c7d2ff', padding:8, fontSize:13, marginBottom:8}}>
              O gestor definirá qual veículo atenderá sua solicitação após a análise.
            </div>
          )}

          {['MANAGER','ADMIN'].includes(user.role) && (
            <div style={{marginTop:8}}>
              <label>Agendar para (ID do usuário): </label>
              <input type="number" value={targetUserId} onChange={e=>setTargetUserId(Number(e.target.value)||user.id)} />
              <div style={{fontSize:12, opacity:.7}}>Sugestão: UI de busca de usuários futuramente.</div>
            </div>
          )}

          <div style={{marginTop:12}}>
            <Calendar vehicleId={selectedVehicle} onSelect={handleSelect} />
          </div>
        </div>

        {/* Meus agendamentos */}
        <div style={{border:'1px solid #ddd', padding:12}}>
          <h3>Meus agendamentos</h3>
          <ul>
            {bookings.map(b => (
              <li key={b.id} style={{marginBottom:8}}>
                <div>
                  <strong>{b.date} ({b.period})</strong>
                </div>
                <div>
                  Veículo: {b.Vehicle ? `${b.Vehicle.plate} — ${b.Vehicle.model}` : 'Pendente (aguardando gestor)' }
                </div>
                <div>Ticket: {b.ticket}</div>
                <div>Motorista: {b.Driver ? b.Driver.name : '—'}</div>
                {['MANAGER','ADMIN'].includes(user.role) && (
                  <div style={{display:'flex', gap:8, marginTop:4, flexWrap:'wrap'}}>
                    <select defaultValue="" onChange={e=>assignVehicle(b.id, Number(e.target.value))}>
                      <option value="" disabled>Atribuir veículo</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
                    </select>
                    <select defaultValue="" onChange={e=>assignDriver(b.id, Number(e.target.value))}>
                      <option value="" disabled>Atribuir motorista</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Modal suspenso */}
      <ManageVehiclesModal
        open={openManage}
        onClose={()=>setOpenManage(false)}
        vehicles={vehicles}
        onAdd={addVehicle}
        onRemove={removeVehicle}
      />

      <ManageDriversModal
  open={openDrivers}
  onClose={()=>setOpenDrivers(false)}
  drivers={drivers}
  onAdd={addDriver}
  onRemove={removeDriver}
/>

    </div>
  )
}

export default function App(){
  const [user,setUser] = useState(null);
  useEffect(()=>{},[]);
  if (!user) return <Login onLogin={setUser} />;
  if (user.mustChangePassword) return <FirstChange onDone={()=>setUser({...user, mustChangePassword:false})} />;
  return <Dashboard user={user} onLogout={()=>{ localStorage.removeItem('token'); setUser(null); }} />;
}
