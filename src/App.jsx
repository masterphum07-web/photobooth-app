import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, Image as ImageIcon, Wand2, Download, QrCode, 
  Settings, Smile, ChevronRight, Sparkles, RefreshCcw, 
  X, Layers, Share2, Loader2, AlertCircle, ShieldAlert,
  Plus, Trash2, ImagePlus, Paintbrush, MonitorSmartphone, LayoutTemplate, Square
} from 'lucide-react';
import QRCode from 'qrcode';

// --- INITIAL CONFIGURATION & ASSETS ---
const LAYOUTS = {
  single: { id: 'single', name: '1 รูป (โพลารอยด์)', shots: 1, cols: 1, aspect: 'aspect-[3/4]', vW: 1200, vH: 1600 },
  strip: { id: 'strip', name: '3 รูป (แนวตั้ง)', shots: 3, cols: 1, aspect: 'aspect-[1/3]', vW: 800, vH: 2400 },
  strip_4: { id: 'strip_4', name: '4 รูป (แนวตั้ง)', shots: 4, cols: 1, aspect: 'aspect-[1/4]', vW: 800, vH: 3200 },
  grid: { id: 'grid', name: '4 รูป (2x2)', shots: 4, cols: 2, aspect: 'aspect-square', vW: 1600, vH: 1600 },
  grid_6: { id: 'grid_6', name: '6 รูป (2x3)', shots: 6, cols: 2, aspect: 'aspect-[2/3]', vW: 1600, vH: 2400 },
};

const FILTERS = [
  { id: 'none', name: 'ปกติ', css: '' },
  { id: 'grayscale', name: 'ขาวดำ', css: 'grayscale(100%) contrast(120%)' },
  { id: 'sepia', name: 'วินเทจ', css: 'sepia(80%) contrast(110%) brightness(90%)' },
  { id: 'warm', name: 'อบอุ่น', css: 'sepia(30%) saturate(140%) hue-rotate(-10deg)' },
  { id: 'cool', name: 'เย็นตา', css: 'saturate(120%) hue-rotate(180deg) brightness(110%)' },
];

const DEFAULT_FRAMES = [
  { id: 'white', name: 'คลาสสิกขาว', type: 'color', bg: '#ffffff', text: '#000000' },
  { id: 'black', name: 'คลาสสิกดำ', type: 'color', bg: '#18181b', text: '#ffffff' },
  { id: 'y2k', name: 'Y2K ชมพู', type: 'color', bg: '#f472b6', text: '#ffffff' },
  { id: 'checkered', name: 'หมากรุก', type: 'pattern', bg: 'repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%) 50% / 40px 40px', baseColor: '#ffffff', patternColor: '#cbd5e1', size: 40, text: '#000000' }
];

const DEFAULT_STICKERS = ['👑', '✨', '💖', '🎉', '🌸', '😎', '🐱', '🎀', '🎈', '🔥', '💎', '🌈', '🦋'];

// --- CUSTOM HOOK FOR LOCAL STORAGE ---
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });
  const setValue = value => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {}
  };
  return [storedValue, setValue];
}

// --- UTILS ---
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- MAIN APP COMPONENT ---
export default function App() {
  const [view, setView] = useState('landing'); 
  const DEFAULT_CLOUD_CONFIG = { cloudName: '', uploadPreset: '' };
  const [cloudConfig, setCloudConfig] = useLocalStorage('studio-booth-cloud', DEFAULT_CLOUD_CONFIG);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('download') === '1') {
      setView('download');
    }
  }, []);

  const [config, setConfig] = useState({ layout: LAYOUTS.strip, filter: FILTERS[0], timer: 3 });
  const [photos, setPhotos] = useState([]);
  const [finalImage, setFinalImage] = useState(null);
  const [finalVideo, setFinalVideo] = useState(null);

  // Admin Managed Assets
  const [customFrames, setCustomFrames] = useLocalStorage('studio-booth-frames', DEFAULT_FRAMES);
  const [customStickers, setCustomStickers] = useLocalStorage('studio-booth-stickers', DEFAULT_STICKERS);

  const DEFAULT_LANDING_CONFIG = {
    title: 'Yeehaw Photo Booth',
    subtitle: 'ถ่ายรูปสไตล์คาวบอย กรอบสวย สติกเกอร์เพียบ!',
    buttonText: '🤠 แตะเพื่อเริ่มถ่ายรูป',
    brandText: 'STUDIO BOOTH',
    shareTitle: 'รูปภาพของคุณพร้อมแล้ว!',
    shareSubtitle: 'สแกนคิวอาร์โค้ดเพื่อเซฟลงมือถือได้เลย หรือกดปุ่มดาวน์โหลดด้านล่าง',
    fontFamily: 'Kanit',
    bgColor1: '#1a0e04',
    bgColor2: '#3d1f00',
    accentColor: '#d4a055',
    showStars: true,
    bgImage: '',
  };
  const [landingConfig, setLandingConfig] = useLocalStorage('studio-booth-landing', DEFAULT_LANDING_CONFIG);
  const DEFAULT_PHOTO_CONFIG = { borderRadius: 0, padding: 5, spacing: 5 };
  const [photoConfig, setPhotoConfig] = useLocalStorage('studio-booth-photo', DEFAULT_PHOTO_CONFIG);

  useEffect(() => {
    const font = landingConfig?.fontFamily || 'Kanit';
    document.body.style.fontFamily = `'${font}', sans-serif`;
    const linkId = `font-${font}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;
      document.head.appendChild(link);
    }
  }, [landingConfig?.fontFamily]);

  const resetSession = () => {
    setPhotos([]);
    setFinalImage(null);
    setFinalVideo(null);
    setView('landing');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans overflow-hidden flex flex-col selection:bg-indigo-500/30">
      {view === 'landing' && <LandingView onStart={() => setView('setup')} onAdmin={() => setView('admin')} config={landingConfig} />}
      
      {view === 'admin' && (
        <AdminView 
          frames={customFrames} setFrames={setCustomFrames}
          stickers={customStickers} setStickers={setCustomStickers}
          landingConfig={landingConfig} setLandingConfig={setLandingConfig}
          cloudConfig={cloudConfig} setCloudConfig={setCloudConfig}
          photoConfig={photoConfig} setPhotoConfig={setPhotoConfig}
          onBack={() => setView('landing')} 
        />
      )}

      {view === 'setup' && (
        <SetupView 
          config={config} setConfig={setConfig} 
          onNext={() => setView('booth')} 
          onBack={() => setView('landing')} 
        />
      )}
      
      {view === 'booth' && (
        <BoothView 
          config={config} 
          onComplete={(captured, video) => { setPhotos(captured); setFinalVideo(video); setView('edit'); }} 
          onCancel={() => setView('setup')}
        />
      )}
      
      {view === 'edit' && (
        <EditorView 
          config={config} photos={photos} 
          availableFrames={customFrames} availableStickers={customStickers}
          brandText={landingConfig?.brandText || 'STUDIO BOOTH'}
          fontFamily={landingConfig?.fontFamily || 'Kanit'}
          photoConfig={photoConfig}
          finalVideo={finalVideo}
          onExport={(imgData, videoBlob) => { setFinalImage(imgData); setFinalVideo(videoBlob); setView('share'); }}
          onRetake={() => setView('booth')}
        />
      )}
      
      {view === 'share' && <ShareView image={finalImage} videoBlob={finalVideo} cloudConfig={cloudConfig} landingConfig={landingConfig} onDone={resetSession} />}

      {view === 'download' && <DownloadView />}
    </div>
  );
}

// --- VIEWS ---

function LandingView({ onStart, onAdmin, config }) {
  return (
    <div 
      className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        background: config.bgImage 
          ? `url(${config.bgImage}) center/cover no-repeat` 
          : `linear-gradient(to bottom, ${config.bgColor1}, ${config.bgColor2})`
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          backgroundColor: config.bgImage ? 'rgba(26, 14, 4, 0.6)' : 'transparent',
          backgroundImage: config.bgImage ? 'none' : `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`
        }} 
      />

      <div className="absolute inset-4 sm:inset-8 border-4 border-dashed rounded-3xl pointer-events-none opacity-40 z-0" style={{ borderColor: config.accentColor }} />

      {config.showStars && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {Array.from({ length: 25 }).map((_, i) => (
            <div 
              key={i}
              className="absolute bg-white rounded-full animate-twinkle"
              style={{
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 3 + 1 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}
      
      <button onClick={onAdmin} className="absolute bottom-4 left-4 p-2 opacity-10 hover:opacity-100 transition-opacity z-20 text-white">
        <Settings className="w-5 h-5" />
      </button>

      <div className="absolute top-1/4 left-10 text-4xl animate-float z-10" style={{ animationDelay: '0s' }}>🌵</div>
      <div className="absolute bottom-1/4 right-10 text-4xl animate-float z-10" style={{ animationDelay: '1s' }}>👢</div>
      <div className="absolute top-1/3 right-20 text-5xl animate-sway z-10" style={{ animationDelay: '0.5s' }}>🤠</div>
      <div className="absolute bottom-1/3 left-20 text-3xl animate-float z-10" style={{ animationDelay: '1.5s' }}>🐎</div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mt-12">
        <h1 
          className="text-5xl md:text-7xl font-extrabold tracking-wider mb-6 font-serif"
          style={{ 
            color: config.accentColor,
            textShadow: '2px 2px 0px #3d1f00, 4px 4px 0px rgba(0,0,0,0.5), 0 0 20px rgba(212,160,85,0.4)'
          }}
        >
          {config.title}
        </h1>
        
        <p className="text-xl md:text-2xl mb-12 max-w-lg leading-relaxed font-medium" style={{ color: '#FFF8DC', textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>
          {config.subtitle}
        </p>
        
        <button 
          onClick={onStart}
          className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full text-xl font-bold transition-all hover:scale-105 active:scale-95 animate-glow-pulse border-2 overflow-hidden"
          style={{ 
            backgroundColor: '#3d1f00',
            color: config.accentColor,
            borderColor: config.accentColor
          }}
        >
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }} />
          <span className="relative z-10 drop-shadow-md">{config.buttonText}</span>
          <ChevronRight className="w-6 h-6 relative z-10 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

// --- NEW: ADMIN DASHBOARD ---
function AdminView({ frames, setFrames, stickers, setStickers, landingConfig, setLandingConfig, cloudConfig, setCloudConfig, photoConfig, setPhotoConfig, onBack }) {
  const [activeTab, setActiveTab] = useState('landing');
  const [newSticker, setNewSticker] = useState('');
  const [newFrameName, setNewFrameName] = useState('');
  const [newFrameColor, setNewFrameColor] = useState('#ff0000');
  const [newFrameTextColor, setNewFrameTextColor] = useState('#ffffff');

  const addSticker = () => {
    if(newSticker.trim()) {
      setStickers([...stickers, newSticker.trim()]);
      setNewSticker('');
    }
  };

  const handleImageUpload = (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => callback(event.target.result);
    reader.readAsDataURL(file);
  };

  const addImageSticker = (dataUrl) => {
    setStickers([...stickers, dataUrl]);
  };

  const addFrame = () => {
    if(newFrameName.trim()) {
      const frame = {
        id: Date.now().toString(),
        name: newFrameName,
        type: 'color',
        bg: newFrameColor,
        text: newFrameTextColor
      };
      setFrames([...frames, frame]);
      setNewFrameName('');
    }
  };

  const addImageFrame = (dataUrl) => {
    const frame = {
      id: Date.now().toString(),
      name: newFrameName || 'Custom Frame',
      type: 'image',
      src: dataUrl,
      bg: 'transparent',
      text: newFrameTextColor
    };
    setFrames([...frames, frame]);
    setNewFrameName('');
  };

  const exportSettings = () => {
    const data = JSON.stringify({ frames, stickers, landingConfig, photoConfig });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'photobooth-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.frames) setFrames(data.frames);
        if (data.stickers) setStickers(data.stickers);
        if (data.landingConfig) setLandingConfig(data.landingConfig);
        if (data.photoConfig) setPhotoConfig(data.photoConfig);
        alert("โหลดการตั้งค่าสำเร็จ!");
      } catch (err) {
        alert("ไฟล์ไม่ถูกต้อง");
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset input
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 p-6 md:p-12 overflow-y-auto">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold">ระบบหลังบ้าน (Admin Dashboard)</h2>
            <p className="text-zinc-400 text-sm mt-1">จัดการเทมเพลตและสติกเกอร์ ข้อมูลจะถูกบันทึกในอุปกรณ์นี้</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <label className="flex-1 md:flex-none cursor-pointer bg-zinc-800 hover:bg-zinc-700 px-4 py-3 md:py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors">
            <Download className="w-4 h-4 rotate-180" /> นำเข้า (Import)
            <input type="file" accept=".json" className="hidden" onChange={importSettings} />
          </label>
          <button onClick={exportSettings} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 px-4 py-3 md:py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> บันทึกการตั้งค่า (Export)
          </button>
        </div>
      </header>

      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 max-w-6xl mx-auto w-full border-b border-zinc-800">
        <button onClick={() => setActiveTab('landing')} className={`flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'landing' ? 'bg-zinc-800 text-amber-400 border-b-2 border-amber-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}><Paintbrush className="w-4 h-4"/> หน้าแรก</button>
        <button onClick={() => setActiveTab('photo')} className={`flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'photo' ? 'bg-zinc-800 text-blue-400 border-b-2 border-blue-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}><LayoutTemplate className="w-4 h-4"/> ตกแต่งรูปภาพ</button>
        <button onClick={() => setActiveTab('frames')} className={`flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'frames' ? 'bg-zinc-800 text-fuchsia-400 border-b-2 border-fuchsia-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}><Square className="w-4 h-4"/> กรอบรูป</button>
        <button onClick={() => setActiveTab('stickers')} className={`flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'stickers' ? 'bg-zinc-800 text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}><Smile className="w-4 h-4"/> สติกเกอร์</button>
        <button onClick={() => setActiveTab('cloud')} className={`flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'cloud' ? 'bg-zinc-800 text-zinc-100 border-b-2 border-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}><MonitorSmartphone className="w-4 h-4"/> ระบบแชร์ (Cloud)</button>
      </div>

      <div className="max-w-6xl mx-auto w-full">
        {activeTab === 'landing' && (
          <div className="grid md:grid-cols-2 gap-12">
            <div className="md:col-span-2 space-y-6 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
              <h3 className="text-xl font-semibold flex items-center gap-2"><Paintbrush className="text-amber-400"/> ตกแต่งหน้าแรก (Landing Page Design)</h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">ชื่อหน้าแรก (Title)</label>
                    <input type="text" value={landingConfig.title} onChange={e => setLandingConfig({...landingConfig, title: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">คำอธิบาย (Subtitle)</label>
                    <input type="text" value={landingConfig.subtitle} onChange={e => setLandingConfig({...landingConfig, subtitle: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">ข้อความปุ่ม (Button Text)</label>
                    <input type="text" value={landingConfig.buttonText} onChange={e => setLandingConfig({...landingConfig, buttonText: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">ข้อความลายน้ำ (Brand Text)</label>
                    <input type="text" value={landingConfig.brandText || 'STUDIO BOOTH'} onChange={e => setLandingConfig({...landingConfig, brandText: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">ฟอนต์ตัวอักษร (Font Family)</label>
                    <select value={landingConfig.fontFamily || 'Kanit'} onChange={e => setLandingConfig({...landingConfig, fontFamily: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500">
                      <option value="Kanit">Kanit (มาตรฐาน)</option>
                      <option value="Prompt">Prompt (โมเดิร์น)</option>
                      <option value="Mali">Mali (ลายมือ)</option>
                      <option value="Chonburi">Chonburi (คลาสสิก)</option>
                      <option value="Sarabun">Sarabun (ทางการ)</option>
                    </select>
                  </div>
                  <div className="pt-4 border-t border-zinc-800">
                    <label className="text-xs text-zinc-400 mb-1 block">หัวข้อหน้าสแกนรูป (Share Title)</label>
                    <input type="text" value={landingConfig.shareTitle || 'รูปภาพของคุณพร้อมแล้ว!'} onChange={e => setLandingConfig({...landingConfig, shareTitle: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500 mb-4" />
                    
                    <label className="text-xs text-zinc-400 mb-1 block">คำอธิบายหน้าสแกนรูป (Share Subtitle)</label>
                    <input type="text" value={landingConfig.shareSubtitle || 'สแกนคิวอาร์โค้ดเพื่อเซฟลงมือถือได้เลย หรือกดปุ่มดาวน์โหลดด้านล่าง'} onChange={e => setLandingConfig({...landingConfig, shareSubtitle: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">สีพื้นหลัง 1</label>
                      <input type="color" value={landingConfig.bgColor1} onChange={e => setLandingConfig({...landingConfig, bgColor1: e.target.value})} className="w-full h-10 rounded cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">สีพื้นหลัง 2</label>
                      <input type="color" value={landingConfig.bgColor2} onChange={e => setLandingConfig({...landingConfig, bgColor2: e.target.value})} className="w-full h-10 rounded cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">สีเน้น (Accent)</label>
                      <input type="color" value={landingConfig.accentColor} onChange={e => setLandingConfig({...landingConfig, accentColor: e.target.value})} className="w-full h-10 rounded cursor-pointer" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="showStars" checked={landingConfig.showStars} onChange={e => setLandingConfig({...landingConfig, showStars: e.target.checked})} className="w-4 h-4 accent-amber-500" />
                    <label htmlFor="showStars" className="text-sm text-zinc-300">แสดงดาว (Show Stars)</label>
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-500/50 cursor-pointer rounded-xl px-4 py-2 text-sm font-bold transition-colors flex items-center justify-center gap-2">
                      <ImagePlus className="w-4 h-4"/> อัปโหลดพื้นหลัง
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (data) => setLandingConfig({...landingConfig, bgImage: data}))} />
                    </label>
                    {landingConfig.bgImage && (
                      <button onClick={() => setLandingConfig({...landingConfig, bgImage: ''})} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-xl text-sm font-bold hover:bg-red-500/40 transition-colors">
                        ลบพื้นหลัง
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Live Preview */}
                <div className="flex flex-col items-center justify-center p-4 bg-zinc-800 rounded-xl border border-zinc-700">
                  <span className="text-xs text-zinc-400 mb-2">Live Preview</span>
                  <div 
                    className="w-[200px] h-[120px] rounded-lg relative overflow-hidden flex flex-col items-center justify-center border-2 border-dashed"
                    style={{
                      borderColor: landingConfig.accentColor,
                      background: landingConfig.bgImage 
                        ? `url(${landingConfig.bgImage}) center/cover no-repeat` 
                        : `linear-gradient(to bottom, ${landingConfig.bgColor1}, ${landingConfig.bgColor2})`
                    }}
                  >
                    {landingConfig.bgImage && <div className="absolute inset-0 bg-black/40" />}
                    <div className="relative z-10 text-center scale-50 origin-center w-[350px]">
                      <h4 className="font-serif font-bold text-xl mb-1" style={{ color: landingConfig.accentColor }}>{landingConfig.title}</h4>
                      <div 
                        className="mx-auto px-4 py-2 rounded-full text-sm font-bold border-2 inline-block"
                        style={{ 
                          backgroundColor: '#3d1f00',
                          color: landingConfig.accentColor,
                          borderColor: landingConfig.accentColor
                        }}
                      >
                        {landingConfig.buttonText}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'photo' && (
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
               <h3 className="text-xl font-semibold flex items-center gap-2"><LayoutTemplate className="text-blue-400"/> ตกแต่งเลย์เอาต์รูปภาพ</h3>
               <div className="space-y-6">
                 <div>
                   <label className="flex justify-between text-sm font-bold text-zinc-300 mb-2">
                     <span>ความมนของมุมรูป (Border Radius)</span>
                     <span className="text-blue-400">{photoConfig?.borderRadius || 0}%</span>
                   </label>
                   <input type="range" min="0" max="50" value={photoConfig?.borderRadius || 0} onChange={e => setPhotoConfig({...photoConfig, borderRadius: parseInt(e.target.value)})} className="w-full accent-blue-500" />
                 </div>
                 <div>
                   <label className="flex justify-between text-sm font-bold text-zinc-300 mb-2">
                     <span>ระยะห่างระหว่างรูป (Spacing)</span>
                     <span className="text-blue-400">{photoConfig?.spacing || 5}</span>
                   </label>
                   <input type="range" min="0" max="20" value={photoConfig?.spacing || 0} onChange={e => setPhotoConfig({...photoConfig, spacing: parseInt(e.target.value)})} className="w-full accent-blue-500" />
                 </div>
                 <div>
                   <label className="flex justify-between text-sm font-bold text-zinc-300 mb-2">
                     <span>ขอบนอกสุด (Padding)</span>
                     <span className="text-blue-400">{photoConfig?.padding || 5}</span>
                   </label>
                   <input type="range" min="0" max="20" value={photoConfig?.padding || 0} onChange={e => setPhotoConfig({...photoConfig, padding: parseInt(e.target.value)})} className="w-full accent-blue-500" />
                 </div>
               </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-4 bg-zinc-800 rounded-xl border border-zinc-700">
              <span className="text-xs text-zinc-400 mb-2">Live Preview (เลย์เอาต์ 1x3)</span>
              <div className="w-[160px] h-[480px] bg-white relative flex flex-col scale-[0.6] origin-top shadow-xl" style={{ padding: `${photoConfig?.padding ?? 5}%` }}>
                <div className="flex-1 bg-zinc-300 overflow-hidden relative" style={{ borderRadius: `${photoConfig?.borderRadius || 0}%`, marginBottom: `${photoConfig?.spacing ?? 5}%` }}><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" className="w-full h-full object-cover absolute inset-0" /></div>
                <div className="flex-1 bg-zinc-300 overflow-hidden relative" style={{ borderRadius: `${photoConfig?.borderRadius || 0}%`, marginBottom: `${photoConfig?.spacing ?? 5}%` }}><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" className="w-full h-full object-cover absolute inset-0" /></div>
                <div className="flex-1 bg-zinc-300 overflow-hidden relative" style={{ borderRadius: `${photoConfig?.borderRadius || 0}%` }}><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" className="w-full h-full object-cover absolute inset-0" /></div>
                <div className="h-[15%] w-full flex items-center justify-center shrink-0"><span className="text-black font-bold text-[10px] tracking-wider">{landingConfig?.brandText || 'STUDIO BOOTH'}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'frames' && (
          <div className="space-y-6 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
            <h3 className="text-xl font-semibold flex items-center gap-2"><Settings className="text-fuchsia-400"/> จัดการกรอบรูป (สีพื้นฐาน)</h3>
            
            <div className="space-y-4 bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
              <input 
                type="text" value={newFrameName} onChange={e => setNewFrameName(e.target.value)}
                placeholder="ชื่อกรอบรูป เช่น พาสเทลเขียว" 
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500"
              />
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-zinc-400 mb-1 block">สีพื้นหลัง</label>
                  <input type="color" value={newFrameColor} onChange={e => setNewFrameColor(e.target.value)} className="w-full h-12 rounded cursor-pointer" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-zinc-400 mb-1 block">สีตัวอักษร</label>
                  <input type="color" value={newFrameTextColor} onChange={e => setNewFrameTextColor(e.target.value)} className="w-full h-12 rounded cursor-pointer" />
                </div>
              </div>
              <button onClick={addFrame} className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                <Plus className="w-5 h-5"/> สร้างกรอบสีใหม่
              </button>
              <div className="relative mt-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700"></div></div>
                <div className="relative flex justify-center"><span className="px-2 bg-zinc-800/50 text-xs text-zinc-400 uppercase">หรือ</span></div>
              </div>
              <label className="w-full bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-400 border border-fuchsia-500/50 py-3 rounded-xl cursor-pointer font-bold transition-colors flex items-center justify-center gap-2 mt-2">
                <ImagePlus className="w-5 h-5"/> อัปโหลดกรอบรูป (Overlay PNG)
                <input type="file" accept="image/png" className="hidden" onChange={(e) => handleImageUpload(e, addImageFrame)} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              {frames.map((fr, i) => (
                <div key={i} className="flex items-center justify-between bg-zinc-800 p-3 rounded-xl border border-zinc-700">
                  <div className="flex items-center gap-3 w-3/4">
                    <div className="w-8 h-8 rounded-md shadow-inner border border-white/10 shrink-0 overflow-hidden bg-white flex items-center justify-center" style={{ background: fr.type === 'color' ? fr.bg : 'transparent' }}>
                      {fr.type === 'image' && <img src={fr.src} className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-sm font-medium truncate">{fr.name}</span>
                  </div>
                  {i >= 4 && ( // Don't allow deleting default frames easily
                    <button onClick={() => setFrames(frames.filter(f => f.id !== fr.id))} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'stickers' && (
          <div className="space-y-6 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
            <h3 className="text-xl font-semibold flex items-center gap-2"><Smile className="text-indigo-400"/> จัดการสติกเกอร์</h3>
            
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input 
                  type="text" value={newSticker} onChange={e => setNewSticker(e.target.value)}
                  placeholder="ใส่อีโมจิ หรือข้อความ" 
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                />
                <button onClick={addSticker} className="bg-indigo-600 hover:bg-indigo-700 px-6 rounded-xl font-bold transition-colors">เพิ่ม</button>
              </div>
              <div className="relative mt-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                <div className="relative flex justify-center"><span className="px-2 bg-zinc-900/50 text-xs text-zinc-500 uppercase">หรือ</span></div>
              </div>
              <label className="w-full bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/50 cursor-pointer rounded-xl px-4 py-3 text-center font-bold transition-colors flex items-center justify-center gap-2">
                <ImagePlus className="w-5 h-5"/> อัปโหลดรูปภาพสติกเกอร์ (PNG)
                <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleImageUpload(e, addImageSticker)} />
              </label>
            </div>

            <div className="grid grid-cols-5 gap-3 mt-4">
              {stickers.map((st, i) => (
                <div key={i} className="relative aspect-square bg-zinc-800 rounded-xl flex items-center justify-center text-3xl group border border-zinc-700 overflow-hidden">
                  {st.startsWith('data:image') ? <img src={st} className="w-full h-full object-contain p-2" /> : st}
                  <button 
                    onClick={() => setStickers(stickers.filter((_, idx) => idx !== i))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'cloud' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
             <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-amber-500" /> Cloudinary Settings (สำหรับ iPad / QR Code)</h3>
             <p className="text-zinc-400 text-sm mb-4">สมัครฟรีที่ cloudinary.com แล้วนำค่า 2 ตัวนี้มาใส่ เพื่อให้ QR Code โหลดรูปลงมือถือได้</p>
             <div className="flex flex-col gap-4">
                <div>
                   <label className="block text-sm font-bold text-zinc-400 mb-1">Cloud Name</label>
                   <input type="text" value={cloudConfig.cloudName} onChange={e => setCloudConfig({...cloudConfig, cloudName: e.target.value})} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-2 text-white" placeholder="e.g. dxyzxyz" />
                </div>
                <div>
                   <label className="block text-sm font-bold text-zinc-400 mb-1">Upload Preset (Unsigned)</label>
                   <input type="text" value={cloudConfig.uploadPreset} onChange={e => setCloudConfig({...cloudConfig, uploadPreset: e.target.value})} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-2 text-white" placeholder="e.g. my_unsigned_preset" />
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SetupView({ config, setConfig, onNext, onBack }) {
  return (
    <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between py-4 mb-8 border-b border-zinc-800">
        <button onClick={onBack} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold">ตั้งค่าก่อนถ่าย</h2>
        <div className="w-10" />
      </header>

      <div className="grid md:grid-cols-2 gap-12 flex-1">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-medium border-b border-zinc-800 pb-2 text-amber-500">
            <Layers className="w-5 h-5" />
            <h3 className="text-zinc-50">เลือกรูปแบบกรอบ (Layout)</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.values(LAYOUTS).map(layout => (
              <button
                key={layout.id}
                onClick={() => setConfig({ ...config, layout })}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
                  config.layout.id === layout.id 
                    ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className={`w-12 h-16 bg-zinc-800 rounded-sm mb-4 border border-zinc-700 p-1 flex flex-col gap-1 ${
                  layout.id === 'grid' ? 'grid grid-cols-2 flex-row' : ''
                }`}>
                  {Array.from({ length: layout.shots }).map((_, i) => (
                    <div key={i} className="flex-1 bg-zinc-600 rounded-sm w-full h-full" />
                  ))}
                </div>
                <span className="font-medium">{layout.name}</span>
                <span className="text-xs text-zinc-500 mt-1">ถ่าย {layout.shots} ช็อต</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-medium border-b border-zinc-800 pb-2 text-orange-400">
            <Wand2 className="w-5 h-5" />
            <h3 className="text-zinc-50">เลือกฟิลเตอร์</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {FILTERS.map(filter => (
              <button
                key={filter.id}
                onClick={() => setConfig({ ...config, filter })}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  config.filter.id === filter.id 
                    ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.2)]' 
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div 
                  className="w-12 h-12 rounded-full bg-[url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80')] bg-cover bg-center ring-2 ring-zinc-800"
                  style={{ filter: filter.css }}
                />
                <span className="text-sm font-medium">{filter.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-2 text-lg font-medium border-b border-zinc-800 pb-2 text-blue-400">
          <span className="text-xl">⏱️</span>
          <h3 className="text-zinc-50">เวลานับถอยหลัง (Timer)</h3>
        </div>
        <div className="flex gap-4">
          {[3, 5, 10].map(t => (
            <button
              key={t}
              onClick={() => setConfig({ ...config, timer: t })}
              className={`flex-1 py-4 rounded-xl border-2 transition-all font-bold ${
                config.timer === t 
                  ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)] text-blue-400' 
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              {t} วินาที
            </button>
          ))}
        </div>
      </div>

      <div className="py-8 flex justify-end">
        <button 
          onClick={onNext}
          className="px-10 py-5 bg-amber-700 hover:bg-amber-600 text-white rounded-full text-xl font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-[0_0_30px_rgba(217,119,6,0.4)]"
        >
          <Camera className="w-6 h-6" />
          เข้าตู้ถ่ายรูป
        </button>
      </div>
    </div>
  );
}

function BoothView({ config, onComplete, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recordCanvasRef = useRef(null);
  const recorderRef = useRef(null);
  const requestRef = useRef(null);
  const chunksRef = useRef([]);
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState('idle'); 
  const [count, setCount] = useState(3);
  const [shotIndex, setShotIndex] = useState(0);
  const [captured, setCaptured] = useState([]);

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้องในเบราว์เซอร์");
      }
    }
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = () => {
    if (!videoRef.current || !recordCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = recordCanvasRef.current;
    // Safe fallback dimensions if video is not fully initialized
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    
    const render = () => {
      if (!videoRef.current) return;
      if (config.filter.css) ctx.filter = config.filter.css;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      requestRef.current = requestAnimationFrame(render);
    };
    requestRef.current = requestAnimationFrame(render);
    
    try {
      chunksRef.current = [];
      const stream = canvas.captureStream(30);
      let options = { mimeType: 'video/webm' };
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        options = { mimeType: 'video/webm;codecs=vp9' };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
      }
      recorderRef.current = new MediaRecorder(stream, options);
      recorderRef.current.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current.start(500); // Record in 500ms chunks to ensure data availability
    } catch(e) {
      console.error("Recording not supported", e);
    }
  };

  const stopRecording = () => {
    return new Promise(resolve => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: recorderRef.current.mimeType });
          resolve(blob);
        };
        recorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
  };

  const startSequence = async () => {
    startRecording();
    let currentCaptured = [];
    
    for (let currentShot = 0; currentShot < config.layout.shots; currentShot++) {
      setShotIndex(currentShot);
      setStatus('countdown');
      for (let i = config.timer; i > 0; i--) {
        setCount(i);
        await wait(1000);
      }
      setStatus('flashing');
      await wait(150);
      
      // Capture
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (config.filter.css) ctx.filter = config.filter.css;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      currentCaptured.push(imgData);
      setCaptured([...currentCaptured]);
      
      if (currentShot < config.layout.shots - 1) {
         setStatus('idle'); // Just to show idle UI briefly
         await wait(1000); // 1 second break between shots
      }
    }
    
    setStatus('done');
    const finalBlob = await stopRecording();
    setTimeout(() => onComplete([...currentCaptured], finalBlob), 800);
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 p-2 sm:p-6 relative">
      {/* Physical Machine Frame */}
      <div className="flex-1 bg-black rounded-[2rem] border-[12px] border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)_inset,0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col">
        
        {/* Screen Glare */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-30" />
        
        {/* Top Camera Hole indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-black border-2 border-zinc-700 rounded-full z-40 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-blue-500/50 rounded-full" />
        </div>

        <header className="absolute top-6 left-6 right-6 z-40 flex justify-between items-center">
          <button onClick={onCancel} className="p-3 bg-black/60 hover:bg-black/90 backdrop-blur-md rounded-full text-white transition-all hover:scale-110 active:scale-90 border border-white/10 shadow-xl">
            <X className="w-5 h-5" />
          </button>
          <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full text-sm font-bold border border-white/10 shadow-xl text-white">
            ช็อตที่ {shotIndex + 1} / {config.layout.shots}
          </div>
        </header>

        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-900">
          <video 
            ref={videoRef} autoPlay playsInline muted 
            className="w-full h-full object-cover -scale-x-100"
            style={{ filter: config.filter.css }}
          />
        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={recordCanvasRef} className="hidden" />

        {/* Camera UI Overlay (Corners) */}
        <div className="absolute inset-8 border-2 border-white/10 rounded-2xl pointer-events-none z-20">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/60 rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/60 rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/60 rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/60 rounded-br-xl" />
        </div>

        {status === 'idle' && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-50">
            <button 
              onClick={startSequence}
              className="w-24 h-24 rounded-full border-4 border-red-500 bg-red-600/30 p-2 flex items-center justify-center hover:bg-red-600/50 hover:scale-110 hover:shadow-[0_0_40px_rgba(239,68,68,0.8)] active:scale-90 transition-all duration-300 group shadow-[0_0_30px_rgba(239,68,68,0.4)]"
            >
              <div className="w-full h-full bg-red-500 rounded-full group-hover:bg-red-400 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.8)] transition-all duration-300 shadow-inner shadow-black/30" />
            </button>
            <span className="text-white text-sm font-bold tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,1)] bg-black/60 px-5 py-2 rounded-full backdrop-blur-md border border-white/10 animate-pulse">
              📸 แตะเพื่อเริ่มถ่ายรูป
            </span>
          </div>
        )}

        {status === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-[200px] font-black text-white drop-shadow-[0_0_40px_rgba(0,0,0,0.8)] animate-pulse">
              {count}
            </span>
          </div>
        )}

        {status === 'flashing' && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none opacity-100 animate-[pulse_0.15s_ease-out]" />
        )}
      </div>

      </div>

      {/* Captured Preview Strip at Bottom */}
      <div className="h-32 mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex gap-3 overflow-x-auto items-center justify-center">
        {Array.from({ length: config.layout.shots }).map((_, i) => (
          <div 
            key={i} 
            className={`h-full aspect-[3/4] rounded-lg border-2 overflow-hidden bg-zinc-900 transition-all duration-300 ${
              i === shotIndex ? 'border-amber-500 scale-105 shadow-lg shadow-amber-500/20' : 'border-zinc-800'
            }`}
          >
            {captured[i] ? (
              <img src={captured[i]} alt={`Shot ${i+1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- DRAGGABLE STICKER COMPONENT (PERCENTAGE BASED) ---
// Changed to use percentage (x,y) so it perfectly scales between UI and Virtual Canvas
function DraggableSticker({ sticker, containerRef, onUpdate, onDelete, isSelected, onSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ mouseX: 0, mouseY: 0, stickerX: 0, stickerY: 0 });

  const handlePointerDown = (e) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    setStartPos({
      mouseX: clientX,
      mouseY: clientY,
      stickerX: sticker.x,
      stickerY: sticker.y
    });
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - startPos.mouseX;
    const deltaY = clientY - startPos.mouseY;

    // Convert pixel delta to percentage based on container size
    const rect = containerRef.current.getBoundingClientRect();
    const deltaPercentX = (deltaX / rect.width) * 100;
    const deltaPercentY = (deltaY / rect.height) * 100;

    onUpdate(sticker.id, {
      x: startPos.stickerX + deltaPercentX,
      y: startPos.stickerY + deltaPercentY
    });
  }, [isDragging, startPos, onUpdate, sticker.id, containerRef]);

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove, { passive: false });
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <div
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      className={`absolute cursor-move select-none inline-block ${isSelected ? 'ring-2 ring-indigo-500 ring-dashed rounded-md bg-white/20 backdrop-blur-sm' : ''}`}
      style={{
        left: `${sticker.x}%`,
        top: `${sticker.y}%`,
        // Translate -50% to center the sticker on the x,y coordinate
        transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
        transformOrigin: 'center center',
        zIndex: isSelected ? 50 : 10,
        fontSize: '4rem', // Base UI size
        lineHeight: 1,
        touchAction: 'none'
      }}
    >
      {sticker.content.startsWith('data:image') ? (
        <img src={sticker.content} className="w-full h-full object-contain pointer-events-none" draggable={false} style={{ width: '1em', height: '1em' }} />
      ) : (
        sticker.content
      )}
      
      {isSelected && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(sticker.id); }}
          onTouchStart={(e) => { e.stopPropagation(); onDelete(sticker.id); }}
          className="absolute -top-4 -right-4 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-xl hover:bg-red-600 hover:scale-110 z-50 transition-transform"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function EditorView({ config, photos, availableFrames, availableStickers, brandText, fontFamily, finalVideo, onExport, onRetake }) {
  const [stickers, setStickers] = useState([]);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [activeTab, setActiveTab] = useState('stickers'); 
  const [selectedFrame, setSelectedFrame] = useState(availableFrames[0] || DEFAULT_FRAMES[0]);
  const [isExporting, setIsExporting] = useState(false);
  
  const layoutRef = useRef(null); // The actual frame container

  const addSticker = (content) => {
    const newSticker = {
      id: Date.now().toString(),
      content,
      x: 50, // Center %
      y: 50, // Center %
      scale: 1,
      rotation: (Math.random() - 0.5) * 20
    };
    setStickers([...stickers, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  const updateSticker = (id, newProps) => setStickers(prev => prev.map(s => s.id === id ? { ...s, ...newProps } : s));
  const deleteSticker = (id) => {
    setStickers(prev => prev.filter(s => s.id !== id));
    setSelectedStickerId(null);
  };

  // --- NEW VIRTUAL CANVAS EXPORT LOGIC ---
  // This solves the bug where images distort based on device screen size.
  // We draw to a fixed-size mathematical canvas off-screen.
  const handleExport = async () => {
    setIsExporting(true);
    setSelectedStickerId(null); 
    await wait(100);

    try {
      const vW = config.layout.vW;
      const vH = config.layout.vH;
      
      const canvas = document.createElement('canvas');
      canvas.width = vW;
      canvas.height = vH;
      const ctx = canvas.getContext('2d');

      // 1. Draw Frame Background
      if (selectedFrame.type === 'color') {
        ctx.fillStyle = selectedFrame.bg;
        ctx.fillRect(0, 0, vW, vH);
      } else if (selectedFrame.type === 'gradient' || selectedFrame.type === 'pattern') {
        // Simple fallback for gradients/patterns on canvas
        ctx.fillStyle = selectedFrame.baseColor || selectedFrame.colors?.[0] || '#ffffff';
        ctx.fillRect(0, 0, vW, vH);
        
        if (selectedFrame.id === 'checkered') {
          ctx.fillStyle = selectedFrame.patternColor;
          const s = 100; // Checker size relative to high-res canvas
          for(let y=0; y<vH; y+=s) {
            for(let x=0; x<vW; x+=s) {
              if (Math.floor(x/s + y/s) % 2 === 0) ctx.fillRect(x, y, s, s);
            }
          }
        }
      } else if (selectedFrame.type === 'image') {
        // White background behind photos for custom image frames
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, vW, vH);
      }

      // 2. Calculate Photo Layout Mathematics
      const padding = vW * ((photoConfig?.padding ?? 5) / 100); 
      const bottomArea = vH * 0.1; // 10% bottom area for branding
      const contentW = vW - (padding * 2);
      const contentH = vH - padding - bottomArea;
      
      const cols = config.layout.cols;
      const rows = Math.ceil(config.layout.shots / cols);
      const spacing = vW * ((photoConfig?.spacing ?? 5) / 100);

      const slotW = (contentW - (spacing * (cols - 1))) / cols;
      const slotH = (contentH - (spacing * (rows - 1))) / rows;

      // 3. Load & Draw Photos
      const loadPromises = photos.map((photoSrc, i) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            
            const x = padding + (col * (slotW + spacing));
            const y = padding + (row * (slotH + spacing));
            
            // Object-fit: cover simulation
            const imgAspect = img.width / img.height;
            const slotAspect = slotW / slotH;
            let drawW, drawH, drawX, drawY;
            
            if (imgAspect > slotAspect) {
              drawH = img.height;
              drawW = img.height * slotAspect;
              drawX = (img.width - drawW) / 2;
              drawY = 0;
            } else {
              drawW = img.width;
              drawH = img.width / slotAspect;
              drawX = 0;
              drawY = (img.height - drawH) / 2;
            }
            
            const radius = slotW * ((photoConfig?.borderRadius ?? 0) / 100);
            
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x, y, slotW, slotH, radius);
            ctx.clip();
            
            // Draw photo background (gray)
            ctx.fillStyle = '#e4e4e7';
            ctx.fillRect(x, y, slotW, slotH);
            
            // Draw Image
            ctx.drawImage(img, drawX, drawY, drawW, drawH, x, y, slotW, slotH);
            
            ctx.restore();
            resolve();
          };
          img.src = photoSrc;
        });
      });

      await Promise.all(loadPromises);

      // 3.5 Draw Custom Frame Overlay
      if (selectedFrame.type === 'image') {
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, vW, vH);
            resolve();
          };
          img.src = selectedFrame.src;
        });
      }

      // 4. Draw Branding and Date (Hide if using custom image frame)
      if (selectedFrame.type !== 'image') {
        ctx.fillStyle = selectedFrame.text;
        
        // Brand Text
        ctx.font = `bold ${vW * 0.04}px '${fontFamily}', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(brandText, vW / 2, vH - (bottomArea / 2));

        // Date (Top-left)
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        ctx.font = `bold ${vW * 0.02}px '${fontFamily}', sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(today, vW * 0.04, vH * 0.02);
      }

      // 5. Draw Stickers (Mapping % to absolute canvas pixels)
      for (const s of stickers) {
        ctx.save();
        const absX = (s.x / 100) * vW;
        const absY = (s.y / 100) * vH;
        
        ctx.translate(absX, absY); 
        ctx.rotate((s.rotation * Math.PI) / 180);
        
        const baseFontSize = vW * 0.12; 
        const size = baseFontSize * s.scale;
        
        if (s.content.startsWith('data:image')) {
          await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, -size/2, -size/2, size, size);
              resolve();
            };
            img.src = s.content;
          });
        } else {
          ctx.font = `${size}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(s.content, 0, 0);
        }
        ctx.restore();
      }

      const finalDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      onExport(finalDataUrl, finalVideo);
    } catch (err) {
      console.error("Export failed:", err);
      alert("เกิดข้อผิดพลาดในการสร้างรูปภาพ กรุณาลองใหม่");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-zinc-950 relative" onClick={() => setSelectedStickerId(null)}>
      {/* Top/Left Toolbar */}
      <div className="w-full md:w-20 bg-zinc-900 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-row md:flex-col items-center py-4 px-2 gap-6 z-20 shrink-0 shadow-xl">
        <button onClick={onRetake} className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors" title="ถ่ายใหม่">
          <RefreshCcw className="w-6 h-6" />
        </button>
        <div className="w-px h-8 bg-zinc-800 hidden md:block" />
        <div className="h-px w-8 bg-zinc-800 block md:hidden" />
        
        <button 
          onClick={(e) => { e.stopPropagation(); setActiveTab('stickers'); }} 
          className={`p-3 rounded-xl transition-colors ${activeTab === 'stickers' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
          title="สติกเกอร์"
        >
          <Smile className="w-6 h-6" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setActiveTab('frame'); }}
          className={`p-3 rounded-xl transition-colors ${activeTab === 'frame' ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
          title="กรอบรูป"
        >
          <Settings className="w-6 h-6" />
        </button>

        <div className="flex-1" />
        
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="p-3 bg-white text-zinc-950 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          title="ส่งออก & แชร์"
        >
          {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Share2 className="w-6 h-6" />}
        </button>
      </div>

      {/* Main Canvas Area (UI Display) */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-zinc-950 relative">
        <div className="relative max-w-full max-h-full flex items-center justify-center shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-visible">
          
          {/* The Layout Container (Responsive UI Representation) 
            It uses the aspect ratio to maintain shape, and relative positioning for stickers.
          */}
          <div 
            ref={layoutRef}
            className={`relative overflow-hidden ${config.layout.aspect} flex flex-col transition-colors duration-300 ring-1 ring-white/10`}
              style={{ 
                background: selectedFrame.type === 'image' ? '#ffffff' : selectedFrame.bg,
                height: 'calc(100vh - 220px)',
                maxHeight: '850px',
                minHeight: '400px',
                padding: `${photoConfig?.padding ?? 5}%`
              }}
          >
            {/* Top-left date */}
            {selectedFrame.type !== 'image' && (
              <div 
                className="absolute top-[2%] left-[4%] z-20 font-bold opacity-80 tracking-widest pointer-events-none"
                style={{ color: selectedFrame.text, fontSize: 'clamp(8px, 1.2vh, 16px)', fontFamily: `'${fontFamily}', sans-serif` }}
              >
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            )}

            {/* Photos Grid */}
            <div 
              className={`flex-1 grid ${config.layout.cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
              style={{ gap: `${photoConfig?.spacing ?? 5}%` }}
            >
              {photos.map((photo, i) => (
                <div 
                  key={i} 
                  className="bg-zinc-200 overflow-hidden relative shadow-inner w-full h-full"
                  style={{ borderRadius: `${photoConfig?.borderRadius || 0}%` }}
                >
                  <img src={photo} alt="" className="w-full h-full object-cover absolute inset-0" />
                </div>
              ))}
            </div>
            
            {/* Frame Overlay Image */}
            {selectedFrame.type === 'image' && (
              <img src={selectedFrame.src} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10" />
            )}

            {/* Branding */}
            {selectedFrame.type !== 'image' && (
              <div className="h-[10%] min-h-[40px] flex items-center justify-center shrink-0 z-0">
                <span className="font-bold text-[clamp(12px,2vh,24px)] tracking-widest opacity-90" style={{ color: selectedFrame.text, fontFamily: `'${fontFamily}', sans-serif` }}>
                  {brandText}
                </span>
              </div>
            )}

            {/* Draggable Stickers Overlay (inside the layout ref so % positioning works) */}
            <div className="absolute inset-0 pointer-events-none" style={{ clipPath: 'inset(0 0 0 0)' }}>
              <div className="relative w-full h-full pointer-events-auto">
                {stickers.map(sticker => (
                  <DraggableSticker
                    key={sticker.id}
                    sticker={sticker}
                    containerRef={layoutRef} // Pass container to calc % movement
                    isSelected={selectedStickerId === sticker.id}
                    onSelect={() => setSelectedStickerId(sticker.id)}
                    onUpdate={updateSticker}
                    onDelete={deleteSticker}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right/Bottom Panel (Settings) */}
      <div 
        className="w-full md:w-80 bg-zinc-900 border-t md:border-t-0 md:border-l border-zinc-800 p-6 flex flex-col gap-6 z-20 shrink-0 shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {activeTab === 'stickers' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">ตกแต่งสติกเกอร์</h3>
            <div className="grid grid-cols-4 gap-3">
              {availableStickers.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => addSticker(emoji)}
                  className="aspect-square bg-zinc-800/50 hover:bg-zinc-700 rounded-xl flex items-center justify-center text-3xl transition-transform hover:scale-110 active:scale-95 border border-zinc-700 shadow-sm overflow-hidden"
                >
                  {emoji.startsWith('data:image') ? <img src={emoji} className="w-full h-full object-contain p-2 pointer-events-none" /> : emoji}
                </button>
              ))}
            </div>
            
            {selectedStickerId ? (
              <div className="mt-8 p-5 bg-zinc-800/80 rounded-2xl border border-zinc-700 shadow-inner">
                <h4 className="text-xs font-bold text-indigo-400 mb-5 uppercase tracking-wider">ปรับแต่งสติกเกอร์</h4>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs text-zinc-300 mb-2 flex justify-between">
                      <span>ขนาด (Size)</span>
                      <span>{Math.round(stickers.find(s => s.id === selectedStickerId)?.scale * 100)}%</span>
                    </label>
                    <input 
                      type="range" min="0.5" max="3" step="0.1"
                      className="w-full accent-indigo-500"
                      value={stickers.find(s => s.id === selectedStickerId)?.scale || 1}
                      onChange={(e) => updateSticker(selectedStickerId, { scale: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-300 mb-2 flex justify-between">
                      <span>หมุน (Rotate)</span>
                      <span>{stickers.find(s => s.id === selectedStickerId)?.rotation}°</span>
                    </label>
                    <input 
                      type="range" min="-180" max="180"
                      className="w-full accent-indigo-500"
                      value={stickers.find(s => s.id === selectedStickerId)?.rotation || 0}
                      onChange={(e) => updateSticker(selectedStickerId, { rotation: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 p-6 text-center border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-sm">
                แตะที่สติกเกอร์บนรูป <br/> เพื่อปรับขนาดและหมุน
              </div>
            )}
          </div>
        )}

        {activeTab === 'frame' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">รูปแบบกรอบ (Frames)</h3>
            <div className="grid grid-cols-2 gap-3">
              {availableFrames.map(frame => (
                <button
                  key={frame.id}
                  onClick={() => setSelectedFrame(frame)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    selectedFrame.id === frame.id 
                      ? 'border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(217,70,239,0.2)]' 
                      : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-600'
                  }`}
                >
                  <div 
                    className="w-full h-16 rounded-lg shadow-inner border border-zinc-700/50 overflow-hidden flex items-center justify-center bg-white"
                    style={{ background: frame.type === 'color' ? frame.bg : 'transparent' }}
                  >
                    {frame.type === 'image' && <img src={frame.src} className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-xs font-medium text-zinc-300 truncate w-full text-center">{frame.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShareView({ image, videoBlob, cloudConfig, landingConfig, onDone }) {
  const [isUploading, setIsUploading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [printableImage, setPrintableImage] = useState(null);

  const downloadVideo = () => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `photobooth-timelapse-${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!image) return;
    
    if (!cloudConfig?.cloudName || !cloudConfig?.uploadPreset) {
      setErrorMsg("⚠️ ยังไม่ได้ตั้งค่า Cloudinary ในเมนู Admin ทำให้ QR Code สแกนโหลดไฟล์ไม่ได้ (รันแบบออฟไลน์)");
      return;
    }

    let isMounted = true;

    const uploadToCloudinary = async () => {
      setIsUploading(true);
      try {
        const uploadFile = async (file, resourceType = 'image') => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', cloudConfig.uploadPreset);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudConfig.cloudName}/${resourceType}/upload`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message);
          return data.secure_url;
        };

        // If 'image' is a data URL, fetch it to a blob first
        const resImage = await fetch(image);
        const imageBlob = await resImage.blob();
        const imgUrl = await uploadFile(imageBlob, 'image');
        
        let vidUrl = '';
        if (videoBlob) {
          vidUrl = await uploadFile(videoBlob, 'video');
          vidUrl = vidUrl.replace(/\.(webm|ogg)$/i, '.mp4'); // Force Cloudinary to convert to mp4 for iOS support
        }
        
        const url = new URL(window.location.href);
        url.searchParams.set('download', '1');
        url.searchParams.set('img', imgUrl);
        if (vidUrl) url.searchParams.set('vid', vidUrl);
        
        if (isMounted) {
          setShareUrl(url.toString());
          let finalQrDataUrl = null;
          
          try {
            finalQrDataUrl = await QRCode.toDataURL(url.toString(), {
              width: 300, margin: 2, color: { dark: '#000000', light: '#ffffff' }
            });
          } catch (qrErr) {
            console.error("Local QR generation failed:", qrErr);
            finalQrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url.toString())}&bgcolor=ffffff&color=000000`;
          }

          setQrCodeUrl(finalQrDataUrl);
          
          // Generate composite image with QR code for printing/downloading
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const baseImg = new Image();
          baseImg.crossOrigin = "Anonymous";
          
          baseImg.onload = () => {
            canvas.width = baseImg.width;
            canvas.height = baseImg.height;
            ctx.drawImage(baseImg, 0, 0);

            const qrImg = new Image();
            qrImg.crossOrigin = "Anonymous"; // Important if falling back to external API
            qrImg.onload = () => {
              const qrSize = Math.max(canvas.width * 0.12, 100); 
              const padding = canvas.width * 0.04;
              const x = canvas.width - qrSize - padding;
              const y = padding;
              
              // Draw white background for QR
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(x - 4, y - 4, qrSize + 8, qrSize + 8);
              // Draw QR Code
              ctx.drawImage(qrImg, x, y, qrSize, qrSize);
              
              try {
                setPrintableImage(canvas.toDataURL('image/jpeg', 0.95));
              } catch (e) {
                console.error("Failed to composite QR code (CORS issue):", e);
              }
            };
            qrImg.onerror = (e) => console.error("QR Image failed to load on canvas", e);
            qrImg.src = finalQrDataUrl;
          };
          baseImg.onerror = (e) => console.error("Base image failed to load on canvas", e);
          baseImg.src = image;
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setErrorMsg("อัปโหลดไม่สำเร็จ: " + err.message);
        }
      } finally {
        if (isMounted) {
          setIsUploading(false);
        }
      }
    };

    uploadToCloudinary();
    return () => { isMounted = false; };
  }, [image, videoBlob, cloudConfig]);

  const handleDownload = () => {
    if (!image) return;
    try {
      const link = document.createElement('a');
      link.href = printableImage || image;
      link.download = `StudioBooth_${new Date().getTime()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e) {
      alert("ดาวน์โหลดล้มเหลว กรุณาแตะค้างที่รูปภาพเพื่อบันทึก");
    }
  };

  const handlePrint = () => {
    if (!image) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Print Photobooth</title>
          <style>
            @page { margin: 0; }
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: white; }
            img { max-width: 100%; max-height: 100%; object-fit: contain; }
          </style>
        </head>
        <body>
          <img src="${printableImage || image}" onload="window.print(); setTimeout(() => { window.parent.document.body.removeChild(window.frameElement); }, 1000);" />
        </body>
      </html>
    `);
    doc.close();
  };

  return (
    <div 
      className="flex-1 flex items-center justify-center p-4 md:p-6 relative overflow-y-auto text-amber-50"
      style={{ background: `linear-gradient(to bottom, ${landingConfig?.bgColor1 || '#1a0e04'}, ${landingConfig?.bgColor2 || '#3d1f00'})` }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      
      <div className="relative z-10 max-w-5xl w-full grid md:grid-cols-2 gap-8 md:gap-12 items-center py-10">
        
        {/* Left: Result Image and Video */}
        <div className="flex flex-col items-center gap-6">
          <div className="print-container relative p-2 bg-zinc-900 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-zinc-800 md:rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
            <img src={printableImage || image} alt="Final Print" className="print-image max-h-[50vh] md:max-h-[55vh] object-contain rounded-xl shadow-inner pointer-events-auto" />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none rounded-2xl" />
          </div>
          
          {videoBlob && (
            <div className="relative p-2 bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-[250px] shadow-xl md:rotate-[3deg]">
              <div className="absolute -top-3 -right-3 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-lg transform rotate-12 z-10">Timelapse 🚀</div>
               <video 
                  src={URL.createObjectURL(videoBlob)} 
                  autoPlay loop muted playsInline 
                  className="w-full rounded-xl"
                  ref={v => { if(v) v.playbackRate = 2.0; }}
               />
               <button onClick={downloadVideo} className="absolute bottom-4 right-4 p-3 bg-black/60 rounded-full text-white hover:bg-amber-500 transition-colors backdrop-blur-md hover:scale-110">
                 <Download className="w-5 h-5" />
               </button>
            </div>
          )}
          <p className="text-zinc-500 text-xs mt-2 hidden md:block">แตะค้างที่รูปภาพ หากต้องการเซฟด้วยตัวเอง</p>
        </div>

        {/* Right: Actions */}
        <div className="space-y-6 md:space-y-8 flex flex-col items-center md:items-start text-center md:text-left">
          <div>
            <h2 
              className="text-3xl md:text-4xl font-extrabold mb-3 drop-shadow-md"
              style={{ color: landingConfig?.accentColor || '#d4a055' }}
            >
              {landingConfig?.shareTitle || 'รูปภาพของคุณพร้อมแล้ว!'}
            </h2>
            <p className="text-amber-200/80 text-base md:text-lg">
              {landingConfig?.shareSubtitle || 'สแกนคิวอาร์โค้ดเพื่อเซฟลงมือถือได้เลย หรือกดปุ่มดาวน์โหลดด้านล่าง'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <button 
              onClick={handleDownload}
              className="flex-1 py-4 bg-amber-700 text-amber-50 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors shadow-xl"
              style={{ backgroundColor: landingConfig?.accentColor, color: '#1a0e04' }}
            >
              <Download className="w-5 h-5" />
              ดาวน์โหลด HD
            </button>
            <button 
              className="flex-1 py-4 bg-black/40 border border-amber-900/50 text-amber-200 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-black/60 transition-colors"
              onClick={handlePrint}
            >
              พิมพ์รูป
            </button>
          </div>
          
          <p className="text-amber-500/80 text-xs w-full max-w-sm text-left px-2">
            * หากปุ่มดาวน์โหลดไม่ทำงาน ให้แตะค้างที่รูปภาพด้านซ้าย แล้วเลือก "บันทึกรูปภาพ" (Save Image)
          </p>

          <div className="w-full max-w-sm bg-black/40 p-5 md:p-6 rounded-2xl border border-amber-900/30 backdrop-blur-md flex flex-col gap-4 shadow-2xl">
            {errorMsg && (
              <div className="text-amber-500 text-xs bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                {errorMsg}
              </div>
            )}
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-24 h-24 md:w-28 md:h-28 bg-white/90 rounded-xl p-2 flex items-center justify-center shrink-0 relative overflow-hidden">
                {isUploading && (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                    <span className="text-[10px] text-amber-800 font-medium">กำลังอัปโหลด...</span>
                  </div>
                )}
                {!isUploading && qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain animate-in fade-in zoom-in duration-500" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base md:text-lg mb-1 flex items-center gap-2 text-amber-100">
                  <QrCode className="w-5 h-5 text-amber-500" />
                  สแกนรับรูปภาพ
                </h3>
                <p className="text-xs md:text-sm text-amber-200/60 leading-relaxed">
                  เปิดกล้องมือถือสแกนเพื่อโหลดรูป
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={onDone}
            className="text-amber-500 hover:text-amber-300 transition-colors underline underline-offset-4 mt-2"
          >
            กลับไปหน้าแรก / ถ่ายใหม่
          </button>
        </div>
      </div>
    </div>
  );
}

function DownloadView() {
  const params = new URLSearchParams(window.location.search);
  const imgUrl = params.get('img');
  const vidUrl = params.get('vid');

  const downloadFile = async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch(err) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 p-6 items-center min-h-screen text-center justify-center">
      <h1 className="text-3xl font-bold text-amber-500 mb-2">🎉 รูปของคุณมาแล้ว!</h1>
      <p className="text-zinc-400 mb-8">บันทึกรูปและวิดีโอลงมือถือได้เลย</p>

      {imgUrl && (
        <div className="mb-6 flex flex-col items-center">
          <img src={imgUrl} className="max-w-full w-64 rounded-xl shadow-2xl mb-4 border-2 border-zinc-800" />
          <button onClick={() => downloadFile(imgUrl, 'photobooth.jpg')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full font-bold text-white shadow-lg flex items-center gap-2">
            <Download className="w-5 h-5" /> โหลดรูปภาพ
          </button>
          <p className="text-xs text-zinc-500 mt-2">หรือแตะค้างที่รูปเพื่อบันทึก</p>
        </div>
      )}

      {vidUrl && (
        <div className="mb-6 flex flex-col items-center pt-6 border-t border-zinc-800 w-full max-w-sm">
          <video src={vidUrl} autoPlay loop muted playsInline className="max-w-full w-48 rounded-xl shadow-2xl mb-4 border-2 border-zinc-800" />
          <button onClick={() => downloadFile(vidUrl, 'photobooth-timelapse.mp4')} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-full font-bold text-white shadow-lg flex items-center gap-2">
            <Download className="w-5 h-5" /> โหลดวิดีโอ Timelapse
          </button>
        </div>
      )}
    </div>
  );
}