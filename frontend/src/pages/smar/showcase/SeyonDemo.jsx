import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import seyonHtml from '../../../../public/seyon.html?raw';

export default function SeyonDemo() {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <Helmet><title>ለሴዮን ውዴ ❤️</title></Helmet>
      <div style={{ width: '100vw', height: '100vh' }}>
        <iframe
          srcDoc={seyonHtml}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Seyon"
        />
      </div>
    </>
  );
}
