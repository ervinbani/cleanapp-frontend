import { useEffect, useState, useRef, useCallback } from "react";
import { useLang } from "../contexts/LangContext";
import { useAuth } from "../contexts/AuthContext";
import { messageService } from "../services/messageService";
import apiClient from "../services/apiClient";
import type { InternalMessage, MessageUser, User } from "../types";
import styles from "./MessagesPage.module.css";

// ─── helpers ──────────────────────────────────────────────────────────────────

function asUser(v: MessageUser | string | undefined): MessageUser | null {
  if (!v || typeof v === "string") return null;
  return v;
}

function initials(u: MessageUser | null): string {
  if (!u) return "?";
  return `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase();
}

function fullName(u: MessageUser | null, fallback = "Unknown"): string {
  if (!u) return fallback;
  return `${u.firstName} ${u.lastName}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── labels ───────────────────────────────────────────────────────────────────

const ml = {
  en: {
    title: "Messages",
    noConversations: "No messages yet.",
    noThread: "Select a conversation to read messages.",
    reply: "Reply",
    send: "Send",
    sending: "Sending…",
    newMessage: "New Message",
    to: "To",
    subject: "Subject (optional)",
    body: "Message",
    cancel: "Cancel",
    compose: "Compose",
    unread: "unread",
    bodyPlaceholder: "Write your message…",
    subjectPlaceholder: "e.g. Job tomorrow",
    selectUser: "Select a recipient",
    deleteMsg: "Delete message",
    confirmDelete: "Delete this message?",
    confirmDeleteBody: "This action cannot be undone.",
    deleteConv: "Delete conversation",
    confirmDeleteConv: "Delete this conversation?",
    confirmDeleteConvBody: "All messages with this contact will be deleted permanently.",
    delete: "Delete",
  },
  es: {
    title: "Mensajes",
    noConversations: "Sin mensajes aún.",
    noThread: "Selecciona una conversación para leer los mensajes.",
    reply: "Responder",
    send: "Enviar",
    sending: "Enviando…",
    newMessage: "Nuevo mensaje",
    to: "Para",
    subject: "Asunto (opcional)",
    body: "Mensaje",
    cancel: "Cancelar",
    compose: "Redactar",
    unread: "no leídos",
    bodyPlaceholder: "Escribe tu mensaje…",
    subjectPlaceholder: "Ej: Trabajo de mañana",
    selectUser: "Selecciona un destinatario",
    deleteMsg: "Eliminar mensaje",
    confirmDelete: "¿Eliminar este mensaje?",
    confirmDeleteBody: "Esta acción no se puede deshacer.",
    deleteConv: "Eliminar conversación",
    confirmDeleteConv: "¿Eliminar esta conversación?",
    confirmDeleteConvBody: "Todos los mensajes con este contacto serán eliminados permanentemente.",
    delete: "Eliminar",
  },
};

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────

interface ConfirmDeleteModalProps {
  lang: "en" | "es";
  title?: string;
  body?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDeleteModal({
  lang,
  title,
  body,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const t = ml[lang];
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={styles.modalTitle}>{title ?? t.confirmDelete}</h2>
        <p className={styles.confirmBody}>{body ?? t.confirmDeleteBody}</p>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            {t.cancel}
          </button>
          <button className={styles.deleteDangerBtn} onClick={onConfirm}>
            {t.delete}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ComposeModal ─────────────────────────────────────────────────────────────

interface ComposeModalProps {
  lang: "en" | "es";
  users: User[];
  preselectedUserId?: string;
  onClose: () => void;
  onSent: (msg: InternalMessage) => void;
}

function ComposeModal({
  lang,
  users,
  preselectedUserId,
  onClose,
  onSent,
}: ComposeModalProps) {
  const t = ml[lang];
  const [toUserId, setToUserId] = useState(preselectedUserId ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!toUserId || !body.trim()) return;
    setSaving(true);
    setError("");
    try {
      const msg = await messageService.send({
        toUserId,
        body: body.trim(),
        subject: subject.trim() || undefined,
      });
      onSent(msg);
      onClose();
    } catch {
      setError(lang === "en" ? "Failed to send." : "Error al enviar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={styles.modalTitle}>{t.newMessage}</h2>

        <label className={styles.formLabel}>{t.to}</label>
        <select
          className={styles.formSelect}
          value={toUserId}
          onChange={(e) => setToUserId(e.target.value)}
        >
          <option value="">{t.selectUser}</option>
          {users.map((u) => (
            <option key={u._id ?? u.id} value={u._id ?? u.id}>
              {u.firstName} {u.lastName} — {u.role}
            </option>
          ))}
        </select>

        <label className={styles.formLabel}>{t.subject}</label>
        <input
          className={styles.formInput}
          type="text"
          maxLength={255}
          placeholder={t.subjectPlaceholder}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <label className={styles.formLabel}>{t.body}</label>
        <textarea
          className={styles.formTextarea}
          maxLength={2000}
          placeholder={t.bodyPlaceholder}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
        />

        {error && <p className={styles.formError}>{error}</p>}

        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            {t.cancel}
          </button>
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={saving || !toUserId || !body.trim()}
          >
            {saving ? t.sending : t.send}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MessagesPage ─────────────────────────────────────────────────────────────

interface Conversation {
  userId: string;
  user: MessageUser;
  lastMessage: InternalMessage;
  unreadCount: number;
}

export default function MessagesPage() {
  const { lang } = useLang();
  const { user: me } = useAuth();
  const t = ml[lang];

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [thread, setThread] = useState<InternalMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openConvMenuId, setOpenConvMenuId] = useState<string | null>(null);
  const [confirmDeleteConvUserId, setConfirmDeleteConvUserId] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // ── load inbox + users ────────────────────────────────────────────────────
  const loadInbox = useCallback(async () => {
    try {
      const myId = me?._id ?? me?.id;
      const [received, sent] = await Promise.allSettled([
        messageService.getInbox(),
        messageService.getSent(),
      ]);
      const data = [
        ...(received.status === "fulfilled" ? received.value : []),
        ...(sent.status === "fulfilled" ? sent.value : []),
      ];

      // build conversation list keyed by the OTHER participant
      const map = new Map<string, Conversation>();
      for (const msg of data) {
        const from = asUser(msg.fromUserId);
        const to = asUser(msg.toUserId);
        // the contact is whoever is NOT me
        const contact =
          from && from._id !== myId ? from : to && to._id !== myId ? to : null;
        if (!contact) continue;
        const cid = contact._id;
        const isMine = from ? from._id === myId : false;
        const existing = map.get(cid);
        if (!existing) {
          map.set(cid, {
            userId: cid,
            user: contact,
            lastMessage: msg,
            unreadCount: !isMine && !msg.isRead ? 1 : 0,
          });
        } else {
          if (!isMine && !msg.isRead) existing.unreadCount += 1;
          if (
            new Date(msg.createdAt) >
            new Date(existing.lastMessage.createdAt)
          ) {
            existing.lastMessage = msg;
          }
        }
      }
      setConversations(
        Array.from(map.values()).sort(
          (a, b) =>
            new Date(b.lastMessage.createdAt).getTime() -
            new Date(a.lastMessage.createdAt).getTime(),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    loadInbox();
    apiClient
      .get<{ success: boolean; data: User[] }>("/users")
      .then((r) => {
        const all: User[] = r.data.data ?? [];
        setUsers(all.filter((u) => (u._id ?? u.id) !== (me?._id ?? me?.id)));
      })
      .catch(() => {});
  }, [loadInbox, me]);

  // ── load thread ───────────────────────────────────────────────────────────
  const openThread = useCallback(
    async (userId: string) => {
      setSelectedUserId(userId);
      setThreadLoading(true);
      setReplyBody("");
      try {
        const msgs = await messageService.getThread(userId);
        setThread(msgs);
        // mark unread messages as read
        const unread = msgs.filter(
          (m) =>
            !m.isRead &&
            (typeof m.toUserId === "string"
              ? m.toUserId === (me?._id ?? me?.id)
              : m.toUserId._id === (me?._id ?? me?.id)),
        );
        await Promise.all(unread.map((m) => messageService.markAsRead(m._id)));
        if (unread.length > 0) {
          // refresh inbox unread counts
          loadInbox();
        }
      } finally {
        setThreadLoading(false);
      }
    },
    [me, loadInbox],
  );

  // scroll thread to bottom
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  // close any open menu on outside click or Escape
  useEffect(() => {
    if (!openMenuId && !openConvMenuId) return;
    const close = () => {
      setOpenMenuId(null);
      setOpenConvMenuId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
        setOpenConvMenuId(null);
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenuId, openConvMenuId]);

  // ── send reply ────────────────────────────────────────────────────────────
  const handleReply = async () => {
    if (!selectedUserId || !replyBody.trim()) return;
    setReplySending(true);
    try {
      const sent = await messageService.send({
        toUserId: selectedUserId,
        body: replyBody.trim(),
      });
      setThread((prev) => [...prev, sent]);
      setReplyBody("");
    } finally {
      setReplySending(false);
    }
  };

  // ── delete conversation ────────────────────────────────────────────────
  const handleDeleteConversation = async () => {
    if (!confirmDeleteConvUserId) return;
    const userId = confirmDeleteConvUserId;
    setConfirmDeleteConvUserId(null);
    try {
      const msgs = await messageService.getThread(userId);
      await Promise.all(msgs.map((m) => messageService.deleteMessage(m._id)));
      setConversations((prev) => prev.filter((c) => c.userId !== userId));
      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setThread([]);
      }
    } catch {
      // silently ignore
    }
  };

  // ── delete message ──────────────────────────────────────────────────────
  const handleDeleteMessage = async () => {
    if (!confirmDeleteId) return;
    const idToDelete = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await messageService.deleteMessage(idToDelete);
      const remaining = thread.filter((m) => m._id !== idToDelete);
      setThread(remaining);
      if (remaining.length === 0) {
        setSelectedUserId(null);
      }
      loadInbox();
    } catch {
      // silently ignore; the message stays in the thread
    }
  };

  // ── compose sent ─────────────────────────────────────────────────────────
  const handleComposeSent = (msg: InternalMessage) => {
    const recipientId =
      typeof msg.toUserId === "string" ? msg.toUserId : msg.toUserId._id;

    // build a MessageUser for the recipient from the populated field or
    // fall back to the users list we already have
    const populated = asUser(msg.toUserId);
    const fromUsers = users.find(
      (u) => (u._id ?? u.id) === recipientId,
    );
    const contact: MessageUser | null = populated ??
      (fromUsers
        ? {
            _id: fromUsers._id ?? fromUsers.id ?? recipientId,
            firstName: fromUsers.firstName,
            lastName: fromUsers.lastName,
            email: fromUsers.email,
            role: fromUsers.role,
          }
        : null);

    if (contact) {
      setConversations((prev) => {
        const exists = prev.find((c) => c.userId === recipientId);
        if (exists) {
          return prev.map((c) =>
            c.userId === recipientId &&
            new Date(msg.createdAt) > new Date(c.lastMessage.createdAt)
              ? { ...c, lastMessage: msg }
              : c,
          );
        }
        return [
          { userId: recipientId, user: contact, lastMessage: msg, unreadCount: 0 },
          ...prev,
        ];
      });
    }

    openThread(recipientId);
  };

  // ─────────────────────────────────────────────────────────────────────────

  const selectedConv = conversations.find((c) => c.userId === selectedUserId);

  return (
    <div className={styles.page}>
      {/* ── Left panel ─────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.title}>{t.title}</h1>
          <button
            className={styles.composeBtn}
            onClick={() => setShowCompose(true)}
            title={t.compose}
          >
            ✏️
          </button>
        </div>

        {loading ? (
          <p className={styles.empty}>…</p>
        ) : conversations.length === 0 ? (
          <p className={styles.empty}>{t.noConversations}</p>
        ) : (
          <ul className={styles.convList}>
            {conversations.map((conv) => (
              <li
                key={conv.userId}
                className={`${styles.convItem} ${selectedUserId === conv.userId ? styles.convItemActive : ""}`}
                onClick={() => openThread(conv.userId)}
              >
                <div className={styles.convAvatar}>
                  {initials(conv.user)}
                  {conv.unreadCount > 0 && (
                    <span
                      className={styles.unreadDot}
                      aria-label={`${conv.unreadCount} ${t.unread}`}
                    />
                  )}
                </div>
                <div className={styles.convInfo}>
                  <div className={styles.convName}>
                    {fullName(conv.user)}
                    {conv.unreadCount > 0 && (
                      <span className={styles.unreadBadge}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className={styles.convPreview}>
                    {conv.lastMessage.subject
                      ? conv.lastMessage.subject
                      : conv.lastMessage.body}
                  </div>
                </div>
                <div className={styles.convRight}>
                  <span className={styles.convTime}>
                    {formatTime(conv.lastMessage.createdAt)}
                  </span>
                  <div className={styles.convMenuAnchor}>
                    <button
                      className={styles.convMenuBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenConvMenuId(
                          openConvMenuId === conv.userId ? null : conv.userId,
                        );
                      }}
                      aria-label="Conversation options"
                    >
                      ▾
                    </button>
                    {openConvMenuId === conv.userId && (
                      <ul className={styles.msgMenu} role="menu">
                        <li>
                          <button
                            className={`${styles.msgMenuItem} ${styles.msgMenuItemDanger}`}
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenConvMenuId(null);
                              setConfirmDeleteConvUserId(conv.userId);
                            }}
                          >
                            🗑 {t.deleteConv}
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ── Right panel ────────────────────────── */}
      <main className={styles.thread}>
        {!selectedUserId ? (
          <p className={styles.emptyThread}>{t.noThread}</p>
        ) : (
          <>
            <div className={styles.threadHeader}>
              <div className={styles.threadAvatar}>
                {selectedConv ? initials(selectedConv.user) : "?"}
              </div>
              <span className={styles.threadName}>
                {selectedConv ? fullName(selectedConv.user) : ""}
              </span>
            </div>

            <div className={styles.messages}>
              {threadLoading ? (
                <p className={styles.empty}>…</p>
              ) : (
                thread.map((msg) => {
                  const fromId =
                    typeof msg.fromUserId === "string"
                      ? msg.fromUserId
                      : msg.fromUserId._id;
                  const isMine = fromId === (me?._id ?? me?.id);
                  return (
                    <div
                      key={msg._id}
                      className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs}`}
                    >
                      {/* ── dropdown menu anchor ── */}
                      <div className={styles.msgMenuAnchor}>
                        <button
                          className={styles.msgMenuBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(
                              openMenuId === msg._id ? null : msg._id,
                            );
                          }}
                          aria-label="Message options"
                        >
                          ▾
                        </button>
                        {openMenuId === msg._id && (
                          <ul className={styles.msgMenu} role="menu">
                            <li>
                              <button
                                className={`${styles.msgMenuItem} ${styles.msgMenuItemDanger}`}
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setConfirmDeleteId(msg._id);
                                }}
                              >
                                🗑 {t.deleteMsg}
                              </button>
                            </li>
                          </ul>
                        )}
                      </div>
                      {msg.subject && (
                        <p className={styles.bubbleSubject}>{msg.subject}</p>
                      )}
                      <p className={styles.bubbleBody}>{msg.body}</p>
                      <span className={styles.bubbleTime}>
                        <span className={styles.bubbleTimeText}>{formatTime(msg.createdAt)}</span>
                        {isMine && (
                          <span
                            className={
                              msg.isRead
                                ? styles.readMarkRead
                                : styles.readMarkSent
                            }
                            aria-label={msg.isRead ? "Read" : "Sent"}
                          >
                            {msg.isRead ? " ✓✓" : " ✓"}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={threadEndRef} />
            </div>

            <div className={styles.replyBox}>
              <textarea
                className={styles.replyInput}
                placeholder={t.bodyPlaceholder}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleReply();
                  }
                }}
              />
              <button
                className={styles.replyBtn}
                onClick={handleReply}
                disabled={replySending || !replyBody.trim()}
              >
                {replySending ? t.sending : t.send}
              </button>
            </div>
          </>
        )}
      </main>

      {/* ── Compose modal ─────────────────────── */}
      {showCompose && (
        <ComposeModal
          lang={lang}
          users={users}
          onClose={() => setShowCompose(false)}
          onSent={handleComposeSent}
        />
      )}

      {/* ── Confirm delete modal ──────────────── */}
      {confirmDeleteId && (
        <ConfirmDeleteModal
          lang={lang}
          onConfirm={handleDeleteMessage}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {confirmDeleteConvUserId && (
        <ConfirmDeleteModal
          lang={lang}
          title={t.confirmDeleteConv}
          body={t.confirmDeleteConvBody}
          onConfirm={handleDeleteConversation}
          onCancel={() => setConfirmDeleteConvUserId(null)}
        />
      )}
    </div>
  );
}
