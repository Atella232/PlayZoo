import { useState } from 'react';
import { DICE } from '@playzoo/shared';
import { useApp } from '../lib/store';
import { applySettings, loadSettings } from '../lib/sfx';
import { navigate } from '../lib/router';
import { isNative, setDailyReminder } from '../lib/native';
import { useToast } from '../components/common';

const EMOJIS = ['🦊', '🐻', '🐼', '🦁', '🐸', '🐧', '🐙', '🦉', '🐯', '🐨', '🦄', '🐵', '🐰', '🐢', '🦋', '🐝'];

export function Profile() {
  const { me, updateMe, signOut, dice, backend } = useApp();
  const [nombre, setNombre] = useState(me?.nombre ?? '');
  const [settings, setSettings] = useState(loadSettings());
  const [toast, say] = useToast();
  const [reminder, setReminder] = useState(() => localStorage.getItem('pz:reminder') === '1');
  if (!me) return null;

  const set = (s: Partial<typeof settings>) => {
    const n = { ...settings, ...s };
    setSettings(n);
    applySettings(n);
  };

  return (
    <div className="app">
      <h1 className="page-title">Perfil</h1>
      <div className="card mt">
        <div className="field">
          <label htmlFor="pn">Nombre</label>
          <div className="row">
            <input id="pn" className="input" maxLength={24} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <button className="btn" disabled={!nombre.trim() || nombre.trim() === me.nombre} onClick={async () => { await updateMe({ nombre: nombre.trim() }); say('Nombre guardado'); }}>Guardar</button>
          </div>
        </div>
        <div className="field mt">
          <label>Animal</label>
          <div className="emojis">
            {EMOJIS.map((e) => (
              <button key={e} className={e === me.emoji ? 'on' : ''} onClick={() => updateMe({ emoji: e })} aria-label={`Animal ${e}`}>{e}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt">
        <h3>🎲 Dados: {dice ?? '–'}</h3>
        <p className="note">Empiezas con {DICE.inicial}. Ganas {DICE.porJugar} por cada día que juegas, {DICE.porPodio} por acabar en el podio del día y {DICE.porTemporada} por ganar una temporada. "¡Uno más!" cuesta {DICE.costeUnoMas}.</p>
      </div>

      <div className="card mt">
        <h3>Ajustes</h3>
        <label className="row between li" style={{ borderTop: 0 }}>
          <span>Sonido</span>
          <input type="checkbox" checked={settings.sonido} onChange={(e) => set({ sonido: e.target.checked })} />
        </label>
        <label className="row between li">
          <span>Vibración</span>
          <input type="checkbox" checked={settings.vibracion} onChange={(e) => set({ vibracion: e.target.checked })} />
        </label>
        {isNative() && (
          <label className="row between li">
            <span>Recordatorio diario (9:00)</span>
            <input
              type="checkbox"
              checked={reminder}
              onChange={async (e) => {
                const on = e.target.checked;
                const ok = await setDailyReminder(on);
                if (on && !ok) return say('No tenemos permiso para enviar notificaciones');
                setReminder(on);
                localStorage.setItem('pz:reminder', on ? '1' : '0');
              }}
            />
          </label>
        )}
      </div>

      <div className="card mt">
        <h3>Cuenta</h3>
        <p className="note">{backend.kind === 'local' ? 'Modo demo: tus datos están solo en este dispositivo.' : 'Conectado al servidor.'}</p>
        <div className="btnrow mt">
          <button className="btn" onClick={() => { if (window.confirm('¿Cerrar sesión?')) void signOut(); }}>Cerrar sesión</button>
          {import.meta.env.DEV && <button className="btn ghost" onClick={() => navigate('/dev')}>Galería /dev</button>}
        </div>
      </div>
      {toast}
    </div>
  );
}
