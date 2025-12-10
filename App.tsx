import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from './components/Icon';
import { AppView, WordCard } from './types';
import { generateWordDetails, playPronunciation } from './services/geminiService';

// --- Local Storage Helper ---
const STORAGE_KEY = 'lumiere_french_cards_v3';

const saveCards = (cards: WordCard[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
};

const loadCards = (): WordCard[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

// --- Helpers for Theming ---

// Earthy, Stone-like Palette to match the texture reference with White Text
const CARD_THEMES = [
  { id: 'stone', bg: 'bg-[#BDB7AB]', text: 'text-white' },    // Warm Stone
  { id: 'clay', bg: 'bg-[#C8B2A0]', text: 'text-white' },     // Terracotta/Clay
  { id: 'sage', bg: 'bg-[#A8B5A5]', text: 'text-white' },     // Dried Sage
  { id: 'slate', bg: 'bg-[#9FA8B0]', text: 'text-white' },    // Blue Slate
  { id: 'mauve', bg: 'bg-[#B5A8A8]', text: 'text-white' },    // Muted Mauve
  { id: 'sand', bg: 'bg-[#C2BCA8]', text: 'text-white' },     // Wet Sand
  { id: 'mist', bg: 'bg-[#AAB7B8]', text: 'text-white' },     // Cool Mist
];

// Deterministic random theme based on string ID
const getThemeForId = (id: string) => {
  const num = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const theme = CARD_THEMES[num % CARD_THEMES.length];
  return theme;
};

// --- Texture Library ---
// Defines SVG Data URIs for different material types
const TEXTURE_STYLES: Record<string, string> = {
    // Default Stone/Noise - Granular
    stone: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")`,
    
    // Fur - Directional Noise (Stretched)
    fur: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='furFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.2 0.02' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23furFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
    
    // Wood - Vertical Grain
    wood: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='woodFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.005 0.05' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23woodFilter)' opacity='0.45'/%3E%3C/svg%3E")`,
    
    // Water - Smooth Swirls
    water: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='waterFilter'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.015' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23waterFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
    
    // Fabric - Fine Grid/Canvas
    fabric: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='fabricFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23fabricFilter)' opacity='0.2'/%3E%3C/svg%3E")`,
    
    // Plant - Organic/Cellular-ish (Soft Noise)
    plant: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='plantFilter'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.05' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23plantFilter)' opacity='0.35'/%3E%3C/svg%3E")`,

    // Metal - Brushed
    metal: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='metalFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.002 0.4' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23metalFilter)' opacity='0.3'/%3E%3C/svg%3E")`,
};

const getTextureForCard = (textureType?: string) => {
    if (!textureType || !TEXTURE_STYLES[textureType]) {
        return TEXTURE_STYLES.stone; // Fallback
    }
    return TEXTURE_STYLES[textureType];
};

// Helper for dynamic font size based on word length
const getFontSize = (text: string) => {
  if (text.length <= 4) return 'text-6xl sm:text-7xl leading-none';
  if (text.length <= 8) return 'text-5xl sm:text-6xl leading-none';
  if (text.length <= 12) return 'text-4xl sm:text-5xl leading-tight';
  return 'text-3xl sm:text-4xl leading-tight';
};

// --- Components ---

interface ButtonProps {
    onClick?: (e?: React.MouseEvent) => void;
    children: React.ReactNode;
    className?: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
}

const Button = ({ onClick, children, className, variant = 'primary', disabled = false, type = 'button' }: ButtonProps) => {
  const baseStyle = "rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-black text-white shadow-lg disabled:bg-gray-400 px-6 py-3",
    secondary: "bg-white text-gray-900 border border-gray-200 shadow-sm disabled:bg-gray-50 disabled:text-gray-400 px-6 py-3 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 disabled:text-gray-400 px-2 py-1",
    icon: "p-2 rounded-full hover:bg-gray-100 text-gray-600"
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className || ''}`}
    >
      {children}
    </button>
  );
};

// --- Views ---

const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const [apiKey, setApiKey] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setApiKey(localStorage.getItem('user_gemini_api_key') || '');
            setSaved(false);
        }
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('user_gemini_api_key', apiKey.trim());
        setSaved(true);
        setTimeout(() => {
            onClose();
        }, 800);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Paramètres</h2>
                    <Button variant="icon" onClick={onClose}><Icons.Close size={24} /></Button>
                </div>
                
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
                        <input 
                            type="password" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Entrez votre clé API..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-black outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                           Nécessaire pour générer les cartes avec l'IA. <br/>
                           Vous pouvez obtenir une clé gratuite sur <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google AI Studio</a>.
                        </p>
                    </div>
                    
                    <Button onClick={handleSave} disabled={!apiKey.trim()} className={saved ? 'bg-green-600' : ''}>
                        {saved ? 'Enregistré !' : 'Enregistrer'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const AddWordModal = ({ isOpen, onClose, onSave, onOpenSettings }: { isOpen: boolean, onClose: () => void, onSave: (word: string) => Promise<void>, onOpenSettings: () => void }) => {
  const [inputWord, setInputWord] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputWord('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await onSave(inputWord);
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.message === 'MISSING_API_KEY') {
          setError("Clé API manquante. Veuillez la configurer dans les paramètres.");
      } else {
          setError("Une erreur est survenue. Vérifiez votre connexion.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity pointer-events-auto" onClick={onClose} />
      {/* iOS Sheet Style: Rounded Top, Handle Bar, Safe Area Bottom */}
      <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-3xl p-6 pb-safe shadow-2xl transform transition-transform pointer-events-auto flex flex-col gap-6 animate-in slide-in-from-bottom duration-300">
        
        {/* Pull Handle for iOS feel */}
        <div className="w-full flex justify-center -mt-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>
        
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Ajouter un mot</h2>
          <Button variant="icon" onClick={onClose}><Icons.Close size={24} /></Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2 ml-1">Mot français</label>
            <div className="relative">
                <input
                autoFocus
                type="text"
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                placeholder="Ex: Chat"
                className="w-full text-3xl font-bold px-5 py-5 bg-white border-2 border-gray-200 focus:border-black focus:ring-4 focus:ring-gray-100 text-gray-900 rounded-2xl outline-none transition-all placeholder:text-gray-300 shadow-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-black p-2 rounded-xl">
                    <Icons.Plus className="text-white" size={20} />
                </div>
            </div>
          </div>

          {error && (
              <div className="flex flex-col gap-3 bg-red-50 p-4 rounded-xl border border-red-100">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                  {error.includes("Clé API") && (
                      <Button 
                        onClick={(e) => { 
                            e?.preventDefault(); 
                            onOpenSettings(); 
                        }} 
                        variant="secondary" 
                        className="py-2 text-sm w-full bg-white text-red-600 border-red-200 hover:bg-red-50"
                      >
                          Configurer maintenant
                      </Button>
                  )}
              </div>
          )}

          <Button type="submit" variant="primary" className="w-full mt-2 py-4 text-lg mb-2" disabled={isLoading || !inputWord.trim()}>
            {isLoading ? (
              <>
                <Icons.Sparkles className="animate-spin" size={20} />
                <span>Analyse...</span>
              </>
            ) : (
              "Créer la carte"
            )}
          </Button>
        </form>
        {/* Extra padding for safe area logic ensures button isn't too close to home indicator */}
        <div className="h-4"></div> 
      </div>
    </div>
  );
};

const WordDetailView = ({ card, onBack, onDelete }: { card: WordCard, onBack: () => void, onDelete: (id: string) => void }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingExample, setIsPlayingExample] = useState(false);

  const handlePlay = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsPlaying(true);
    await playPronunciation(card.french);
    setIsPlaying(false);
  };

  const handlePlayExample = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsPlayingExample(true);
    await playPronunciation(card.exampleSentence);
    setIsPlayingExample(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(card.id);
  };

  const getGenderBadge = () => {
    if (!card.gender) return null;
    const g = card.gender.toLowerCase();
    let label = 'N';
    let color = 'bg-gray-100 text-gray-500';

    if (g.includes('masc')) {
      label = 'Masc.';
      color = 'bg-blue-600 text-white';
    } else if (g.includes('fém') || g.includes('fem')) {
      label = 'Fém.';
      color = 'bg-pink-500 text-white';
    } else if (g.includes('plur')) {
        label = 'Pl.';
        color = 'bg-purple-600 text-white';
    }

    return <span className={`text-xs uppercase font-bold px-2 py-1 rounded-full shadow-sm ${color}`}>{label}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      {/* Navbar - Safe Area Top */}
      <div className="pt-safe px-4 py-3 flex items-center justify-between sticky top-0 z-20 bg-[#FAFAFA]/85 backdrop-blur-xl border-b border-gray-200/30">
         {/* Apple Style Back Button */}
         <button onClick={onBack} className="w-11 h-11 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors">
             <Icons.ChevronRight className="rotate-180 ml-[-2px]" size={24} />
         </button>
         
         <button 
            type="button"
            onClick={handleDelete} 
            className="w-11 h-11 bg-white border border-red-100 rounded-full shadow-sm flex items-center justify-center text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all active:scale-95"
            aria-label="Supprimer le mot"
         >
             <Icons.Trash size={22} />
         </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-safe">
        <div className="px-6 pb-12 max-w-lg mx-auto w-full flex flex-col gap-8 pt-6">
            
            {/* Header Section */}
            <div className="flex flex-col items-start gap-4">
                <div className="flex items-center gap-3">
                    {getGenderBadge()}
                    {card.texture && (
                        <span className="text-xs uppercase font-bold px-2 py-1 rounded-full bg-gray-200 text-gray-600">
                             {card.texture}
                        </span>
                    )}
                </div>
                
                <div className="flex flex-col gap-2 w-full">
                     <h1 
                        className="text-6xl sm:text-7xl font-black text-gray-900 tracking-tighter leading-none cursor-pointer active:scale-95 transition-transform break-words"
                        onClick={handlePlay}
                     >
                        {card.french}
                     </h1>
                     
                     {/* Pronunciation Button */}
                     <button 
                        onClick={handlePlay}
                        className="flex items-center gap-3 text-gray-500 hover:text-black transition-colors self-start py-2 group cursor-pointer"
                     >
                         {card.phonetic && <span className="font-mono text-xl group-hover:text-black transition-colors">/{card.phonetic}/</span>}
                         <div className="bg-white border border-gray-200 p-2 rounded-full shadow-sm group-active:scale-90 transition-transform">
                            <Icons.Speaker size={20} className={isPlaying ? 'text-blue-600 animate-pulse' : 'text-gray-900'} />
                         </div>
                         <span className="text-xs font-bold uppercase tracking-wider text-gray-400 group-hover:text-gray-600">Écouter</span>
                     </button>
                </div>

                <div className="w-full h-px bg-gray-100 my-2"></div>

                <div>
                    <h2 className="text-4xl font-bold text-gray-900 leading-tight mb-3 tracking-tight">
                        {card.translation}
                    </h2>
                    <p className="text-xl text-gray-500 font-medium leading-relaxed">
                        {card.definition}
                    </p>
                </div>
            </div>

            {/* Example Section */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
                 <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Icons.Book size={14} /> Exemple
                    </h3>
                    <button 
                        onClick={handlePlayExample}
                        className="p-2.5 bg-gray-50 rounded-full text-gray-900 hover:bg-gray-100 active:scale-90 transition-all"
                    >
                        <Icons.Speaker size={20} className={isPlayingExample ? 'animate-pulse text-blue-600' : ''} />
                    </button>
                 </div>
                 <div>
                    <p className="text-2xl text-gray-800 font-serif italic mb-3 leading-snug">"{card.exampleSentence}"</p>
                    <p className="text-base text-gray-500 font-medium">{card.exampleTranslation}</p>
                 </div>
            </div>

            {/* Vibe Check */}
            {card.nuance && (
                <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-100/50">
                    <div className="flex items-center gap-2 mb-3">
                            <Icons.Sparkles size={16} className="text-yellow-600" />
                            <span className="text-xs font-bold text-yellow-600 uppercase tracking-widest">Le Vibe Check</span>
                    </div>
                    <p className="text-gray-800 text-lg leading-relaxed">
                        {card.nuance}
                    </p>
                </div>
            )}
            
            {/* Secondary Delete Action */}
            <div className="flex justify-center mt-6 mb-12">
                <button
                    onClick={handleDelete}
                    className="text-red-400 text-sm font-semibold hover:text-red-600 transition-colors flex items-center gap-2 px-6 py-3 rounded-xl hover:bg-red-50 active:bg-red-100"
                >
                    <Icons.Trash size={18} />
                    Supprimer cette carte
                </button>
            </div>
            
            <div className="h-12"></div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [cards, setCards] = useState<WordCard[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Pre-load voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
       const load = () => window.speechSynthesis.getVoices();
       load();
       window.speechSynthesis.onvoiceschanged = load;
    }
  }, []);

  useEffect(() => {
    setCards(loadCards());
  }, []);

  const handleSaveWord = async (word: string) => {
    const details = await generateWordDetails(word);
    
    const newCard: WordCard = {
      id: Date.now().toString(),
      french: word,
      ...details,
      createdAt: Date.now()
    };

    const updatedCards = [newCard, ...cards];
    setCards(updatedCards);
    saveCards(updatedCards);
  };

  const handleDeleteCard = (id: string) => {
    // If the deleted card is the currently open one, close it immediately
    if (selectedCardId === id) {
        setSelectedCardId(null);
    }
    // Update state safely
    setCards(prevCards => {
        const updatedCards = prevCards.filter(c => c.id !== id);
        saveCards(updatedCards);
        return updatedCards;
    });
  };

  const filteredCards = cards.filter(c => 
    c.french.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.translation.includes(searchQuery)
  );

  const handleListPlay = async (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    await playPronunciation(word);
  };

  const renderContent = () => {
    const activeCard = selectedCardId ? cards.find(c => c.id === selectedCardId) : null;

    if (selectedCardId && activeCard) {
      return (
        <WordDetailView 
            card={activeCard} 
            onBack={() => setSelectedCardId(null)} 
            onDelete={handleDeleteCard}
        />
      );
    }

    const displayedCards = view === AppView.REVIEW 
        ? [...filteredCards].sort((a, b) => a.createdAt - b.createdAt)
        : filteredCards;

    return (
      <div className="flex flex-col h-full bg-[#F2F4F7]">
        {/* Header - Safe Area Top added - Lighter Glass */}
        <header className="sticky top-0 z-10 bg-[#F2F4F7]/85 backdrop-blur-xl pt-safe px-6 pb-3 border-b border-gray-200/50">
           {/* Added extra padding for status bar spacing */}
           <div className="pt-2 flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
                        <span className="font-serif italic font-bold text-2xl">L</span>
                    </div>
                    Lumière
                    </h1>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button 
                        variant="icon" 
                        onClick={() => setIsSettingsOpen(true)}
                        className="text-gray-500 hover:text-black hover:bg-white"
                    >
                        <Icons.Settings size={24} />
                    </Button>
                    <Button 
                        variant="ghost" 
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-blue-600 font-semibold text-lg hover:bg-gray-200/50"
                    >
                        {isEditing ? 'OK' : 'Modifier'}
                    </Button>
                </div>
           </div>
           
           <div className="relative group mb-2">
               <div 
                 onClick={() => setIsModalOpen(true)}
                 className="bg-[#E3E3E8] rounded-xl h-12 flex items-center px-4 cursor-text active:scale-[0.99] transition-transform"
               >
                   <Icons.Plus size={20} className="text-gray-500 mr-2" />
                   <span className="text-gray-500 font-medium text-lg truncate">Ajouter un mot...</span>
               </div>
           </div>
           
           {cards.length > 5 && (
             <div className="pt-1">
                 <input 
                    type="text" 
                    placeholder="Rechercher" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#E3E3E8] rounded-xl px-4 py-2.5 text-base focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-500"
                 />
             </div>
           )}
        </header>

        {/* List - Card Feed */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 no-scrollbar pb-32">
          {displayedCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-8 opacity-50">
              <Icons.Book size={48} className="text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">Votre collection est vide</p>
              <p className="text-gray-400 text-sm mt-2">Appuyez sur + pour commencer</p>
            </div>
          ) : (
             <div className="grid grid-cols-2 min-[450px]:grid-cols-3 sm:grid-cols-4 gap-3">
                 {displayedCards.map(card => {
                     const theme = getThemeForId(card.id);
                     const fontSizeClass = getFontSize(card.french);
                     // Dynamic Texture URL
                     const textureUrl = getTextureForCard(card.texture);
                     
                     return (
                     <div 
                        key={card.id}
                        onClick={() => !isEditing && setSelectedCardId(card.id)}
                        className={`relative w-full aspect-square rounded-[2rem] p-3 shadow-sm transition-all cursor-pointer overflow-hidden ${theme.bg} ${!isEditing ? 'active:scale-[0.96]' : ''} flex flex-col items-center justify-between text-center select-none`}
                     >
                        {/* Dynamic Context-Aware Texture */}
                        <div className="absolute inset-0 pointer-events-none mix-blend-overlay" style={{ backgroundImage: textureUrl }}></div>
                        
                        {isEditing && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCard(card.id);
                                }}
                                className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center bg-gray-100 text-red-500 rounded-full shadow-md hover:scale-110 transition-transform animate-in zoom-in duration-200"
                            >
                                <Icons.Minus size={20} />
                            </button>
                        )}

                        <div className={`relative z-10 w-full h-full flex flex-col items-center justify-between ${isEditing ? 'opacity-60 scale-95' : ''} transition-all`}>
                            
                            <div className="flex-1 flex flex-col items-center justify-center w-full gap-0.5 mt-2">
                                <h3 className={`${fontSizeClass} font-black text-white drop-shadow-md tracking-tighter break-words w-full px-1 leading-[0.9]`}>
                                    {card.french}
                                </h3>
                                <p className="text-base text-white/90 font-bold drop-shadow-md line-clamp-1 mt-1">
                                    {card.translation}
                                </p>
                            </div>

                            <div className="w-full flex justify-center pb-1">
                                <button 
                                    onClick={(e) => handleListPlay(e, card.french)}
                                    className="bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center justify-center gap-1.5 transition-all group"
                                >
                                    {card.phonetic && (
                                        <span className="text-white/95 font-mono text-[10px] font-semibold tracking-wide group-hover:text-white">/{card.phonetic}/</span>
                                    )}
                                    <Icons.Speaker size={12} className="text-white fill-white/20" />
                                </button>
                            </div>
                        </div>
                     </div>
                 )})}
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    // Updated container: uses h-[100dvh] for Safari mobile fix
    <main className="h-[100dvh] w-full bg-[#F2F4F7] text-gray-900 antialiased overflow-hidden flex flex-col select-none">
        <div className="w-full h-full bg-[#F2F4F7] flex flex-col relative overflow-hidden">
        
        <div className="flex-1 overflow-hidden relative">
          {renderContent()}
        </div>

        {!selectedCardId && (
          // Navigation - Safe Area Bottom added - Standard iOS Tab Bar Height (49px + safe area)
          <nav className="absolute bottom-0 w-full bg-white/85 backdrop-blur-xl border-t border-gray-300/50 pb-safe px-6 flex justify-around items-end h-[calc(55px+env(safe-area-inset-bottom))] z-30">
            <button 
              onClick={() => setView(AppView.HOME)}
              className={`flex flex-col items-center justify-center gap-1 h-full w-20 pb-2 ${view === AppView.HOME ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <Icons.Book size={28} strokeWidth={view === AppView.HOME ? 2.5 : 2} />
              <span className="text-[10px] font-medium tracking-wide">Mots</span>
            </button>
            <button 
              onClick={() => setView(AppView.REVIEW)}
              className={`flex flex-col items-center justify-center gap-1 h-full w-20 pb-2 ${view === AppView.REVIEW ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <Icons.Calendar size={28} strokeWidth={view === AppView.REVIEW ? 2.5 : 2} />
              <span className="text-[10px] font-medium tracking-wide">Révision</span>
            </button>
          </nav>
        )}

        <AddWordModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveWord} 
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        
        <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
        />
        
      </div>
    </main>
  );
}