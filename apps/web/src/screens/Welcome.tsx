import { useState } from 'react';
import { useApp } from '../lib/store';

const EMOJIS = ['🦊', '🐻', '🐼', '🦁', '🐸', '🐧', '🐙', '🦉', '🐯', '🐨', '🦄', '🐵', '🐰', '🐢', '🦋', '🐝'];

export function Welcome() {
  const { signIn, backend } = useApp();
  const [nombre, setNombre] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const real = backend.kind === 'supabase';

  const go = async () => {
    setErr('');
    if (!nombre.trim()) return setErr('Escribe tu nombre');
    if (real && !/^\S+@\S+\.\S+$/.test(email)) return setErr('Escribe un correo válido');
    setBusy(true);
    try {
      const r = await signIn(nombre.trim(), emoji, email.trim());
      if (r && r.revisaCorreo) setSent(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <div className="welcome center">
        <div className="logo">📬</div>
        <h1 className="page-title">Revisa tu correo</h1>
        <p className="sub">Te hemos enviado un enlace a {email}. Ábrelo en este mismo dispositivo para entrar.</p>
        <button className="btn ghost" onClick={() => setSent(false)}>Usar otro correo</button>
      </div>
    );

  return (
    <div className="welcome">
      <div className="logo">{emoji}</div>
      <div className="center">
        <h1 className="page-title"><span className="brand" style={{ fontSize: 40 }}>PlayZoo</span></h1>
        <p className="sub mt">Un minijuego animal al día. Compite con tu grupo.</p>
      </div>
      <div className="field">
        <label htmlFor="nombre">Tu nombre</label>
        <input id="nombre" className="input" maxLength={24} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ana" autoComplete="nickname" />
      </div>
      <div className="field">
        <label>Tu animal</label>
        <div className="emojis">
          {EMOJIS.map((e) => (
            <button key={e} className={e === emoji ? 'on' : ''} onClick={() => setEmoji(e)} aria-label={`Animal ${e}`}>{e}</button>
          ))}
        </div>
      </div>
      {real && (
        <div className="field">
          <label htmlFor="email">Correo (te enviamos un enlace, sin contraseña)</label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email" />
        </div>
      )}
      {err && <div className="err">{err}</div>}
      <button className="btn primary block" onClick={go} disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      {!real && <div className="demo-banner">Modo demo: los datos se guardan solo en este dispositivo y tu grupo tiene jugadores simulados. Configura Supabase para jugar con amigos reales (ver README).</div>}
    </div>
  );
}
