import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '../../store/useStore';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';
import { useT } from '../../hooks/useT';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, incrementUnread } = useStore();
  const { t } = useT();

  // Listen for global real-time events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Payment events for parents
    socket.on('payment_approved', (data) => {
      toast.success(t('paymentApproved'));
    });

    socket.on('payment_rejected', (data) => {
      toast.error(`${t('paymentRejected')}: ${data.reason}`);
    });

    socket.on('payment_expired', () => {
      toast.error(t('paymentExpired'), { duration: 8000 });
    });

    // New messages
    socket.on('new_message', (msg) => {
      if (msg.sender?._id !== user?._id) {
        incrementUnread();
        toast(`💬 ${msg.sender?.name}: ${msg.content.substring(0, 50)}...`, { duration: 5000 });
      }
    });

    // Announcements
    socket.on('new_announcement', ({ announcement }) => {
      const title = user?.language === 'fr' && announcement.titleFr
        ? announcement.titleFr : announcement.title;
      toast(`📢 ${title}`, { duration: 6000 });
    });

    // Events
    socket.on('new_event', ({ event }) => {
      const title = user?.language === 'fr' && event.titleFr ? event.titleFr : event.title;
      toast(`🗓️ ${title}`, { duration: 6000 });
    });

    // Child registered (parent notification)
    socket.on('child_registered', ({ child }) => {
      toast.success(`${child.name} has been registered!`);
    });

    return () => {
      socket.off('payment_approved');
      socket.off('payment_rejected');
      socket.off('payment_expired');
      socket.off('new_message');
      socket.off('new_announcement');
      socket.off('new_event');
      socket.off('child_registered');
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
