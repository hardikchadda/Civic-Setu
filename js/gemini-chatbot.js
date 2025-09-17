class GeminiChatbot {
    constructor(systemPrompt, botName) {
        this.systemPrompt = systemPrompt;
        this.botName = botName;
        this.conversationHistory = [];
        this.apiKey = this.getApiKey();
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
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
        // Check if modal already exists
        if (document.getElementById('gemini-api-modal')) {
            console.log('API key modal already exists');
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'gemini-api-modal';
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
            <p>To use this chatbot, you need a Gemini API key. For quick access, you can use this demo key:</p>
            
            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 15px; margin: 15px 0; text-align: center;">
                <strong style="color: #198754;">Demo API Key (Ready to Use):</strong><br>
                <code style="background: white; padding: 5px; border-radius: 3px; font-size: 12px; word-break: break-all; display: inline-block; margin: 5px 0; border: 1px solid #ccc;">AIzaSyD_dG23Yn4klYkTAU3kLPPcSufukhJGoYw</code><br>
                <button id="copyToInputBtn" 
                        style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; font-size: 12px; cursor: pointer; margin-top: 5px;">
                    📋 Copy to Input
                </button>
            </div>
            
            <p><strong>Or get your own free key:</strong></p>
            <ol style="text-align: left; margin: 10px 0; font-size: 14px;">
                <li>Visit <a href="https://ai.google.dev/" target="_blank">Google AI Studio</a></li>
                <li>Sign in → Click "Get API Key" → Create new key</li>
                <li>Copy and paste it below</li>
            </ol>
            
            <input type="text" id="apiKeyInput" placeholder="Paste API key here (or use demo key above)" 
                   style="width: 90%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px; font-family: monospace;">
            <br>
            <button id="saveApiKeyBtn" style="background: #198754; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">
                ✅ Save & Continue
            </button>
            <button id="cancelApiKeyBtn" style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">
                ❌ Cancel
            </button>
            <p style="font-size: 12px; color: #666; margin-top: 15px;">
                🔒 Your API key is stored locally in your browser and never shared.
            </p>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Add event listeners with proper scope binding
        const copyButton = modalContent.querySelector('#copyToInputBtn');
        const saveButton = modalContent.querySelector('#saveApiKeyBtn');
        const cancelButton = modalContent.querySelector('#cancelApiKeyBtn');
        
        // Fix the copy button
        if (copyButton) {
            copyButton.onclick = () => {
                document.getElementById('apiKeyInput').value = 'AIzaSyD_dG23Yn4klYkTAU3kLPPcSufukhJGoYw';
            };
        }
        
        // Save button handler
        saveButton.onclick = () => {
            const apiKey = document.getElementById('apiKeyInput').value.trim();
            if (apiKey) {
                localStorage.setItem('GEMINI_API_KEY', apiKey);
                this.apiKey = apiKey;
                document.body.removeChild(modal);
                console.log('✅ API key saved successfully!');
                
                // If there's a pending message, retry it
                if (this.pendingMessage && this.pendingChatBoxId) {
                    console.log('Retrying pending message...');
                    this.sendMessage(this.pendingMessage, this.pendingChatBoxId);
                    this.pendingMessage = null;
                    this.pendingChatBoxId = null;
                }
            } else {
                alert('Please enter a valid API key.');
            }
        };

        // Cancel button handler
        cancelButton.onclick = () => {
            document.body.removeChild(modal);
            console.log('❌ API key setup cancelled.');
        };
        
        // Auto-fill the demo key on modal load
        setTimeout(() => {
            const input = document.getElementById('apiKeyInput');
            if (input) {
                input.value = 'AIzaSyD_dG23Yn4klYkTAU3kLPPcSufukhJGoYw';
            }
        }, 100);
    }

    async sendMessage(userMessage, chatBoxId) {
        // Check for API key again in case it was just saved
        if (!this.apiKey) {
            this.apiKey = localStorage.getItem('GEMINI_API_KEY');
        }
        
        if (!this.apiKey) {
            console.log('No API key found, showing modal...');
            // Store the pending message to retry after API key is saved
            this.pendingMessage = userMessage;
            this.pendingChatBoxId = chatBoxId;
            this.showApiKeyModal();
            return;
        }
        
        console.log('API key found, proceeding with message...', this.apiKey.substring(0, 10) + '...');

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

            console.log('Sending request to Gemini API...');
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            this.removeTypingIndicator(chatBoxId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                let botResponse = data.candidates[0].content.parts[0].text;
                
                // Clean up formatting - remove excessive markdown
                botResponse = botResponse
                    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Convert **text** to <strong>
                    .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Convert *text* to <em>
                    .replace(/\n\n/g, '<br><br>') // Convert double newlines to breaks
                    .replace(/\n/g, '<br>') // Convert single newlines to breaks
                    .replace(/- /g, '• ') // Convert - to bullet points
                    .trim();
                
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
