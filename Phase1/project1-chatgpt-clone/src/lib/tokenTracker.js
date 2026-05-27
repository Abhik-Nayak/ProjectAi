const { encoding_for_model } = require("tiktoken");

class TokenTracker {
  constructor(model = "gpt-4o-mini") {
    this.model = model;
    this.encoder = encoding_for_model(model);
    this.usage = new Map();
  }

  countTokens(text) {
    return this.encoder.encode(text).length;
  }

  countMessagesTokens(messages) {
    let total = 0;
    for (const msg of messages) {
      total += 4; // every message has <|im_start|>{role}\n...content\n<|im_end|>
      total += this.countTokens(msg.content);
      total += this.countTokens(msg.role);
    }
    total += 2; // <|im_start|>assistant prefix
    return total;
  }

  trackUsage(sessionId, promptTokens, completionTokens) {
    if (!this.usage.has(sessionId)) {
      this.usage.set(sessionId, { promptTokens: 0, completionTokens: 0, totalTokens: 0, requests: 0 });
    }
    const session = this.usage.get(sessionId);
    session.promptTokens += promptTokens;
    session.completionTokens += completionTokens;
    session.totalTokens += promptTokens + completionTokens;
    session.requests += 1;
  }

  getUsage(sessionId) {
    return this.usage.get(sessionId) || { promptTokens: 0, completionTokens: 0, totalTokens: 0, requests: 0 };
  }

  isOverLimit(sessionId, maxTokens) {
    const usage = this.getUsage(sessionId);
    return usage.totalTokens >= maxTokens;
  }

  free() {
    this.encoder.free();
  }
}

module.exports = { TokenTracker };
