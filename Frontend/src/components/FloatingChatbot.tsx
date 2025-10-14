import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageCircle, FiX, FiSend } from 'react-icons/fi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL, withAuth } from '@/lib/config';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/context/I18nContext';

interface FloatingChatbotProps {
  type?: 'authority' | 'user';
}

const FloatingChatbot = ({ type = 'user' }: FloatingChatbotProps) => {
  const { t, locale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: t('assistant_greeting') }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [useKB, setUseKB] = useState(true);
  const [lang, setLang] = useState<'en'|'hi'|'mr'>(locale as 'en'|'hi'|'mr');
  const [lastSources, setLastSources] = useState<number | null>(null);

  // Keep chatbot language in sync with site language selection
  useEffect(() => {
    setLang(locale as 'en'|'hi'|'mr');
  }, [locale]);

  const authoritySuggestions = [
    'Show illegal mining in district X',
    'Generate monthly report',
    'View high-risk zones',
    'Check environmental impact',
  ];

  const userSuggestions = [
    'Show my mining volume',
    'Check compliance status',
    'Generate report',
    'Analyze efficiency',
  ];

  const suggestions = type === 'authority' ? authoritySuggestions : userSuggestions;

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    // Append user message using functional update to avoid stale closure
    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
    setIsTyping(true);
    const payload = {
      messages: [...messages, { role: 'user', content: inputValue }].map(m => ({ role: m.role, content: m.content })),
      persona: type,
    };
    try {
      let reply = '';
      setLastSources(null);
      if (useKB) {
        const res = await fetch(`${API_BASE_URL}/ai/chat/rag`, {
          method: 'POST',
          headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
          body: JSON.stringify({ question: inputValue, persona: type, limit: 5, language: lang }),
        });
        if (!res.ok) {
          let detail = '';
          try { const errJson = await res.json(); detail = errJson?.detail || errJson?.message || ''; } catch {}
          if (!detail) {
            try { detail = await res.text(); } catch {}
          }
          throw new Error(`RAG error ${res.status}: ${detail || res.statusText}`);
        }
        const data = await res.json();
        reply = typeof data?.reply === 'string' && data.reply.trim() ? data.reply : '(no reply)';
        if (typeof data?.sources_used === 'number') setLastSources(data.sources_used);
      } else {
        const res = await fetch(`${API_BASE_URL}/ai/chat`, {
          method: 'POST',
          headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
          body: JSON.stringify({ ...payload, language: lang }),
        });
        if (!res.ok) {
          let detail = '';
          try { const errJson = await res.json(); detail = errJson?.detail || errJson?.message || ''; } catch {}
          if (!detail) {
            try { detail = await res.text(); } catch {}
          }
          throw new Error(`Chat error ${res.status}: ${detail || res.statusText}`);
        }
        const data = await res.json();
        reply = typeof data?.reply === 'string' && data.reply.trim() ? data.reply : '(no reply)';
      }
      if (reply?.trim?.() === 'I do not have enough information.') {
        reply = `${reply} (Questions must be about mining, GIS/DEM, or TrishulVision features.)`;
      }
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e:any) {
      // Ensure errors are visible in the chat instead of silent "(no reply)"
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${String(e?.message||e)}` }]);
    } finally {
      setIsTyping(false);
      setInputValue('');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
      >
        {isOpen ? <FiX className="w-6 h-6" /> : <FiMessageCircle className="w-6 h-6" />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
          >
            <Card className="shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiMessageCircle className="w-5 h-5" />
                  <div>
                    <h3 className="font-semibold">{t('ai_assistant')}</h3>
                    <p className="text-xs opacity-90">
                      {type === 'authority' ? t('authority_support') : t('user_support')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs opacity-90 flex items-center gap-1">
                    <input type="checkbox" checked={useKB} onChange={(e)=>setUseKB(e.target.checked)} /> Use knowledge base (RAG)
                  </label>
                  {lastSources !== null && <Badge variant="secondary" className="text-[10px]">{lastSources} sources</Badge>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-primary-foreground/10"
                >
                  <FiX className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="h-96 p-4">
                <div className="space-y-4">
                  {messages.map((message, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent/20 border border-border'
                      }`}>
                        {message.role === 'assistant' && (
                          <Badge className="mb-2" variant="outline">AI</Badge>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-accent/20 border border-border rounded-lg p-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Quick Suggestions */}
              <div className="px-4 py-2 border-t border-border bg-accent/5">
                <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant="outline"
                      onClick={() => setInputValue(suggestion)}
                      className="text-xs h-7"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span>Language:</span>
                  <Badge variant="outline">{locale.toUpperCase()}</Badge>
                </div>
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask me anything..."
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} size="icon">
                    <FiSend className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingChatbot;
