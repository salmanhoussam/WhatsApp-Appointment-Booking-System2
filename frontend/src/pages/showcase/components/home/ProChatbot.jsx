import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.salmansaas.com';

const IconChat = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const SUGGESTIONS = {
  ar: ['ما هي أسعار المنصة؟', 'كيف أبدأ حجزاً؟', 'هل تدعم المطاعم؟'],
  en: ['What are the pricing plans?', 'How do I start booking?', 'Do you support restaurants?'],
};

export default function ProChatbot() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [showDot, setShowDot] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const abortRef       = useRef(null);

  // Hide the "new" dot after first open
  useEffect(() => {
    if (open) setShowDot(false);
  }, [open]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, messages]);

  const send = useCallback(async (text) => {
    const userMsg = text.trim();
    if (!userMsg || streaming) return;
    setInput('');

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);

    // Placeholder assistant message to stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const res = await fetch(`${API_BASE}/api/v1/public/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const parsed = JSON.parse(line.slice(5).trim());
            if (parsed.done) break;
            if (parsed.text) {
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: copy[copy.length - 1].content + parsed.text,
                };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: 'assistant',
            content: isAr ? 'عذراً، حدث خطأ. حاول مرة أخرى.' : 'Sorry, an error occurred. Please try again.',
          };
          return copy;
        });
      }
    } finally {
      setMessages(prev => {
        const copy = [...prev];
        if (copy[copy.length - 1]?.streaming) {
          const { streaming: _, ...rest } = copy[copy.length - 1];
          copy[copy.length - 1] = rest;
        }
        return copy;
      });
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming, isAr]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      [isAr ? 'left' : 'right']: 28,
      zIndex: 9999,
      fontFamily: "'Cairo', sans-serif",
    }}>
      {/* ── Chat Panel ── */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: 70,
          [isAr ? 'left' : 'right']: 0,
          width: 'min(360px, calc(100vw - 40px))',
          background: '#0d0d14',
          border: '1px solid rgba(255,26,85,0.25)',
          boxShadow: '0 0 60px rgba(255,26,85,0.08), 0 20px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'chatFadeIn 0.2s ease',
        }}>

          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,26,85,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#ff1a55',
                boxShadow: '0 0 8px #ff1a55',
                animation: 'pulse 2s infinite',
              }} />
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.7rem', letterSpacing: '0.14em',
                textTransform: 'uppercase', color: '#ff1a55',
              }}>
                {isAr ? 'مساعد SalmanSaaS' : 'SalmanSaaS AI'}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.35)', padding: 4,
                display: 'flex', alignItems: 'center',
              }}
            >
              <IconClose />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: 12,
            minHeight: 240, maxHeight: 380,
            direction: isAr ? 'rtl' : 'ltr',
          }}>
            {messages.length === 0 && (
              <div>
                <p style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)',
                  textAlign: 'center', marginBottom: 16, lineHeight: 1.7,
                }}>
                  {isAr ? 'اسألني عن المنصة' : 'Ask me anything about the platform'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SUGGESTIONS[isAr ? 'ar' : 'en'].map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{
                        background: 'rgba(255,26,85,0.06)',
                        border: '1px solid rgba(255,26,85,0.2)',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.75rem', padding: '8px 12px',
                        cursor: 'pointer', textAlign: isAr ? 'right' : 'left',
                        fontFamily: "'Cairo', sans-serif",
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,26,85,0.5)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,26,85,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? (isAr ? 'flex-start' : 'flex-end') : (isAr ? 'flex-end' : 'flex-start'),
                  maxWidth: '85%',
                }}
              >
                <div style={{
                  padding: '9px 13px',
                  background: m.role === 'user'
                    ? 'rgba(255,26,85,0.15)'
                    : 'rgba(255,255,255,0.04)',
                  border: m.role === 'user'
                    ? '1px solid rgba(255,26,85,0.3)'
                    : '1px solid rgba(255,255,255,0.07)',
                  fontSize: '0.82rem',
                  color: m.role === 'user' ? '#fff' : 'rgba(255,255,255,0.8)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {m.content}
                  {m.streaming && (
                    <span style={{
                      display: 'inline-block', width: 6, height: 14,
                      background: '#ff1a55', marginLeft: 3,
                      animation: 'blink 0.8s step-end infinite',
                      verticalAlign: 'text-bottom',
                    }} />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 8,
            direction: isAr ? 'rtl' : 'ltr',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={streaming}
              placeholder={isAr ? 'اكتب سؤالك...' : 'Type your question...'}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', padding: '8px 12px',
                fontSize: '0.82rem', outline: 'none',
                fontFamily: "'Cairo', sans-serif",
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,26,85,0.4)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || streaming}
              style={{
                background: input.trim() && !streaming ? '#ff1a55' : 'rgba(255,255,255,0.06)',
                border: 'none', color: '#fff', padding: '8px 12px',
                cursor: input.trim() && !streaming ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <IconSend />
            </button>
          </div>
        </div>
      )}

      {/* ── Toggle Button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 52, height: 52,
          background: open ? 'rgba(255,26,85,0.15)' : '#ff1a55',
          border: open ? '1px solid rgba(255,26,85,0.4)' : 'none',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? 'none' : '0 0 30px rgba(255,26,85,0.5)',
          transition: 'all 0.25s',
          position: 'relative',
        }}
        aria-label="Open AI chat"
      >
        {open ? <IconClose /> : <IconChat />}
        {showDot && !open && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            width: 8, height: 8, borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 0 6px rgba(255,255,255,0.8)',
          }} />
        )}
      </button>

      <style>{`
        @keyframes chatFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
      `}</style>
    </div>
  );
}
