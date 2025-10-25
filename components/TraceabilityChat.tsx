

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import api from '../services/localStorageManager';
import SendIcon from './icons/SendIcon';
import SparklesIcon from './icons/SparklesIcon';
import { useAuth } from '../contexts/AuthContext';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

const DAILY_QUERY_LIMIT = 20;

const getGreeting = (userName: string) => {
    const hour = new Date().getHours();
    let timeGreeting = "¡Hola";
    if (hour < 12) {
        timeGreeting = "Buenos días";
    } else if (hour < 18) {
        timeGreeting = "Buenas tardes";
    } else {
        timeGreeting = "Buenas noches";
    }
    return `${timeGreeting}, ${userName}. Soy KAVO, tu asistente de trazabilidad. ¿En qué puedo ayudarte hoy?`;
}

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
    const renderLine = (line: string, index: number) => {
        const headingMatch = line.match(/^(#{3,4})\s(.*)/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = headingMatch[2].replace(/\*\*/g, '');
            const className = "font-semibold mt-4 mb-2 text-green-600 dark:text-green-400";
            if (level === 3) return <h3 key={index} className={`text-lg ${className}`}>{text}</h3>;
            if (level === 4) return <h4 key={index} className={`text-base ${className}`}>{text}</h4>;
        }

        const text = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>');
        return <p key={index} dangerouslySetInnerHTML={{ __html: text }} />;
    };

    const parts = useMemo(() => {
        const elements: React.ReactNode[] = [];
        const lines = content.split('\n');
        let inList = false;
        let listItems: string[] = [];

        lines.forEach((line, index) => {
            const isListItem = line.startsWith('* ') || line.startsWith('- ');
            
            if (isListItem) {
                if (!inList) {
                    inList = true;
                    listItems = [];
                }
                listItems.push(line);
            } else {
                if (inList) {
                    elements.push(
                        <ul key={`ul-${index}`} className="list-disc pl-5 space-y-1 my-2">
                            {listItems.map((item, itemIndex) => {
                                const text = item.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>');
                                return <li key={itemIndex} dangerouslySetInnerHTML={{ __html: text }} />;
                            })}
                        </ul>
                    );
                    inList = false;
                    listItems = [];
                }
                if (line.trim() !== '') {
                    elements.push(renderLine(line, index));
                }
            }
        });

        if (inList) {
            elements.push(
                <ul key={`ul-end`} className="list-disc pl-5 space-y-1 my-2">
                    {listItems.map((item, itemIndex) => {
                        const text = item.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>');
                        return <li key={itemIndex} dangerouslySetInnerHTML={{ __html: text }} />;
                    })}
                </ul>
            );
        }

        return elements;
    }, [content]);

    return <div className="space-y-1">{parts}</div>;
};


const TraceabilityChat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remainingQueries, setRemainingQueries] = useState(DAILY_QUERY_LIMIT);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const initialGreeting = getGreeting(user?.name || 'Usuario');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastChatDay = sessionStorage.getItem('traceabilityChatLastDay');

    if (lastChatDay !== today) {
      sessionStorage.setItem('traceabilityChatHistory', JSON.stringify([{ role: 'model', content: initialGreeting }]));
      sessionStorage.setItem('traceabilityChatLastDay', today);
    }
    
    try {
      const savedHistory = sessionStorage.getItem('traceabilityChatHistory');
      setMessages(savedHistory ? JSON.parse(savedHistory) : [{ role: 'model', content: initialGreeting }]);
    } catch (error) {
      console.error("Could not load chat history", error);
      setMessages([{ role: 'model', content: initialGreeting }]);
    }
  }, []);

  useEffect(() => {
    try {
      if (messages.length > 0) {
        sessionStorage.setItem('traceabilityChatHistory', JSON.stringify(messages));
      }
    } catch (error) {
      console.error("Could not save chat history", error);
    }
  }, [messages]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const usageData = JSON.parse(localStorage.getItem('chatUsage') || '{}');
      if (usageData.date === today) {
        setRemainingQueries(Math.max(0, DAILY_QUERY_LIMIT - usageData.count));
      } else {
        localStorage.setItem('chatUsage', JSON.stringify({ date: today, count: 0 }));
        setRemainingQueries(DAILY_QUERY_LIMIT);
      }
    } catch (error) {
      console.error("Could not process chat usage data", error);
      localStorage.removeItem('chatUsage');
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages, isLoading]);
  
  const handleSendMessage = async (query: string) => {
    if (!query || isLoading || remainingQueries <= 0) return;

    const userMessage: ChatMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInputValue('');

    const today = new Date().toISOString().split('T')[0];
    const usageData = JSON.parse(localStorage.getItem('chatUsage') || '{}');
    const newCount = (usageData.date === today ? usageData.count : 0) + 1;
    localStorage.setItem('chatUsage', JSON.stringify({ date: today, count: newCount }));
    setRemainingQueries(DAILY_QUERY_LIMIT - newCount);

    try {
      const collectionsToFetch = ['contracts', 'contractLots', 'purchaseReceipts', 'threshingOrders', 'threshingOrderReceipts', 'rendimientos', 'reprocesos', 'mezclas', 'salidas', 'suppliers', 'clients', 'exporters', 'buyers'];
      const allDataPromises = collectionsToFetch.map(name => api.getCollection(name));
      const allDataResults = await Promise.all(allDataPromises);
      
      const dataContext = collectionsToFetch.reduce((acc, name, index) => {
        acc[name] = allDataResults[index];
        return acc;
      }, {} as Record<string, any[]>);

      const getLatest = (items: any[], dateField: string, count: number) => items.sort((a, b) => new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime()).slice(0, count);

      const recentDataContext = {
          contracts: getLatest(dataContext.contracts, 'saleDate', 20),
          purchaseReceipts: getLatest(dataContext.purchaseReceipts, 'fecha', 25),
          threshingOrders: getLatest(dataContext.threshingOrders, 'creationDate', 20),
          rendimientos: getLatest(dataContext.rendimientos, 'creationDate', 15),
          reprocesos: getLatest(dataContext.reprocesos, 'creationDate', 15),
          mezclas: getLatest(dataContext.mezclas, 'creationDate', 15),
          salidas: getLatest(dataContext.salidas, 'fecha', 15),
          contractLots: dataContext.contractLots,
          threshingOrderReceipts: dataContext.threshingOrderReceipts,
          suppliers: dataContext.suppliers,
          clients: dataContext.clients,
          exporters: dataContext.exporters,
          buyers: dataContext.buyers,
      };

      const dataContextString = `CONTEXTO DE BASE DE DATOS:\n${JSON.stringify(recentDataContext, null, 2)}`;
      
      const chatHistory = messages.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      const fullPrompt = `${dataContextString}\n\nHISTORIAL DE CHAT RECIENTE:\n${chatHistory}\n\nNUEVA PREGUNTA DEL USUARIO:\n${query}`;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          systemInstruction: "Eres un asistente experto en trazabilidad de café para el sistema BeanTrace. Tu nombre es KAVO. Respondes preguntas sobre el ciclo de vida de productos usando el contexto y el historial de chat proporcionado. Eres conciso, amigable y profesional. REGLAS CRÍTICAS: 1. NUNCA, bajo ninguna circunstancia, muestres los IDs internos de los documentos (ej: (con ID ...)). No son relevantes para el usuario. 2. Tus respuestas deben ser en español y formateadas en Markdown legible. Usa ### para títulos de sección (ej: ### 1. Compra de Café), listas con '*' o '-' para los detalles, y ** para negritas. No uses más de un nivel de título. 3. Todas las unidades de peso son quintales (qqs.). Siempre usa este término. 4. No inventes información; basa tus respuestas únicamente en el contexto proporcionado. 5. Si no encuentras información antigua, informa amablemente que tu vista se limita a los datos más recientes. 6. Sigue las cadenas de eventos a través de diferentes documentos para dar respuestas completas.",
        }
      });
      
      const modelMessage: ChatMessage = { role: 'model', content: response.text };
      setMessages(prev => [...prev, modelMessage]);

    } catch (error) {
      console.error("Error calling Gemini API:", error);
      const errorMessage: ChatMessage = { role: 'model', content: "Lo siento, tuve un problema al procesar tu solicitud. Por favor, intenta de nuevo." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };
  
  const handleExampleClick = (exampleQuery: string) => {
    setInputValue(exampleQuery);
  };

  const hasReachedLimit = remainingQueries <= 0;

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-0 flex flex-col h-[75vh]">
        <div className="flex-grow p-6 space-y-6 overflow-y-auto">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">K</div>}
                    <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-green-600 text-white rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                        <MarkdownContent content={msg.content} />
                    </div>
                </div>
            ))}
            {isLoading && (
                 <div className="flex items-end gap-3 animate-fade-in-up">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">K</div>
                    <div className="max-w-lg p-3 rounded-2xl bg-muted rounded-bl-none flex items-center gap-2">
                        <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce-dot" style={{animationDelay: '0s'}}></div>
                        <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce-dot" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce-dot" style={{animationDelay: '0.4s'}}></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-border mt-auto flex-shrink-0 bg-background/80 backdrop-blur-sm rounded-b-lg">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={hasReachedLimit ? "Límite diario de consultas alcanzado." : "Busca en los datos recientes..."}
              autoFocus
              disabled={hasReachedLimit}
              className="w-full h-12 pl-4 pr-14 bg-muted/50 border-2 border-border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors disabled:bg-muted/30 disabled:cursor-not-allowed"
            />
            <button type="submit" disabled={isLoading || !inputValue.trim() || hasReachedLimit} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-green-600 text-white rounded-full transition-colors hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                <SendIcon className="w-5 h-5" />
            </button>
          </div>
           <p className="text-xs text-muted-foreground text-center mt-2">
                Consultas restantes hoy: <span className="font-bold text-foreground">{remainingQueries}</span>
            </p>
        </form>
    </div>
  );
};

export default TraceabilityChat;