import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { aiService, type AiMessage } from "../services/aiService";
import styles from "./AiChat.module.css";

const STORAGE_KEY = "ai_session_id";

function stripConfirmationCode(text: string): string {
  return text.replace(/<!--CONFIRMATION_CODE:[^>]+-->/g, "").trim();
}

export default function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const sessionIdRef = useRef<string | null>(localStorage.getItem(STORAGE_KEY));
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: AiMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { reply, sessionId } = await aiService.chat(
        newMessages,
        sessionIdRef.current,
      );
      sessionIdRef.current = sessionId;
      localStorage.setItem(STORAGE_KEY, sessionId);
      setMessages([...newMessages, { role: "assistant", content: reply }]);
      setRateLimited(false);
    } catch (err: unknown) {
      let errorMsg = "⚠️ Errore nella risposta. Riprova.";
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 429) {
          setRateLimited(true);
          errorMsg =
            "⚠️ Hai superato il limite di richieste AI. Riprova tra qualche minuto.";
        } else if (
          err.response.status === 400 &&
          err.response.data?.details?.[0]
        ) {
          errorMsg = `⚠️ ${err.response.data.details[0].message}`;
        }
      }
      setMessages([...newMessages, { role: "assistant", content: errorMsg }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span>🤖 AI Assistant</span>
            <button
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className={styles.messages}>
            {messages.length === 0 && !loading && (
              <p className={styles.empty}>Ciao! Come posso aiutarti?</p>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.bubble} ${
                  msg.role === "user"
                    ? styles.bubbleUser
                    : styles.bubbleAssistant
                }`}
              >
                {msg.role === "assistant"
                  ? stripConfirmationCode(msg.content)
                  : msg.content}
              </div>
            ))}

            {loading && (
              <div className={`${styles.bubble} ${styles.bubbleLoading}`}>
                ...
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {rateLimited && (
            <div className={styles.banner}>
              ⚠️ Troppe richieste. Riprova tra qualche minuto.
            </div>
          )}
          <div className={styles.inputRow}>
            <textarea
              ref={textareaRef}
              className={styles.input}
              rows={1}
              placeholder="Scrivi un messaggio… (Invio per inviare)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || rateLimited}
            />
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={loading || rateLimited || !input.trim()}
              aria-label="Invia"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <button
        className={styles.fab}
        onClick={() => setOpen((v) => !v)}
        aria-label="AI Assistant"
      >
        🤖
      </button>
    </>
  );
}
