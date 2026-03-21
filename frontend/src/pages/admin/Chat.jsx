import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { format } from 'date-fns';

export default function AdminChat() {
  const { user } = useStore();
  const { t } = useT();
  const [conversations, setConversations] = useState([]);
  const [activeParent, setActiveParent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const loadConversations = async () => {
    try {
      const r = await api.get('/chat/admin/conversations');
      setConversations(r.data.conversations);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadMessages = async (parentId) => {
    try {
      const r = await api.get(`/chat/${parentId}`);
      setMessages(r.data.messages);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadConversations();
    const socket = getSocket();
    if (socket) {
      socket.on('new_message', (msg) => {
        setMessages((prev) => {
          if (prev.find((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        loadConversations();
      });
    }
    return () => getSocket()?.off('new_message');
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectParent = async (conv) => {
    setActiveParent(conv.parent);
    await loadMessages(conv._id);
  };

  const send = async () => {
    if (!input.trim() || !activeParent) return;
    const content = input.trim();
    setInput('');
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('send_message', {
        senderId: user._id, senderRole: 'admin',
        parentId: activeParent._id, content,
      });
    } else {
      try {
        const r = await api.post('/chat', { content, parentId: activeParent._id });
        setMessages((prev) => [...prev, r.data.message]);
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div className="animate-in" style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
      <div className="mb-16">
        <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('chat')}</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>Conversations with parents</p>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Conversations sidebar */}
        <div style={{
          width: 280, borderRight: '1px solid var(--gray-100)',
          overflowY: 'auto', flexShrink: 0,
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)' }}>
            <h4 style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase' }}>
              {t('conversations')}
            </h4>
          </div>
          {loading ? (
            <div style={{ padding: 20 }}><div className="spinner" /></div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div key={conv._id} onClick={() => selectParent(conv)} style={{
                padding: '14px 16px', cursor: 'pointer',
                background: activeParent?._id === conv._id ? 'var(--maroon-pale)' : 'transparent',
                borderLeft: activeParent?._id === conv._id ? '3px solid var(--maroon)' : '3px solid transparent',
                transition: 'background 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'var(--maroon)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, flexShrink: 0,
                  }}>
                    {conv.parent?.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
                      {conv.parent?.name}
                    </div>
                    <div style={{
                      fontSize: 12, color: 'var(--gray-400)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {conv.lastMessage}
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span style={{
                      background: 'var(--maroon)', color: 'white',
                      borderRadius: 999, fontSize: 10, fontWeight: 700,
                      padding: '2px 6px', minWidth: 18, textAlign: 'center',
                    }}>{conv.unreadCount}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeParent ? (
            <div className="flex-center" style={{ flex: 1 }}>
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h4>{t('selectConversation')}</h4>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid var(--gray-100)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--maroon)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                }}>
                  {activeParent.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{activeParent.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{activeParent.email}</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {messages.map((msg) => {
                  const isAdmin = msg.senderRole === 'admin';
                  return (
                    <div key={msg._id} style={{
                      display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                      marginBottom: 10,
                    }}>
                      <div style={{
                        maxWidth: '70%',
                        background: isAdmin ? 'var(--maroon)' : 'var(--gray-100)',
                        color: isAdmin ? 'white' : 'var(--gray-700)',
                        padding: '10px 14px', borderRadius: 12,
                        borderBottomRightRadius: isAdmin ? 4 : 12,
                        borderBottomLeftRadius: isAdmin ? 12 : 4,
                      }}>
                        <div style={{ fontSize: 13, lineHeight: 1.5 }}>{msg.content}</div>
                        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 3 }}>
                          {format(new Date(msg.createdAt), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: '12px 16px', borderTop: '1px solid var(--gray-100)',
                display: 'flex', gap: 10,
              }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
                  placeholder={t('typeMessage')}
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button onClick={send} disabled={!input.trim()} className="btn btn-primary">
                  {t('send')} ➤
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="width: 280px"] { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--gray-100); }
          .card[style*="display: flex"] { flex-direction: column !important; }
        }
      `}</style>
    </div>
  );
}
