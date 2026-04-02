import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';
import { connectSocket, disconnectSocket } from '../utils/socket';

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────────────────────
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ user, token, isAuthenticated: true, language: user.language || 'en' });
        connectSocket(token, user._id, user.role);
        return user;
      },

      register: async (data) => {
        const res = await api.post('/auth/register', data);
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ user, token, isAuthenticated: true, language: user.language || 'en' });
        connectSocket(token, user._id, user.role);
        return user;
      },

      logout: () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        disconnectSocket();
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const res = await api.get('/auth/me');
          const { user } = res.data;
          set({ user, token, isAuthenticated: true, language: user.language || 'en' });
          connectSocket(token, user._id, user.role);
        } catch {
          get().logout();
        }
      },

      updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

      // ── Language ──────────────────────────────────────────────────────────
      language: 'en',

      setLanguage: async (lang) => {
        set({ language: lang });
        if (get().isAuthenticated) {
          try {
            await api.put('/auth/language', { language: lang });
            get().updateUser({ language: lang });
          } catch (e) {
            console.error('Language save failed', e);
          }
        }
      },

      // ── UI State ──────────────────────────────────────────────────────────
      sidebarOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),

      // ── Notifications (unread messages) ──────────────────────────────────
      unreadMessages: 0,
      setUnreadMessages: (n) => set({ unreadMessages: n }),
      incrementUnread: () => set((s) => ({ unreadMessages: s.unreadMessages + 1 })),
    }),
    {
      name: 'peace-mindset-store',
      partialize: (state) => ({
        token: state.token,
        language: state.language,
      }),
    }
  )
);
