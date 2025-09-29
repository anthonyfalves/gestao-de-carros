import React, { useEffect, useState } from 'react';

export default function ManageVehiclesModal({
  open,
  onClose,
  vehicles = [],
  onAdd,      // (plate, model) => Promise<void>
  onRemove,   // (id) => Promise<void>
}) {
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');

  useEffect(() => {
    // limpa o form ao abrir
    if (open) {
      setPlate('');
      setModel('');
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!plate || !model) return;
    onAdd(plate.trim().toUpperCase(), model.trim()).then(() => {
      setPlate('');
      setModel('');
    });
  }

  // estilos simples inline para evitar dependências
  const backdrop = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
  };
  const panel = {
    width: 'min(720px, 96vw)', maxHeight: '92vh', overflow: 'auto',
    background: '#fff', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.25)',
    padding: 16,
  };
  const closeBtn = {
    border: '1px solid #ddd', background: '#fafafa', padding: '6px 10px', borderRadius: 8
  };

  function onKeyDown(e){
    if (e.key === 'Escape') onClose();
  }

  return (
    <div style={backdrop} onKeyDown={onKeyDown} tabIndex={-1}>
      <div style={panel}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
          <h2 style={{margin:0}}>Gerenciar veículos</h2>
          <button onClick={onClose} style={closeBtn}>Fechar (Esc)</button>
        </div>

        <form onSubmit={handleSubmit} style={{display:'grid', gap:8, gridTemplateColumns:'1fr 1fr auto', alignItems:'end', marginBottom:12}}>
          <div>
            <label style={{fontSize:12, opacity:.7}}>Placa</label>
            <input placeholder="ABC1D23" value={plate} onChange={e=>setPlate(e.target.value)} />
          </div>
          <div>
            <label style={{fontSize:12, opacity:.7}}>Modelo</label>
            <input placeholder="Fiat Uno" value={model} onChange={e=>setModel(e.target.value)} />
          </div>
          <button type="submit">Adicionar</button>
        </form>

        <div style={{fontSize:12, opacity:.7, marginBottom:6}}>A lista mostra somente veículos <b>ativos</b>.</div>
        <ul style={{margin:0, padding:0, listStyle:'none'}}>
          {vehicles.map(v => (
            <li key={v.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #eee', padding:'8px 0'}}>
              <div><strong>{v.plate}</strong> — {v.model}</div>
              <button
                onClick={()=> onRemove(v.id)}
                style={{background:'#ffeaea', border:'1px solid #f1b3b3', borderRadius:8, padding:'6px 10px'}}
              >
                Excluir
              </button>
            </li>
          ))}
          {vehicles.length === 0 && <li style={{padding:'8px 0'}}>Nenhum veículo ativo.</li>}
        </ul>
      </div>
    </div>
  );
}
