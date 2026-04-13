declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

import { useState } from 'react';
import { Network, FileText, Headphones, Video, Download, Loader2, Play } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function InsightsOverviews() {
  const [activeTab, setActiveTab] = useState<'visual' | 'strategic' | 'audio' | 'video'>('visual');
  const [topic, setTopic] = useState('NexusLM Architecture');
  
  // Generation States
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const downloadFile = (content: string | Blob, filename: string, type: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportVisual = (format: 'json' | 'md') => {
    const data = {
      core: topic,
      nodes: ['Financial Context', 'Market Analysis', 'Technical Specs', 'Risk Factors']
    };
    if (format === 'json') {
      downloadFile(JSON.stringify(data, null, 2), `${topic.replace(/\s+/g, '_')}_MindMap.json`, 'application/json');
    } else {
      const md = `# Mind Map: ${topic}\n\n- Financial Context\n- Market Analysis\n- Technical Specs\n- Risk Factors`;
      downloadFile(md, `${topic.replace(/\s+/g, '_')}_MindMap.md`, 'text/markdown');
    }
  };

  const exportStrategic = (format: 'json' | 'md') => {
    const data = { title: `Strategic Report: ${topic}`, sections: ['Key Partners', 'Key Activities', 'Value Propositions'] };
    if (format === 'json') {
      downloadFile(JSON.stringify(data, null, 2), `${topic.replace(/\s+/g, '_')}_BMC.json`, 'application/json');
    } else {
      const md = `# Strategic Report: ${topic}\n\n## Key Partners\n...\n## Value Propositions\n...`;
      downloadFile(md, `${topic.replace(/\s+/g, '_')}_BMC.md`, 'text/markdown');
    }
  };

  const generateAudioOverview = async () => {
    setIsGeneratingAudio(true);
    try {
      const prompt = `Create a short 2-person podcast overview discussing: ${topic}. 
      Host: Welcome to the overview. Today we are discussing ${topic}.
      Expert: Thanks for having me. It's a fascinating subject.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: 'Host', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                { speaker: 'Expert', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
              ]
            }
          }
        }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        setAudioUrl(`data:audio/mp3;base64,${base64Audio}`);
      }
    } catch (error) {
      console.error("Audio generation failed:", error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const generateVideoOverview = async () => {
    setIsGeneratingVideo(true);
    try {
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
      }
      const localAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      
      let operation = await localAi.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `A cinematic, high-tech visualization representing: ${topic}`,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await localAi.operations.getVideosOperation({operation: operation});
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        const response = await fetch(uri, { headers: { 'x-goog-api-key': apiKey! } });
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
      }
    } catch (error) {
      console.error("Video generation failed:", error);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Insights & Overviews</h1>
          <p className="text-sm text-gray-400 mt-1">Generated artifacts based on search context</p>
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="text" 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Overview Topic..."
            className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 w-64"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        {[
          { id: 'visual', label: 'Visual Map', icon: Network },
          { id: 'strategic', label: 'Strategic Report', icon: FileText },
          { id: 'audio', label: 'Audio Podcast', icon: Headphones },
          { id: 'video', label: 'Video Overview', icon: Video },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 relative">
        {/* Visual Intelligence Tab */}
        {activeTab === 'visual' && (
          <div className="h-full flex flex-col gap-4">
            <div className="flex justify-end gap-2">
              <button onClick={() => exportVisual('json')} className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 flex items-center gap-2"><Download className="w-3.5 h-3.5"/> JSON</button>
              <button onClick={() => exportVisual('md')} className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 flex items-center gap-2"><Download className="w-3.5 h-3.5"/> Markdown</button>
            </div>
            <div className="flex-1 border border-white/10 rounded-xl bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
              <div className="relative w-full h-full max-w-3xl max-h-[600px]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center z-10 backdrop-blur-sm">
                  <div className="text-center px-2">
                    <Network className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <div className="text-xs font-medium text-emerald-100 truncate w-24">{topic}</div>
                  </div>
                </div>
                {/* Connected Nodes */}
                {[
                  { top: '20%', left: '20%', label: 'Context', color: 'blue' },
                  { top: '20%', left: '80%', label: 'Analysis', color: 'purple' },
                  { top: '80%', left: '25%', label: 'Specs', color: 'amber' },
                  { top: '75%', left: '75%', label: 'Risks', color: 'rose' },
                ].map((node, i) => (
                  <div key={i} className="absolute" style={{ top: node.top, left: node.left, transform: 'translate(-50%, -50%)' }}>
                    <div className={`w-24 h-24 bg-${node.color}-500/10 border border-${node.color}-500/30 rounded-full flex items-center justify-center z-10 backdrop-blur-sm`}>
                      <div className="text-[10px] font-medium text-gray-300 text-center px-2">{node.label}</div>
                    </div>
                  </div>
                ))}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="50%" y1="50%" x2="80%" y2="20%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="50%" y1="50%" x2="25%" y2="80%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="50%" y1="50%" x2="75%" y2="75%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Strategic Reporting Tab */}
        {activeTab === 'strategic' && (
          <div className="h-full flex flex-col gap-4">
            <div className="flex justify-end gap-2">
              <button onClick={() => exportStrategic('json')} className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 flex items-center gap-2"><Download className="w-3.5 h-3.5"/> JSON</button>
              <button onClick={() => exportStrategic('md')} className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 flex items-center gap-2"><Download className="w-3.5 h-3.5"/> Markdown</button>
            </div>
            <div className="flex-1 border border-white/10 rounded-xl bg-[#141414] p-6 overflow-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-white/10 rounded-lg p-4 bg-black/20">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Key Activities</h3>
                  <p className="text-sm text-gray-300">Analysis and synthesis of {topic}.</p>
                </div>
                <div className="border border-emerald-500/20 rounded-lg p-4 bg-emerald-500/5">
                  <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Value Proposition</h3>
                  <p className="text-sm text-emerald-100/80">Delivering deep insights regarding {topic}.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audio Podcast Tab */}
        {activeTab === 'audio' && (
          <div className="h-full flex flex-col gap-4">
            <div className="flex justify-end gap-2">
              {audioUrl && (
                <button onClick={() => downloadFile(audioUrl, `${topic.replace(/\s+/g, '_')}_Podcast.mp3`, 'audio/mp3')} className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 flex items-center gap-2"><Download className="w-3.5 h-3.5"/> MP3</button>
              )}
            </div>
            <div className="flex-1 border border-white/10 rounded-xl bg-[#141414] flex flex-col items-center justify-center p-6">
              <Headphones className="w-16 h-16 text-emerald-500 mb-6 opacity-80" />
              <h2 className="text-xl font-medium text-white mb-2">Multi-Speaker Audio Overview</h2>
              <p className="text-sm text-gray-400 mb-8 text-center max-w-md">Generate a conversational podcast discussing the key points of "{topic}".</p>
              
              {audioUrl ? (
                <div className="w-full max-w-md bg-black/40 p-4 rounded-xl border border-white/10">
                  <audio controls src={audioUrl} className="w-full" />
                </div>
              ) : (
                <button 
                  onClick={generateAudioOverview}
                  disabled={isGeneratingAudio}
                  className="px-6 py-3 rounded-xl bg-emerald-500 text-black font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isGeneratingAudio ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  {isGeneratingAudio ? 'Synthesizing...' : 'Generate Podcast'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Video Overview Tab */}
        {activeTab === 'video' && (
          <div className="h-full flex flex-col gap-4">
            <div className="flex justify-end gap-2">
              {videoUrl && (
                <button onClick={() => downloadFile(videoUrl, `${topic.replace(/\s+/g, '_')}_Video.mp4`, 'video/mp4')} className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 flex items-center gap-2"><Download className="w-3.5 h-3.5"/> MP4</button>
              )}
            </div>
            <div className="flex-1 border border-white/10 rounded-xl bg-[#141414] flex flex-col items-center justify-center p-6">
              <Video className="w-16 h-16 text-blue-500 mb-6 opacity-80" />
              <h2 className="text-xl font-medium text-white mb-2">Cinematic Video Overview</h2>
              <p className="text-sm text-gray-400 mb-8 text-center max-w-md">Generate a high-quality video visualization for "{topic}" using Veo.</p>
              
              {videoUrl ? (
                <div className="w-full max-w-2xl bg-black/40 p-2 rounded-xl border border-white/10">
                  <video controls src={videoUrl} className="w-full rounded-lg" autoPlay loop />
                </div>
              ) : (
                <button 
                  onClick={generateVideoOverview}
                  disabled={isGeneratingVideo}
                  className="px-6 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isGeneratingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  {isGeneratingVideo ? 'Rendering Video (This may take a few minutes)...' : 'Generate Video'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
