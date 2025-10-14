import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMessageCircle, FiSend, FiDownload, FiMap } from 'react-icons/fi';
import { AuthorityNavbar } from '@/components/AuthorityNavbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL, withAuth } from '@/lib/config';
import { useI18n } from '@/context/I18nContext';

const AIChatbot = () => {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: t('assistant_greeting') },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [useKB, setUseKB] = useState(true);
  const [lastSources, setLastSources] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const suggestedQueries = [
    'Show illegal mining detected in district X last week',
    'Generate report for all illegal mining activities this month',
    'Visualize 3D depth of mining pits in region Y',
    'What are the high-risk zones for illegal mining?',
    'Show environmental impact analysis for Site Alpha',
  ];

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
    setIsTyping(true);
    try {
      let reply = '';
      setLastSources(null);
      if (useKB) {
        const res = await fetch(`${API_BASE_URL}/ai/chat/rag`, {
          method: 'POST',
          headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
          body: JSON.stringify({ question: inputValue, persona: 'authority', limit: 5, language: locale }),
        });
        const data = await res.json();
        reply = data?.reply || '(no reply)';
        if (typeof data?.sources_used === 'number') setLastSources(data.sources_used);
      } else {
        const payload = {
          messages: [...messages, { role: 'user', content: inputValue }].map(m => ({ role: m.role, content: m.content })),
          persona: 'authority',
        };
        const res = await fetch(`${API_BASE_URL}/ai/chat`, {
          method: 'POST',
          headers: { ...withAuth({ 'Content-Type': 'application/json' }) },
          body: JSON.stringify({ ...payload, language: locale }),
        });
        const data = await res.json();
        reply = data?.reply || '(no reply)';
      }
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: String(e?.message || e) }]);
    } finally {
      setIsTyping(false);
      setInputValue('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AuthorityNavbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FiMessageCircle className="text-primary" />
            {t('ai_assistant')}
          </h1>
          <p className="text-muted-foreground">
            Ask questions about mining activities, generate reports, and get insights
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Suggested Queries */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Suggested Queries</h2>
              <div className="space-y-2">
                {suggestedQueries.map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputValue(query)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/10 transition-colors text-sm"
                  >
                    {query}
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FiDownload className="mr-2" />
                    Generate Monthly Report
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FiMap className="mr-2" />
                    Show All Detections
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Chat Interface */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="p-6 h-[700px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">Mode: {useKB ? 'Knowledge base (RAG)' : 'General chat'}</div>
                <div className="flex items-center gap-3">
                  {lastSources !== null && <Badge variant="secondary" className="text-[10px]">{lastSources} sources</Badge>}
                  <label className="text-xs opacity-90 flex items-center gap-2">
                    <input type="checkbox" checked={useKB} onChange={(e)=>setUseKB(e.target.checked)} /> Use knowledge base
                  </label>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent/20 border border-border'
                    }`}>
                      {message.role === 'assistant' && (
                        <Badge className="mb-2" variant="outline">AI Assistant</Badge>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {message.role === 'assistant' && idx > 0 && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline">
                            <FiMap className="mr-1" />
                            View Map
                          </Button>
                          <Button size="sm" variant="outline">
                            <FiDownload className="mr-1" />
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-accent/20 border border-border rounded-lg p-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about mining activities, reports, or analytics..."
                  className="flex-1"
                />
                <Button onClick={handleSendMessage}>
                  <FiSend />
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIChatbot;
