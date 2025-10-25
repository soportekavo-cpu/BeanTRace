


import React, { useState, useEffect, useRef } from 'react';
import XIcon from './icons/XIcon';
import { CategorizedResults } from '../types';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string | React.ReactNode;
  results?: CategorizedResults;
}

interface SearchChatModalProps {
  isOpen: boolean;
  isSearching: boolean;
  messages: ChatMessage[];
  onClose: () => void;
  onSendMessage: (query: string) => void;
  onViewResults: (results: CategorizedResults) => void;
}

const SearchChatModal: React.FC<SearchChatModalProps> = ({ isOpen, isSearching, messages, onClose, onSendMessage, onViewResults }) => {
  const [query, setQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isSearching]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isSearching) {
      onSendMessage(query.trim());
      setQuery('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 transition-opacity duration-300" onClick={onClose}>
      <div className="bg-card rounded-lg shadow-2xl max-w-2xl w-full flex flex-col animate-fade-in-right h-[70vh]" onClick={e => e.stopPropagation()} style={{animationDuration: '0.3s'}}>
        <div className="flex justify-between items-center p-4 border-b border-border flex-shrink-0">
          <h3 className="text-lg font-bold text-foreground">Asistente Inteligente BeanTrace</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-grow p-6 space-y-4 overflow-y-auto">
            {messages.length === 0 && (
                <div className="text-center text-muted-foreground">
                    <p className="font-semibold">¿Cómo puedo ayudarte hoy?</p>
                    <p className="text-sm mt-2">Puedes buscar datos o pedir un análisis.</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-4">
                        <div className="bg-muted/50 p-3 rounded-lg text-center cursor-pointer hover:bg-muted" onClick={() => onSendMessage("muéstrame los contratos de Panamerican")}>"muéstrame los contratos de Panamerican"</div>
                        <div className="bg-muted/50 p-3 rounded-lg text-center cursor-pointer hover:bg-muted" onClick={() => onSendMessage("¿cuál fue mi proveedor más rentable el mes pasado?")}>"¿cuál fue mi proveedor más rentable?"</div>
                    </div>
                </div>
            )}
            {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-green-600 text-white' : 'bg-muted'}`}>
                        {typeof msg.content === 'string' ? <p style={{whiteSpace: 'pre-wrap'}}>{msg.content}</p> : msg.content}
                        {msg.results && (
                             <button onClick={() => onViewResults(msg.results!)} className="mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                                Ver Resultados
                            </button>
                        )}
                    </div>
                </div>
            ))}
            {isSearching && (
                 <div className="flex justify-start">
                    <div className="max-w-lg p-3 rounded-lg bg-muted flex items-center gap-2">
                        <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                        <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-border mt-auto flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Escribe tu pregunta o búsqueda aquí..."
              autoFocus
              className="w-full h-12 pl-4 pr-12 bg-muted/50 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button type="submit" disabled={isSearching || !query.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-green-600 text-white rounded-full transition-colors hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SearchChatModal;