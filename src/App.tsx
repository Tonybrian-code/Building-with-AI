/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  CloudSun, 
  Store, 
  Bookmark, 
  Globe, 
  Loader2, 
  Trash2,
  Download,
  CheckCircle2,
  Leaf,
  WifiOff,
  Stethoscope,
  TrendingUp,
  MapPin,
  MessageSquare,
  X,
  Send,
  Map as MapIcon,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { analyzeCropImage, getPlantingSchedule, getChatResponse } from './services/geminiService';
import { translations, Language } from './constants';
import { cn } from './lib/utils';

interface SavedAdvice {
  id: string;
  type: 'health' | 'weather' | 'market';
  title: string;
  content: string;
  date: string;
  image?: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

const MOCK_OUTBREAKS = [
  { region: 'Marsabit', pest: 'Desert Locusts', risk: 'High', color: '#EF4444', x: 65, y: 25 },
  { region: 'Trans Nzoia', pest: 'Fall Armyworm', risk: 'High', color: '#EF4444', x: 30, y: 45 },
  { region: 'Kiambu', pest: 'Coffee Berry Borer', risk: 'Medium', color: '#F59E0B', x: 45, y: 65 },
  { region: 'Kilifi', pest: 'Maize Lethal Necrosis', risk: 'Medium', color: '#F59E0B', x: 75, y: 80 },
  { region: 'Nakuru', pest: 'Wheat Rust', risk: 'Low', color: '#10B981', x: 40, y: 55 },
];

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'health' | 'weather' | 'market' | 'map' | 'saved'>('health');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<SavedAdvice[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  useEffect(() => {
    const saved = localStorage.getItem('agri_expert_saved');
    if (saved) {
      setSavedItems(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const saveToLocal = (items: SavedAdvice[]) => {
    localStorage.setItem('agri_expert_saved', JSON.stringify(items));
    setSavedItems(items);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      alert(t.selectImage);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const base64 = selectedImage.split(',')[1];
      const advice = await analyzeCropImage(base64, t.diagnosisPrompt);
      setResult(advice);
      // Initialize chat with context
      setChatMessages([{ role: 'ai', text: advice.slice(0, 200) + "..." }]);
    } catch (error) {
      console.error(error);
      alert(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetSchedule = async () => {
    if (!location) {
      alert(t.enterLocation);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const advice = await getPlantingSchedule(location, t.schedulePrompt(location));
      setResult(advice);
    } catch (error) {
      console.error(error);
      alert(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetMarket = async () => {
    if (!location) {
      alert(t.enterLocation);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const advice = await getPlantingSchedule(location, t.marketPrompt(location));
      setResult(advice);
    } catch (error) {
      console.error(error);
      alert(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);
    
    try {
      const history = chatMessages.map(m => `${m.role}: ${m.text}`).join('\n');
      const response = await getChatResponse(userMsg, history, t.chatPrompt(history));
      setChatMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: 'ai', text: t.error }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSaveAdvice = () => {
    if (!result) return;
    const newItem: SavedAdvice = {
      id: Date.now().toString(),
      type: activeTab === 'health' ? 'health' : activeTab === 'weather' ? 'weather' : 'market',
      title: activeTab === 'health' ? `Health - ${new Date().toLocaleDateString()}` : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} - ${location}`,
      content: result,
      date: new Date().toLocaleString(),
      image: activeTab === 'health' ? selectedImage || undefined : undefined
    };
    const updated = [newItem, ...savedItems];
    saveToLocal(updated);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const deleteSaved = (id: string) => {
    const updated = savedItems.filter(item => item.id !== id);
    saveToLocal(updated);
  };

  const cycleLanguage = () => {
    if (lang === 'en') setLang('sw');
    else if (lang === 'sw') setLang('sh');
    else setLang('en');
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[#F1F8E9] shadow-xl relative overflow-hidden">
      {/* Sidebar Chat */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="bg-[#2D5A27] p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MessageSquare size={20} className="text-[#A5D6A7]" />
                  <h2 className="font-serif font-bold text-lg">{t.chatTitle}</h2>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/20 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F1F8E9]/30">
                {chatMessages.length === 0 && (
                  <div className="text-center py-12 text-[#2D5A27]/40 italic text-sm">
                    Ask me anything about your crops!
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn(
                    "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                    msg.role === 'user' 
                      ? "bg-[#2D5A27] text-white ml-auto rounded-tr-none" 
                      : "bg-white text-[#1B2E1A] mr-auto rounded-tl-none border border-[#2D5A27]/10"
                  )}>
                    <Markdown>{msg.text}</Markdown>
                  </div>
                ))}
                {chatLoading && (
                  <div className="bg-white text-[#2D5A27] mr-auto rounded-2xl rounded-tl-none p-3 border border-[#2D5A27]/10 shadow-sm">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-[#2D5A27]/10 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder={t.chatPlaceholder}
                  className="flex-1 p-3 rounded-xl border border-[#2D5A27]/20 focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/50 text-sm"
                />
                <button 
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="bg-[#2D5A27] text-white p-3 rounded-xl disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-[#2D5A27] text-white p-6 rounded-b-[32px] shadow-lg border-b-4 border-[#8B5E3C]/30 z-10">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-serif font-bold tracking-tight flex items-center gap-2">
            <Leaf className="text-[#A5D6A7]" />
            {t.title}
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsChatOpen(true)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <MessageSquare size={20} />
            </button>
            <button 
              onClick={cycleLanguage}
              className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border border-white/30"
            >
              <Globe size={14} />
              {lang === 'en' ? t.english : lang === 'sw' ? t.swahili : t.sheng}
            </button>
          </div>
        </div>
        <p className="text-white/80 text-sm italic">{t.subtitle}</p>
      </header>

      {/* Tabs */}
      <nav className="flex p-4 gap-2 overflow-x-auto no-scrollbar z-10">
        {[
          { id: 'health', icon: Stethoscope, label: t.health },
          { id: 'weather', icon: CloudSun, label: t.weather },
          { id: 'market', icon: Store, label: t.market },
          { id: 'map', icon: MapIcon, label: t.map },
          { id: 'saved', icon: Bookmark, label: t.saved }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setResult(null);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300",
              activeTab === tab.id 
                ? "bg-[#2D5A27] text-white shadow-md scale-105" 
                : "bg-white text-[#2D5A27] border border-[#2D5A27]/20"
            )}
          >
            <tab.icon size={18} />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'health' && (
            <motion.div
              key="health"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-white p-4 rounded-3xl border border-[#2D5A27]/10 mb-2">
                <div className="flex items-center gap-2 text-[#8B5E3C] mb-1">
                  <Leaf size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">{t.treatmentPlan}</span>
                </div>
                <p className="text-xs text-[#1B2E1A]/60">{t.organicPriority}</p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "aspect-square rounded-3xl border-2 border-dashed border-[#2D5A27]/30 flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-white transition-all",
                  selectedImage ? "border-solid" : "hover:bg-[#2D5A27]/5"
                )}
              >
                {selectedImage ? (
                  <img src={selectedImage} alt="Crop" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <>
                    <div className="bg-[#2D5A27]/10 p-4 rounded-full mb-3">
                      <Camera size={32} className="text-[#2D5A27]" />
                    </div>
                    <span className="text-[#2D5A27] font-medium">{t.uploadImage}</span>
                  </>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              
              <button
                onClick={handleAnalyze}
                disabled={loading || !selectedImage}
                className="w-full bg-[#2D5A27] text-white py-4 rounded-2xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Stethoscope />}
                {loading ? t.analyzing : t.analyze}
              </button>
            </motion.div>
          )}

          {(activeTab === 'weather' || activeTab === 'market') && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#2D5A27]/10">
                <div className="flex items-center gap-2 mb-4 text-[#8B5E3C]">
                  <MapPin size={18} />
                  <label className="block text-xs font-bold uppercase tracking-wider">
                    {t.location}
                  </label>
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Nakuru, Kenya"
                  className="w-full p-3 rounded-xl border border-[#2D5A27]/20 focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/50 bg-[#F1F8E9]/30"
                />
              </div>
              
              <button
                onClick={activeTab === 'weather' ? handleGetSchedule : handleGetMarket}
                disabled={loading || !location}
                className="w-full bg-[#2D5A27] text-white py-4 rounded-2xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {loading ? <Loader2 className="animate-spin" /> : activeTab === 'weather' ? <CloudSun /> : <TrendingUp />}
                {loading ? t.loading : activeTab === 'weather' ? t.getSchedule : t.market}
              </button>
            </motion.div>
          )}

          {activeTab === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#2D5A27]/10">
                <h2 className="font-serif font-bold text-xl text-[#2D5A27] mb-1">{t.outbreakTitle}</h2>
                <p className="text-xs text-[#1B2E1A]/60 mb-6">{t.outbreakSubtitle}</p>
                
                {/* SVG Map of Kenya (Simplified) */}
                <div className="relative aspect-[4/5] bg-[#F1F8E9]/30 rounded-2xl border border-[#2D5A27]/10 overflow-hidden mb-6">
                  <svg viewBox="0 0 100 100" className="w-full h-full fill-[#A5D6A7]/30 stroke-[#2D5A27]/20 stroke-[0.5]">
                    <path d="M35,10 L65,10 L85,30 L90,60 L75,90 L45,95 L20,85 L10,60 L15,30 Z" />
                    {MOCK_OUTBREAKS.map((alert, i) => (
                      <g key={i}>
                        <circle 
                          cx={alert.x} 
                          cy={alert.y} 
                          r="2" 
                          fill={alert.color} 
                          className="animate-pulse"
                        />
                        <circle 
                          cx={alert.x} 
                          cy={alert.y} 
                          r="4" 
                          fill={alert.color} 
                          fillOpacity="0.2"
                        />
                      </g>
                    ))}
                  </svg>
                  
                  {/* Legend */}
                  <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm p-2 rounded-lg text-[8px] font-bold uppercase tracking-wider border border-[#2D5A27]/10">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>{t.riskHigh}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span>{t.riskMedium}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span>{t.riskLow}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {MOCK_OUTBREAKS.map((alert, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-[#F1F8E9]/50 border border-[#2D5A27]/5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-white shadow-sm">
                          <AlertTriangle size={16} style={{ color: alert.color }} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{alert.region}</h4>
                          <p className="text-[10px] text-[#1B2E1A]/60">{alert.pest}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                        alert.risk === 'High' ? "bg-red-100 text-red-600" : alert.risk === 'Medium' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                      )}>
                        {alert.risk === 'High' ? t.riskHigh : alert.risk === 'Medium' ? t.riskMedium : t.riskLow}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'saved' && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {savedItems.length === 0 ? (
                <div className="text-center py-12 text-[#2D5A27]/40 italic">
                  {t.noSaved}
                </div>
              ) : (
                savedItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-[#2D5A27]/10 overflow-hidden">
                    {item.image && (
                      <img src={item.image} alt="Saved crop" className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
                    )}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {item.type === 'health' ? <Stethoscope size={16} className="text-[#2D5A27]" /> : item.type === 'weather' ? <CloudSun size={16} className="text-[#2D5A27]" /> : <Store size={16} className="text-[#2D5A27]" />}
                          <div>
                            <h3 className="font-serif font-bold text-lg leading-tight">{item.title}</h3>
                            <span className="text-[10px] text-[#2D5A27]/50 uppercase tracking-widest">{item.date}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteSaved(item.id)}
                          className="text-red-400 p-1 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto text-sm text-[#1B2E1A]/80 markdown-body">
                        <Markdown>{item.content}</Markdown>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Display */}
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 bg-white rounded-[32px] p-6 shadow-xl border border-[#2D5A27]/10 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-[#2D5A27]"></div>
            <div className="flex justify-between items-center mb-6">
              <span className="bg-[#2D5A27]/10 text-[#2D5A27] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                <CheckCircle2 size={10} />
                AI Advisory
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsChatOpen(true)}
                  className="flex items-center gap-1 text-[#2D5A27] font-bold text-xs hover:underline"
                >
                  <MessageSquare size={14} />
                  Ask Follow-up
                </button>
                <button 
                  onClick={handleSaveAdvice}
                  className="flex items-center gap-1 text-[#2D5A27] font-bold text-xs hover:underline"
                >
                  <Download size={14} />
                  {t.saveAdvice}
                </button>
              </div>
            </div>
            
            <div className="markdown-body">
              <Markdown>{result}</Markdown>
            </div>
          </motion.div>
        )}
      </main>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#2D5A27] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 z-50"
          >
            <CheckCircle2 size={20} />
            <span className="font-medium">Saved successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-[#F1F8E9]/90 backdrop-blur-md border-t border-[#2D5A27]/10">
        <div className="flex items-center justify-center gap-2 text-[10px] text-[#2D5A27]/60 font-bold uppercase tracking-[0.2em]">
          <WifiOff size={10} />
          {t.syncStatus}
        </div>
      </footer>
    </div>
  );
}
