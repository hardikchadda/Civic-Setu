class GeminiChatbot {
    constructor(systemPrompt, botName) {
        this.systemPrompt = systemPrompt;
        this.botName = botName;
        this.conversationHistory = [];
        this.apiKey = this.getApiKey();
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    }

    getApiKey() {
        // Try to get API key from localStorage (user will need to set this)
        let apiKey = localStorage.getItem('GEMINI_API_KEY');
        
        if (!apiKey) {
            // Show modal to get API key from user
            this.showApiKeyModal();
            return null;
        }
        return apiKey;
    }

    showApiKeyModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 500px;
            text-align: center;
        `;

        modalContent.innerHTML = `
            <h3>🔑 Gemini API Key Required</h3>
            <p>To use this chatbot, you need a free Gemini API key:</p>
            <ol style="text-align: left; margin: 20px 0;">
                <li>Visit <a href="https://ai.google.dev/" target="_blank">Google AI Studio</a></li>
                <li>Sign in with your Google account</li>
                <li>Click "Get API Key" and create a new key</li>
                <li>Copy and paste it below</li>
            </ol>
            <input type="password" id="apiKeyInput" placeholder="Paste your Gemini API key here" 
                   style="width: 90%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px;">
            <br>
            <button onclick="this.saveApiKey()" style="background: #198754; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">
                Save & Continue
            </button>
            <button onclick="this.closeModal()" style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">
                Cancel
            </button>
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
                🔒 Your API key is stored locally in your browser and never shared.
            </p>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Add event listeners
        modalContent.querySelector('button').onclick = () => {
            const apiKey = document.getElementById('apiKeyInput').value.trim();
            if (apiKey) {
                localStorage.setItem('GEMINI_API_KEY', apiKey);
                this.apiKey = apiKey;
                document.body.removeChild(modal);
                this.addBotMessage("✅ API key saved! You can now start chatting.");
            } else {
                alert('Please enter a valid API key.');
            }
        };

        modalContent.querySelectorAll('button')[1].onclick = () => {
            document.body.removeChild(modal);
            this.addBotMessage("❌ API key required to use this chatbot. Click 'Send' again to retry.");
        };
    }

    async sendMessage(userMessage, chatBoxId) {
        if (!this.apiKey) {
            this.showApiKeyModal();
            return;
        }

        try {
            this.addUserMessage(userMessage, chatBoxId);
            this.showTypingIndicator(chatBoxId);

            // Add user message to conversation history
            this.conversationHistory.push({
                role: "user",
                parts: [{ text: userMessage }]
            });

            // Prepare the request with correct format
            const requestBody = {
                contents: [
                    {
                        parts: [{ 
                            text: `${this.systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:` 
                        }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                    stopSequences: []
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            };

            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            this.removeTypingIndicator(chatBoxId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const botResponse = data.candidates[0].content.parts[0].text;
                this.addBotMessage(botResponse, chatBoxId);
                
                // Add bot response to conversation history
                this.conversationHistory.push({
                    role: "model",
                    parts: [{ text: botResponse }]
                });
            } else {
                this.addBotMessage("I'm sorry, I couldn't generate a proper response. Please try again.", chatBoxId);
            }

        } catch (error) {
            this.removeTypingIndicator(chatBoxId);
            console.error('Error calling Gemini API:', error);
            console.error('API URL:', this.apiUrl);
            console.error('API Key (first 10 chars):', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'NO KEY');
            
            if (error.message.includes('401') || error.message.includes('403')) {
                this.addBotMessage("❌ API key issue. Please check your Gemini API key and try again. Error: " + error.message, chatBoxId);
                localStorage.removeItem('GEMINI_API_KEY');
                this.apiKey = null;
            } else if (error.message.includes('400')) {
                this.addBotMessage("❌ Bad request. There might be an issue with the message format. Error: " + error.message, chatBoxId);
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.addBotMessage("❌ Network error. Please check your internet connection and try again.", chatBoxId);
            } else {
                this.addBotMessage(`Sorry, I'm having trouble connecting right now. Error: ${error.message}. Please try again in a moment.`, chatBoxId);
            }
        }
    }

    addUserMessage(message, chatBoxId) {
        const chatBox = document.getElementById(chatBoxId);
        const userDiv = document.createElement('div');
        userDiv.className = 'user-message';
        userDiv.innerHTML = `<strong>You:</strong> ${message}`;
        userDiv.style.cssText = `
            margin: 10px 0;
            padding: 10px;
            background: #e3f2fd;
            border-radius: 10px;
            border-left: 4px solid #2196f3;
        `;
        chatBox.appendChild(userDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    addBotMessage(message, chatBoxId) {
        const chatBox = document.getElementById(chatBoxId);
        const botDiv = document.createElement('div');
        botDiv.className = 'bot-message';
        botDiv.innerHTML = `<strong>${this.botName}:</strong> ${message}`;
        botDiv.style.cssText = `
            margin: 10px 0;
            padding: 10px;
            background: #f1f8e9;
            border-radius: 10px;
            border-left: 4px solid #4caf50;
        `;
        chatBox.appendChild(botDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    showTypingIndicator(chatBoxId) {
        const chatBox = document.getElementById(chatBoxId);
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `<strong>${this.botName}:</strong> <span class="typing-dots">Thinking...</span>`;
        typingDiv.style.cssText = `
            margin: 10px 0;
            padding: 10px;
            background: #fff3e0;
            border-radius: 10px;
            border-left: 4px solid #ff9800;
            font-style: italic;
        `;
        chatBox.appendChild(typingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    removeTypingIndicator(chatBoxId) {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Method to clear conversation history
    clearHistory() {
        this.conversationHistory = [];
    }

    // Method to reset API key (for testing or key updates)
    resetApiKey() {
        localStorage.removeItem('GEMINI_API_KEY');
        this.apiKey = null;
        this.showApiKeyModal();
    }
}

// Export for use in HTML files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeminiChatbot;
}
