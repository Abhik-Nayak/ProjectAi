class PromptBuilder {
  constructor(systemPrompt = "You are a helpful assistant.") {
    this.systemPrompt = systemPrompt;
  }

  build(conversationHistory, userMessage) {
    const messages = [
      { role: "system", content: this.systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];
    return messages;
  }

  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
  }
}

module.exports = { PromptBuilder };
