import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import hamoudiHtml from '../../../../public/hamoudi.html?raw';

export default function HamoudiDemo() {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <Helmet><title>إلى حمودي الغالي ❤️</title></Helmet>
      <div style={{ width: '100vw', height: '100vh' }}>
        <iframe
          srcDoc={hamoudiHtml}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Hamoudi"
        />
      </div>
    </>
  );
}
