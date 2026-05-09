import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function AiChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(err.error || 'เกิดข้อผิดพลาด');
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('ไม่สามารถเชื่อมต่อ AI ได้');
    }

    setIsLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        aria-label="AI Chat"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-accent/10">
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Kitchen AI Assistant</h4>
              <p className="text-xs text-muted-foreground">ถามเกี่ยวกับต้นทุน เมนู วัตถุดิบ</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8 space-y-2">
                <Bot className="w-10 h-10 mx-auto opacity-30" />
                <p>สวัสดีค่ะ! ถามอะไรเกี่ยวกับร้านได้เลย</p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {['เมนูไหนกำไรดีที่สุด?', 'สรุปต้นทุนภาพรวม', 'วัตถุดิบไหนแพงสุด?'].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-border hover:bg-accent/10 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-accent" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-accent text-accent-foreground rounded-br-sm'
                    : 'bg-muted rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-accent" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t px-3 py-2.5">
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="พิมพ์คำถาม..."
                className="flex-1 h-9 text-sm rounded-full"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 rounded-full flex-shrink-0"
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
