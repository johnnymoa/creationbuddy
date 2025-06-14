const chatListElement = document.getElementById('chat-list');
const chatAreaElement = document.getElementById('chat-area');
const chatInputElement = document.getElementById('chat-input');
const newChatButton = document.getElementById('new-chat-btn');
const sendButton = document.getElementById('send-btn');
const deleteAllButton = document.getElementById('delete-all-btn');
const exportAllButton = document.getElementById('export-all-btn');
const importAllButton = document.getElementById('import-all-btn');
const importAllInput = document.getElementById('import-all-input');
let iframe = document.getElementById('preview-iframe');
const resizer = document.getElementById('resizer');
const mainChat = document.getElementById('main-chat');
const iframeContainer = document.getElementById('iframe-container');
const apiKeyInput = document.getElementById('apikey');
const modelSelect = document.getElementById('model');
const toastContainer = document.getElementById('toast-container');

// Confirmation Modal System
let activeModal = null;

function createConfirmationModal(title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDangerous = false) {
    // Close any existing modal
    if (activeModal) {
        closeModal(activeModal);
    }
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
        </div>
        <div class="modal-body">
            <p>${message}</p>
        </div>
        <div class="modal-footer">
            <button class="modal-btn secondary" data-action="cancel">${cancelText}</button>
            <button class="modal-btn ${isDangerous ? 'danger' : 'primary'}" data-action="confirm">${confirmText}</button>
        </div>
    `;
    
    modal.innerHTML = modalContent;
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    // Trigger animation
    setTimeout(() => modalOverlay.classList.add('show'), 10);
    
    activeModal = modalOverlay;
    
    return new Promise((resolve) => {
        const handleAction = (e) => {
            const action = e.target.dataset.action;
            if (action) {
                closeModal(modalOverlay);
                resolve(action === 'confirm');
            }
        };
        
        modal.addEventListener('click', handleAction);
        
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal(modalOverlay);
                resolve(false);
            }
        });
        
        // Handle escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal(modalOverlay);
                resolve(false);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    });
}

function closeModal(modalOverlay) {
    modalOverlay.classList.remove('show');
    setTimeout(() => {
        if (modalOverlay.parentNode) {
            modalOverlay.parentNode.removeChild(modalOverlay);
        }
        if (activeModal === modalOverlay) {
            activeModal = null;
        }
    }, 300);
}

const WEBSITE_GENERATOR_PROMPT = `You are an expert AI web developer agent named Creation Buddy.
Your primary goal is to help users create complete, production-ready websites using only vanilla HTML, CSS, and JavaScript.

**Your Process:**
1.  **Clarify:** If the user's request is ambiguous, ask clarifying questions to ensure you understand their vision before writing any code.
2.  **Plan:** For complex requests, briefly outline the structure (HTML), styling (CSS), and functionality (JavaScript) you will create.
3.  **Generate:** Provide the complete, runnable code within a single HTML code block. This is crucial. Do not split it into multiple code blocks for HTML, CSS, and JS.

**Code Requirements:**
-   **Single File:** Always generate a full HTML5 document (\`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\`) in one single file.
-   **CSS:** Embed all CSS inside a \`<style>\` tag within the \`<head>\`.
-   **JavaScript:** Embed all JavaScript inside a \`<script>\` tag just before the closing \`</body>\` tag.
-   **Purity:** Do not use any external libraries or frameworks (like Bootstrap, jQuery, React, etc.) unless specifically requested by the user.
-   **Completeness:** Write clean, readable, and well-commented code. Avoid placeholder comments like \`/* your css here */\`; implement the features directly.

After generating the code, wait for the user's feedback or next instruction. You can modify the code based on their requests.`;

let chats = JSON.parse(localStorage.getItem('chats')) || [];
let currentChatIndex = 0;
let editingPromptIndex = null;
let codeBlocks = {}; // Store code blocks globally
let currentCodeId = null; // Track currently displayed code
let originalCodeContent = ''; // Track original code content for change detection
let awaitingResponse = false;
let abortController = null;

// Model metadata with token limits
const MODEL_METADATA = {
    'magistral-medium-2506': { name: 'Magistral Medium', maxTokens: 40000, description: 'Frontier-class reasoning model (June 2025)' },
    'mistral-medium-2505': { name: 'Mistral Medium', maxTokens: 128000, description: 'Frontier-class multimodal model (May 2025)' },
    'mistral-medium-latest': { name: 'Mistral Medium', maxTokens: 128000, description: 'Latest Mistral Medium' },
    'codestral-2501': { name: 'Codestral', maxTokens: 256000, description: 'Cutting-edge language model for coding (Jan 2025)' },
    'codestral-latest': { name: 'Codestral', maxTokens: 256000, description: 'Latest Codestral' },
    'mistral-saba-2502': { name: 'Mistral Saba', maxTokens: 32000, description: 'Middle East and South Asia languages' },
    'mistral-large-2411': { name: 'Mistral Large', maxTokens: 128000, description: 'Top-tier reasoning model (Nov 2024)' },
    'mistral-large-latest': { name: 'Mistral Large', maxTokens: 128000, description: 'Latest Mistral Large' },
    'pixtral-large-2411': { name: 'Pixtral Large', maxTokens: 128000, description: 'Frontier-class multimodal model (Nov 2024)' },
    'ministral-3b-2410': { name: 'Ministral 3B', maxTokens: 128000, description: 'World\'s best edge model' },
    'ministral-8b-2410': { name: 'Ministral 8B', maxTokens: 128000, description: 'Powerful edge model' },
    'mistral-small-latest': { name: 'Mistral Small', maxTokens: 32000, description: 'Efficient small model' },
    'devstral-small-latest': { name: 'Devstral Small', maxTokens: 32000, description: 'Small development model' },
    'mistral-embed': { name: 'Mistral Embed', maxTokens: 8000, description: 'Text embedding model' },
    'codestral-embed': { name: 'Codestral Embed', maxTokens: 8000, description: 'Code embedding model' },
    'mistral-moderation-2411': { name: 'Mistral Moderation', maxTokens: 8000, description: 'Content moderation model' }
};

// Token estimation function (rough approximation)
function estimateTokens(text) {
    // Rough estimation: ~4 characters per token for English text
    // This is a simplified approach; actual tokenization varies
    return Math.ceil(text.length / 4);
}

// Calculate total tokens for messages
function calculateTotalTokens(messages) {
    return messages.reduce((total, msg) => {
        return total + estimateTokens(msg.content);
    }, 0);
}

// Truncate messages to fit within token limit
function truncateMessages(messages, maxTokens, systemPromptTokens) {
    // Reserve tokens for system prompt and response
    const reservedTokens = systemPromptTokens + 2000; // Reserve 2000 tokens for response
    const availableTokens = maxTokens - reservedTokens;
    
    if (availableTokens <= 0) {
        console.error('Model token limit too small for system prompt and response');
        return messages.slice(-1); // Return only the last message
    }
    
    // Always keep the last user message
    const lastMessage = messages[messages.length - 1];
    const lastMessageTokens = estimateTokens(lastMessage.content);
    
    if (lastMessageTokens > availableTokens) {
        // If even the last message is too long, we need to truncate it
        console.warn('Last message exceeds available tokens, truncating...');
        return [lastMessage];
    }
    
    // Build message list from most recent to oldest
    const truncatedMessages = [lastMessage];
    let currentTokens = lastMessageTokens;
    
    // Add messages from newest to oldest until we hit the limit
    for (let i = messages.length - 2; i >= 0; i--) {
        const msg = messages[i];
        const msgTokens = estimateTokens(msg.content);
        
        if (currentTokens + msgTokens <= availableTokens) {
            truncatedMessages.unshift(msg);
            currentTokens += msgTokens;
        } else {
            // We've hit the limit
            break;
        }
    }
    
    // Add a system message if we truncated
    if (truncatedMessages.length < messages.length) {
        const truncatedCount = messages.length - truncatedMessages.length;
        const summaryMessage = {
            role: 'system',
            content: `[Note: ${truncatedCount} earlier messages were truncated due to context length limits. The conversation continues from the most recent messages.]`
        };
        truncatedMessages.unshift(summaryMessage);
    }
    
    return truncatedMessages;
}

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
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
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
    // This function is no longer needed as we're hardcoding the prompt
}

function closeAllContextMenus() {
    document.querySelectorAll('.chat-context-menu').forEach(menu => {
        menu.remove();
    });
}

document.addEventListener('click', closeAllContextMenus);

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

        const moreOptionsBtn = document.createElement('button');
        moreOptionsBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" /></svg>`;
        moreOptionsBtn.classList.add('action-btn', 'more-options-btn');
        moreOptionsBtn.title = 'More options';

        moreOptionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllContextMenus(); // Close any other open menus

            const contextMenu = document.createElement('div');
            contextMenu.className = 'chat-context-menu';
            
            const rect = moreOptionsBtn.getBoundingClientRect();
            contextMenu.style.top = `${rect.bottom + 4}px`;
            contextMenu.style.right = `${window.innerWidth - rect.right - (rect.width/2)}px`;

            // Rename button
            const renameAction = document.createElement('div');
            renameAction.className = 'context-menu-item';
            renameAction.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg> Rename`;
            renameAction.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAllContextMenus();
                // Trigger inline editing
                titleSpan.style.display = 'none';
                actionsDiv.style.display = 'none';

                const input = document.createElement('input');
                input.type = 'text';
                input.value = chatName;
                input.classList.add('rename-input');

                const finishEditing = (shouldSave) => {
                    const newName = input.value.trim();
                    if (shouldSave && newName && newName !== chatName) {
                        renameChat(index, newName);
                    } else {
                        renderChatList(); // Just re-render to restore state
                    }
                };

                input.addEventListener('blur', () => finishEditing(true));
                input.addEventListener('keydown', (keyEvent) => {
                    if (keyEvent.key === 'Enter') {
                        finishEditing(true);
                    } else if (keyEvent.key === 'Escape') {
                        finishEditing(false);
                    }
                });

                li.insertBefore(input, titleSpan);
                input.focus();
                input.select();
            });

            // Delete button
            const deleteAction = document.createElement('div');
            deleteAction.className = 'context-menu-item danger';
            deleteAction.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg> Delete`;
            deleteAction.addEventListener('click', async (e) => {
                e.stopPropagation();
                closeAllContextMenus();
                const confirmed = await createConfirmationModal(
                    'Delete Chat',
                    'Are you sure you want to delete this chat? This action cannot be undone.',
                    'Delete',
                    'Cancel',
                    true
                );
                if (confirmed) {
                    deleteChat(index);
                }
            });

            contextMenu.appendChild(renameAction);
            contextMenu.appendChild(deleteAction);
            document.body.appendChild(contextMenu);
        });

        actionsDiv.appendChild(moreOptionsBtn);
        li.appendChild(actionsDiv);
        
        li.addEventListener('click', () => handleChatSwitch(index));
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

function formatMessage(content, isUserMessage = false) {
    let thinkContent = '';
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    
    if (thinkMatch) {
        thinkContent = thinkMatch[1];
        content = content.replace(thinkMatch[0], '').trim();
    }

    const processSegment = (segment) => {
        // First, handle code blocks
        const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
        let result = [];
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(segment)) !== null) {
            const [fullMatch, language, code] = match;
            const offset = match.index;

            // Process text before the code block with Marked
            if (offset > lastIndex) {
                const textBefore = segment.slice(lastIndex, offset);
                if (isUserMessage && !textBefore.includes('\n\n') && !textBefore.includes('#') && !textBefore.includes('*') && !textBefore.includes('`')) {
                    // For simple user messages, just escape HTML and preserve line breaks
                    result.push(escapeHtml(textBefore).replace(/\n/g, '<br>'));
                } else {
                    result.push(marked.parse(textBefore));
                }
            }

            // Process the code block
            const cleanCode = code.trim();
            const detectedLanguage = detectLanguage(language, cleanCode);
            const isHtml = detectedLanguage === 'html';
            const uniqueId = `creation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            codeBlocks[uniqueId] = {
                code: cleanCode,
                language: detectedLanguage,
                isHtml: isHtml
            };
            
            const header = `<div class="code-block-header" onclick="viewCode('${uniqueId}')">
                <div class="code-block-info">
                    <span class="code-block-language">${detectedLanguage}</span>
                    <span class="code-block-lines">${cleanCode.split('\n').length} lines</span>
                </div>
            </div>`;
            result.push(header);

            lastIndex = offset + fullMatch.length;
        }

        // Process any remaining text after the last code block
        if (lastIndex < segment.length) {
            const remainingText = segment.slice(lastIndex);
            if (isUserMessage && !remainingText.includes('\n\n') && !remainingText.includes('#') && !remainingText.includes('*') && !remainingText.includes('`')) {
                // For simple user messages, just escape HTML and preserve line breaks
                result.push(escapeHtml(remainingText).replace(/\n/g, '<br>'));
            } else {
                result.push(marked.parse(remainingText));
            }
        }
        
        // If no code blocks were found, process the whole segment
        if (result.length === 0 && segment.trim()) {
            if (isUserMessage && !segment.includes('\n\n') && !segment.includes('#') && !segment.includes('*') && !segment.includes('`')) {
                // For simple user messages, just escape HTML and preserve line breaks
                return escapeHtml(segment).replace(/\n/g, '<br>');
            } else {
                return marked.parse(segment);
            }
        }

        return result.join('');
    };
    
    let mainHTML = processSegment(content);
    let thinkingHTML = '';
    
    if (thinkContent) {
        thinkingHTML = `
            <details class="thinking-section">
                <summary>Thought</summary>
                <div class="thinking-content">${processSegment(thinkContent)}</div>
            </details>
        `;
    }

    if (!mainHTML.trim()) {
        mainHTML = escapeHtml(content);
    }
    
    return { mainHTML, thinkingHTML };
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

function showThinkingIndicator() {
    // Remove any existing indicator/thinking message
    hideThinkingIndicator();

    const thinkingMessage = document.createElement('div');
    thinkingMessage.className = 'message assistant';
    thinkingMessage.id = 'thinking-message';
    thinkingMessage.innerHTML = `
        <div class="message-header">
            <div class="message-avatar assistant loading">
                <div class="avatar-letter">B</div>
            </div>
        </div>
    `;

    chatAreaElement.appendChild(thinkingMessage);
    chatAreaElement.scrollTop = chatAreaElement.scrollHeight;
}

function hideThinkingIndicator() {
    const indicator = document.getElementById('thinking-message');
    if (indicator) {
        indicator.remove();
    }
}

function loadChat(index) {
    clearIframe();
    currentChatIndex = index;

    const chatName = chats[index].name || 'New Chat';
    const chatNameElement = document.getElementById('current-chat-name');
    if (chatNameElement) {
        chatNameElement.textContent = chatName;
    }
    
    // Clear code blocks and reset IDE
    codeBlocks = {};
    currentCodeId = null;
    originalCodeContent = '';
    showEmptyState();
    
    chatAreaElement.innerHTML = chats[index].messages.map(msg => {
        const isUser = msg.role === 'user';
        const isEdit = msg.role === 'user_edit';

        if (isEdit) {
            const { mainHTML } = formatMessage(msg.content, true);
            return `
                <div class="message user">
                    <div class="message-content">${mainHTML}</div>
                </div>
            `;
        }
        
        if (isUser) {
            const { mainHTML } = formatMessage(msg.content, true);
            return `
                <div class="message user">
                    <div class="message-content">${mainHTML}</div>
                </div>
            `;
        } else { // Assistant message
            const { mainHTML, thinkingHTML } = formatMessage(msg.content, false);
            
            if (thinkingHTML) {
                // With thinking section: content appears below the header
                return `
                    <div class="message assistant">
                        <div class="message-header">
                            <div class="message-avatar assistant">B</div>
                            ${thinkingHTML}
                        </div>
                        <div class="message-body">
                            ${mainHTML ? `<div class="message-content">${mainHTML}</div>` : ''}
                        </div>
                    </div>
                `;
            } else {
                // Without thinking section: content appears inline with avatar
                return `
                    <div class="message assistant">
                        <div class="message-inline">
                            <div class="message-avatar assistant">B</div>
                            ${mainHTML ? `<div class="message-content">${mainHTML}</div>` : ''}
                        </div>
                    </div>
                `;
            }
        }
    }).join('');
    
    renderChatList(); // Update active state
    chatAreaElement.scrollTop = chatAreaElement.scrollHeight;
    
    // Auto-run the latest HTML code when loading a chat
    autoRunLatestHtml();
}

function addNewChat() {
    chats.push({ name: '', messages: [] });
    saveChats();
    renderChatList();
    loadChat(chats.length - 1);
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
    if (index === currentChatIndex) {
        const chatNameElement = document.getElementById('current-chat-name');
        if (chatNameElement) {
            chatNameElement.textContent = newName;
        }
    }
}

// Function to handle chat switching with generation check
async function handleChatSwitch(index) {
    // Check if we're currently generating a response
    if (awaitingResponse) {
        const confirmed = await createConfirmationModal(
            'Generation in Progress',
            'AI is currently generating a response. Are you sure you want to stop and switch chats?',
            'Stop & Switch',
            'Continue',
            false
        );
        
        if (confirmed) {
            // Abort the current request
            if (abortController) {
                abortController.abort();
            }
            // Reset the UI state
            awaitingResponse = false;
            sendButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
                            </svg>`;
            sendButton.title = 'Send';
            sendButton.classList.remove('stop-button');
            hideThinkingIndicator();
            
            // Now load the new chat
            loadChat(index);
        }
        // If not confirmed, do nothing (stay on current chat)
    } else {
        // No generation in progress, switch normally
        loadChat(index);
    }
}

async function generateChatTitle(chatIndex, userPrompt) {
    const titlePrompt = `Based on the following user request, create a short and concise chat title (3-5 words max). Do not use quotes or any other formatting. Just return the plain text title.\n\nUser request: "${userPrompt}"`;
    const titleModel = 'ministral-3b-2410';
    const messagesForTitle = [{ role: 'user', content: titlePrompt }];

    try {
        const API_URL = "https://api.mistral.ai/v1/chat/completions";
        const API_KEY = apiKeyInput.value;

        if (!API_KEY) {
            console.warn("Cannot generate title without a Mistral API key.");
            return;
        }

        const requestBody = {
            model: titleModel,
            messages: messagesForTitle,
            temperature: 0.5,
            max_tokens: 20
        };

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
            body: JSON.stringify(requestBody),
        });

        if (response.ok) {
            const data = await response.json();
            let newTitle = data.choices[0].message.content.trim();
            newTitle = newTitle.replace(/^["']|["']$/g, ""); // Remove quotes

            if (chats[chatIndex] && chats[chatIndex].name === '') {
                renameChat(chatIndex, newTitle);
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Title generation failed: ${errorData.error?.message || response.status}`);
        }
    } catch (error) {
        console.error("Error generating chat title:", error);
    }
}

function saveChats() {
    localStorage.setItem('chats', JSON.stringify(chats));
}

async function sendMessage() {
    const message = chatInputElement.value.trim();
    if (message === '') return;

    if (awaitingResponse) {
        return;
    }

    const isNewChat = chats[currentChatIndex].name === '';
    const userMessageContent = message;

    // Update button state and UI
    awaitingResponse = true;
    sendButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 6h12v12H6z"/></svg>`;
    sendButton.title = 'Stop generating';
    sendButton.classList.add('stop-button');

    chats[currentChatIndex].messages.push({ 
        role: 'user', 
        content: message, 
        uniqueId: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
    });

    // We save and reload here to show the user's message immediately
    saveChats();
    loadChat(currentChatIndex); 
    chatInputElement.value = '';
    
    // Then show the thinking indicator
    showThinkingIndicator();

    const systemPrompt = WEBSITE_GENERATOR_PROMPT;

    let messagesToSend = JSON.parse(JSON.stringify([{ role: "system", content: systemPrompt }, ...chats[currentChatIndex].messages]));
    messagesToSend = messagesToSend.filter(message => message.role !== 'error');
    
    // Convert 'user_edit' role to 'user' for the API call, so the model understands
    messagesToSend.forEach(message => {
        if (message.role === 'user_edit') {
            message.role = 'user';
        }
    });

    messagesToSend = messagesToSend.map(message => (delete message.uniqueId, message));

    // Apply truncation based on model's token limit
    const selectedModel = modelSelect.value;
    const modelInfo = MODEL_METADATA[selectedModel];
    
    if (modelInfo) {
        const systemPromptTokens = estimateTokens(systemPrompt);
        const totalTokens = calculateTotalTokens(messagesToSend);
        
        console.log(`Model: ${modelInfo.name}, Max Tokens: ${modelInfo.maxTokens}, Current Total: ${totalTokens}`);
        
        if (totalTokens > modelInfo.maxTokens) {
            console.log('Conversation exceeds token limit, applying truncation...');
            // Extract messages without system prompt for truncation
            const userMessages = messagesToSend.slice(1);
            const truncatedUserMessages = truncateMessages(userMessages, modelInfo.maxTokens, systemPromptTokens);
            
            // Reconstruct with system prompt
            messagesToSend = [{ role: "system", content: systemPrompt }, ...truncatedUserMessages];
            
            const newTotalTokens = calculateTotalTokens(messagesToSend);
            console.log(`After truncation: ${newTotalTokens} tokens, ${messagesToSend.length} messages`);
        }
    } else {
        console.warn(`No metadata found for model: ${selectedModel}`);
    }

    console.log('Messages being sent to AI:', messagesToSend);
    
    abortController = new AbortController();
    const responseMessage = await getCompletion(messagesToSend, modelSelect.value, abortController.signal);
    
    // Clean up abort controller
    abortController = null;
    
    hideThinkingIndicator();
    
    if (responseMessage) {
        chats[currentChatIndex].messages.push(responseMessage);
        saveChats();
        loadChat(currentChatIndex);
        
        autoRunLatestHtml();

        if (isNewChat) {
            generateChatTitle(currentChatIndex, message);
        }
    } else {
        // This block will be hit on abort or error
        if (awaitingResponse === false) { // Awaiting response is set to false on abort
             // Remove the user message that was optimistically added
            chats[currentChatIndex].messages.pop();
            saveChats();
            loadChat(currentChatIndex);
            chatInputElement.value = userMessageContent; // Restore input
            autoResizeTextarea(chatInputElement);
        }
    }

    // Reset button state only if not already reset by an abort
    if (awaitingResponse) {
        awaitingResponse = false;
        sendButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
                        </svg>`;
        sendButton.title = 'Send';
        sendButton.classList.remove('stop-button');
    }
}

async function getCompletion(messages, model, signal) {
    const API_URL = "https://api.mistral.ai/v1/chat/completions";
    let API_KEY = apiKeyInput.value;
    
    if (!API_KEY) {
        const errorMsg = 'Please enter your Mistral API key to continue';
        chats[currentChatIndex].messages.push({ role: 'error', content: errorMsg });
        saveChats();
        loadChat(currentChatIndex);
        showToast(errorMsg, 'error');
        return null;
    }

    let headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
    };

    let requestBody = {
        model: model,
        messages: messages
    };

    try {
        let response = await fetch(API_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(requestBody),
            signal: signal,
        });

        if (response.ok) {
            const data = await response.json();
            return {
                content: data.choices[0].message.content,
                role: 'assistant'
            };
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error?.message || `API request failed with status ${response.status}`;
            throw new Error(errorMsg);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request aborted by user.');
            // Let the caller handle UI restoration
            awaitingResponse = false; // Signal that the process was aborted
             sendButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
                        </svg>`;
            sendButton.title = 'Send';
            sendButton.classList.remove('stop-button');
            return null;
        }

        console.error('Error:', error);
        const errorMsg = 'Request failed. Please check your API key and internet connection.';
        chats[currentChatIndex].messages.push({ role: 'error', content: errorMsg });
        saveChats();
        loadChat(currentChatIndex);
        showToast(error.message || errorMsg, 'error');
        return null;
    }
}

function clearIframe() {
    const previewIframe = document.getElementById('preview-iframe');
    if (previewIframe) {
        let newIframe = document.createElement('iframe');
        newIframe.id = 'preview-iframe';
        newIframe.className = 'preview-iframe';
        previewIframe.parentNode.replaceChild(newIframe, previewIframe);
        iframe = newIframe;
    }
}

async function deleteAllChats() {
    const confirmed = await createConfirmationModal(
        'Delete All Chats',
        'Are you sure you want to delete all chats? This action cannot be undone.',
        'Delete All',
        'Cancel',
        true
    );
    if (confirmed) {
        chats = [];
        saveChats();
        renderChatList();
        chatAreaElement.innerHTML = '';
        addNewChat();
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
newChatButton.addEventListener('click', async () => {
    if (awaitingResponse) {
        const confirmed = await createConfirmationModal(
            'Generation in Progress',
            'AI is currently generating a response. Are you sure you want to stop and create a new chat?',
            'Stop & Create',
            'Continue',
            false
        );
        
        if (confirmed) {
            // Abort the current request
            if (abortController) {
                abortController.abort();
            }
            // Reset the UI state
            awaitingResponse = false;
            sendButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
                            </svg>`;
            sendButton.title = 'Send';
            sendButton.classList.remove('stop-button');
            hideThinkingIndicator();
            
            // Create new chat
            addNewChat();
        }
    } else {
        addNewChat();
    }
});

sendButton.addEventListener('click', () => {
    if (awaitingResponse) {
        if (abortController) {
            abortController.abort();
        }
    } else {
        sendMessage();
    }
});

chatInputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !awaitingResponse) {
        e.preventDefault();
        sendMessage();
    }
});

// Update context indicator when typing
chatInputElement.addEventListener('input', () => {
    autoResizeTextarea(chatInputElement);
});

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
}

modelSelect.addEventListener('change', () => {
    localStorage.setItem('selectedModel', modelSelect.value);
});

apiKeyInput.addEventListener('change', () => {
    localStorage.setItem('mistral_apikey', apiKeyInput.value);
});

const savedApiKey = localStorage.getItem('mistral_apikey');
if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
}

// Initialize the app
renderChatList();

if (chats.length === 0) {
    addNewChat();
} else {
    loadChat(0);
}

// Add keyboard shortcut for saving code edits (Ctrl+S or Cmd+S)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const codeEditor = document.getElementById('code-editor');
        if (document.activeElement === codeEditor && currentCodeId) {
            e.preventDefault();
            saveCodeEdit();
        }
    }
    
    // Add keyboard shortcuts for switching views (Ctrl+1 for code, Ctrl+2 for preview)
    if ((e.ctrlKey || e.metaKey) && currentCodeId && codeBlocks[currentCodeId]) {
        if (e.key === '1' && codeBlocks[currentCodeId].isHtml) {
            e.preventDefault();
            const viewToggle = document.getElementById('view-toggle');
            if (viewToggle.style.display !== 'none') {
                switchView('code');
            }
        } else if (e.key === '2' && codeBlocks[currentCodeId].isHtml) {
            e.preventDefault();
            const viewToggle = document.getElementById('view-toggle');
            if (viewToggle.style.display !== 'none') {
                switchView('preview');
            }
        }
    }
});

// Update line numbers
function updateLineNumbers() {
    const codeEditor = document.getElementById('code-editor');
    const lineNumbers = document.getElementById('line-numbers');
    const codeLines = codeEditor.value.split('\n');
    const lineCount = Math.max(codeLines.length, 1); // Ensure at least 1 line
    
    let lineNumbersContent = '';
    for (let i = 1; i <= lineCount; i++) {
        lineNumbersContent += i + '\n';
    }
    
    // Remove trailing newline to prevent extra spacing
    lineNumbers.textContent = lineNumbersContent.trimEnd();
}

// Sync scroll between code editor and line numbers
function syncScroll() {
    const codeEditor = document.getElementById('code-editor');
    const lineNumbers = document.getElementById('line-numbers');
    lineNumbers.scrollTop = codeEditor.scrollTop;
}

// Add change detection for code editor
document.getElementById('code-editor').addEventListener('input', () => {
    if (!currentCodeId) return;
    
    const codeEditor = document.getElementById('code-editor');
    const saveBtn = document.getElementById('save-btn');
    const discardBtn = document.getElementById('discard-btn');
    const modifiedIndicator = document.getElementById('ide-modified-indicator');
    const currentContent = codeEditor.value;
    
    const hasChanged = currentContent !== originalCodeContent;
    
    // Toggle button states and styles
    modifiedIndicator.classList.toggle('show', hasChanged);
    saveBtn.classList.toggle('save-modified', hasChanged);
    saveBtn.disabled = !hasChanged;
    discardBtn.disabled = !hasChanged;
    
    // Update line numbers
    updateLineNumbers();
    
    // If it's HTML and preview is active, update preview live
    if (codeBlocks[currentCodeId] && codeBlocks[currentCodeId].isHtml) {
        const previewSection = document.getElementById('ide-preview-section');
        if (previewSection.classList.contains('active')) {
            updateLivePreview(currentContent);
        }
    }
});

// Add scroll sync
document.getElementById('code-editor').addEventListener('scroll', syncScroll);

// Helper functions for IDE management
function showEmptyState() {
    document.getElementById('ide-empty-state').style.display = 'flex';
    document.getElementById('ide-header').style.display = 'none';
    document.getElementById('ide-content').style.display = 'none';
}

function showEditor(language = null, isHtml = false) {
    document.getElementById('ide-empty-state').style.display = 'none';
    document.getElementById('ide-header').style.display = 'flex';
    document.getElementById('ide-content').style.display = 'flex';
    
    const viewToggle = document.getElementById('view-toggle');
    const codeViewBtn = document.getElementById('code-view-btn');
    
    if (language) {
        // Update the button text to show the language
        codeViewBtn.textContent = language.toUpperCase();
    }
    
    if (isHtml) {
        viewToggle.style.display = 'flex';
        // Restore onclick handler for HTML files
        codeViewBtn.onclick = () => switchView('code');
        codeViewBtn.style.cursor = '';
        // Default to preview view for HTML
        switchView('preview');
    } else {
        viewToggle.style.display = 'flex';
        // Hide preview button for non-HTML, only show language button
        document.getElementById('preview-view-btn').style.display = 'none';
        // Make the language button non-clickable for non-HTML
        codeViewBtn.onclick = null;
        codeViewBtn.style.cursor = 'default';
        // Always show code view for non-HTML
        switchView('code');
    }
}

// Switch between code and preview views
function switchView(view) {
    const codeSection = document.getElementById('ide-editor-section');
    const previewSection = document.getElementById('ide-preview-section');
    const codeViewBtn = document.getElementById('code-view-btn');
    const previewViewBtn = document.getElementById('preview-view-btn');
    
    if (view === 'code') {
        codeSection.classList.add('active');
        previewSection.classList.remove('active');
        codeViewBtn.classList.add('active');
        previewViewBtn.classList.remove('active');
    } else { // 'preview'
        // Only allow preview for HTML files
        if (codeBlocks[currentCodeId] && codeBlocks[currentCodeId].isHtml) {
            // Ensure preview is up-to-date with latest edits
            updateLivePreview(document.getElementById('code-editor').value);
            
            codeSection.classList.remove('active');
            previewSection.classList.add('active');
            codeViewBtn.classList.remove('active');
            previewViewBtn.classList.add('active');
        }
    }
}

// Make switchView global
window.switchView = switchView;

// View code in the IDE
function viewCode(codeId) {
    const codeBlock = codeBlocks[codeId];
    if (!codeBlock) return;
    
    currentCodeId = codeId;
    originalCodeContent = codeBlock.code;
    
    // Show the editor with language info
    showEditor(codeBlock.language, codeBlock.isHtml);
    
    // Update code editor
    const codeEditor = document.getElementById('code-editor');
    codeEditor.value = codeBlock.code;
    
    // Update line numbers and reset scroll
    updateLineNumbers();
    codeEditor.scrollTop = 0;
    syncScroll();
    
    // Manually trigger input event to set initial button states
    codeEditor.dispatchEvent(new Event('input', { bubbles: true }));
    
    // If it's HTML, update preview
    if (codeBlock.isHtml) {
        updateLivePreview(codeBlock.code);
        // Make sure preview button is visible for HTML
        document.getElementById('preview-view-btn').style.display = '';
    }
}

// Update live preview
function updateLivePreview(htmlCode) {
    const previewIframe = document.getElementById('preview-iframe');
    if (previewIframe) {
        previewIframe.contentDocument.open();
        previewIframe.contentDocument.write(htmlCode);
        previewIframe.contentDocument.close();
    }
}

// Refresh preview
function refreshPreview() {
    if (currentCodeId && codeBlocks[currentCodeId] && codeBlocks[currentCodeId].isHtml) {
        const codeEditor = document.getElementById('code-editor');
        updateLivePreview(codeEditor.value);
    }
}

// Auto-run the latest HTML code
function autoRunLatestHtml() {
    const messages = chats[currentChatIndex].messages;
    let latestHtmlId = null;

    // Find the latest HTML code block
    const allCodeBlocksInOrder = [];
    for (const content of messages.map(m => m.content)) {
        const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
        let match;
        while ((match = codeBlockRegex.exec(content)) !== null) {
            const [fullMatch, language, code] = match;
            const cleanCode = code.trim();
            const detectedLanguage = detectLanguage(language, cleanCode);
            if (detectedLanguage === 'html') {
                 for (const [id, block] of Object.entries(codeBlocks)) {
                    if (block.code.trim() === cleanCode) {
                        allCodeBlocksInOrder.push(id);
                    }
                }
            }
        }
    }

    if (allCodeBlocksInOrder.length > 0) {
        latestHtmlId = allCodeBlocksInOrder[allCodeBlocksInOrder.length - 1];
        // Automatically view the latest HTML
        viewCode(latestHtmlId);
        return true;
    }
    
    return false;
}

// Discard changes to the code
function discardCodeEdit() {
    if (!currentCodeId) return;

    const codeEditor = document.getElementById('code-editor');
    codeEditor.value = originalCodeContent;

    // Manually trigger input event to reset button states, line numbers, and preview
    codeEditor.dispatchEvent(new Event('input', { bubbles: true }));
}

// Save code edit as a new version in the chat
function saveCodeEdit() {
    if (!currentCodeId || document.getElementById('save-btn').disabled) {
        return;
    }
    
    const codeEditor = document.getElementById('code-editor');
    const editedCode = codeEditor.value.trim();
    
    if (!editedCode) {
        return;
    }
    
    const originalCodeBlock = codeBlocks[currentCodeId];
    if (!originalCodeBlock) {
        return;
    }
    
    // Check if code has actually changed
    if (editedCode === originalCodeBlock.code) {
        return;
    }
    
    // Create a new code block with edited content
    const newCodeId = `creation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newCodeBlock = {
        code: editedCode,
        language: originalCodeBlock.language,
        isHtml: originalCodeBlock.isHtml
    };
    
    // Store the new code block
    codeBlocks[newCodeId] = newCodeBlock;
    
    // Create edit message to add to chat
    const editMessage = `I've edited the ${originalCodeBlock.language} code. Here's the updated version:\n\n\`\`\`${originalCodeBlock.language}\n${editedCode}\n\`\`\``;
    
    // Add the edit as a new message with a special role
    chats[currentChatIndex].messages.push({ 
        role: 'user_edit',
        content: editMessage, 
        uniqueId: `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
    });
    
    // Update current code ID to the new version
    currentCodeId = newCodeId;
    originalCodeContent = editedCode;
    
    // Reset modification indicator
    document.getElementById('ide-modified-indicator').classList.remove('show');
    document.getElementById('save-btn').classList.remove('save-modified');
    
    // Save and reload chat
    saveChats();
    loadChat(currentChatIndex);
    
    // The new code will be automatically viewed by autoRunLatestHtml
    
    // If it's HTML, update the preview
    if (newCodeBlock.isHtml) {
        updateLivePreview(editedCode);
    }
}

// Copy current code to clipboard
function copyCurrentCode() {
    if (!currentCodeId || !codeBlocks[currentCodeId]) return;
    
    const codeEditor = document.getElementById('code-editor');
    const code = codeEditor.value;
    
    navigator.clipboard.writeText(code).then(() => {
        showToast('Code copied to clipboard', 'success', 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy code', 'error');
    });
}

// Download current code as file
function downloadCurrentCode() {
    if (!currentCodeId || !codeBlocks[currentCodeId]) return;
    
    const codeBlock = codeBlocks[currentCodeId];
    const codeEditor = document.getElementById('code-editor');
    const code = codeEditor.value;
    
    // Determine file extension based on language
    let extension = '.txt';
    if (codeBlock.language === 'html') extension = '.html';
    else if (codeBlock.language === 'css') extension = '.css';
    else if (codeBlock.language === 'javascript') extension = '.js';
    else if (codeBlock.language === 'json') extension = '.json';
    else if (codeBlock.language === 'python') extension = '.py';
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creation-buddy-code${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Sidebar Toggle
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const appContainer = document.querySelector('.app-container');

sidebarToggleBtn.addEventListener('click', () => {
    appContainer.classList.toggle('sidebar-collapsed');
}); 