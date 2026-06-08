import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User, Lock, Loader2, Rocket, Eye, EyeOff,
  Calendar, Users, BarChart2, DollarSign, ShieldCheck,
  Sliders, Copy, Check, X, Monitor, Tablet as TabletIcon, Phone
} from 'lucide-react';
import logo from '../assets/logo.png';
import bgDesktop from '../assets/barbershop_desktop.png';
import bgMobile from '../assets/barbershop_mobile.png';

const features = [
  { icon: Calendar,   label: 'GESTIONA\nCITAS' },
  { icon: Users,      label: 'ADMINISTRA\nCLIENTES' },
  { icon: BarChart2,  label: 'ANALIZA TU\nNEGOCIO' },
  { icon: DollarSign, label: 'HAZ CRECER\nTU BARBERÍA' },
];

export default function Login() {
  const { login, loading } = useAuth();
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  
  // ── ESTADOS DE CALIBRACIÓN DE FONDO INTERACTIVOS (CON PERSISTENCIA LOCALSTORAGE) ──
  
  // Helper para obtener valores numéricos de localStorage
  const getLocalNum = (key, fallback) => {
    const val = localStorage.getItem(key);
    return val !== null ? Number(val) : fallback;
  };

  // Helper para obtener strings de localStorage
  const getLocalStr = (key, fallback) => {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  };

  // 1. Escritorio / Laptop
  const [bgZoomMode, setBgZoomMode] = useState(() => getLocalStr('bgZoomMode', 'cover'));
  const [bgZoom, setBgZoom]         = useState(() => getLocalNum('bgZoom', 122));
  const [bgX, setBgX]               = useState(() => getLocalNum('bgX', 56));
  const [bgY, setBgY]               = useState(() => getLocalNum('bgY', 100));
  const [bgDarkness, setBgDarkness] = useState(() => getLocalNum('bgDarkness', 51));
  const [photoWidth, setPhotoWidth] = useState(() => getLocalNum('photoWidth', 59));
  const [gradientStart, setGradientStart] = useState(() => getLocalNum('gradientStart', 49));

  // 2. Tablet (iPad)
  const [tabBgZoomMode, setTabBgZoomMode] = useState(() => getLocalStr('tabBgZoomMode', 'cover'));
  const [tabBgZoom, setTabBgZoom]         = useState(() => getLocalNum('tabBgZoom', 100));
  const [tabBgX, setTabBgX]               = useState(() => getLocalNum('tabBgX', 64));
  const [tabBgY, setTabBgY]               = useState(() => getLocalNum('tabBgY', 97));

  // 3. Teléfono / Móvil (Inicializado con los valores calibrados por el usuario en el screenshot)
  const [mobBgZoomMode, setMobBgZoomMode] = useState(() => getLocalStr('mobBgZoomMode', 'manual')); 
  const [mobBgZoom, setMobBgZoom]         = useState(() => getLocalNum('mobBgZoom', 101));
  const [mobBgX, setMobBgX]               = useState(() => getLocalNum('mobBgX', 0));
  const [mobBgY, setMobBgY]               = useState(() => getLocalNum('mobBgY', 100));
  const [mobileSplit, setMobileSplit]     = useState(() => getLocalNum('mobileSplit', 34));
  const [rememberMe, setRememberMe]       = useState(false);

  // 4. Espaciados e Interlineados de Pantalla Móvil (Actualizado con screenshot)
  const [mobLogoSize, setMobLogoSize]         = useState(() => getLocalNum('mobLogoSize', 118));
  const [mobLogoGap, setMobLogoGap]           = useState(() => getLocalNum('mobLogoGap', 26));
  const [mobTitleGap, setMobTitleGap]         = useState(() => getLocalNum('mobTitleGap', 7));
  const [mobHeaderPadding, setMobHeaderPadding] = useState(() => getLocalNum('mobHeaderPadding', 28));
  const [mobCardPadding, setMobCardPadding]   = useState(() => getLocalNum('mobCardPadding', 33));
  const [mobFieldsGap, setMobFieldsGap]       = useState(() => getLocalNum('mobFieldsGap', 27));
  const [mobBottomGap, setMobBottomGap]       = useState(() => getLocalNum('mobBottomGap', 25));
  const [mobBottomPaddingTop, setMobBottomPaddingTop] = useState(() => getLocalNum('mobBottomPaddingTop', 20));

  // Nuevas separaciones específicas debajo de la tarjeta
  const [mobCardFeaturesGap, setMobCardFeaturesGap]   = useState(() => getLocalNum('mobCardFeaturesGap', 22));
  const [mobFeaturesSecureGap, setMobFeaturesSecureGap] = useState(() => getLocalNum('mobFeaturesSecureGap', 25));

  // Guardar en localStorage cuando cambie cualquier valor
  useEffect(() => {
    localStorage.setItem('bgZoomMode', bgZoomMode);
    localStorage.setItem('bgZoom', bgZoom);
    localStorage.setItem('bgX', bgX);
    localStorage.setItem('bgY', bgY);
    localStorage.setItem('bgDarkness', bgDarkness);
    localStorage.setItem('photoWidth', photoWidth);
    localStorage.setItem('gradientStart', gradientStart);

    localStorage.setItem('tabBgZoomMode', tabBgZoomMode);
    localStorage.setItem('tabBgZoom', tabBgZoom);
    localStorage.setItem('tabBgX', tabBgX);
    localStorage.setItem('tabBgY', tabBgY);

    localStorage.setItem('mobBgZoomMode', mobBgZoomMode);
    localStorage.setItem('mobBgZoom', mobBgZoom);
    localStorage.setItem('mobBgX', mobBgX);
    localStorage.setItem('mobBgY', mobBgY);
    localStorage.setItem('mobileSplit', mobileSplit);

    localStorage.setItem('mobLogoSize', mobLogoSize);
    localStorage.setItem('mobLogoGap', mobLogoGap);
    localStorage.setItem('mobTitleGap', mobTitleGap);
    localStorage.setItem('mobHeaderPadding', mobHeaderPadding);
    localStorage.setItem('mobCardPadding', mobCardPadding);
    localStorage.setItem('mobFieldsGap', mobFieldsGap);
    localStorage.setItem('mobBottomGap', mobBottomGap);
    localStorage.setItem('mobBottomPaddingTop', mobBottomPaddingTop);

    localStorage.setItem('mobCardFeaturesGap', mobCardFeaturesGap);
    localStorage.setItem('mobFeaturesSecureGap', mobFeaturesSecureGap);
  }, [
    bgZoomMode, bgZoom, bgX, bgY, bgDarkness, photoWidth, gradientStart,
    tabBgZoomMode, tabBgZoom, tabBgX, tabBgY,
    mobBgZoomMode, mobBgZoom, mobBgX, mobBgY, mobileSplit,
    mobLogoSize, mobLogoGap, mobTitleGap, mobHeaderPadding,
    mobCardPadding, mobFieldsGap, mobBottomGap, mobBottomPaddingTop,
    mobCardFeaturesGap, mobFeaturesSecureGap
  ]);

  // Panel de control flotante
  const [showCalibrator, setShowCalibrator] = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [windowWidth, setWindowWidth]       = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getActiveDevice = () => {
    const isPortrait = window.innerHeight > window.innerWidth;
    if (windowWidth <= 768 || isPortrait) return 'mobile';
    if (windowWidth <= 1024) return 'tablet';
    return 'desktop';
  };

  const activeDevice = getActiveDevice();

  const handleCopyConfig = () => {
    const configCode = `// Reemplaza estas variables al inicio de Login.jsx para fijar tu diseño:
const bgZoom = ${bgZoomMode === 'cover' ? "'cover'" : bgZoom};
const bgX = ${bgX};
const bgY = ${bgY};
const bgDarkness = ${bgDarkness};
const photoWidth = ${photoWidth};
const gradientStart = ${gradientStart};

const tabBgZoom = ${tabBgZoomMode === 'cover' ? "'cover'" : tabBgZoom};
const tabBgX = ${tabBgX};
const tabBgY = ${tabBgY};

const mobBgZoom = ${mobBgZoomMode === 'cover' ? "'cover'" : mobBgZoom};
const mobBgX = ${mobBgX};
const mobBgY = ${mobBgY};
const mobileSplit = ${mobileSplit};

const mobLogoSize = ${mobLogoSize};
const mobLogoGap = ${mobLogoGap};
const mobTitleGap = ${mobTitleGap};
const mobHeaderPadding = ${mobHeaderPadding};
const mobCardPadding = ${mobCardPadding};
const mobFieldsGap = ${mobFieldsGap};
const mobBottomGap = ${mobBottomGap};
const mobBottomPaddingTop = ${mobBottomPaddingTop};
const mobCardFeaturesGap = ${mobCardFeaturesGap};
const mobFeaturesSecureGap = ${mobFeaturesSecureGap};`;

    navigator.clipboard.writeText(configCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (!result.success) setError(result.message);
  };

  return (
    <div className="l-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── ROOT ── */
        .l-root {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #050506;
          padding: 24px; /* Margen negro alrededor del marco */
        }

        /* ── CONTENEDOR CON BORDE DORADO (MARCO) ── */
        .l-frame {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 28px;
          border: 1.5px solid rgba(212, 175, 55, 0.22);
          overflow: hidden;
          display: flex;
          align-items: stretch;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8);
        }

        /* ── BACKGROUND LAYERS ── */
        .l-bg {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          transition: opacity 0.4s;
          filter: brightness(0.70) contrast(1.05); /* Hace la foto y sus alrededores más oscuros y cinematográficos */
          background-repeat: no-repeat;
        }
        .l-bg-desktop {
          background-image: url(${bgDesktop});
          width: var(--photo-width, 53%);
          opacity: 1;
          background-size: var(--bg-zoom, cover);
          background-position: var(--bg-x, 50%) var(--bg-y, 50%);
        }
        .l-bg-mobile-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: var(--mobile-split, 45%);
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
          z-index: 1;
          -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.95) 50%, rgba(0, 0, 0, 0) 100%);
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.95) 50%, rgba(0, 0, 0, 0) 100%);
        }
        .l-bg-mobile-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.70) contrast(1.05);
          transform: scale(var(--mob-bg-zoom-factor, 1));
          transform-origin: var(--mob-bg-x, 50%) var(--mob-bg-y, 50%);
        }
        /* dark overlay - oscurece el lado izquierdo y se difumina a negro puro hacia el lado derecho */
        .l-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to right,
            var(--bg-darkness-start, rgba(0,0,0,0.15)) 0%,
            var(--bg-darkness-start, rgba(0,0,0,0.15)) var(--gradient-start, 45%),
            #0a0a0c var(--photo-width, 53%),
            #0a0a0c 100%
          );
        }

        /* ── LAYOUT ── */
        .l-inner {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1380px; /* Limitar el ancho de visualización del contenido */
          margin: 0 auto; /* Centrar todo el bloque en la pantalla */
          display: flex;
          align-items: center;
          justify-content: space-between; /* Pushes containers to their respective sides */
          padding: 50px 80px;
          gap: 40px; /* Distancia mínima para pantallas medianas */
        }

        /* ── LEFT SIDE ── */
        .l-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start; /* Alineado a la izquierda */
          height: 100%;
          max-width: 520px;
          gap: 36px;
          padding-left: 0; /* Let inner container handle the outer padding */
        }
        .l-tagline {
          display: flex;
          flex-direction: column;
          align-items: flex-start; /* Elementos alineados a la izquierda */
          justify-content: center;
          width: 100%;
          max-width: 480px;
        }
        .l-logo {
          width: 170px; /* Logo más pequeño y elegante */
          margin: 0 0 32px 0; /* Alinear logo a la izquierda */
          display: block;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.95)) drop-shadow(0 2px 4px rgba(0,0,0,0.85));
        }
        .l-heading {
          font-size: clamp(32px, 3.2vw, 42px);
          font-weight: 800;
          line-height: 1.15;
          color: #fff;
          letter-spacing: -0.5px;
          margin-bottom: 20px;
          text-align: left; /* Título alineado a la izquierda */
          width: 100%;
        }
        .l-heading span { color: #d4af37; }
        .l-desc {
          font-size: 13.5px;
          color: rgba(255, 255, 255, 0.85); /* Mucho más contraste y luminosidad */
          font-weight: 500; /* Añade cuerpo al texto */
          line-height: 1.6;
          max-width: 440px; /* Ancho exacto e ideal */
          text-align: left; /* Subtítulo alineado a la izquierda */
          margin-left: 0; /* Resetear margen */
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8); /* Sombra para despegarlo del fondo */
        }
        .l-features {
          display: flex;
          align-items: stretch;
          margin-top: 15px;
          width: 100%;
          max-width: 500px;
        }
        .l-feat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start; /* Alineado a la izquierda */
          gap: 12px;
          border-right: 1px solid rgba(255, 255, 255, 0.08); /* Línea divisoria fina entre items */
          padding: 0 16px 0 0; /* Borde y espaciado alineado */
        }
        .l-feat:last-child {
          border-right: none; /* Quitar borde al último elemento */
        }
        .l-feat-icon {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          color: #d4af37;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.85)); /* Añade sombra al icono dorado */
        }
        .l-feat-label {
          font-size: 10.5px; /* Ligeramente más grande */
          font-weight: 800;
          text-align: left; /* Alineado a la izquierda */
          color: rgba(255, 255, 255, 0.9); /* Más contraste e iluminación */
          letter-spacing: 0.6px;
          line-height: 1.5;
          white-space: pre-line;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95); /* Sombra para despegar el texto del mármol */
        }

        /* ── RIGHT CARD ── */
        .l-card {
          flex-shrink: 0;
          width: 410px;
          background: #0f0f11; /* Gris oscuro sólido sin transparencia excesiva */
          border: 1px solid rgba(212, 175, 55, 0.22); /* Borde dorado pulido y sutil */
          border-radius: 24px; /* Esquinas exactas */
          padding: 54px 36px; /* Relleno optimizado para ancho más estrecho */
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
        }
        .l-card-title {
          font-size: 21px;
          font-weight: 800;
          color: #fff;
          text-align: center;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }
        .l-card-title span { color: #d4af37; }
        .l-card-sub {
          font-size: 13.5px;
          color: rgba(255,255,255,0.40);
          text-align: center;
          margin-bottom: 44px; /* Más espacio para estirar el largo */
        }

        /* ── INPUTS ── */
        .l-field {
          position: relative;
          margin-bottom: 24px; /* Mayor espacio vertical */
        }
        .l-field-label {
          position: absolute;
          top: 10px;
          left: 54px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #9a7e2b; /* Dorado envejecido/apagado */
          text-transform: uppercase;
          pointer-events: none;
          z-index: 1;
        }
        .l-field-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #9a7e2b; /* Dorado a juego con la etiqueta */
          display: flex;
          z-index: 1;
          opacity: 0.8;
        }
        .l-input {
          width: 100%;
          padding: 28px 46px 12px 54px;
          background: #1a1a1e; /* Negro/gris mate plano de la referencia */
          border: 1px solid #2e2e35; /* Borde gris sutil */
          border-radius: 12px; /* Redondeado igual al botón */
          color: #fff;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          outline: none;
          color-scheme: dark; /* Forzar al navegador a renderizar esquinas/sombras en modo oscuro */
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .l-input::placeholder { color: rgba(255,255,255,0.22); }
        
        /* Evitar que el autocompletado de Chrome pinte los inputs de blanco/azul */
        .l-input:-webkit-autofill,
        .l-input:-webkit-autofill:hover, 
        .l-input:-webkit-autofill:focus, 
        .l-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #1a1a1e inset !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .l-input:focus {
          border-color: rgba(212,175,55,0.8); /* Iluminar borde dorado */
          box-shadow: 0 0 0 3px rgba(212,175,55,0.15);
        }
        .l-eye-btn {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #d4af37; /* Dorado en la referencia */
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
          z-index: 1;
        }

        .l-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          font-size: 13px;
          width: 100%;
        }
        .l-remember {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-weight: 500;
        }
        .l-remember input {
          accent-color: #d4af37;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        .l-forgot {
          color: #d4af37;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }
        .l-forgot:hover {
          color: #caa03d;
          text-decoration: underline;
        }

        /* ── ERROR ── */
        .l-error {
          color: #ff453a;
          font-size: 13px;
          font-weight: 600;
          background: rgba(255,69,58,0.08);
          border: 1px solid rgba(255,69,58,0.20);
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }

        /* ── BUTTON ── */
        .l-btn {
          width: 100%;
          height: 56px;
          background: linear-gradient(to right, #ecc355 0%, #caa03d 100%); /* Degradado dorado suave */
          border: none;
          border-radius: 12px; /* Redondeado exacto de 12px */
          color: #000; /* Texto negro */
          font-size: 14.5px;
          font-weight: 800; /* Negrita */
          letter-spacing: 1.5px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 8px 20px rgba(212,175,55,0.15); /* Resplandor dorado suave */
        }
        .l-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(212,175,55,0.25);
        }
        .l-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── SECURITY NOTE ── */
        .l-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 24px;
          font-size: 12px;
          color: rgba(255,255,255,0.40);
        }
        .l-secure span { color: #d4af37; font-weight: 600; }

        /* ── SPIN ── */
        @keyframes l-spin { to { transform: rotate(360deg); } }
        .l-spin { animation: l-spin 1s linear infinite; }

        /* ── PREMIUM ANIMATIONS & SHADOWS ── */
        @keyframes l-pulse-glow {
          0% { opacity: 0.55; transform: scale(0.9) translateY(-50%); }
          100% { opacity: 0.95; transform: scale(1.1) translateY(-50%); }
        }
        .l-glow-orb {
          position: absolute;
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.07) 0%, rgba(212, 175, 55, 0) 70%);
          right: -120px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          z-index: 1;
          animation: l-pulse-glow 6s ease-in-out infinite alternate;
        }

        @keyframes l-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .l-shimmer-text {
          background: linear-gradient(90deg, #d4af37 0%, #fff 50%, #d4af37 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: l-shimmer 4s linear infinite;
        }

        .l-btn-shimmer {
          position: relative;
          overflow: hidden;
        }
        .l-btn-shimmer::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -60%;
          width: 30%;
          height: 200%;
          background: rgba(255, 255, 255, 0.35);
          transform: rotate(30deg);
          animation: l-btn-glow 4.5s ease-in-out infinite;
        }
        @keyframes l-btn-glow {
          0% { left: -60%; }
          30% { left: 160%; }
          100% { left: 160%; }
        }

        @keyframes l-fade-in-right {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes l-slide-in-left {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .l-animate-left {
          animation: l-slide-in-left 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .l-animate-right {
          animation: l-fade-in-right 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          position: relative;
          z-index: 2; /* Sit on top of the glow orb */
        }

        /* Hover interactions on features */
        .l-feat {
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease;
          cursor: pointer;
        }
        .l-feat:hover {
          transform: translateY(-5px);
          filter: brightness(1.25);
        }
        .l-feat:hover .l-feat-icon {
          filter: drop-shadow(0 2px 10px rgba(212, 175, 55, 0.6));
        }

        /* Focus feedback on inputs */
        .l-field-icon {
          transition: transform 0.25s ease, color 0.25s ease;
        }
        .l-field {
          position: relative;
          margin-bottom: 24px;
        }
        .l-field:focus-within .l-field-icon {
          color: #d4af37;
          transform: translateY(-50%) scale(1.15);
        }

        /* ── MOBILE / TABLET PORTRAIT APILADO ── */
        @media (max-width: 768px), (orientation: portrait) {
          .l-root {
            padding: 0 !important;
          }
          .l-frame {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .l-bg-desktop { opacity: 0; pointer-events: none; }
          .l-bg-mobile-container { 
            opacity: 1; 
            pointer-events: auto; 
            height: var(--mobile-split, 45%); 
          }
          /* Si es tablet (entre 769px y 1024px), usar las variables del tablet */
          @media (min-width: 769px) {
            .l-bg-mobile-img {
              transform: scale(var(--tab-bg-zoom-factor, 1));
              transform-origin: var(--tab-bg-x, 50%) var(--tab-bg-y, 50%);
            }
          }
          .l-overlay {
            background: linear-gradient(
              to bottom,
              rgba(0,0,0,0.15) 0%,
              rgba(0,0,0,0.40) calc(var(--mobile-split, 45%) - 15%),
              #0a0a0c var(--mobile-split, 45%),
              #0a0a0c 100%
            ) !important;
          }

          .l-inner {
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 0 20px;
            gap: 0;
            overflow-y: auto;
            height: 100vh;
          }

          .l-left {
            display: none !important;
          }
          
          .l-mob-header {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end; /* Alineado al fondo de la foto para despejar la parte superior */
            height: var(--mobile-split-vh, 45vh);
            width: 100%;
            max-width: 440px;
            z-index: 3;
            box-sizing: border-box;
            padding-bottom: var(--mob-header-padding, 12px); /* Espaciado fino antes del corte de la foto */
            flex-shrink: 0;
          }
          .l-logo-mob {
            width: var(--mob-logo-size, 130px);
            margin-bottom: var(--mob-logo-gap, 16px);
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.95)) drop-shadow(0 2px 4px rgba(0,0,0,0.85));
          }
          .l-mob-title {
            font-size: 24px;
            font-weight: 900;
            color: #fff;
            text-align: center;
            margin-bottom: var(--mob-title-gap, 8px);
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .l-mob-title span {
            color: #d4af37;
          }
          .l-mob-sub {
            font-size: 13.5px;
            color: rgba(255,255,255,0.60);
            text-align: center;
          }
          .l-card-title, .l-card-sub {
            display: none !important;
          }

          .l-mob-bottom {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-evenly; /* Distribuye el formulario, características y nota de seguridad en todo el largo */
            flex: 1;
            min-height: calc(100vh - var(--mobile-split-vh, 45vh) - 20px); /* Fuerza a ocupar el espacio restante usando vh puro */
            width: 100%;
            box-sizing: border-box;
            gap: var(--mob-bottom-gap, 36px); /* Garantiza un espacio generoso para que respire cada bloque */
            padding-top: var(--mob-bottom-padding-top, 20px); /* Controla el espacio inicial tras el título de forma sutil */
            padding-bottom: 20px;
          }

          .l-card {
            width: 100%;
            max-width: 420px;
            padding: var(--mob-card-padding, 32px) 24px;
            background: #0f0f11 !important;
            border: 1px solid rgba(212, 175, 55, 0.15) !important;
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            box-sizing: border-box;
          }

          .l-mob-bottom .l-field {
            margin-bottom: var(--mob-fields-gap, 24px);
          }
          .l-mob-bottom .l-row {
            margin-bottom: var(--mob-fields-gap, 24px);
          }

          .l-mob-features {
            display: flex !important;
            gap: 0;
            width: 100%;
            max-width: 440px;
            padding: 22px 10px;
            background: rgba(15, 15, 17, 0.8);
            border: 1px solid rgba(212, 175, 55, 0.12);
            border-radius: 18px;
            margin-top: var(--mob-card-features-gap, 36px) !important;
            margin-bottom: 0 !important;
            margin-left: 0;
            margin-right: 0;
          }
          .l-mob-features .l-feat {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            border-right: 1px solid rgba(255, 255, 255, 0.08);
            padding: 0 4px;
          }
          .l-mob-features .l-feat:last-child {
            border-right: none;
          }
          .l-mob-features .l-feat-icon {
            justify-content: center;
          }
          .l-mob-features .l-feat-label {
            text-align: center;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.4px;
            line-height: 1.4;
          }

          .l-mob-secure {
            display: flex !important;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 12px;
            color: rgba(255,255,255,0.50);
            width: 100%;
            max-width: 440px;
            margin-top: var(--mob-features-secure-gap, 36px) !important;
            margin-bottom: 0 !important;
            margin-left: 0;
            margin-right: 0;
          }
          .l-mob-secure span {
            color: #d4af37;
            font-weight: 600;
          }
          .l-card .l-secure {
            display: none !important;
          }

          /* Escalar componentes si es una pantalla portrait más ancha (ej: iPad de 768px o Pixel Tablet de 800px) */
          @media (min-width: 600px) {
            .l-card {
              max-width: 510px;
              padding: calc(var(--mob-card-padding, 33px) * 1.25) 36px;
            }
            .l-mob-header {
              max-width: 530px;
            }
            .l-logo-mob {
              width: calc(var(--mob-logo-size, 118px) * 1.3) !important;
            }
            .l-mob-title {
              font-size: 30px;
            }
            .l-mob-sub {
              font-size: 15.5px;
            }
            .l-input {
              font-size: 15.5px;
              padding: 30px 48px 12px 56px;
            }
            .l-field-label {
              font-size: 10px;
              left: 56px;
            }
            .l-field-icon {
              left: 20px;
            }
            .l-btn {
              font-size: 15.5px;
              padding: 18px 24px;
            }
            .l-mob-features {
              max-width: 530px;
              padding: 26px 14px;
            }
            .l-mob-features .l-feat-label {
              font-size: 10.5px;
            }
            .l-mob-secure {
              font-size: 13.5px;
              max-width: 530px;
            }
          }
        }

        /* ── TABLET HORIZONTAL (769px a 1024px) ── */
        @media (min-width: 769px) and (max-width: 1024px) and (orientation: landscape) {
          .l-bg-desktop {
            background-size: var(--tab-bg-zoom, cover) !important;
            background-position: var(--tab-bg-x, 56%) var(--tab-bg-y, 100%) !important;
          }
          .l-inner {
            padding: 40px 32px;
            gap: 24px;
          }
          .l-left {
            gap: 24px;
            max-width: 400px;
          }
          .l-logo {
            width: 180px;
            margin-bottom: 20px;
          }
          .l-heading {
            font-size: clamp(26px, 2.5vw, 32px);
            margin-bottom: 12px;
          }
          .l-desc {
            font-size: 12.5px;
            max-width: 360px;
          }
          .l-card {
            padding: 36px 24px;
            width: 380px;
          }
          .l-features {
            margin-top: 10px;
          }
          .l-feat {
            padding: 0 10px 0 0;
            gap: 8px;
          }
          .l-feat-label {
            font-size: 9.5px;
          }
        }
        .l-mob-header { display: none; }
        .l-mob-secure { display: none; }
        .l-mob-features { display: none; }
        .l-mob-bottom { display: contents; }

        /* ── CONFIGURADOR FLOTANTE (CALIBRATOR PANEL) ── */
        .l-cal-btn {
          position: fixed;
          bottom: 16px;
          left: 16px;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(21, 21, 24, 0.9);
          border: 1px solid rgba(212, 175, 55, 0.4);
          color: #d4af37;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          transition: transform 0.2s, background 0.2s;
        }
        .l-cal-btn:hover {
          transform: scale(1.05);
          background: #1a1a1e;
        }
        .l-cal-panel {
          position: fixed;
          bottom: 64px;
          left: 16px;
          width: 300px;
          background: rgba(15, 15, 17, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 16px;
          padding: 20px;
          z-index: 10000;
          color: #fff;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .l-cal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 10px;
        }
        .l-cal-header h3 {
          font-size: 13px;
          font-weight: 800;
          color: #d4af37;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .l-cal-close {
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          padding: 0;
          display: flex;
        }
        .l-cal-device {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(212, 175, 55, 0.1);
          color: #d4af37;
          padding: 4px 8px;
          border-radius: 6px;
          align-self: flex-start;
          text-transform: uppercase;
        }
        .l-cal-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .l-cal-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .l-cal-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 800;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .l-cal-label-row span.val {
          color: #d4af37;
        }
        .l-cal-slider {
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.1);
          outline: none;
          cursor: pointer;
          accent-color: #d4af37;
        }
        .l-cal-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          cursor: pointer;
          margin-top: 4px;
        }
        .l-cal-toggle input {
          accent-color: #d4af37;
          cursor: pointer;
        }
        .l-cal-btn-copy {
          width: 100%;
          height: 38px;
          background: linear-gradient(to right, #ecc355 0%, #caa03d 100%);
          border: none;
          border-radius: 8px;
          color: #000;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 4px;
          transition: transform 0.15s;
        }
        .l-cal-btn-copy:active {
          transform: scale(0.98);
        }
      `}</style>

      {/* ── MARCO CONTENEDOR DORADO ── */}
      <div className="l-frame" style={{
        '--bg-zoom': bgZoomMode === 'cover' ? 'cover' : `${bgZoom}%`,
        '--bg-x': `${bgX}%`,
        '--bg-y': `${bgY}%`,
        '--bg-darkness-start': `rgba(0,0,0,${(bgDarkness - 30) / 100})`,
        '--bg-darkness-mid': `rgba(0,0,0,${bgDarkness / 100})`,
        '--photo-width': `${photoWidth}%`,
        '--gradient-start': `${gradientStart}%`,
        '--mobile-split': `${mobileSplit}%`,
        '--mobile-split-vh': `${mobileSplit}vh`,
        '--mob-bg-zoom': mobBgZoomMode === 'cover' ? 'cover' : `${mobBgZoom}%`,
        '--mob-bg-x': `${mobBgX}%`,
        '--mob-bg-y': `${mobBgY}%`,
        '--tab-bg-zoom': tabBgZoomMode === 'cover' ? 'cover' : `${tabBgZoom}%`,
        '--tab-bg-x': `${tabBgX}%`,
        '--tab-bg-y': `${tabBgY}%`,
        '--mob-bg-zoom-factor': mobBgZoomMode === 'cover' ? 1.0 : mobBgZoom / 100,
        '--tab-bg-zoom-factor': tabBgZoomMode === 'cover' ? 1.0 : tabBgZoom / 100,
        '--mob-logo-size': `${mobLogoSize}px`,
        '--mob-logo-gap': `${mobLogoGap}px`,
        '--mob-title-gap': `${mobTitleGap}px`,
        '--mob-header-padding': `${mobHeaderPadding}px`,
        '--mob-card-padding': `${mobCardPadding}px`,
        '--mob-fields-gap': `${mobFieldsGap}px`,
        '--mob-bottom-gap': `${mobBottomGap}px`,
        '--mob-bottom-padding-top': `${mobBottomPaddingTop}px`,
        '--mob-card-features-gap': `${mobCardFeaturesGap}px`,
        '--mob-features-secure-gap': `${mobFeaturesSecureGap}px`
      }}>
        {/* ── BACKGROUNDS ── */}
        <div className="l-bg l-bg-desktop" />
        <div className="l-bg-mobile-container">
          <img src={bgMobile} className="l-bg-mobile-img" alt="" />
        </div>
        <div className="l-overlay" />
        <div className="l-glow-orb" />

        {/* ── CONTENT ── */}
        <div className="l-inner">

          {/* ── LEFT ── */}
          <div className="l-left l-animate-left">
            <div className="l-tagline">
              <img src={logo} alt="Astro Barbershop" className="l-logo" />
              <h1 className="l-heading">
                LLEVA TU BARBERÍA<br />
                AL SIGUIENTE <span className="l-shimmer-text">NIVEL</span>
              </h1>
              <p className="l-desc">
                El CRM diseñado para barberos que quieren organizar, gestionar y hacer crecer su negocio.
              </p>
            </div>

            <div className="l-features">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="l-feat">
                  <div className="l-feat-icon">
                    <Icon size={20} color="#d4af37" />
                  </div>
                  <span className="l-feat-label">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── MOBILE HEADER (Only shown on mobile) ── */}
          <div className="l-mob-header">
            <img src={logo} alt="Astro Barbershop" className="l-logo-mob" />
            <h2 className="l-mob-title">¡BIENVENIDO A <span>ASTRO</span>!</h2>
            <p className="l-mob-sub">Ingresa tus credenciales para continuar</p>
          </div>

          {/* ── MOBILE BOTTOM WRAPPER ── */}
          <div className="l-mob-bottom">
            {/* ── RIGHT CARD ── */}
            <div className="l-card l-animate-right">
              <p className="l-card-title">¡BIENVENIDO A <span>ASTRO</span>!</p>
              <p className="l-card-sub">Ingresa tus credenciales para continuar</p>

              <form onSubmit={handleSubmit}>
                {/* Username */}
                <div className="l-field">
                  <span className="l-field-label">USUARIO</span>
                  <span className="l-field-icon"><User size={17} /></span>
                  <input
                    type="text"
                    placeholder="Nombre de usuario"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    className="l-input"
                  />
                </div>

                {/* Password */}
                <div className="l-field">
                  <span className="l-field-label">CONTRASEÑA</span>
                  <span className="l-field-icon"><Lock size={17} /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="l-input"
                  />
                  <button
                    type="button"
                    className="l-eye-btn"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>



                {error && <div className="l-error">{error}</div>}

                <button type="submit" disabled={loading} className="l-btn l-btn-shimmer">
                  {loading
                    ? <Loader2 size={20} className="l-spin" />
                    : <><Rocket size={18} /> INICIAR SESIÓN</>
                  }
                </button>
              </form>

              <div className="l-secure">
                <ShieldCheck size={14} color="#d4af37" />
                Tu información está <span>segura</span> con nosotros
              </div>
            </div>

            {/* ── MOBILE: features below card ── */}
            <div className="l-mob-features">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="l-feat" style={{ flex: 1 }}>
                  <div className="l-feat-icon">
                    <Icon size={18} color="#d4af37" />
                  </div>
                  <span className="l-feat-label">{label}</span>
                </div>
              ))}
            </div>

            {/* ── MOBILE: security note below features ── */}
            <div className="l-mob-secure">
              <ShieldCheck size={14} color="#d4af37" />
              Tu información está <span>segura</span> con nosotros
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
