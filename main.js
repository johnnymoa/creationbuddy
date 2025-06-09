const chatListElement = document.getElementById('chat-list');
const chatAreaElement = document.getElementById('chat-area');
const chatInputElement = document.getElementById('chat-input');
const newChatButton = document.getElementById('new-chat-btn');
const sendButton = document.getElementById('send-btn');
const deleteAllButton = document.getElementById('delete-all-btn');
const exportAllButton = document.getElementById('export-all-btn');
const importAllButton = document.getElementById('import-all-btn');
const importAllInput = document.getElementById('import-all-input');
let iframe = document.getElementById('genai-iframe');
const resizer = document.getElementById('resizer');
const mainChat = document.getElementById('main-chat');
const iframeContainer = document.getElementById('iframe-container');
const apiKeyInput = document.getElementById('apikey');
const modelSelect = document.getElementById('model');
const systemPromptSelect = document.getElementById('system-prompt-select');
const memoryModeSelect = document.getElementById('memory-mode-select');
const toastContainer = document.getElementById('toast-container');

let provider = document.getElementById('model').selectedOptions[0].getAttribute('provider');
let chats = JSON.parse(localStorage.getItem('chats')) || [];
let systemPrompts = [];
let currentChatIndex = 0;
let editingPromptIndex = null;

// Toast Notification System
function showToast(message, type = 'success', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const toastContent = document.createElement('div');
    toastContent.className = 'toast-content';
    
    const toastIcon = document.createElement('div');
    toastIcon.className = 'toast-icon';
    toastIcon.innerHTML = getToastIcon(type);
    
    const toastMessage = document.createElement('div');
    toastMessage.className = 'toast-message';
    toastMessage.textContent = message;
    
    const toastClose = document.createElement('button');
    toastClose.className = 'toast-close';
    toastClose.innerHTML = '×';
    toastClose.onclick = () => removeToast(toast);
    
    toastContent.appendChild(toastIcon);
    toastContent.appendChild(toastMessage);
    toastContent.appendChild(toastClose);
    toast.appendChild(toastContent);
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto remove
    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }
    
    return toast;
}

function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

function getToastIcon(type) {
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    return icons[type] || icons.info;
}

// Auto-resize textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Function to load prompt content from the server
async function loadPromptContent(name) {
    try {
        const response = await fetch(`/prompts/${name}.txt`);
        if (response.ok) {
            return await response.text();
        } else {
            console.error(`Failed to load content for ${name}`);
            return '';
        }
    } catch (error) {
        console.error(`Error loading prompt ${name}:`, error);
        return '';
    }
}

// Function to load default system prompts and merge them with stored prompts
async function initializeSystemPrompts() {
    systemPrompts = [
        { name: 'Make WebApps', content: '' },
        { name: 'Just Chat', content: '' },
        { name: 'Use P5js', content: '' },
        { name: 'Use Mermaid diagrams', content: '' }
    ];
    
    for (let prompt of systemPrompts) {
        prompt.content = await loadPromptContent(prompt.name);
    }
    
    systemPromptSelect.innerHTML = '';
    systemPrompts.forEach((prompt, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = prompt.name;
        systemPromptSelect.appendChild(option);
    });
    
    loadSelectedSystemPrompt();
}

function renderChatList() {
    chatListElement.innerHTML = '';
    chats.forEach((chat, index) => {
        const chatName = chat.name || 'New chat';
        const li = document.createElement('li');
        
        if (index === currentChatIndex) {
            li.classList.add('active');
        }

        const titleSpan = document.createElement('span');
        titleSpan.textContent = chatName;
        titleSpan.classList.add('title');
        li.appendChild(titleSpan);

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('chat-actions');

        const renameBtn = document.createElement('button');
        renameBtn.innerHTML = '✏';
        renameBtn.classList.add('action-btn');
        renameBtn.title = 'Rename chat';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newName = prompt('Enter new chat name:', chatName);
            if (newName !== null && newName.trim() !== '') {
                renameChat(index, newName.trim());
                showToast('Chat renamed successfully');
            }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '×';
        deleteBtn.classList.add('action-btn', 'danger');
        deleteBtn.title = 'Delete chat';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this chat?')) {
                deleteChat(index);
                showToast('Chat deleted', 'warning');
            }
        });

        actionsDiv.appendChild(renameBtn);
        actionsDiv.appendChild(deleteBtn);
        li.appendChild(actionsDiv);
        
        li.addEventListener('click', () => loadChat(index));
        chatListElement.appendChild(li);
    });
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatMessage(content) {
    // Clean up content first - remove trailing backticks that might appear after code blocks
    content = content.trim();
    
    // Remove standalone backticks at the end that aren't part of a code block
    content = content.replace(/\n```\s*$/, '');
    content = content.replace(/```\s*$/, '');
    
    // Count triple backticks to ensure they're balanced
    const tripleBacktickMatches = content.match(/```/g) || [];
    const tripleBacktickCount = tripleBacktickMatches.length;
    
    // If odd number of backticks, add closing backticks
    if (tripleBacktickCount % 2 !== 0) {
        content += "\n```";
    }

    // Enhanced regex to handle various code block formats
    const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;

    // Array to hold processed segments
    let segments = [];
    let lastIndex = 0;

    // Process each code block
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
        const [fullMatch, language, code] = match;
        const offset = match.index;

        // Escape content before the code block
        if (offset > lastIndex) {
            const textBefore = content.slice(lastIndex, offset);
            if (textBefore.trim()) {
                segments.push(escapeHtml(textBefore));
            }
        }

        // Process the code block
        const cleanCode = code.trim();
        if (cleanCode) {
            const escapedCode = escapeHtml(cleanCode);
            const detectedLanguage = detectLanguage(language, cleanCode);
            const isHtml = detectedLanguage === 'html';
            const uniqueId = `creation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const buttons = `<div class="code-buttons">
    <p>${detectedLanguage}</p>
    <div class="code-actions">
        <button onclick="copyToClipboard('${uniqueId}')">Copy</button>
        ${isHtml ? `<button onclick="downloadHtml('${uniqueId}')">Download</button>` : ''}
        ${isHtml ? `<button class="run-button" onclick="runHtml('${uniqueId}')">Run</button>` : ''}
    </div>
</div>`;
            
            segments.push(`<div class="code-block-container">${buttons}<pre id="${uniqueId}"><code ${isHtml ? 'data-html="true"' : ''}>${escapedCode}</code></pre></div>`);
        }

        lastIndex = offset + fullMatch.length;
    }

    // Escape remaining content after the last code block
    if (lastIndex < content.length) {
        const remainingText = content.slice(lastIndex);
        if (remainingText.trim()) {
            segments.push(escapeHtml(remainingText));
        }
    }

    // If no code blocks were found, just escape the entire content
    if (segments.length === 0) {
        return escapeHtml(content);
    }

    // Join all segments together
    return segments.join('');
}

// Helper function to detect language from code content if not specified
function detectLanguage(specifiedLanguage, code) {
    if (specifiedLanguage) {
        return specifiedLanguage.toLowerCase();
    }
    
    // Simple language detection based on code patterns
    const codeUpper = code.toUpperCase();
    
    // Check for HTML
    if (code.includes('<!DOCTYPE') || code.includes('<html') || code.includes('<body') || 
        (code.includes('<') && code.includes('>') && code.includes('</'))) {
        return 'html';
    }
    
    // Check for CSS
    if (code.includes('{') && code.includes('}') && code.includes(':') && 
        (code.includes('color') || code.includes('margin') || code.includes('padding'))) {
        return 'css';
    }
    
    // Check for JavaScript
    if (code.includes('function') || code.includes('const ') || code.includes('let ') || 
        code.includes('var ') || code.includes('=>') || code.includes('console.log')) {
        return 'javascript';
    }
    
    // Check for Python
    if (code.includes('def ') || code.includes('import ') || code.includes('print(') || 
        code.includes('if __name__')) {
        return 'python';
    }
    
    // Check for JSON
    if ((code.trim().startsWith('{') && code.trim().endsWith('}')) || 
        (code.trim().startsWith('[') && code.trim().endsWith(']'))) {
        try {
            JSON.parse(code);
            return 'json';
        } catch (e) {
            // Not valid JSON
        }
    }
    
    return 'code';
}

function startOverFrom(index, uniqueId) {
    if (confirm("Are you sure you want to delete this prompt and all following messages? This action cannot be undone.")) {
        let messageIndex = chats[index].messages.findIndex(message => message.uniqueId === uniqueId);

        if (messageIndex !== -1) {
            const deletedCount = chats[index].messages.length - messageIndex;
            chats[index].messages.splice(messageIndex);
            saveChats();
            loadChat(index);
            showToast(`Deleted ${deletedCount} message(s)`, 'warning');
        } else {
            console.error("Message with the specified uniqueId not found.");
            showToast('Message not found', 'error');
        }
    }
}

function createThinkingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'thinking-indicator';
    indicator.id = 'thinking-indicator';
    
    const dots = document.createElement('div');
    dots.className = 'thinking-dots';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'thinking-dot';
        dots.appendChild(dot);
    }
    
    const text = document.createElement('div');
    text.className = 'thinking-text';
    text.textContent = 'Buddy is thinking...';
    
    indicator.appendChild(dots);
    indicator.appendChild(text);
    
    return indicator;
}

function showThinkingIndicator() {
    const existingIndicator = document.getElementById('thinking-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const indicator = createThinkingIndicator();
    chatAreaElement.appendChild(indicator);
    chatAreaElement.scrollTop = chatAreaElement.scrollHeight;
}

function hideThinkingIndicator() {
    const indicator = document.getElementById('thinking-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function loadChat(index) {
    clearIframe();
    currentChatIndex = index;
    
    chatAreaElement.innerHTML = chats[index].messages.map(msg => {
        const formattedContent = formatMessage(msg.content);
        const isUser = msg.role === 'user';
        
        return `
            <div class="message ${isUser ? 'user' : 'assistant'}">
                ${isUser ? `
                    <div class="start-over-section">
                        <button class="start-over-btn" onclick="startOverFrom(${index},'${msg.uniqueId}')">
                            Start over from here
                        </button>
                    </div>
                    <hr class="message-divider">
                ` : ''}
                <div class="message-header">
                    <div class="message-avatar ${isUser ? 'user' : 'assistant'}">
                        ${isUser ? 'U' : 'B'}
                    </div>
                    <div class="message-author">${isUser ? 'You' : 'Buddy'}</div>
                </div>
                <div class="message-content">${formattedContent}</div>
            </div>
        `;
    }).join('');
    
    loadSelectedSystemPrompt();
    renderChatList(); // Update active state
    chatAreaElement.scrollTop = chatAreaElement.scrollHeight;
}

function addNewChat() {
    chats.push({ name: '', messages: [], selectedPromptIndex: systemPromptSelect.value });
    saveChats();
    renderChatList();
    loadChat(chats.length - 1);
    showToast('New chat created');
}

function deleteChat(index) {
    chats.splice(index, 1);
    saveChats();
    renderChatList();
    if (chats.length > 0) {
        loadChat(Math.min(index, chats.length - 1));
    } else {
        chatAreaElement.innerHTML = '';
        addNewChat();
    }
}

function renameChat(index, newName) {
    chats[index].name = newName;
    saveChats();
    renderChatList();
}

function saveChats() {
    localStorage.setItem('chats', JSON.stringify(chats));
}

function saveSelectedSystemPrompt() {
    chats[currentChatIndex].selectedPromptIndex = systemPromptSelect.value;
    saveChats();
}

function loadSelectedSystemPrompt() {
    const selectedPromptIndex = chats[currentChatIndex]?.selectedPromptIndex || 0;
    systemPromptSelect.value = selectedPromptIndex;
}

let awaitingResponse = false;

async function sendMessage() {
    const message = chatInputElement.value.trim();
    if (message === '') return;

    if (awaitingResponse) {
        showToast('Please wait for the current response to complete', 'warning');
        return;
    }

    // Update button state
    const sendText = sendButton.querySelector('.send-text');
    const sendIcon = sendButton.querySelector('.send-icon');
    sendButton.disabled = true;
    sendText.textContent = 'Sending...';
    sendIcon.textContent = '⏳';
    awaitingResponse = true;

    // Show thinking indicator
    showThinkingIndicator();

    chats[currentChatIndex].messages.push({ 
        role: 'user', 
        content: message, 
        uniqueId: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
    });
    saveChats();
    loadChat(currentChatIndex);
    chatInputElement.value = '';
    autoResizeTextarea(chatInputElement);

    const systemPromptIndex = systemPromptSelect.value;
    const systemPrompt = systemPrompts[systemPromptIndex]?.content || "You are a helpful assistant.";

    let messagesToSend = JSON.parse(JSON.stringify([{ role: "system", content: systemPrompt }, ...chats[currentChatIndex].messages]));
    messagesToSend = messagesToSend.filter(message => message.role !== 'error');
    messagesToSend = messagesToSend.map(message => (delete message.uniqueId, message));

    if (memoryModeSelect.value == "last") {
        if (messagesToSend.length > 3) {
            messagesToSend = [
                messagesToSend[0],
                ...messagesToSend.slice(-3)
            ];
        }
    }

    const responseMessage = await getCompletion(messagesToSend, modelSelect.value);
    
    // Hide thinking indicator
    hideThinkingIndicator();
    
    if (responseMessage) {
        chats[currentChatIndex].messages.push(responseMessage);
        saveChats();
        loadChat(currentChatIndex);
        showToast('Response received');
    }

    // Reset button state
    sendButton.disabled = false;
    sendText.textContent = 'Send';
    sendIcon.textContent = '→';
    awaitingResponse = false;
}

async function getCompletion(messages, model) {
    let API_URL = "";
    let API_KEY = apiKeyInput.value;
    let headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
    };

    let requestBody = {
        model: model,
        messages: messages
    };

    switch (provider) {
        case "openai":
            API_URL = "https://api.openai.com/v1/chat/completions";
            if (model == 'o1-preview') messages[0].role = 'user';
            if (model == 'o1') messages[0].role = 'user';
            if (model == 'o1-mini') messages[0].role = 'user';
            break;
        case "mistral":
            API_URL = "https://api.mistral.ai/v1/chat/completions";
            break;
        case "groq":
            API_URL = "https://api.groq.com/openai/v1/chat/completions";
            break;
        case "anthropic":
            requestBody.max_tokens = 4096;
            messages[0].role = "user";
            messages.splice(1, 0, { role: "assistant", content: "OK" });
            API_URL = "https://api.anthropic.com/v1/messages";
            headers = {
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
                "x-api-key": `${API_KEY}`,
                "anthropic-dangerous-direct-browser-access": "true"
            };
            break;
        default:
            break;
    }

    if (!API_KEY) {
        const errorMsg = 'Please enter your API key to continue';
        chats[currentChatIndex].messages.push({ role: 'error', content: errorMsg });
        saveChats();
        loadChat(currentChatIndex);
        showToast(errorMsg, 'error');
        return null;
    }

    try {
        let response = await fetch(API_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(requestBody),
        });

        if (response.ok) {
            const data = await response.json();
            if (provider === "anthropic") {
                return {
                    content: data.content[0].text,
                    role: 'assistant'
                };
            } else {
                return {
                    content: data.choices[0].message.content,
                    role: 'assistant'
                };
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error?.message || `API request failed with status ${response.status}`;
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Error:', error);
        const errorMsg = 'Request failed. Please check your API key and internet connection.';
        chats[currentChatIndex].messages.push({ role: 'error', content: errorMsg });
        saveChats();
        loadChat(currentChatIndex);
        showToast(error.message || errorMsg, 'error');
        return null;
    }
}

function copyToClipboard(uniqueId) {
    const codeElement = document.querySelector(`#${uniqueId} code`);
    const textArea = document.createElement('textarea');
    textArea.value = codeElement.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('Code copied to clipboard');
}

function downloadHtml(uniqueId) {
    const codeElement = document.querySelector(`#${uniqueId} code`);
    if (codeElement.dataset.html) {
        var file = new Blob([codeElement.textContent], { type: 'text/html' });
        var fileURL = URL.createObjectURL(file);
        var a = document.createElement("a");
        a.href = fileURL;
        a.download = uniqueId + ".html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(fileURL);
        showToast('HTML file downloaded');
    }
}

function clearIframe() {
    let newIframe = document.createElement('iframe');
    newIframe.id = iframe.id;
    newIframe.width = iframe.width;
    newIframe.height = iframe.height;
    newIframe.className = iframe.className;
    Array.from(iframe.attributes).forEach(attr => {
        if (attr.name !== 'id') {
            newIframe.setAttribute(attr.name, attr.value);
        }
    });
    newIframe.style.cssText = iframe.style.cssText;
    iframe.parentNode.replaceChild(newIframe, iframe);
    iframe = newIframe;
}

function runHtml(uniqueId) {
    const codeElement = document.querySelector(`#${uniqueId} code`);
    if (codeElement.dataset.html) {
        clearIframe();
        iframe.contentDocument.open();
        iframe.contentDocument.write(codeElement.textContent);
        iframe.contentDocument.close();
        showToast('HTML code executed in preview');
    }
}



function deleteAllChats() {
    if (confirm('Are you sure you want to delete all chats? This action cannot be undone.')) {
        chats = [];
        saveChats();
        renderChatList();
        chatAreaElement.innerHTML = '';
        addNewChat();
        showToast('All chats deleted', 'warning');
    }
}

function exportAllData() {
    try {
        const data = { chats };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `creation-buddy-export-${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showToast('Data exported successfully');
    } catch (error) {
        showToast('Export failed', 'error');
    }
}

function importAllData(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                chats = data.chats || [];
                saveChats();
                renderChatList();
                if (chats.length > 0) {
                    loadChat(0);
                } else {
                    addNewChat();
                }
                showToast('Data imported successfully');
            } catch (error) {
                showToast('Import failed - invalid file format', 'error');
            }
        };
        reader.readAsText(file);
    }
    // Reset file input
    event.target.value = '';
}

// Event Listeners
deleteAllButton.addEventListener('click', deleteAllChats);
exportAllButton.addEventListener('click', exportAllData);
importAllButton.addEventListener('click', () => importAllInput.click());
importAllInput.addEventListener('change', importAllData);
newChatButton.addEventListener('click', addNewChat);
sendButton.addEventListener('click', sendMessage);

chatInputElement.addEventListener('input', () => autoResizeTextarea(chatInputElement));
chatInputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !awaitingResponse) {
        e.preventDefault();
        sendMessage();
    }
});

systemPromptSelect.addEventListener('change', saveSelectedSystemPrompt);

// Resizer functionality
const resizerMoveHandler = (e) => {
    // Prevent selecting text while resizing
    e.preventDefault();

    let offsetRight = document.body.offsetWidth - e.clientX;
    const minWidth = 200; // 200px min width for both panels
    const resizerWidth = resizer.offsetWidth || 5;

    // Constrain left panel by mouse position
    if (e.clientX < minWidth) {
        offsetRight = document.body.offsetWidth - minWidth;
    }
    
    // Constrain right panel by its calculated width
    if (offsetRight < minWidth) {
        offsetRight = minWidth;
    }

    mainChat.style.width = `calc(100% - ${offsetRight + resizerWidth}px)`;
    iframeContainer.style.width = `${offsetRight}px`;
};

const resizerUpHandler = () => {
    document.body.style.cursor = 'auto';
    document.body.style.userSelect = 'auto';
    if (iframe) {
        iframe.style.pointerEvents = 'auto';
    }

    document.removeEventListener('mousemove', resizerMoveHandler);
    document.removeEventListener('mouseup', resizerUpHandler);
};

resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    if (iframe) {
        iframe.style.pointerEvents = 'none';
    }

    document.addEventListener('mousemove', resizerMoveHandler);
    document.addEventListener('mouseup', resizerUpHandler);
});

// Model and API key management
const savedModel = localStorage.getItem('selectedModel');
if (savedModel) {
    modelSelect.value = savedModel;
    modelSelect.dispatchEvent(new Event('change'));
    provider = document.getElementById('model').selectedOptions[0].getAttribute('provider');
    const savedApiKey = localStorage.getItem(provider + '_apikey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }
}

modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    localStorage.setItem('selectedModel', selectedModel);

    provider = document.getElementById('model').selectedOptions[0].getAttribute('provider');
    const savedApiKey = localStorage.getItem(provider + '_apikey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    } else {
        apiKeyInput.value = '';
    }
});

apiKeyInput.addEventListener('change', () => {
    localStorage.setItem(provider + '_apikey', apiKeyInput.value);
});

const savedApiKey = localStorage.getItem(provider + '_apikey');
if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
}

// Initialize the app
initializeSystemPrompts();
renderChatList();

if (chats.length === 0) {
    addNewChat();
} else {
    loadChat(0);
} 