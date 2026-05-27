class ConversationMemory {
  constructor() {
    this.sessions = new Map();
  }

  getHistory(sessionId) {
    return this.sessions.get(sessionId) || [];
  }

  addMessage(sessionId, role, content) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    this.sessions.get(sessionId).push({ role, content });
  }

  clearSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  getSessionCount() {
    return this.sessions.size;
  }

  getMessageCount(sessionId) {
    return this.getHistory(sessionId).length;
  }
}

module.exports = { ConversationMemory };
