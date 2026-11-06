import { useState } from 'react';

const PASSWORD_BOT = 'duitharam';

export default function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('');
  const [salah, setSalah] = useState(false);

  const cekPassword = () => {
    if (input === PASSWORD_BOT) {
      sessionStorage.setItem('bot-unlocked', 'yes');
      onUnlock();
    } else {
      setSalah(true);
      setInput('');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 20 }}>
      <div style={{ background: '#1e293b', padding: 28, borderRadius: 16, width: '100%', maxWidth: 360, textAlign: 'center', border: '1px solid #334155' }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <h1 style={{ color: 'white', fontSize: 22, margin: '10px 0 4px' }}>FreqAI Pro</h1>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 20px' }}>Masukin password buat buka bot!</p>
        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setSalah(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') cekPassword(); }}
          placeholder="Password..."
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #475569', background: '#0f172a', color: 'white', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
          autoFocus
        />
        {salah && <p style={{ color: '#f87171', fontSize: 13, margin: '10px 0 0' }}>Password salah! Coba lagi!</p>}
        <button
          onClick={cekPassword}
          style={{ width: '100%', marginTop: 14, padding: '12px', borderRadius: 10, border: 'none', background: '#22c55e', color: 'white', fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}
        >
          BUKA BOT 🚀
        </button>
        <p style={{ color: '#64748b', fontSize: 11, margin: '14px 0 0' }}>Tutup tab = ke-lock lagi otomatis!</p>
      </div>
    </div>
  );
    }
