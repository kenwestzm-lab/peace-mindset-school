/**
 * PEACE MINDSET SCHOOL — CHAT FIXES
 * 
 * Drop these fixes into your existing Chat component.
 * Each section is clearly labeled. Nothing is broken, only additions/corrections.
 */

// ── 1. VOICE MESSAGE FIX ──────────────────────────────────────────────
// Problem: Blob not converted to base64, mic permissions fail silently.
// Replace your existing recording logic with this:

import { useRef, useState, useEffect } from "react";

export function useVoiceRecorder({ socket, senderId, senderRole, parentId }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Use webm on desktop, mp4 as fallback for iOS Safari
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const durationMs = Date.now() - startTimeRef.current;

        // CRITICAL: convert to base64 BEFORE sending via socket
        const reader = new FileReader();
        reader.onload = () => {
          socket.emit("send_message", {
            senderId,
            senderRole,
            parentId,
            content: "",
            messageType: "voice",
            mediaData: reader.result,   // base64 data URL
            mediaMimeType: mimeType,
            duration: Math.round(durationMs / 1000),
          });
        };
        reader.readAsDataURL(blob);

        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        setDuration(0);
        setIsRecording(false);
      };

      recorder.start(100); // collect every 100ms
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      console.error("Mic error:", err);
      if (err.name === "NotAllowedError") {
        alert("Microphone permission denied. Please allow microphone access in your browser settings.");
      } else {
        alert("Could not start recording: " + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
      setDuration(0);
      setIsRecording(false);
    }
  };

  return { isRecording, duration, startRecording, stopRecording, cancelRecording };
}


// ── 2. MEDIA (PHOTO/VIDEO) SENDING FIX ───────────────────────────────
// Problem: Media was being sent via socket which can't handle large binary.
// Solution: Send via HTTP POST /api/chat, socket auto-broadcasts.

export async function sendMediaMessage({ file, parentId, senderRole, token, onProgress }) {
  return new Promise((resolve, reject) => {
    // Validate file size (max 50MB for video, 10MB for image)
    const maxSize = file.type.startsWith("video") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      reject(new Error(`File too large. Max ${file.type.startsWith("video") ? "50MB" : "10MB"}`));
      return;
    }

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress && onProgress(Math.round((e.loaded / e.total) * 50)); // 0-50%
      }
    };
    reader.onload = async () => {
      try {
        onProgress && onProgress(60);

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            parentId,
            senderRole,
            content: "",
            messageType: file.type.startsWith("video") ? "video" : "image",
            mediaData: reader.result,
            mediaMimeType: file.type,
          }),
        });

        onProgress && onProgress(100);

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }

        const data = await res.json();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}


// ── 3. INPUT BAR ALWAYS VISIBLE FIX ──────────────────────────────────
// Add this CSS to your chat stylesheet:
export const CHAT_CSS_FIXES = `
/* Fix: chat layout so input bar is always visible above keyboard */
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100dvh;          /* dvh = dynamic viewport height - shrinks with keyboard */
  overflow: hidden;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
}

.chat-header {
  flex-shrink: 0;
  z-index: 10;
}

.chat-messages-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 8px;
}

.chat-input-bar {
  flex-shrink: 0;
  padding: 8px 12px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  background: #1a2332;     /* match your dark theme */
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Also add this to your index.html <head>: */
/* <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"> */
`;

// Apply it in your component like:
// import { CHAT_CSS_FIXES } from './chatFixes';
// Add <style>{CHAT_CSS_FIXES}</style> in your chat JSX


// ── 4. WHATSAPP-STYLE MIC ICON ────────────────────────────────────────
export const WhatsAppMicIcon = ({ size = 24, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Microphone body */}
    <rect x="9" y="2" width="6" height="12" rx="3" fill={color} />
    {/* Stand arc */}
    <path
      d="M5 11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Stem */}
    <line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
    {/* Base */}
    <line x1="8" y1="22" x2="16" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);


// ── 5. ONLINE STATUS HOOK ─────────────────────────────────────────────
export function useOnlineStatus(socket) {
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (!socket) return;

    // Admin: get initial online list
    socket.emit("join_admin");
    socket.on("online_users", ({ userIds }) => {
      setOnlineUsers(new Set(userIds));
    });

    // Real-time updates
    socket.on("user_online", ({ userId, online }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.off("online_users");
      socket.off("user_online");
    };
  }, [socket]);

  const isOnline = (userId) => onlineUsers.has(userId);

  return { isOnline };
}

// Usage in chat header:
// const { isOnline } = useOnlineStatus(socket);
// <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
//   <span style={{
//     width: 8, height: 8, borderRadius: '50%',
//     background: isOnline(parentId) ? '#25D366' : '#666',
//     display: 'inline-block'
//   }} />
//   <span style={{ fontSize: 12, color: isOnline(parentId) ? '#25D366' : '#999' }}>
//     {isOnline(parentId) ? 'Online' : 'Offline'}
//   </span>
// </div>


// ── 6. EXAMPLE: UPDATED CHAT INPUT BAR COMPONENT ─────────────────────
// Drop this into your chat UI replacing the current input bar:

export function ChatInputBar({
  socket,
  token,
  senderId,
  senderRole,
  parentId,
  onMessageSent,
}) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const { isRecording, duration, startRecording, stopRecording, cancelRecording } =
    useVoiceRecorder({ socket, senderId, senderRole, parentId });

  const handleSendText = () => {
    if (!text.trim()) return;
    socket.emit("send_message", {
      senderId,
      senderRole,
      parentId,
      content: text.trim(),
      messageType: "text",
    });
    setText("");
    onMessageSent && onMessageSent();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      await sendMediaMessage({
        file,
        parentId,
        senderRole,
        token,
        onProgress: setUploadProgress,
      });
      onMessageSent && onMessageSent();
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        background: "#1a2332",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Attachment button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isRecording || uploading}
        style={{
          background: "none",
          border: "none",
          color: "#8b949e",
          cursor: "pointer",
          padding: 8,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Paperclip */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      </button>

      {/* Text input or recording indicator */}
      {isRecording ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(255,59,59,0.1)",
            borderRadius: 24,
            padding: "10px 16px",
          }}
        >
          <span style={{ color: "#ff3b3b", fontSize: 12 }}>🔴</span>
          <span style={{ color: "#e6edf3", fontSize: 14 }}>
            Recording... {duration}s
          </span>
          <button
            onClick={cancelRecording}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#ff3b3b",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={uploading ? `Uploading... ${uploadProgress}%` : "Message"}
          disabled={uploading}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.08)",
            border: "none",
            borderRadius: 24,
            padding: "10px 16px",
            color: "#e6edf3",
            fontSize: 15,
            outline: "none",
          }}
        />
      )}

      {/* Send / Mic button */}
      {text.trim() ? (
        <button
          onClick={handleSendText}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#25D366",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </button>
      ) : (
        <button
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={isRecording ? stopRecording : undefined}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: isRecording ? "#ff3b3b" : "#25D366",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flexShrink: 0,
            transition: "background 0.2s",
          }}
        >
          <WhatsAppMicIcon size={22} color="#fff" />
        </button>
      )}
    </div>
  );
}
