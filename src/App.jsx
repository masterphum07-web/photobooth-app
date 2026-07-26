import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, Image as ImageIcon, Wand2, Download, QrCode, 
  Settings, Smile, ChevronRight, Sparkles, RefreshCcw, 
  X, Layers, Share2, Loader2, AlertCircle, ShieldAlert,
  Plus, Trash2, ImagePlus, Paintbrush
} from 'lucide-react';

// --- INITIAL CONFIGURATION & ASSETS ---
const LAYOUTS = {
  single: { id: 'single', name: 'โพลารอยด์', shots: 1, cols: 1, aspect: 'aspect-[3/4]', vW: 1200, vH: 1600 },
  strip: { id: 'strip', name: 'โฟโต้สตริป', shots: 3, cols: 1, aspect: 'aspect-[1/3]', vW: 800, vH: 2400 },
  grid: { id: 'grid', name: 'กริด 2x2', shots: 4, cols: 2, aspect: 'aspect-square', vW: 1600, vH: 1600 },
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
  const [config, setConfig] = useState({ layout: LAYOUTS.strip, filter: FILTERS[0] });
  const [photos, setPhotos] = useState([]);
  const [finalImage, setFinalImage] = useState(null);

  // Admin Managed Assets
  const [customFrames, setCustomFrames] = useLocalStorage('studio-booth-frames', DEFAULT_FRAMES);
  const [customStickers, setCustomStickers] = useLocalStorage('studio-booth-stickers', DEFAULT_STICKERS);

  const DEFAULT_LANDING_CONFIG = {
    title: 'Yeehaw Photo Booth',
    subtitle: 'ถ่ายรูปสไตล์คาวบอย กรอบสวย สติกเกอร์เพียบ!',
    buttonText: '🤠 แตะเพื่อเริ่มถ่ายรูป',
    bgColor1: '#1a0e04',
    bgColor2: '#3d1f00',
    accentColor: '#d4a055',
    showStars: true,
    bgImage: '',
  };
  const [landingConfig, setLandingConfig] = useLocalStorage('studio-booth-landing', DEFAULT_LANDING_CONFIG);

  const resetSession = () => {
    setPhotos([]);
    setFinalImage(null);
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
          onComplete={(captured) => { setPhotos(captured); setView('edit'); }} 
          onCancel={() => setView('setup')}
        />
      )}
      
      {view === 'edit' && (
        <EditorView 
          config={config} photos={photos} 
          availableFrames={customFrames} availableStickers={customStickers}
          onExport={(imgData) => { setFinalImage(imgData); setView('share'); }}
          onRetake={() => setView('booth')}
        />
      )}
      
      {view === 'share' && <ShareView image={finalImage} onDone={resetSession} />}
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
      
      <button onClick={onAdmin} className="absolute top-6 right-6 p-3 bg-amber-900/50 hover:bg-amber-800 rounded-full backdrop-blur-md text-amber-200 hover:text-white transition-colors border shadow-xl z-20" style={{ borderColor: config.accentColor }}>
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
function AdminView({ frames, setFrames, stickers, setStickers, landingConfig, setLandingConfig, onBack }) {
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
    const data = JSON.stringify({ frames, stickers, landingConfig });
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

      <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto w-full">
        {/* Landing Page Customization */}
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

        {/* Manage Stickers */}
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

        {/* Manage Frames */}
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

  const takePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Capture at high resolution based on video feed
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (config.filter.css) ctx.filter = config.filter.css;
    
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1); // Mirror
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    setCaptured(prev => [...prev, imgData]);
    
    if (shotIndex < config.layout.shots - 1) {
      setShotIndex(prev => prev + 1);
      setStatus('idle');
    } else {
      setStatus('done');
      setTimeout(() => onComplete([...captured, imgData]), 800);
    }
  }, [config.filter.css, config.layout.shots, captured, shotIndex, onComplete]);

  const startSequence = async () => {
    setStatus('countdown');
    for (let i = 3; i > 0; i--) {
      setCount(i);
      await wait(1000);
    }
    setStatus('flashing');
    await wait(150);
    takePhoto();
  };

  return (
    <div className="flex-1 flex flex-col bg-black relative">
      <header className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onCancel} className="p-2 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <div className="bg-black/50 backdrop-blur-md px-6 py-2 rounded-full text-sm font-bold border border-zinc-800 shadow-lg">
          ช็อตที่ {shotIndex + 1} / {config.layout.shots}
        </div>
      </header>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} autoPlay playsInline muted 
          className="w-full h-full object-cover -scale-x-100"
          style={{ filter: config.filter.css }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <button 
              onClick={startSequence}
              className="w-24 h-24 rounded-full border-4 border-white/50 flex items-center justify-center hover:border-white transition-colors group shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
              <div className="w-20 h-20 bg-white rounded-full group-hover:scale-95 transition-transform" />
            </button>
          </div>
        )}

        {status === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md">
            <span className="text-[200px] font-black text-white drop-shadow-[0_0_40px_rgba(0,0,0,0.8)] animate-pulse">
              {count}
            </span>
          </div>
        )}

        {status === 'flashing' && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none opacity-100 animate-[pulse_0.15s_ease-out]" />
        )}
      </div>

      <div className="h-32 bg-zinc-950 border-t border-zinc-900 p-4 flex gap-4 overflow-x-auto items-center justify-center">
        {Array.from({ length: config.layout.shots }).map((_, i) => (
          <div 
            key={i} 
            className={`h-full aspect-[3/4] rounded-lg border-2 overflow-hidden bg-zinc-900 transition-all ${
              i === shotIndex ? 'border-indigo-500 scale-105 shadow-lg shadow-indigo-500/20' : 'border-zinc-800'
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

function EditorView({ config, photos, availableFrames, availableStickers, onExport, onRetake }) {
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
      const padding = vW * 0.05; // 5% padding
      const bottomArea = vH * 0.1; // 10% bottom area for branding
      const contentW = vW - (padding * 2);
      const contentH = vH - padding - bottomArea;
      
      const cols = config.layout.cols;
      const rows = Math.ceil(config.layout.shots / cols);
      const spacing = padding * 0.5;

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
            
            // Draw photo background (gray)
            ctx.fillStyle = '#e4e4e7';
            ctx.fillRect(x, y, slotW, slotH);
            
            // Draw Image
            ctx.drawImage(img, drawX, drawY, drawW, drawH, x, y, slotW, slotH);
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

      // 4. Draw Branding (Hide if using custom image frame)
      if (selectedFrame.type !== 'image') {
        ctx.fillStyle = selectedFrame.text;
        ctx.font = `bold ${vW * 0.04}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('STUDIO BOOTH', vW / 2, vH - (bottomArea / 2));
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
      onExport(finalDataUrl);
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
            className={`relative overflow-hidden ${config.layout.aspect} flex flex-col gap-2 p-[4%] transition-colors duration-300 ring-1 ring-white/10`}
            style={{ 
              background: selectedFrame.type === 'image' ? '#ffffff' : selectedFrame.bg,
              height: 'calc(100vh - 220px)',
              maxHeight: '850px',
              minHeight: '400px'
            }}
          >
            {/* Photos Grid */}
            <div className={`flex-1 grid gap-[4%] ${config.layout.cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {photos.map((photo, i) => (
                <div key={i} className="bg-zinc-200 overflow-hidden relative shadow-inner w-full h-full">
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
                <span className="font-bold text-[clamp(12px,2vh,24px)] tracking-widest opacity-90" style={{ color: selectedFrame.text }}>
                  STUDIO BOOTH
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

function ShareView({ image, onDone }) {
  const [uploadStatus, setUploadStatus] = useState('uploading'); 
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  useEffect(() => {
    if (!image) return;
    let isMounted = true;

    const uploadImage = async () => {
      try {
        const res = await fetch(image);
        const blob = await res.blob();
        const formData = new FormData();
        formData.append('file', blob, 'studio-booth.jpg');

        // Using tmpfiles.org for anonymous fast upload
        const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
          method: 'POST',
          body: formData
        });
        
        const json = await uploadRes.json();
        
        if (json.status === 'success' && isMounted) {
          // Format URL to direct image URL for saving
          const fileUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
          const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fileUrl)}&bgcolor=ffffff&color=000000`;
          setQrCodeUrl(qr);
          setUploadStatus('done');
        } else if (isMounted) {
          throw new Error('Upload failed');
        }
      } catch (err) {
        console.error('Cloud Upload Error:', err);
        if (isMounted) setUploadStatus('error');
      }
    };

    uploadImage();
    return () => { isMounted = false; };
  }, [image]);

  const handleDownload = () => {
    if (!image) return;
    try {
      const link = document.createElement('a');
      link.href = image;
      link.download = `StudioBooth_${new Date().getTime()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e) {
      alert("ดาวน์โหลดล้มเหลว กรุณาแตะค้างที่รูปภาพเพื่อบันทึก");
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-6 relative overflow-y-auto bg-zinc-950">
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      
      <div className="relative z-10 max-w-5xl w-full grid md:grid-cols-2 gap-8 md:gap-12 items-center py-10">
        
        {/* Left: Result Image */}
        <div className="flex flex-col items-center">
          <div className="relative p-2 bg-zinc-900 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-zinc-800 md:rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
            <img src={image} alt="Final Print" className="max-h-[50vh] md:max-h-[65vh] object-contain rounded-xl shadow-inner pointer-events-auto" />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none rounded-2xl" />
          </div>
          <p className="text-zinc-500 text-xs mt-4 hidden md:block">แตะค้างที่รูปภาพ หากต้องการเซฟด้วยตัวเอง</p>
        </div>

        {/* Right: Actions */}
        <div className="space-y-6 md:space-y-8 flex flex-col items-center md:items-start text-center md:text-left">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3 bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
              รูปภาพของคุณพร้อมแล้ว!
            </h2>
            <p className="text-zinc-400 text-base md:text-lg">สแกนคิวอาร์โค้ดเพื่อเซฟลงมือถือได้เลย หรือกดปุ่มดาวน์โหลดด้านล่าง</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <button 
              onClick={handleDownload}
              className="flex-1 py-4 bg-white text-black rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors shadow-xl shadow-white/10"
            >
              <Download className="w-5 h-5" />
              ดาวน์โหลด HD
            </button>
            <button 
              className="flex-1 py-4 bg-zinc-900 border border-zinc-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
              onClick={() => alert('จำลองระบบพริ้นต์เตอร์ ในระบบจริงจะส่งคำสั่งไปที่เครื่องพิมพ์อัตโนมัติ')}
            >
              พิมพ์รูป
            </button>
          </div>
          
          <p className="text-yellow-500/80 text-xs w-full max-w-sm text-left px-2">
            * หากปุ่มดาวน์โหลดไม่ทำงาน ให้แตะค้างที่รูปภาพด้านซ้าย แล้วเลือก "บันทึกรูปภาพ" (Save Image)
          </p>

          <div className="w-full max-w-sm bg-zinc-900/80 p-5 md:p-6 rounded-2xl border border-zinc-800 backdrop-blur-md flex items-center gap-4 md:gap-6 shadow-2xl">
            <div className="w-24 h-24 md:w-28 md:h-28 bg-white rounded-xl p-2 flex items-center justify-center shrink-0 relative overflow-hidden">
              {uploadStatus === 'uploading' && (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  <span className="text-[10px] text-zinc-500 font-medium">กำลังอัปโหลด...</span>
                </div>
              )}
              {uploadStatus === 'done' && qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain animate-in fade-in zoom-in duration-500" />
              )}
              {uploadStatus === 'error' && (
                <div className="flex flex-col items-center gap-1 text-red-500 text-center">
                  <AlertCircle className="w-6 h-6" />
                  <span className="text-[9px] font-bold">เชื่อมต่อเซิร์ฟเวอร์ไม่ได้</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base md:text-lg mb-1 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-400" />
                สแกนรับรูปภาพ
              </h3>
              <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                เปิดกล้องมือถือสแกนเพื่อโหลดรูป (รูปภาพจะถูกลบอัตโนมัติจาก Cloud)
              </p>
            </div>
          </div>

          <button 
            onClick={onDone}
            className="text-zinc-500 hover:text-white transition-colors underline underline-offset-4 mt-2"
          >
            กลับไปหน้าแรก / ถ่ายใหม่
          </button>
        </div>
      </div>
    </div>
  );
}