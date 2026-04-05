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
        
        // Show typing indicator
        const typingDiv = showTypingIndicator();
        
        setTimeout(() => {
            typingDiv.remove();
            const response = getBotResponse(text);
            appendMessage('bot', response);
        }, 1000);
    };

    sendChatBtn?.addEventListener('click', sendMessage);
    aiChatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function appendMessage(sender, content) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-message ${sender}`;
        
        if (typeof content === 'string') {
            msgDiv.innerHTML = content.replace(/\n/g, '<br>');
        } else {
            msgDiv.appendChild(content);
        }
        
        chatBody?.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message bot typing';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        chatBody?.appendChild(typingDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
        return typingDiv;
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
        
        // 1. Search in QUESTIONS
        const matchedQuestion = QUESTIONS.find(item => 
            item.title.toLowerCase().includes(q) || 
            item.tags.some(t => t.toLowerCase().includes(q)) ||
            (item.company && item.company.toLowerCase().includes(q))
        );

        if (matchedQuestion) {
            return `I found a relevant interview question: <strong>${matchedQuestion.icon} ${matchedQuestion.title}</strong>.<br><br>${matchedQuestion.desc}<br><br><button class="btn btn-sm btn-primary" style="margin-top:10px" onclick="window.app.openQuestion(${matchedQuestion.id}); document.getElementById('aiChatWindow').classList.add('hidden');">Open Question Details</button>`;
        }

        // 2. Search in CONCEPTS
        const matchedConcept = CONCEPTS.find(item => 
            item.title.toLowerCase().includes(q) || 
            item.tags.some(t => t.toLowerCase().includes(q)) ||
            item.desc.toLowerCase().includes(q)
        );

        if (matchedConcept) {
            return `<strong>${matchedConcept.icon} ${matchedConcept.title}</strong>: ${matchedConcept.desc}<br><br><button class="btn btn-sm btn-ghost" style="margin-top:10px" onclick="window.app.navigateTo('concepts'); document.getElementById('aiChatWindow').classList.add('hidden');">View All Concepts</button>`;
        }

        // 3. Search in GUIDES_DATA
        const matchedGuide = GUIDES_DATA.find(item => 
            item.title.toLowerCase().includes(q) || 
            item.tags.some(t => t.toLowerCase().includes(q)) ||
            item.desc.toLowerCase().includes(q)
        );

        if (matchedGuide) {
            return `I recommend checking out this deep dive: <strong>${matchedGuide.icon} ${matchedGuide.title}</strong>.<br><br>${matchedGuide.desc}<br><br><a href="${matchedGuide.url}" target="_blank" class="btn btn-sm btn-primary" style="margin-top:10px; text-decoration:none;">Read Guide ↗</a>`;
        }

        // Specific high-signal triggers
        if (q.includes('cap')) {
            return "The CAP theorem states that a distributed system can only provide two out of three: Consistency, Availability, and Partition Tolerance. In a network partition, you must choose between C and A. Check the <strong>Distributed Systems</strong> section for more!";
        }
        
        if (q.includes('hello') || q.includes('hi ') || q.includes('hey')) {
            return "Hello! I'm your System Design Assistant. You can ask me things like 'How to scale Twitter?', 'Explain Load Balancing', or 'Show me the Kubernetes guide'. What are we building today?";
        }

        return "That's a great topic! I don't have a specific result for that yet, but you can find more in our <strong>Deep Dives</strong> or <strong>Concepts</strong> sections. Would you like me to show you the top interview questions?";
    }
});

