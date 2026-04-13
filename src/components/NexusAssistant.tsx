import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Zap, BrainCircuit, Network, Mic, Square, Radio, Volume2, Loader2, Play } from 'lucide-react';
import { GoogleGenAI, ThinkingLevel, Modality, LiveServerMessage } from '@google/genai';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, setDoc } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
  createdAt: any;
};

export default function NexusAssistant() {
  const [mode, setMode] = useState<'chat' | 'live'>('chat');
  const [chatMode, setChatMode] = useState<'fast' | 'standard' | 'deep'>('standard');
  
  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // STT State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // TTS State
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Live State
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!auth.currentUser || mode === 'live') return;

    const initChat = async () => {
      try {
        const newChatRef = doc(collection(db, 'chats'));
        await setDoc(newChatRef, {
          userId: auth.currentUser!.uid,
          title: 'Nexus Session',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setChatId(newChatRef.id);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'chats');
      }
    };

    if (!chatId) {
      initChat();
      return;
    }

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      where('userId', '==', auth.currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => msgs.push({ id: doc.id, ...doc.data() } as Message));
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || Date.now();
        const timeB = b.createdAt?.toMillis?.() || Date.now();
        return timeA - timeB;
      });
      setMessages(msgs);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
    });

    return () => unsubscribe();
  }, [chatId, mode]);

  // --- Chat & STT Logic ---
  const handleSend = async () => {
    if (!input.trim() || !chatId || !auth.currentUser) return;
    const userMsg = input;
    setInput('');
    setIsLoading(true);

    try {
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        chatId, userId: auth.currentUser.uid, role: 'user', content: userMsg, createdAt: serverTimestamp()
      });

      let modelName = 'gemini-3.1-pro-preview';
      let config: any = {};
      if (chatMode === 'fast') modelName = 'gemini-3.1-flash-lite-preview';
      else if (chatMode === 'deep') config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };

      const chatHistory = messages.map(m => ({ role: m.role, parts: [{ text: m.content }] }));
      const chat = ai.chats.create({ model: modelName, config, history: chatHistory });
      const response = await chat.sendMessage({ message: userMsg });

      await addDoc(collection(db, `chats/${chatId}/messages`), {
        chatId, userId: auth.currentUser.uid, role: 'model', content: response.text, createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        handleFirestoreError(error, OperationType.CREATE, `chats/${chatId}/messages`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscribe(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing mic:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleTranscribe = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { data: base64data, mimeType: 'audio/webm' } },
              { text: 'Transcribe this audio accurately.' }
            ]
          }
        });
        if (response.text) setInput(prev => prev + (prev ? ' ' : '') + response.text);
      };
    } catch (error) {
      console.error("Error transcribing:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const playTTS = async (msgId: string, text: string) => {
    if (playingMsgId === msgId) {
      audioRef.current?.pause();
      setPlayingMsgId(null);
      return;
    }
    setPlayingMsgId(msgId);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const url = `data:audio/pcm;rate=24000;base64,${base64Audio}`;
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          audioRef.current.onended = () => setPlayingMsgId(null);
        } else {
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.play();
          audio.onended = () => setPlayingMsgId(null);
        }
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setPlayingMsgId(null);
    }
  };

  // --- Live Voice Logic ---
  const addLiveLog = (msg: string) => setLiveLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-10));

  const connectLive = async () => {
    setIsLiveConnecting(true);
    try {
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } } },
          systemInstruction: "You are Nexus, an advanced AI knowledge operating system assistant.",
        },
        callbacks: {
          onopen: () => {
            setIsLiveConnected(true);
            setIsLiveConnecting(false);
            addLiveLog("Connected to Live API");
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
              mediaStreamRef.current = stream;
              addLiveLog("Microphone active");
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) addLiveLog("Received audio chunk");
            if (message.serverContent?.interrupted) addLiveLog("Model interrupted");
          },
          onclose: () => {
            setIsLiveConnected(false);
            addLiveLog("Connection closed");
            stopLiveAudio();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            addLiveLog("Error occurred");
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error("Failed to connect live:", error);
      addLiveLog("Connection failed");
      setIsLiveConnecting(false);
    }
  };

  const disconnectLive = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    stopLiveAudio();
    setIsLiveConnected(false);
  };

  const stopLiveAudio = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      disconnectLive();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-white">Nexus Assistant</h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1">Unified Chat, Audio, and Live Voice Interaction</p>
        </div>
        <div className="flex items-center gap-4 self-start sm:self-auto">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#141414] border border-white/10 rounded-lg p-1">
            <button 
              onClick={() => setMode('chat')}
              className={`px-3 md:px-4 py-1.5 rounded text-xs md:text-sm font-medium transition-colors ${mode === 'chat' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Chat & Audio
            </button>
            <button 
              onClick={() => setMode('live')}
              className={`px-3 md:px-4 py-1.5 rounded text-xs md:text-sm font-medium flex items-center gap-2 transition-colors ${mode === 'live' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-emerald-400'}`}
            >
              <Radio className="w-3.5 h-3.5 md:w-4 md:h-4" /> Live Voice
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 border border-white/10 rounded-xl bg-[#0a0a0a] flex flex-col overflow-hidden relative">
        {mode === 'chat' ? (
          <>
            {/* Chat Header Options */}
            <div className="p-2 md:p-3 border-b border-white/10 bg-[#141414] flex flex-wrap justify-center sm:justify-end gap-2 shrink-0">
              <button onClick={() => setChatMode('fast')} className={`px-2 md:px-3 py-1 rounded text-[10px] md:text-xs font-medium flex items-center gap-1.5 transition-colors ${chatMode === 'fast' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}><Zap className="w-3 h-3 md:w-3.5 md:h-3.5" /> Fast</button>
              <button onClick={() => setChatMode('standard')} className={`px-2 md:px-3 py-1 rounded text-[10px] md:text-xs font-medium flex items-center gap-1.5 transition-colors ${chatMode === 'standard' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}><BrainCircuit className="w-3 h-3 md:w-3.5 md:h-3.5" /> Standard</button>
              <button onClick={() => setChatMode('deep')} className={`px-2 md:px-3 py-1 rounded text-[10px] md:text-xs font-medium flex items-center gap-1.5 transition-colors ${chatMode === 'deep' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-emerald-400'}`}><Network className="w-3 h-3 md:w-3.5 md:h-3.5" /> Deep Thinking</button>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <Bot className="w-10 h-10 md:w-12 md:h-12 mb-4 opacity-50" />
                  <p className="text-sm md:text-base">Initialize a new query to begin.</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {msg.role === 'user' ? <User className="w-3 h-3 md:w-4 md:h-4" /> : <Bot className="w-3 h-3 md:w-4 md:h-4" />}
                  </div>
                  <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-4 py-2.5 md:px-5 md:py-3 relative group ${msg.role === 'user' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-50' : 'bg-[#141414] border border-white/10 text-gray-200'}`}>
                    <div className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed">{msg.content}</div>
                    {msg.role === 'model' && (
                      <button 
                        onClick={() => playTTS(msg.id, msg.content)}
                        className="absolute -bottom-3 -right-2 md:-right-10 md:top-2 md:bottom-auto p-1.5 rounded-full bg-[#1a1a1a] border border-white/10 md:border-none md:bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 md:opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                        title="Read aloud"
                      >
                        {playingMsgId === msg.id ? <Square className="w-3 h-3 md:w-4 md:h-4" /> : <Volume2 className="w-3 h-3 md:w-4 md:h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 md:gap-4">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0"><Bot className="w-3 h-3 md:w-4 md:h-4" /></div>
                  <div className="bg-[#141414] border border-white/10 rounded-2xl px-4 py-2.5 md:px-5 md:py-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 md:p-4 bg-[#141414] border-t border-white/10">
              <div className="relative flex items-center gap-2">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2.5 md:p-3 rounded-xl transition-colors shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                  title="Voice Input (STT)"
                >
                  {isTranscribing ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isRecording ? "Listening..." : isTranscribing ? "Transcribing..." : "Enter your query..."}
                  className="flex-1 min-w-0 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-xs md:text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  disabled={isLoading || !auth.currentUser || isRecording || isTranscribing}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim() || !auth.currentUser}
                  className="p-2.5 md:p-3 rounded-xl bg-emerald-500 text-black hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-colors shrink-0"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
              {!auth.currentUser && <p className="text-[10px] md:text-xs text-red-400 mt-2 text-center">Please sign in to use the assistant.</p>}
            </div>
          </>
        ) : (
          // Live Voice UI
          <div className="flex-1 flex flex-col items-center justify-center relative p-4">
            <div className="absolute inset-0 flex items-center justify-center opacity-20 overflow-hidden">
              <div className={`w-48 h-48 md:w-64 md:h-64 rounded-full border border-emerald-500/30 ${isLiveConnected ? 'animate-ping' : ''}`} style={{ animationDuration: '3s' }}></div>
              <div className={`absolute w-32 h-32 md:w-48 md:h-48 rounded-full border border-emerald-500/50 ${isLiveConnected ? 'animate-ping' : ''}`} style={{ animationDuration: '2s' }}></div>
            </div>

            <div className="z-10 flex flex-col items-center gap-6 md:gap-8">
              <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all duration-500 ${isLiveConnected ? 'bg-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.3)]' : 'bg-white/5'}`}>
                <Volume2 className={`w-10 h-10 md:w-12 md:h-12 ${isLiveConnected ? 'text-emerald-400' : 'text-gray-600'}`} />
              </div>
              
              <button
                onClick={isLiveConnected ? disconnectLive : connectLive}
                disabled={isLiveConnecting}
                className={`px-6 py-3 md:px-8 md:py-4 rounded-full text-sm md:text-base font-medium flex items-center gap-2 md:gap-3 transition-all ${
                  isLiveConnected 
                    ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30' 
                    : 'bg-emerald-500 text-black hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
                }`}
              >
                {isLiveConnecting ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : isLiveConnected ? <Square className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
                {isLiveConnecting ? 'Connecting...' : isLiveConnected ? 'End Conversation' : 'Start Live Conversation'}
              </button>
            </div>

            <div className="absolute bottom-4 left-4 right-4 h-24 md:h-32 bg-black/40 border border-white/10 rounded-xl p-3 md:p-4 overflow-auto font-mono text-[10px] md:text-xs text-gray-400 space-y-1">
              {liveLogs.length === 0 ? <p className="italic">Live session logs will appear here...</p> : liveLogs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
