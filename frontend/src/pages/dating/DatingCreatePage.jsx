import { useState } from 'react';
import { useCreateDatePage } from './hooks/useDatePage';
import './dating.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

function toArray(str) {
  return str
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="dp-create-label">{label}</label>
      <input className="dp-create-input" {...props} />
    </div>
  );
}

function Textarea({ label, ...props }) {
  return (
    <div>
      <label className="dp-create-label">{label}</label>
      <textarea className="dp-create-input dp-create-textarea" {...props} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div>
      <label className="dp-create-label">{label}</label>
      <select
        className="dp-create-input"
        style={{ cursor: 'pointer' }}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

// ── Step sub-components ────────────────────────────────────────────────────────

function Step1({ form, set }) {
  return (
    <>
      <div className="dp-create-step-header">👩 معلومات أساسية</div>
      <div className="dp-create-step-sub">عن من هذه الصفحة؟</div>
      <Input
        label="اسمها *"
        value={form.her_name}
        onChange={e => set('her_name', e.target.value)}
        placeholder="مثال: سارة"
        required
      />
      <Input
        label="رقمك (واتساب) *"
        value={form.owner_phone}
        onChange={e => set('owner_phone', e.target.value)}
        placeholder="9613000000"
        type="tel"
      />
      <Input
        label="رقمها (اختياري — لإرسال الرابط مباشرة)"
        value={form.her_phone}
        onChange={e => set('her_phone', e.target.value)}
        placeholder="9613000000"
        type="tel"
      />
      <Input
        label="slug مخصص (اختياري — تلقائي إذا تركته)"
        value={form.slug}
        onChange={e => set('slug', e.target.value)}
        placeholder="مثال: sara-2026 (حروف وأرقام فقط)"
      />
    </>
  );
}

function Step2({ form, set }) {
  return (
    <>
      <div className="dp-create-step-header">💌 الرسالة والقصة</div>
      <div className="dp-create-step-sub">ما الذي تريد قوله؟</div>
      <Input
        label="الرسالة الافتتاحية (تظهر في الصفحة الأولى)"
        value={form.config.message}
        onChange={e => set('config.message', e.target.value)}
        placeholder="لديّ شيء أريد أن أقوله لكِ..."
      />
      <Textarea
        label="قصتكم معاً 📖"
        value={form.config.story}
        onChange={e => set('config.story', e.target.value)}
        placeholder="اكتب هنا قصتكم، كيف التقيتم، ما الذي يميزها..."
        rows={5}
      />
      <Select
        label="الرمز التعبيري (Emoji)"
        value={form.config.emoji}
        onChange={e => set('config.emoji', e.target.value)}
      >
        {['💌', '🌹', '💕', '⭐', '✨', '🌸', '💖', '🎀'].map(e => (
          <option key={e} value={e}>{e}</option>
        ))}
      </Select>
    </>
  );
}

function Step3({ form, set }) {
  return (
    <>
      <div className="dp-create-step-header">✨ المميزات والذكريات</div>
      <div className="dp-create-step-sub">ما الذي يميزها؟ ما أجمل لحظاتكم؟</div>
      <Textarea
        label="مميزاتها — كل مميزة في سطر (تظهر كـ pills) 💎"
        value={form.config.compliments}
        onChange={e => set('config.compliments', e.target.value)}
        placeholder={`جميلة\nذكية\nتجعلني أبتسم دائماً`}
        rows={4}
      />
      <Textarea
        label="ذكريات جميلة — كل ذكرى في سطر 📸"
        value={form.config.memories}
        onChange={e => set('config.memories', e.target.value)}
        placeholder={`أول مرة التقينا في المقهى\nالمشي على الكورنيش`}
        rows={4}
      />
    </>
  );
}

function Step4({ form, set }) {
  return (
    <>
      <div className="dp-create-step-header">📅 تفاصيل الموعد</div>
      <div className="dp-create-step-sub">3 خيارات للوقت — ستختار منها</div>
      {[0, 1, 2].map(i => (
        <Input
          key={i}
          label={`خيار ${i + 1}`}
          value={form.config.datetime_options[i] || ''}
          onChange={e => {
            const arr = [...(form.config.datetime_options || ['', '', ''])];
            arr[i] = e.target.value;
            set('config.datetime_options', arr);
          }}
          placeholder={['السبت مساءً', 'الجمعة بعد الظهر', 'الأحد'][i]}
        />
      ))}
      <Input
        label="المكان 📍"
        value={form.config.location}
        onChange={e => set('config.location', e.target.value)}
        placeholder="مطعم، كافيه، بحر..."
      />
      <Input
        label="النشاط ✨"
        value={form.config.activity}
        onChange={e => set('config.activity', e.target.value)}
        placeholder="عشاء + جولة، فيلم + كافيه..."
      />
    </>
  );
}

function Step5({ form, set }) {
  return (
    <>
      <div className="dp-create-step-header">🍽️ الطعام والتصميم</div>
      <div className="dp-create-step-sub">خيارات الطعام والثيم البصري</div>
      {[0, 1, 2].map(i => (
        <Input
          key={i}
          label={`نوع طعام ${i + 1}`}
          value={form.config.food_options[i] || ''}
          onChange={e => {
            const arr = [...(form.config.food_options || ['', '', ''])];
            arr[i] = e.target.value;
            set('config.food_options', arr);
          }}
          placeholder={['لبناني', 'إيطالي', 'سوشي'][i]}
        />
      ))}
      <Select
        label="الثيم 🎨"
        value={form.config.theme}
        onChange={e => set('config.theme', e.target.value)}
      >
        <option value="dark-rose">Dark Rose 🌹 (افتراضي)</option>
        <option value="light-gold">Light Gold ✨</option>
        <option value="midnight-blue">Midnight Blue 💙</option>
        <option value="classic-black">Classic Black 🖤</option>
      </Select>
      <Select
        label="اللغة"
        value={form.config.language}
        onChange={e => set('config.language', e.target.value)}
      >
        <option value="ar">عربي</option>
        <option value="en">English</option>
      </Select>
    </>
  );
}

// ── Result display ─────────────────────────────────────────────────────────────

function ResultCard({ result }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(result.page_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="dp-result-card">
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
        الصفحة جاهزة!
      </div>
      <div className="dp-result-url">{result.page_url}</div>
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button
          className="dp-btn-primary"
          onClick={copyLink}
          style={{ background: copied ? '#22c55e' : undefined, fontSize: '0.9rem', padding: '0.7rem 1.5rem' }}
        >
          {copied ? '✓ تم النسخ' : '📋 انسخ الرابط'}
        </button>
        <a
          href={result.wa_link}
          target="_blank"
          rel="noreferrer"
          className="dp-btn-primary"
          style={{ textDecoration: 'none', background: '#25d366', fontSize: '0.9rem', padding: '0.7rem 1.5rem' }}
        >
          💬 افتح واتساب
        </a>
      </div>
    </div>
  );
}

// ── Main Create Page ───────────────────────────────────────────────────────────

const INITIAL_FORM = {
  her_name:    '',
  owner_phone: '',
  her_phone:   '',
  slug:        '',
  config: {
    message:          '',
    story:            '',
    emoji:            '💌',
    compliments:      '',
    memories:         '',
    datetime_options: ['', '', ''],
    food_options:     ['', '', ''],
    location:         '',
    activity:         '',
    theme:            'dark-rose',
    language:         'ar',
  },
};

const STEPS = [Step1, Step2, Step3, Step4, Step5];
const STEP_LABELS = ['الأساسيات', 'القصة', 'المميزات', 'الموعد', 'الطعام'];

export default function DatingCreatePage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const { mutateAsync: createPage, isPending } = useCreateDatePage();

  const set = (path, value) => {
    setForm(prev => {
      if (path.startsWith('config.')) {
        const key = path.slice(7);
        return { ...prev, config: { ...prev.config, [key]: value } };
      }
      return { ...prev, [path]: value };
    });
  };

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setError('');
    if (!form.her_name.trim() || !form.owner_phone.trim()) {
      setError('الاسم ورقم الهاتف مطلوبان');
      setStep(0);
      return;
    }
    try {
      const payload = {
        her_name:    form.her_name.trim(),
        owner_phone: form.owner_phone.trim(),
        her_phone:   form.her_phone.trim() || undefined,
        slug:        form.slug.trim()       || undefined,
        config: {
          ...form.config,
          compliments:      toArray(form.config.compliments),
          memories:         toArray(form.config.memories),
          datetime_options: form.config.datetime_options.filter(Boolean),
          food_options:     form.config.food_options.filter(Boolean),
        },
      };
      const res = await createPage(payload);
      setResult(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'حدث خطأ، حاول مجدداً');
    }
  };

  const StepComponent = STEPS[step];
  const isLast = step === STEPS.length - 1;

  if (result) {
    return (
      <div className="dp-create-page">
        <div className="dp-create-step">
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            SalmanSaaS Dating 💌
          </div>
          <ResultCard result={result} />
          <button
            className="dp-btn-ghost"
            onClick={() => { setResult(null); setForm(INITIAL_FORM); setStep(0); }}
            style={{ marginTop: '1.5rem', width: '100%' }}
          >
            + إنشاء صفحة جديدة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dp-create-page">
      <div className="dp-create-step">

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ color: '#e8335a', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            SalmanSaaS Dating — إنشاء صفحة
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem' }}>
            {STEP_LABELS.map((label, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i <= step ? '#e8335a' : 'rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'background 0.3s',
                }}
                title={label}
              />
            ))}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.4rem' }}>
            {step + 1} / {STEPS.length} — {STEP_LABELS[step]}
          </div>
        </div>

        <StepComponent form={form} set={set} />

        {error && (
          <div style={{ color: '#e8335a', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        <div className="dp-create-nav">
          {step > 0 && (
            <button className="dp-btn-ghost" onClick={back} style={{ flex: 1 }}>
              ← السابق
            </button>
          )}
          {isLast ? (
            <button
              className="dp-btn-primary"
              onClick={handleSubmit}
              disabled={isPending}
              style={{ flex: 2 }}
            >
              {isPending ? '...' : '🚀 إنشاء الصفحة'}
            </button>
          ) : (
            <button
              className="dp-btn-primary"
              onClick={next}
              style={{ flex: 2 }}
            >
              التالي →
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
