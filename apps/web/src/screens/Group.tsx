import { useState } from 'react';
import { useApp } from '../lib/store';
import { Avatar, useToast } from '../components/common';

export function GroupScreen() {
  const { groups, group, setGroupId, createGroup, joinGroup, leaveGroup, me } = useApp();
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const run = async (f: () => Promise<void>, okMsg: string) => {
    setErr('');
    setBusy(true);
    try {
      await f();
      say(okMsg);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!group) return;
    const text = `Únete a mi grupo de PlayZoo con el código ${group.codigo}: ${location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PlayZoo', text });
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      say('Invitación copiada');
    } catch {
      say(`Código: ${group.codigo}`);
    }
  };

  return (
    <div className="app">
      <h1 className="page-title">Grupo</h1>
      {groups.length > 1 && (
        <div className="chips mt">
          {groups.map((g) => (
            <button key={g.id} className={'chip' + (g.id === group?.id ? ' on' : '')} onClick={() => setGroupId(g.id)}>{g.nombre}</button>
          ))}
        </div>
      )}

      {group ? (
        <div className="card mt">
          <div className="row between">
            <div>
              <h3 style={{ marginBottom: 2 }}>{group.nombre}</h3>
              <div className="sub">{group.miembros.length} miembro{group.miembros.length === 1 ? '' : 's'}</div>
            </div>
            {group.demo && <span className="tag">Demo</span>}
          </div>
          <div className="row mt" style={{ background: 'var(--bg2)', borderRadius: 14, padding: '10px 14px' }}>
            <div className="grow">
              <div className="note">Código de invitación</div>
              <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: '.12em' }}>{group.codigo}</div>
            </div>
            <button className="btn small" onClick={share}>Compartir</button>
          </div>
          <div className="list mt">
            {group.miembros.map((m) => (
              <div className="li" key={m.id}>
                <Avatar emoji={m.emoji} size={36} />
                <div className="grow" style={{ fontWeight: 800 }}>{m.nombre}{m.id === me?.id ? ' (tú)' : ''}</div>
              </div>
            ))}
          </div>
          <button className="btn ghost small mt" onClick={() => window.confirm('¿Salir de este grupo?') && void run(() => leaveGroup(group.id), 'Has salido del grupo')}>
            Salir del grupo
          </button>
        </div>
      ) : (
        <p className="note mt">Todavía no estás en ningún grupo.</p>
      )}

      <div className="card mt">
        <h3>Crear un grupo</h3>
        <div className="row">
          <input className="input" placeholder="Nombre del grupo" maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre del grupo" />
          <button className="btn" disabled={busy || !nombre.trim()} onClick={() => run(async () => { await createGroup(nombre); setNombre(''); }, 'Grupo creado')}>Crear</button>
        </div>
      </div>

      <div className="card mt">
        <h3>Unirse con un código</h3>
        <div className="row">
          <input className="input" placeholder="ABC123" maxLength={8} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} aria-label="Código del grupo" />
          <button className="btn" disabled={busy || codigo.trim().length < 4} onClick={() => run(async () => { await joinGroup(codigo); setCodigo(''); }, 'Te has unido')}>Unirme</button>
        </div>
        {err && <p className="err mt">{err}</p>}
      </div>
      {toast}
    </div>
  );
}
