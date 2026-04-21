import React, { useRef, useState } from 'react';
import { Camera, X, Check, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';

/**
 * AstroCamera - Un componente premium para capturar o subir fotos.
 * Optimizado para móvil y escritorio.
 */
const AstroCamera = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setError(null);
      }
    } catch (err) {
      setError("Cámara no disponible o permisos denegados.");
      console.warn("Camera access failed:", err);
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
      if (stream) stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        if (stream) stream.getTracks().forEach(track => track.stop());
      };
      reader.readAsDataURL(file);
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
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.95)',
      backdropFilter: 'blur(10px)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.3s ease'
    }}>
      {/* Botón Cerrar */}
      <button 
        onClick={onClose}
        style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '12px', borderRadius: '50%', cursor: 'pointer', zIndex: 11 }}
      >
        <X size={24} />
      </button>

      {/* Contenedor de Previsualización (Tamaño optimizado para PC) */}
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        maxWidth: '420px', // Reducido para que no se vea gigante en PC
        aspectRatio: '3/4', 
        backgroundColor: '#111', 
        overflow: 'hidden', 
        borderRadius: '32px', 
        border: '1px solid rgba(212,175,55,0.2)',
        boxShadow: '0 20px 80px rgba(0,0,0,0.8)' 
      }}>
        {!capturedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            
            {/* Controles modo cámara */}
            <div style={{ position: 'absolute', bottom: '32px', left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px' }}>
              {/* Botón Subir Foto Alternativo */}
              <button 
                onClick={() => fileInputRef.current.click()}
                style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Upload size={20} />
              </button>

              <button 
                onClick={takePhoto}
                style={{
                  width: '72px', height: '72px', borderRadius: '50%', border: '4px solid white', backgroundColor: 'rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'white' }} />
              </button>

              <div style={{ width: '52px' }} /> {/* Espaciador */}
            </div>

            {error && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
                <ImageIcon size={48} color="rgba(212,175,55,0.3)" style={{ marginBottom: '20px' }} />
                <p style={{ color: 'white', fontWeight: '700', fontSize: '14px', marginBottom: '24px' }}>{error}</p>
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="btn-gold"
                  style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '13px' }}
                >
                  Subir desde la Galería
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ width: '100%', height: '100%' }}>
            <img src={capturedImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: '32px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '24px' }}>
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

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600' }}>
          {!capturedImage ? "Captura el arte o sube una foto" : "¡Imagen lista! ¿Confirmamos?"}
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default AstroCamera;
