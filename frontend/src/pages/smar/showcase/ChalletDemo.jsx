import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

export default function ChalletDemo() {
  useEffect(() => {
    // Hide overflow on body to prevent double scrollbars
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Smar Challet Preview</title>
      </Helmet>
      
      <div style={{ width: '100vw', height: '100vh', background: '#1e1710' }}>
        {/* We use an iframe pointing to the static public file. 
            This guarantees it renders perfectly without React Router loops 
            and without CSS conflicts. */}
        <iframe 
          src="/challet.html" 
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Challet Preview"
        />
      </div>
    </>
  );
}
