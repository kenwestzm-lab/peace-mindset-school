import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '../../store/useStore';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, incrementUnread } = useStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('payment_approved', () => toast.success('✅ Payment approved!', { duration: 5000 }));
    socket.on('payment_rejected', (d) => toast.error(`❌ Payment rejected: ${d.reason}`, { duration: 6000 }));
    socket.on('payment_expired', () => toast.error('⚠️ Your payment has expired. Please renew.', { duration: 8000 }));
    socket.on('balance_reminder', (d) => toast(`💳 Reminder: ZMW ${d.remaining} still owed for ${d.childName}`, { duration: 8000, icon:'⚠️' }));

    socket.on('new_message', (msg) => {
      if (msg.sender?._id !== user?._id && msg.sender !== user?._id) {
        incrementUnread();
        const preview = msg.messageType === 'voice' ? '🎤 Voice message' :
                        msg.messageType === 'image' ? '📷 Photo' :
                        msg.messageType === 'video' ? '🎥 Video' :
                        msg.content?.substring(0, 40);
        toast(`💬 ${msg.sender?.name}: ${preview}`, { duration: 5000 });
      }
    });

    socket.on('new_announcement', ({announcement}) => {
      toast(`📢 ${announcement.title}`, { duration: 6000 });
    });

    socket.on('new_event', ({event}) => {
      toast(`🗓️ ${event.title}`, { duration: 6000 });
    });

    socket.on('school_status', ({status, message}) => {
      toast(message || `🏫 School is now ${status}`, { duration: 8000, icon: status==='open' ? '🟢' : '🔴' });
    });

    return () => {
      socket.off('payment_approved');
      socket.off('payment_rejected');
      socket.off('payment_expired');
      socket.off('balance_reminder');
      socket.off('new_message');
      socket.off('new_announcement');
      socket.off('new_event');
      socket.off('school_status');
    };
  }, [user]);

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="main-content">
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
