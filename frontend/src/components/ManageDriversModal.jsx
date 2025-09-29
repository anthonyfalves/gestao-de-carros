import React, { useEffect, useState } from 'react';

export default function ManageDriversModal({
  open,
  onClose,
  drivers = [],
  onAdd,      // (name, cnh) => Promise<void>
  onRemove,   // (id) => Promise<void>
}) {
  const [name, setName] = useState('');
  const [cnh, setCnh] = useState('');

  useEffect(() => {
    if (open) { setName(''); setCnh(''); }
  }, [open]);

  if (!open) return null;

  const backdrop = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
  };
  const panel = {
    width: 'min(720px, 96vw)', maxHeight: '92vh', overflow: 'auto',
    background: '#fff', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.25)',
    padding: 16,
  };
  const closeBtn = { border: '1px solid #ddd', background: '#fafafa', padding: '6px 10px', borderRadius: 8 };

  function submit(e){
    e.preventDefault();
    if (!name) return;
    onAdd(name.trim(), cnh.trim()).then(() => { setName(''); setCnh(''); });
  }

  function onKeyDown(e){ if (e.key === 'Escape') onClose(); }

  return (
    <div style={backdrop} onKeyDown={onKeyDown} tabIndex={-1}>
      <div style={panel}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
          <h2 style={{margin:0}}>Gerenciar motoristas</h2>
          <button onClick={onClose} style={closeBtn}>Fechar (Esc)</button>
        </div>

        <form onSubmit={submit} style={{display:'grid', gap:8, gridTemplateColumns:'2fr 1fr auto', alignItems:'end', marginBottom:12}}>
          <div>
            <label style={{fontSize:12, opacity:.7}}>Nome</label>
            <input placeholder="Nome completo" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <label style={{fontSize:12, opacity:.7}}>CNH (opcional)</label>
            <input placeholder="###########" value={cnh} onChange={e=>setCnh(e.target.value)} />
          </div>
          <button type="submit">Adicionar</button>
        </form>

        <div style={{fontSize:12, opacity:.7, marginBottom:6}}>A lista mostra somente motoristas <b>ativos</b>.</div>
        <ul style={{margin:0, padding:0, listStyle:'none'}}>
          {drivers.map(d => (
            <li key={d.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #eee', padding:'8px 0'}}>
              <div><strong>{d.name}</strong>{d.cnh ? ` — CNH: ${d.cnh}` : ''}</div>
              <button
                onClick={()=> onRemove(d.id)}
                style={{background:'#ffeaea', border:'1px solid #f1b3b3', borderRadius:8, padding:'6px 10px'}}
              >
                Excluir
              </button>
            </li>
          ))}
          {drivers.length === 0 && <li style={{padding:'8px 0'}}>Nenhum motorista ativo.</li>}
        </ul>
      </div>
    </div>
  );
}
