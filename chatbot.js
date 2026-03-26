// --- DOM Elements ---
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messagesContainer');
const welcomeScreen = document.getElementById('welcomeScreen');
const newChatBtn = document.getElementById('newChatBtn');
const chatHistoryList = document.getElementById('chatHistoryList');

// Modal Elements
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const openaiKeyInput = document.getElementById('openaiKeyInput');
const hfKeyInput = document.getElementById('hfKeyInput');
const orKeyInput = document.getElementById('orKeyInput');

// Model Dropdown
const modelSelectBtn = document.getElementById('modelSelectBtn');
const modelDropdown = document.getElementById('modelDropdown');
const currentModelDisplay = document.getElementById('currentModelDisplay');
const modelOptions = document.querySelectorAll('.model-option');

// Sidebar logic
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// --- State ---
let chats = JSON.parse(localStorage.getItem('chats')) || [];
let currentChatId = null;
let isGenerating = false;
let abortController = null;

let currentModel = 'gpt-4o-mini';
let currentProvider = 'openai'; 

// Load API Keys
let openaiApiKey = localStorage.getItem('openai_api_key') || '';
let hfApiKey = localStorage.getItem('hf_api_key') || '';
let orApiKey = localStorage.getItem('or_api_key') || '';


// --- Initialization ---
function init() {
    // Check if we have an API key, if not show settings
    if (!openaiApiKey) {
        setTimeout(openSettings, 1000);
    }

    // Set marked options for markdown rendering
    marked.setOptions({
        breaks: true,
        gfm: true
    });

    renderChatHistorySidebar();

    // Load last chat if exists, else wait for new user input
    if (chats.length > 0) {
        currentChatId = chats[0].id;
        loadChat(currentChatId);
    } else {
        showWelcomeScreen();
    }
    
    updateModelCheckmark();
}

// --- Textarea auto-resize ---
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    
    // Toggle send button state
    if (this.value.trim().length > 0 && !isGenerating) {
        sendBtn.removeAttribute('disabled');
        sendBtn.classList.replace('bg-white', 'bg-accent');
        sendBtn.classList.replace('text-black', 'text-white');
    } else {
        sendBtn.setAttribute('disabled', 'true');
        sendBtn.classList.replace('bg-accent', 'bg-white');
        sendBtn.classList.replace('text-white', 'text-black');
    }
});

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) {
            handleSendMessage();
        }
    }
});

sendBtn.addEventListener('click', handleSendMessage);

// --- Settings Logic ---
settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
cancelSettingsBtn.addEventListener('click', closeSettings);
saveSettingsBtn.addEventListener('click', () => {
    openaiApiKey = openaiKeyInput.value.trim();
    hfApiKey = hfKeyInput.value.trim();
    orApiKey = orKeyInput.value.trim();
    
    localStorage.setItem('openai_api_key', openaiApiKey);
    localStorage.setItem('hf_api_key', hfApiKey);
    localStorage.setItem('or_api_key', orApiKey);
    
    closeSettings();
});

function openSettings() {
    openaiKeyInput.value = openaiApiKey;
    hfKeyInput.value = hfApiKey;
    orKeyInput.value = orApiKey;
    settingsModal.classList.remove('hidden');
    // slight delay for transition
    setTimeout(() => {
        settingsModal.classList.remove('opacity-0');
        settingsModal.firstElementChild.classList.remove('scale-95');
    }, 10);
}

function closeSettings() {
    settingsModal.classList.add('opacity-0');
    settingsModal.firstElementChild.classList.add('scale-95');
    setTimeout(() => {
        settingsModal.classList.add('hidden');
    }, 200);
}

// --- Model Dropdown Logic ---
modelSelectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    modelDropdown.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!modelSelectBtn.contains(e.target) && !modelDropdown.contains(e.target)) {
        modelDropdown.classList.add('hidden');
    }
});

modelOptions.forEach(option => {
    option.addEventListener('click', (e) => {
        currentModel = option.dataset.model;
        currentProvider = option.dataset.provider;
        
        // Update display text
        currentModelDisplay.innerHTML = option.querySelector('.font-medium').innerHTML;
        
        updateModelCheckmark();
        modelDropdown.classList.add('hidden');
    });
});

function updateModelCheckmark() {
    modelOptions.forEach(opt => {
        const check = opt.querySelector('.fa-check');
        if (opt.dataset.model === currentModel) {
            check.classList.remove('hidden');
        } else {
            check.classList.add('hidden');
        }
    });
}

// --- Sidebar Mobile Logic ---
toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('-translate-x-full');
    sidebarOverlay.classList.remove('hidden');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('hidden');
});

// --- Chat Management ---
newChatBtn.addEventListener('click', () => {
    startNewChat();
});

document.getElementById('clearCurrentChat').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
        if (currentChatId) {
            chats = chats.filter(c => c.id !== currentChatId);
            saveChats();
            renderChatHistorySidebar();
            startNewChat();
        }
    }
});

function showWelcomeScreen() {
    welcomeScreen.classList.remove('hidden');
}

function startNewChat() {
    currentChatId = null;
    messagesContainer.innerHTML = '';
    messagesContainer.appendChild(welcomeScreen);
    showWelcomeScreen();
    
    // Reset selection in sidebar
    document.querySelectorAll('.chat-history-item').forEach(item => {
        item.classList.remove('bg-msgbot');
        item.classList.add('hover:bg-white/5');
    });

    // reset UI
    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    }
}

function loadChat(id) {
    currentChatId = id;
    const chat = chats.find(c => c.id === id);
    if (!chat) return;

    welcomeScreen.classList.add('hidden');
    messagesContainer.innerHTML = '';
    
    chat.messages.forEach(msg => {
        appendMessage(msg.role, msg.content, false);
    });
    
    scrollToBottom();
    
    // Highlight sidebar
    document.querySelectorAll('.chat-history-item').forEach(item => {
        if (item.dataset.id === id) {
            item.classList.add('bg-msgbot');
            item.classList.remove('hover:bg-white/5');
        } else {
            item.classList.remove('bg-msgbot');
            item.classList.add('hover:bg-white/5');
        }
    });
    
    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    }
}

function saveChats() {
    localStorage.setItem('chats', JSON.stringify(chats));
}

function renderChatHistorySidebar() {
    chatHistoryList.innerHTML = '';
    
    // Sort logic -> newest first
    const sortedChats = [...chats].sort((a,b) => b.id - a.id);

    sortedChats.forEach(chat => {
        const title = chat.title || 'New Chat';
        const div = document.createElement('div');
        div.className = `chat-history-item flex items-center gap-3 p-2.5 rounded-lg cursor-pointer truncate text-sm text-gray-300 transition-colors group ${chat.id === currentChatId ? 'bg-msgbot' : 'hover:bg-white/5'}`;
        div.dataset.id = chat.id;
        
        let displayTitle = title;
        if(title.length > 25) {
            displayTitle = title.substring(0, 25) + '...';
        }
        
        div.innerHTML = `<span class="truncate flex-1">${escapeHTML(displayTitle)}</span>`;
        
        div.addEventListener('click', () => loadChat(chat.id));
        chatHistoryList.appendChild(div);
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag]));
}

// --- Message Handling ---
async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text || isGenerating) return;

    // Check API Keys
    if (currentProvider === 'openai' && !openaiApiKey) {
        alert("Please set your OpenAI API Key in settings.");
        openSettings();
        return;
    }
    if (currentProvider === 'huggingface' && !hfApiKey) {
        alert("Please set your HuggingFace API Key in settings to use this model.");
        openSettings();
        return;
    }
    if (currentProvider === 'openrouter' && !orApiKey) {
        alert("Please set your OpenRouter API Key in settings to use this model.");
        openSettings();
        return;
    }

    // Reset input
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.setAttribute('disabled', 'true');
    sendBtn.classList.replace('bg-accent', 'bg-white');
    sendBtn.classList.replace('text-white', 'text-black');

    // Create new chat if needed
    if (!currentChatId) {
        currentChatId = Date.now().toString();
        chats.unshift({
            id: currentChatId,
            title: text,
            messages: []
        });
        welcomeScreen.classList.add('hidden');
    }

    // Add user message to UI and state
    appendMessage('user', text);
    const chat = chats.find(c => c.id === currentChatId);
    chat.messages.push({ role: 'user', content: text });
    
    if (chat.messages.length === 1 && chat.title === text) {
        chat.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
    }
    
    saveChats();
    renderChatHistorySidebar();
    
    // Create loading bot message block
    const botMsgElement = appendMessage('assistant', '', true);
    const contentDiv = botMsgElement.querySelector('.prose');
    
    // Call API
    isGenerating = true;
    abortController = new AbortController();
    
    // Change send icon to stop square
    sendBtn.innerHTML = '<i class="fas fa-square"></i>';
    sendBtn.removeAttribute('disabled');
    sendBtn.classList.remove('bg-white', 'text-black');
    sendBtn.classList.add('bg-transparent', 'border', 'border-gray-500', 'text-gray-400', 'hover:bg-transparent', 'hover:text-white', 'hover:border-white');
    sendBtn.removeEventListener('click', handleSendMessage);
    sendBtn.addEventListener('click', stopGeneration);

    try {
        let fullResponse = '';
        
        // Format messages for API
        const apiMessages = chat.messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        const response = await fetchChatCompletion(apiMessages);
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || response.statusText);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.trim().length === 0) continue;
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6);
                    if (dataStr === '[DONE]') break;
                    try {
                        const data = JSON.parse(dataStr);
                        let content = '';
                        
                        // Parse according to provider stream structure
            if(currentProvider === 'openai' || currentProvider === 'openrouter') {
                content = data.choices[0]?.delta?.content || '';
            } else if(currentProvider === 'huggingface') {
                // HF also conforms to delta.content for API Serverless format or message.content for sometimes
                content = data.choices[0]?.delta?.content || '';
            }

                        if (content) {
                            fullResponse += content;
                            contentDiv.innerHTML = marked.parse(fullResponse) + '<span class="streaming-cursor"></span>';
                            scrollToBottom();
                        }
                    } catch (e) {
                         // Some fragments might be incomplete JSON, skip
                    }
                }
            }
        }
        
        // Finish
        contentDiv.innerHTML = marked.parse(fullResponse);
        chat.messages.push({ role: 'assistant', content: fullResponse });
        saveChats();

    } catch (error) {
        if (error.name === 'AbortError') {
            contentDiv.innerHTML += ' <span class="text-xs text-gray-500 italic">[Aborted]</span>';
        } else {
            console.error(error);
            contentDiv.innerHTML = `<span class="text-red-400">Error: ${error.message}</span>`;
            chat.messages.pop(); // Remove user message if failed
            saveChats();
        }
    } finally {
        isGenerating = false;
        abortController = null;
        
        // Reset send button
        sendBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        sendBtn.removeEventListener('click', stopGeneration);
        sendBtn.addEventListener('click', handleSendMessage);
        
        // Check text area
        if (userInput.value.trim().length === 0) {
            sendBtn.setAttribute('disabled', 'true');
            sendBtn.className = 'absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed';
        } else {
            sendBtn.className = 'absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center hover:bg-[#0e906f] transition-colors';
        }
        
        scrollToBottom();
    }
}

function stopGeneration() {
    if (abortController) {
        abortController.abort();
    }
}

async function fetchChatCompletion(messages) {
    let url, headers, body;

    if (currentProvider === 'openai') {
        url = 'https://api.openai.com/v1/chat/completions';
        headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
        };
        body = JSON.stringify({
            model: currentModel,
            messages: messages,
            stream: true
        });
    } else if (currentProvider === 'openrouter') {
        url = 'https://openrouter.ai/api/v1/chat/completions';
        headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${orApiKey}`,
            'HTTP-Referer': window.location.href,
            'X-Title': 'ChatGPT Clone'
        };
        body = JSON.stringify({
            model: currentModel,
            messages: messages,
            stream: true
        });
    } else if (currentProvider === 'huggingface') {
        // HF Inference endpoint structure using Messages API format (supported natively for newer models)
        url = `https://api-inference.huggingface.co/models/${currentModel}/v1/chat/completions`;
        headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hfApiKey}`
        };
        body = JSON.stringify({
            model: currentModel,
            messages: messages,
            stream: true,
            max_tokens: 1024
        });
    }

    return fetch(url, {
        method: 'POST',
        headers: headers,
        body: body,
        signal: abortController.signal
    });
}

// --- UI Helpers ---
function appendMessage(role, content, isStreaming = false) {
    const div = document.createElement('div');
    div.className = `w-full py-6 px-4 ${role === 'assistant' ? 'bg-transparent' : 'bg-transparent'} message-enter flex`;
    
    // Add user avatar or bot avatar
    let avatarIcon = role === 'user' ? '<i class="fas fa-user text-sm text-white"></i>' : '<img src="chat.png" class="w-5 h-5 filter invert" alt="bot">';
    if(role === 'assistant') {
       avatarIcon = '<i class="fa-solid fa-robot text-sm text-white"></i>';
    }

    const innerHtml = `
        <div class="max-w-3xl mx-auto flex gap-4 w-full">
            <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${role === 'user' ? 'bg-indigo-600' : 'bg-accent'}">
                ${avatarIcon}
            </div>
            <div class="flex-1 overflow-hidden">
                <div class="font-bold text-gray-200 mb-1 leading-none text-[13px]">${role === 'user' ? 'You' : 'ChatGPT'}</div>
                <div class="${role === 'assistant' ? 'prose text-gray-200 w-full' : 'text-gray-200 whitespace-pre-wrap leading-relaxed'}">
                    ${role === 'assistant' 
                        ? (isStreaming ? '<span class="streaming-cursor"></span>' : marked.parse(content)) 
                        : escapeHTML(content)}
                </div>
            </div>
        </div>
    `;
    
    div.innerHTML = innerHtml;
    messagesContainer.appendChild(div);
    scrollToBottom();
    return div;
}

function scrollToBottom() {
    const chatArea = document.getElementById('chatArea');
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Start
init();
