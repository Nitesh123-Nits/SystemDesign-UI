/**
 * SystemDesign.Pro — AI Assistant Logic
 * Handles the interactive chat experience, automated responses, and UI toggles.
 */

document.addEventListener('DOMContentLoaded', () => {
    const aiTriggerBtn = document.getElementById('aiTriggerBtn');
    const aiChatWindow = document.getElementById('aiChatWindow');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const aiChatInput = document.getElementById('aiChatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatBody = document.getElementById('chatBody');
    const chatSuggestions = document.getElementById('chatSuggestions');

    const suggestions = [
        "How to scale a social media app?",
        "Explain CAP Theorem simply",
        "SQL vs NoSQL trade-offs",
        "How does Kafka handle scale?"
    ];

    // Toggle Chat Window
    aiTriggerBtn?.addEventListener('click', () => {
        aiChatWindow?.classList.toggle('hidden');
        if (!aiChatWindow?.classList.contains('hidden')) {
            aiChatInput?.focus();
            renderSuggestions();
        }
    });

    closeChatBtn?.addEventListener('click', () => {
        aiChatWindow?.classList.add('hidden');
    });

    // Send Message
    const sendMessage = () => {
        const text = aiChatInput.value.trim();
        if (!text) return;

        appendMessage('user', text);
        aiChatInput.value = '';
        
        // Mock bot response
        setTimeout(() => {
            const response = getBotResponse(text);
            appendMessage('bot', response);
        }, 600);
    };

    sendChatBtn?.addEventListener('click', sendMessage);
    aiChatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-message ${sender}`;
        msgDiv.textContent = text;
        chatBody?.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function renderSuggestions() {
        if (!chatSuggestions) return;
        chatSuggestions.innerHTML = '';
        suggestions.forEach(s => {
            const chip = document.createElement('div');
            chip.className = 'ai-suggestion-chip';
            chip.textContent = s;
            chip.onclick = () => {
                aiChatInput.value = s;
                sendMessage();
            };
            chatSuggestions.appendChild(chip);
        });
    }

    function getBotResponse(query) {
        const q = query.toLowerCase();
        if (q.includes('scale') || q.includes('scaling')) {
            return "To scale, consider horizontal scaling (adding nodes), load balancing, and partitioning your database (sharding). Which area would you like to dive into?";
        }
        if (q.includes('cap')) {
            return "The CAP theorem states that a distributed system can only provide two out of three: Consistency, Availability, and Partition Tolerance. In a network partition, you must choose between C and A.";
        }
        if (q.includes('sql') || q.includes('nosql')) {
            return "SQL is great for relational data and ACID compliance. NoSQL excels at massive writes and flexible schemas. What's your specific use case?";
        }
        if (q.includes('kafka')) {
            return "Kafka uses a distributed append-only log. It scales by partitioning topics across multiple brokers and allows consumers to read at their own pace.";
        }
        return "That's a great question! I'm still learning, but you can find more about that in our 'Deep Dives & Guides' section. Would you like me to summarize a specific guide?";
    }
});
