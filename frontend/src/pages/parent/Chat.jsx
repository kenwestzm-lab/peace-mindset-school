import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { format } from 'date-fns';

export default function ParentChat() {
  const { user, setUnreadMessages } = useStore();
  const { t } = useT();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get(`/chat/${user._id}`);
        setMessages(r.data.messages);
        setUnreadMessages(0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();

    const socket = getSocket();
    if (socket) {
      socket.on('new_message', (msg) => {
        setMessages((prev) => {
          if (prev.find((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        setUnreadMessages(0);
      });
    }
    return () => getSocket()?.off('new_message');
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const content = input.trim();
    setInput('');

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('send_message', {
        senderId: user._id, senderRole: 'parent',
        parentId: user._id, content,
      });
    } else {
      try {
        const r = await api.post('/chat', { content, parentId: user._id });
        setMessages((prev) => [...prev, r.data.message]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="animate-in" style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
      <div className="mb-16">
        <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('chatWithAdmin')}</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>Direct messages to the school administration</p>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h4>{t('noMessages')}</h4>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender?._id === user._id || msg.sender === user._id;
              return (
                <div key={msg._id} style={{
                  display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                }}>
                  {!isMe && (
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: 'var(--maroon)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, marginRight: 8, flexShrink: 0,
                      alignSelf: 'flex-end',
                    }}>A</div>
                  )}
                  <div style={{
                    maxWidth: '70%',
                    background: isMe ? 'var(--maroon)' : 'var(--gray-100)',
                    color: isMe ? 'var(--white)' : 'var(--gray-700)',
                    padding: '10px 14px', borderRadius: 14,
                    borderBottomRightRadius: isMe ? 4 : 14,
                    borderBottomLeftRadius: isMe ? 14 : 4,
                  }}>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{msg.content}</div>
                    <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>
                      {format(new Date(msg.createdAt), 'HH:mm · dd MMM')}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--gray-100)',
          display: 'flex', gap: 10, alignItems: 'flex-end',
        }}>
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t('typeMessage')}
            rows={1}
            style={{
              flex: 1, padding: '10px 14px',
              border: '1.5px solid var(--gray-200)', borderRadius: 12,
              resize: 'none', fontFamily: 'var(--font-body)', fontSize: 14,
              maxHeight: 100,
            }}
          />
          <button
            onClick={send} disabled={!input.trim()}
            className="btn btn-primary"
            style={{ flexShrink: 0, borderRadius: 12 }}
          >
            {t('send')} ➤
          </button>
        </div>
      </div>
    </div>
  );
}
