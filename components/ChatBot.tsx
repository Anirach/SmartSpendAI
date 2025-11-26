import React, { useState, useRef, useEffect } from 'react';
import { createChatSession, isRateLimitError } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Send, User, Bot, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { GenerateContentResponse } from "@google/genai";

export const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: "Hello! I'm your Gemini FinBot. Ask me anything about budgeting strategies, saving tips, or financial concepts.", timestamp: Date.now() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat session once
  useEffect(() => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = createChatSession();
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsStreaming(true);

    try {
      // Create a temporary model message to fill
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '', timestamp: Date.now() }]);

      const streamResult = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
      
      let fullText = '';
      
      for await (const chunk of streamResult) {
        const c = chunk as GenerateContentResponse;
        const textChunk = c.text || ''; // Access .text property directly
        fullText += textChunk;
        
        setMessages(prev => prev.map(msg => 
          msg.id === botMsgId ? { ...msg, text: fullText } : msg
        ));
      }
    } catch (error: any) {
      console.error("Chat error", error);
      
      let errorText = "Sorry, I encountered an error. Please try again.";
      if (isRateLimitError(error)) {
        errorText = "⚠️ usage limits exceeded. Please wait a minute before trying again.";
      }

      setMessages(prev => {
        // Remove the empty loading message if it exists (last message if empty)
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === 'model' && lastMsg.text === '') {
           return [...prev.slice(0, -1), { id: Date.now().toString(), role: 'model', text: errorText, timestamp: Date.now() }];
        }
        return [...prev, { id: Date.now().toString(), role: 'model', text: errorText, timestamp: Date.now() }];
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
         <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center text-white shadow-lg">
                <Sparkles size={20} />
             </div>
             <div>
                <h3 className="font-bold text-slate-800">Gemini FinBot</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                   <span className="w-2 h-2 rounded-full bg-green-500"></span> Online • gemini-3-pro
                </p>
             </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide bg-slate-50/30">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-blue-100 text-blue-600'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-slate-800 text-white rounded-tr-none' 
                : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
            }`}>
               <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
               {msg.text === '' && isStreaming && msg.role === 'model' && (
                 <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1">|</span>
               )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about budgeting, debt strategies, or financial concepts..."
            className="w-full resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all max-h-32"
            rows={1}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming}
            className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:hover:bg-blue-600 shadow-md"
          >
            {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          Gemini can make mistakes. Consider checking important information. Not financial advice.
        </p>
      </div>
    </div>
  );
};