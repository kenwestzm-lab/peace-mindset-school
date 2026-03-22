import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '../../store/useStore';
import { getSocket } from '../../utils/socket';
import { setupPushNotifications } from '../../utils/push';
import toast from 'react-hot-toast';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, incrementUnread } = useStore();
  const location = useLocation();

  // Check if we're on a chat page (needs full screen)
  const isChatPage = location.pathname.includes('/chat');

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('payment_approved', () => toast.success('✅ Payment approved!', { duration:5000 }));
    socket.on('payment_rejected', (d) => toast.error(`❌ Rejected: ${d.reason}`, { duration:6000 }));
    socket.on('payment_expired', () => toast.error('⚠️ Payment expired. Please renew.', { duration:8000 }));
    socket.on('balance_reminder', (d) => toast(`💳 ZMW ${d.remaining} owed for ${d.childName}`, { duration:8000, icon:'⚠️' }));

    socket.on('new_message', (msg) => {
      if (!isChatPage && msg.sender?._id!==user?._id && msg.sender!==user?._id) {
        incrementUnread();
        const preview = msg.messageType==='voice'?'🎤 Voice':msg.messageType==='image'?'📷 Photo':msg.messageType==='video'?'🎥 Video':msg.content?.substring(0,40);
        toast(`💬 ${msg.sender?.name}: ${preview}`, { duration:5000 });
      }
    });

    socket.on('new_announcement', ({announcement}) => toast(`📢 ${announcement.title}`, { duration:6000 }));
    socket.on('new_story', ({story}) => toast(`📸 ${story.author?.name} posted a story`, { duration:5000 }));
    socket.on('school_status', ({status, message}) => toast(message||`🏫 School ${status}`, { duration:8000, icon:status==='open'?'🟢':'🔴' }));

    return () => {
      ['payment_approved','payment_rejected','payment_expired','balance_reminder','new_message','new_announcement','new_story','school_status'].forEach(e => socket.off(e));
    };
  }, [user, isChatPage]);

  // Setup push notifications after login
  useEffect(() => {
    if (user) {
      setTimeout(() => {
        setupPushNotifications().catch(() => {});
      }, 3000); // delay to not interrupt login UX
    }
  }, [user?._id]);

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="main-content">
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className={`page-content${isChatPage?' chat-page':''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
