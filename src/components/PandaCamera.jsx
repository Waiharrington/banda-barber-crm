import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';

/**
 * PandaCamera - Un componente premium para capturar o subir fotos.
 * Diseñado para permitir ambas opciones desde el primer momento, con reencuadre interactivo (drag-to-crop).
 */
const PandaCamera = ({ onCapture, onClose, overlayClass, cardClass }) => {
  const cleanCardClass = cardClass ? cardClass.replace('global-modal-card', '') : '';
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

  // Crop / Drag States
  const [imgDetails, setImgDetails] = useState({
    naturalWidth: 0,
    naturalHeight: 0,
    scaledWidth: 0,
    scaledHeight: 0,
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    viewportWidth: 0,
    viewportHeight: 0
  });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    try {
      stopCamera();
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
        streamRef.current = mediaStream;
        setError(null);
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      setError("Cámara no disponible, pero puedes subir fotos.");
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
      stopCamera();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadstart = () => setError("Leyendo archivo...");
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        setError(null);
        stopCamera();
        e.target.value = ''; // Clear for same-file re-uploads
      };
      reader.onerror = () => {
        setError("Error al leer el archivo. Intenta con otra imagen.");
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setImgDetails({
      naturalWidth: 0,
      naturalHeight: 0,
      scaledWidth: 0,
      scaledHeight: 0,
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      viewportWidth: 0,
      viewportHeight: 0
    });
    setPosition({ x: 0, y: 0 });
    startCamera();
  };

  const handleImageLoad = (e) => {
    const img = e.target;
    const container = img.parentElement;
    const vW = container.clientWidth || 300;
    const vH = container.clientHeight || 400;

    const iW = img.naturalWidth || 300;
    const iH = img.naturalHeight || 400;

    const scale = Math.max(vW / iW, vH / iH);
    const sW = iW * scale;
    const sH = iH * scale;

    const minX = vW - sW;
    const minY = vH - sH;

    setImgDetails({
      naturalWidth: iW,
      naturalHeight: iH,
      scaledWidth: sW,
      scaledHeight: sH,
      minX,
      maxX: 0,
      minY,
      maxY: 0,
      viewportWidth: vW,
      viewportHeight: vH
    });

    // Center the image initially
    setPosition({
      x: (vW - sW) / 2,
      y: (vH - sH) / 2
    });
  };

  // Mouse Drag Events
  const handleDragStart = (e) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = { ...position };
  };

  const handleDragMove = (e) => {
    if (!isDragging.current || imgDetails.naturalWidth === 0) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    let newX = positionStart.current.x + dx;
    let newY = positionStart.current.y + dy;

    newX = Math.max(imgDetails.minX, Math.min(imgDetails.maxX, newX));
    newY = Math.max(imgDetails.minY, Math.min(imgDetails.maxY, newY));

    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    isDragging.current = false;
  };

  // Touch Events
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    positionStart.current = { ...position };
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || e.touches.length !== 1 || imgDetails.naturalWidth === 0) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;

    let newX = positionStart.current.x + dx;
    let newY = positionStart.current.y + dy;

    newX = Math.max(imgDetails.minX, Math.min(imgDetails.maxX, newX));
    newY = Math.max(imgDetails.minY, Math.min(imgDetails.maxY, newY));

    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  const confirm = () => {
    if (imgDetails.naturalWidth > 0 && imgDetails.naturalHeight > 0) {
      const cropCanvas = document.createElement('canvas');
      const scale = imgDetails.scaledWidth / imgDetails.naturalWidth;
      
      const wCrop = imgDetails.viewportWidth / scale;
      const hCrop = imgDetails.viewportHeight / scale;

      const sX = -position.x / scale;
      const sY = -position.y / scale;

      // High-res output standardizing on exactly 3:4 aspect ratio (900x1200)
      const targetW = 900;
      const targetH = 1200;

      cropCanvas.width = targetW;
      cropCanvas.height = targetH;

      const ctx = cropCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const tempImg = new Image();
      tempImg.onload = () => {
        ctx.drawImage(
          tempImg,
          sX, sY, wCrop, hCrop,
          0, 0, targetW, targetH
        );
        const croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.85);
        onCapture(croppedDataUrl);
        stopCamera();
        onClose();
      };
      tempImg.src = capturedImage;
    } else {
      onCapture(capturedImage);
      stopCamera();
      onClose();
    }
  };

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, []);

  return (
    <div className={overlayClass || 'animate-fade-in'} style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.98)',
      backdropFilter: 'blur(15px)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Header with Close */}
      <div style={{ position: 'absolute', top: '24px', left: 0, right: 0, padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 12 }}>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '14px', letterSpacing: '1px' }}>PANDA REC</div>
        <button 
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '12px', borderRadius: '50%', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Viewport */}
      <div className={cleanCardClass || 'animate-scale-in'} style={{ 
        position: 'relative', 
        width: '100%', 
        maxWidth: '400px',
        maxHeight: 'calc(100vh - 220px)',
        aspectRatio: '3/4', 
        backgroundColor: '#050505', 
        overflow: 'hidden', 
        borderRadius: '40px', 
        border: '1.5px solid rgba(255, 255, 255,0.3)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.9)' 
      }}>
        {!capturedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: error ? 0.3 : 1 }} 
            />
            
            {/* Visual Guides */}
            {!error && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: '1px solid rgba(255, 255, 255,0.2)', width: '70%', height: '70%', borderRadius: '20px', pointerEvents: 'none' }} />
            )}

            {error && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
                <ImageIcon size={48} color="rgba(255, 255, 255,0.3)" style={{ marginBottom: '20px' }} />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '500', lineHeight: 1.5 }}>{error}</p>
              </div>
            )}
            
            {/* Action Bar */}
            <div style={{ 
              position: 'absolute', 
              bottom: '0', 
              left: 0, 
              right: 0, 
              padding: '32px', 
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '40px' 
            }}>
              {/* Option 1: Gallery */}
              <button 
                onClick={() => fileInputRef.current.click()}
                className="hover-scale"
                style={{ 
                  width: '56px', height: '56px', borderRadius: '18px', 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                }}
              >
                <Upload size={20} />
                <span style={{ fontSize: '8px', fontWeight: '900', marginTop: '4px' }}>GALERÍA</span>
              </button>

              {/* Option 2: Live Shutter */}
              <button 
                onClick={takePhoto}
                disabled={!!error}
                style={{
                  width: '84px', height: '84px', borderRadius: '50%', 
                  border: '4px solid white', 
                  backgroundColor: error ? 'rgba(255,255,255,0.05)' : 'rgba(255, 255, 255, 0.2)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: error ? 'not-allowed' : 'pointer',
                  opacity: error ? 0.3 : 1
                }}
              >
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '50%', 
                  backgroundColor: 'white',
                  animation: !error ? 'shutterPulse 2s infinite' : 'none'
                }} />
              </button>

              <div style={{ width: '56px' }} />
            </div>
          </>
        ) : (
          <div 
            style={{ 
              position: 'relative', 
              width: '100%', 
              height: '100%', 
              overflow: 'hidden', 
              cursor: 'grab',
              animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
            }}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img 
              src={capturedImage} 
              alt="Preview" 
              onLoad={handleImageLoad}
              style={{ 
                position: 'absolute',
                width: imgDetails.scaledWidth ? `${imgDetails.scaledWidth}px` : '100%', 
                height: imgDetails.scaledHeight ? `${imgDetails.scaledHeight}px` : '100%', 
                left: `${position.x}px`,
                top: `${position.y}px`,
                userSelect: 'none',
                pointerEvents: 'none',
                maxWidth: 'none',
                maxHeight: 'none'
              }} 
            />

            {/* Grid overlay for cropping guides */}
            <div style={{
              position: 'absolute',
              inset: 0,
              border: '2px solid var(--gold-primary)',
              pointerEvents: 'none',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', height: '33.33%', borderBottom: '1px dashed rgba(255,255,255,0.15)' }}>
                <div style={{ width: '33.33%', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
                <div style={{ width: '33.33%', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
                <div style={{ width: '33.33%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', height: '33.33%', borderBottom: '1px dashed rgba(255,255,255,0.15)' }}>
                <div style={{ width: '33.33%', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
                <div style={{ width: '33.33%', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
                <div style={{ width: '33.33%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', height: '33.33%' }}>
                <div style={{ width: '33.33%', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
                <div style={{ width: '33.33%', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
                <div style={{ width: '33.33%' }} />
              </div>
            </div>

            {/* Instruction Banner */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0,0,0,0.75)',
              padding: '6px 16px',
              borderRadius: '30px',
              fontSize: '11px',
              color: 'white',
              pointerEvents: 'none',
              fontWeight: '700',
              border: '1px solid rgba(255,255,255,0.1)',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap'
            }}>
              ↔️ Arrastra para reencuadrar la foto ↕️
            </div>

            {/* Bottom buttons */}
            <div style={{ position: 'absolute', bottom: '32px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '24px', pointerEvents: 'auto' }}>
              <button 
                onClick={retake}
                style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
              >
                <RefreshCw size={24} />
              </button>
              <button 
                onClick={confirm}
                style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)', border: 'none', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 25px rgba(255, 255, 255,0.4)' }}
              >
                <Check size={32} strokeWidth={3} />
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

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' }}>
          {!capturedImage ? "Capturar • Subir" : "Previsualización Elite"}
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes shutterPulse { 0% { transform: scale(1); } 50% { transform: scale(0.95); } 100% { transform: scale(1); } }
        .hover-scale:hover { transform: scale(1.1); background-color: rgba(255,255,255,0.1) !important; }
      `}</style>
    </div>
  );
};

export default PandaCamera;
