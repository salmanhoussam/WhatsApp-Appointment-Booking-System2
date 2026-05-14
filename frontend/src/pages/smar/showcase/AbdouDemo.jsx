import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import abdouHtml from '../../../../public/abdou.html?raw';

export default function AbdouDemo() {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <Helmet><title>إلى عبدو الغالي ❤️</title></Helmet>
      <div style={{ width: '100vw', height: '100vh' }}>
        <iframe
          srcDoc={abdouHtml}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Abdou"
        />
      </div>
    </>
  );
}
