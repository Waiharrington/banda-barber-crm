import React, { useRef, useState } from 'react';
import { Camera, X, Check, RefreshCw } from 'lucide-react';

/**
 * AstroCamera - Un componente premium para capturar fotos directamente desde la web.
 */
const AstroCamera = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, // Prioriza la cámara trasera en móviles
        audio: false 
      });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setError(null);
    } catch (err) {
      setError("No se pudo acceder a la cámara. Revisa los permisos.");
      console.error(err);
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(dataUrl);
      
      // Stop camera stream to save resources
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirm = () => {
    onCapture(capturedImage);
    onClose();
  };

  React.useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'black',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.3s ease'
    }}>
      <button 
        onClick={onClose}
        style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '12px', borderRadius: '50%', cursor: 'pointer', zIndex: 11 }}
      >
        <X size={24} />
      </button>

      <div style={{ position: 'relative', width: '100%', maxWidth: '500px', aspectRatio: '3/4', backgroundColor: '#111', overflow: 'hidden', borderRadius: '24px', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}>
        {!capturedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <div style={{ position: 'absolute', bottom: '40px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={takePhoto}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  border: '4px solid white',
                  backgroundColor: 'rgba(212, 175, 55, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(0,0,0,0.3)'
                }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'white' }} />
              </button>
            </div>
            {error && (
              <div style={{ position: 'absolute', top: '50%', left: '20px', right: '20px', textAlign: 'center', color: '#ff453a', fontWeight: '700' }}>
                {error}
              </div>
            )}
          </>
        ) : (
          <div style={{ width: '100%', height: '100%' }}>
            <img src={capturedImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: '40px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '24px' }}>
              <button 
                onClick={retake}
                style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <RefreshCw size={24} />
              </button>
              <button 
                onClick={confirm}
                style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)', border: 'none', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Check size={28} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
          {!capturedImage ? "Cuadra el ángulo perfecto" : "¡Se ve genial! ¿Deseas guardarla?"}
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default AstroCamera;
