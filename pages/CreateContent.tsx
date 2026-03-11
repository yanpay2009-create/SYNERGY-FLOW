import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Wand2, Image as ImageIcon, Send, Sparkles, X, AlertTriangle, Loader2, Video, Film, Clock, CheckCircle2, Layers, Megaphone, Layout, Trophy, PlusSquare, User, Trash2, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";

export const CreateContent: React.FC = () => {
  const { createPost, updateFeedPost, deleteFeedPost, orders, feed, user, products } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [mood, setMood] = useState('Excited');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showContentList, setShowContentList] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isMediaValid, setIsMediaValid] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  // My Created Contents
  const myContents = useMemo(() => {
    if (!user) return [];
    return feed.filter(f => f.userId === user.email && f.isAi);
  }, [feed, user]);

    // Logic: Calculate available content credits (1 per item purchased)
  const availableCredits = useMemo(() => {
    if (!user) return 0;
    const totalPurchasedUnits = orders.reduce((acc, order) => {
        return acc + order.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
    const totalAiPosts = myContents.length;
    // Strictly 1 credit per 1 unit purchased as requested
    return Math.max(0, totalPurchasedUnits - totalAiPosts);
  }, [orders, myContents, user]);

  const moods = ['Excited', 'Professional', 'Funny', 'Relaxed', 'Persuasive'];

  const handleMediaClick = () => { fileInputRef.current?.click(); };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
        alert("Please upload an image or video file.");
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const base64 = reader.result as string;
        
        if (isVideo) {
            const videoElement = document.createElement('video');
            videoElement.preload = 'metadata';
            videoElement.onloadedmetadata = () => {
                window.URL.revokeObjectURL(videoElement.src);
                const duration = videoElement.duration;
                setVideoDuration(duration);
                
                if (duration > 60) {
                    setIsMediaValid(false);
                    alert("Video must be 60 seconds or less.");
                    setMedia(null);
                    setMediaType(null);
                } else {
                    setIsMediaValid(true);
                    setMedia(base64);
                    setMediaType('video');
                }
            };
            videoElement.src = URL.createObjectURL(file);
        } else {
            setIsMediaValid(true);
            setMedia(base64);
            setMediaType('image');
            setVideoDuration(0);
        }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    setMedia(null); 
    setMediaType(null);
    setVideoDuration(0);
    setIsMediaValid(true);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  // NEW: Transform uploaded image into Ad Visual using AI
  const handleTransformImage = async () => {
    if (availableCredits <= 0 && !editingPostId) {
        alert("No credits remaining. Purchase more items to use AI tools.");
        return;
    }
    if (!media || mediaType !== 'image') {
        alert("Please upload an image first.");
        return;
    }
    if (!topic) {
        alert("Please enter the Product Subject so AI knows what to focus on.");
        return;
    }

    setIsGeneratingImage(true);
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Gemini API Key is missing.");
        }
        const ai = new GoogleGenAI({ apiKey });
        const base64Data = media.split(',')[1];
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mediaType === 'video' ? 'video/mp4' : 'image/png'
                        }
                    },
                    {
                        text: `Transform this user photo into a professional, high-conversion advertisement visual for "${topic}". ${details ? `Focus on these features: ${details}.` : ''} 
                        Style: High-end commercial photography, studio lighting, vibrant colors, premium product placement. 
                        Requirement: Do NOT add any text, logos, or watermarks. Just enhance the visual quality, background, and lighting to make it look like a professional ad. Return the enhanced image.`
                    }
                ]
            }
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    setMedia(`data:image/png;base64,${part.inlineData.data}`);
                    setMediaType('image');
                    break;
                }
            }
        }
    } catch (error) {
        console.error("AI Image Generation failed:", error);
        alert("AI Image Engine is busy. Please try again later.");
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!media || mediaType !== 'image') return;
    setIsAnalyzing(true);
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("Gemini API Key is missing.");
        const ai = new GoogleGenAI({ apiKey });
        const base64Data = media.split(',')[1];
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: 'image/png'
                        }
                    },
                    {
                        text: "Analyze this product image. Provide a short, catchy 'Product Subject' (max 5 words) and a list of 'Key Selling Points' (bullet points). Format the response as JSON with keys 'subject' and 'points'."
                    }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(response.text);
        if (result.subject) setTopic(result.subject);
        if (result.points) setDetails(Array.isArray(result.points) ? result.points.join(', ') : result.points);
    } catch (error) {
        console.error("Analysis failed:", error);
        alert("Could not analyze image. Please fill details manually.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleGenerateCaption = async () => {
      if (availableCredits <= 0 && !editingPostId) {
          alert("You have run out of content credits.");
          return;
      }
      if (!topic || !details) { alert("Please enter topic and details."); return; }
      setIsGenerating(true);
      setApiError(null);
      
      try {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
              throw new Error("Gemini API Key is missing.");
          }
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `Act as a world-class social media marketing expert. 
          Create a high-conversion sales advertisement caption for a product called "${topic}". 
          Key Selling Points to highlight: ${details}. 
          Mood/Tone: ${mood}. 
          Target Platform: ${mediaType === 'video' ? 'TikTok/Reels (Short Video)' : 'Instagram/Facebook (Photo Post)'}.
          
          Structure:
          1. Hook: Start with a scroll-stopping opening line.
          2. Value: Explain why the user needs this.
          3. Social Proof/Urgency: Add a sense of exclusivity or popularity.
          4. CTA: Clear call to action to shop now.
          5. Hashtags: 3-5 relevant hashtags including #SynergyFlow.
          
          Constraints:
          - Language: Thai (if the input is Thai) or English (if the input is English).
          - Length: Keep it punchy and under 250 characters.
          - Emojis: Use them strategically.`;

          const response = await ai.models.generateContent({
             model: 'gemini-3-flash-preview',
             contents: [{ parts: [{ text: prompt }] }]
          });

          const resultText = response.text;
          if (resultText) setGeneratedContent(resultText.trim());
      } catch (error: any) {
          setApiError("AI Engine busy. Using fallback template.");
          setGeneratedContent(`🔥 LIMITED OFFER: Get the ${topic} now! ${details} 🚀 High performance guaranteed. Tap the link to shop! #Ad #Promo #Synergy`);
      } finally {
          setIsGenerating(false);
      }
  };

  const handlePost = () => {
      if (!media || !generatedContent) return;
      
      if (editingPostId) {
          updateFeedPost(editingPostId, {
              content: media,
              caption: generatedContent,
              mood,
              productId: selectedProductId || undefined
          });
          alert("Content updated successfully!");
          resetForm();
      } else {
          createPost({ 
            image: media, 
            caption: generatedContent, 
            mood, 
            isAd: true,
            productId: selectedProductId || undefined
          });
          navigate('/feed');
      }
  };

  const resetForm = () => {
      setTopic('');
      setDetails('');
      setMood('Excited');
      setSelectedProductId(null);
      setMedia(null);
      setMediaType(null);
      setGeneratedContent('');
      setEditingPostId(null);
  };

  const handleEdit = (post: any) => {
      setEditingPostId(post.id);
      setTopic(post.caption.split('\n')[0].replace('🔥 LIMITED OFFER: Get the ', '').replace(' now!', '') || '');
      setDetails(''); // We don't store details separately in FeedItem, so we leave it empty or try to parse
      setMood(post.mood || 'Excited');
      setSelectedProductId(post.productId || null);
      setMedia(post.content);
      setMediaType(post.type);
      setGeneratedContent(post.caption);
      setShowContentList(false);
  };

  const handleDelete = (postId: number) => {
      if (window.confirm("Are you sure you want to delete this content?")) {
          deleteFeedPost(postId);
      }
  };

  return (
    <div className="pb-24 pt-0 px-4 max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="sticky top-0 z-[100] bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100/50 dark:border-gray-800/50 -mx-4 px-4 py-3 mb-6 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
              <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition">
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-xl font-bold ml-2 text-gray-900 dark:text-white tracking-tight">Content Studio</h1>
          </div>
          
          <div 
              onClick={() => setShowContentList(true)}
              className="relative group cursor-pointer active:scale-95 transition-transform"
          >
              <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-soft border border-gray-100 dark:border-gray-700 overflow-hidden">
                  {user?.avatar ? (
                      <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-synergy-blue">
                          <User size={20} />
                      </div>
                  )}
              </div>
              <div className="absolute -top-1.5 -right-1.5 bg-synergy-blue text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-md">
                  {availableCredits}
              </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
        
        <div 
            onClick={media ? undefined : handleMediaClick}
            className={`w-full h-80 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group ${media ? 'border-transparent' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
        >
            {media ? (
                <>
                    {mediaType === 'video' ? (
                        <video src={media} className="w-full h-full object-cover" controls playsInline />
                    ) : (
                        <img src={media} alt="Selected" className="w-full h-full object-cover" />
                    )}
                    
                    {/* Action Buttons on Media */}
                    <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
                        {mediaType === 'image' && (
                            <>
                                <button 
                                    onClick={handleAnalyzeImage}
                                    disabled={isAnalyzing || isGeneratingImage}
                                    className={`backdrop-blur-md px-3 py-2 rounded-xl text-white text-[10px] font-black uppercase flex items-center space-x-2 transition shadow-lg ${isAnalyzing ? 'bg-synergy-blue/50' : 'bg-synergy-blue/80 hover:bg-synergy-blue active:scale-95'}`}
                                >
                                    {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                    <span>Magic Analyze</span>
                                </button>
                                <button 
                                    onClick={handleTransformImage}
                                    disabled={isGeneratingImage || !topic || isAnalyzing}
                                    className={`backdrop-blur-md px-3 py-2 rounded-xl text-white text-[10px] font-black uppercase flex items-center space-x-2 transition shadow-lg ${isGeneratingImage ? 'bg-indigo-500/50' : 'bg-indigo-600/80 hover:bg-indigo-600 active:scale-95'}`}
                                >
                                    {isGeneratingImage ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    <span>AI Ad Visual</span>
                                </button>
                            </>
                        )}
                        <button onClick={handleRemoveMedia} className="bg-black/60 backdrop-blur-md text-white p-2 rounded-xl hover:bg-red-500 transition shadow-lg"><X size={18} /></button>
                    </div>

                    {isGeneratingImage && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
                            <Loader2 size={40} className="animate-spin mb-3" />
                            <p className="text-xs font-black uppercase tracking-[0.2em]">Crafting Ad Visual...</p>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
                            <Loader2 size={40} className="animate-spin mb-3" />
                            <p className="text-xs font-black uppercase tracking-[0.2em]">Analyzing Product...</p>
                        </div>
                    )}
                    
                    {mediaType === 'video' && (
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-black flex items-center space-x-1 border border-white/20">
                            <Clock size={12} />
                            <span>{videoDuration.toFixed(1)}s / 60s</span>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center text-gray-400 p-8">
                    <div className="flex justify-center space-x-4 mb-4">
                        <div className="w-14 h-14 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center"><ImageIcon size={32} className="opacity-40" /></div>
                        <div className="w-14 h-14 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center"><Film size={32} className="opacity-40 text-synergy-blue" /></div>
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.2em]">Upload Content</p>
                    <p className="text-[10px] text-gray-400 mt-2 font-bold">1 purchase = 1 AI content credit</p>
                </div>
            )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-soft dark:shadow-none border border-transparent dark:border-gray-700 space-y-6">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Product to Review</label>
                <button 
                    onClick={() => setShowProductPicker(true)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex items-center justify-between text-sm focus:outline-none focus:ring-2 focus:ring-synergy-blue/20 dark:text-white font-bold"
                >
                    {selectedProductId ? (
                        <div className="flex items-center space-x-3">
                            <img src={products.find(p => p.id === selectedProductId)?.image} className="w-8 h-8 rounded-lg object-cover" alt="Product" />
                            <span>{products.find(p => p.id === selectedProductId)?.name}</span>
                        </div>
                    ) : (
                        <span className="text-gray-400">Choose a product...</span>
                    )}
                    <PlusSquare size={18} className="text-synergy-blue" />
                </button>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Subject</label>
                <input 
                    value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex. Ultra Slim Powerbank"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-synergy-blue/20 dark:text-white font-bold"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Key Selling Points</label>
                <textarea 
                    value={details} onChange={(e) => setDetails(e.target.value)} placeholder="20,000mAh, PD charging, LED display..."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-synergy-blue/20 dark:text-white font-medium leading-relaxed"
                />
            </div>
            
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Caption Tone</label>
                <div className="flex flex-wrap gap-2">
                    {moods.map(m => (
                        <button 
                            key={m} onClick={() => setMood(m)}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition ${mood === m ? 'bg-synergy-blue text-white shadow-glow' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            <button 
                onClick={handleGenerateCaption} disabled={isGenerating || !topic || !details || (availableCredits <= 0 && !editingPostId)}
                className={`w-full bg-gradient-to-r from-synergy-blue to-indigo-600 text-white font-black py-4 rounded-[20px] shadow-glow flex items-center justify-center space-x-2 active:scale-[0.98] transition disabled:opacity-50 uppercase tracking-[0.2em] text-xs h-16`}
            >
                {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <><Sparkles size={20} /><span>{editingPostId ? 'Regenerate AI Ad Caption' : 'Generate AI Ad Caption'}</span></>}
            </button>
        </div>

        {generatedContent && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-soft dark:shadow-none border border-transparent dark:border-gray-700 animate-in slide-in-from-bottom-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-synergy-blue">
                        <Sparkles size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Strategy Optimized</span>
                    </div>
                    {editingPostId && (
                        <button onClick={resetForm} className="text-[10px] font-black text-red-500 uppercase tracking-widest">Cancel Edit</button>
                    )}
                </div>
                {apiError && (
                    <div className="mb-4 flex items-center space-x-2 p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-[10px] font-bold rounded-lg border border-amber-100 dark:border-amber-800">
                        <AlertTriangle size={12} />
                        <span>{apiError}</span>
                    </div>
                )}
                <textarea 
                    value={generatedContent} onChange={(e) => setGeneratedContent(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-6 border border-gray-100 dark:border-gray-700 focus:outline-none h-40 resize-none font-medium"
                />
                <button 
                    onClick={handlePost} disabled={!media || !isMediaValid}
                    className={`w-full h-16 rounded-[20px] font-black uppercase tracking-[0.2em] text-xs transition ${(!media || !isMediaValid) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl'}`}
                >
                    {editingPostId ? 'Update Ad' : 'Publish Ad (-1 Credit)'}
                </button>
            </div>
        )}
      </div>

      {/* Created Content List Modal */}
      {showContentList && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowContentList(false)}></div>
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-[40px] relative animate-in slide-in-from-bottom-full duration-300 flex flex-col h-[80vh] border-t border-white/10">
                <div className="w-full pt-4 pb-2 flex flex-col items-center justify-center cursor-pointer" onClick={() => setShowContentList(false)}>
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mb-1"></div>
                </div>
                <div className="px-6 flex justify-between items-center mb-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">My Created Content</h3>
                    <button onClick={() => setShowContentList(false)} className="p-1 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
                    {myContents.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <PlusSquare size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-black uppercase tracking-widest">No content created yet</p>
                        </div>
                    ) : (
                        myContents.map(post => (
                            <div key={post.id} className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-4 border border-gray-100 dark:border-gray-700 flex space-x-4">
                                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                                    {post.type === 'video' ? (
                                        <video src={post.content} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={post.content} className="w-full h-full object-cover" alt="Content" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-700 dark:text-gray-200 line-clamp-2 font-medium leading-relaxed mb-3">{post.caption}</p>
                                    <div className="flex items-center space-x-2">
                                        <button 
                                            onClick={() => handleEdit(post)}
                                            className="flex-1 bg-white dark:bg-gray-700 text-synergy-blue py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border border-gray-100 dark:border-gray-600 flex items-center justify-center space-x-1.5"
                                        >
                                            <Edit3 size={12} />
                                            <span>Edit</span>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(post.id)}
                                            className="bg-red-50 dark:bg-red-900/20 text-red-500 p-2 rounded-xl border border-red-100 dark:border-red-900/30"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Product Picker Modal */}
      {showProductPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProductPicker(false)}></div>
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-[40px] relative animate-in slide-in-from-bottom-full duration-300 flex flex-col h-[70vh] border-t border-white/10">
                <div className="w-full pt-4 pb-2 flex flex-col items-center justify-center cursor-pointer" onClick={() => setShowProductPicker(false)}>
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mb-1"></div>
                </div>
                <div className="px-6 flex justify-between items-center mb-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Select Product</h3>
                    <button onClick={() => setShowProductPicker(false)} className="p-1 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
                    {products.map(product => (
                        <button 
                            key={product.id}
                            onClick={() => { setSelectedProductId(product.id); setTopic(product.name); setShowProductPicker(false); }}
                            className={`w-full flex items-center space-x-4 p-4 rounded-2xl border transition-all ${selectedProductId === product.id ? 'bg-blue-50 border-synergy-blue dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800 border-transparent hover:border-gray-200'}`}
                        >
                            <img src={product.image} className="w-16 h-16 rounded-xl object-cover shadow-sm" alt={product.name} />
                            <div className="text-left">
                                <p className="font-black text-gray-900 dark:text-white text-sm">{product.name}</p>
                                <p className="text-synergy-blue font-black text-xs mt-1">฿{(product.price ?? 0).toLocaleString()}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>

  );
};