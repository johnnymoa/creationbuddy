// Function to get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Get the apiKey from URL parameters
var apiKeyFromUrl = getUrlParameter('apiKey');

if (apiKeyFromUrl) {
    // If apiKey is present in URL, use it
    document.getElementById('apikey').value = apiKeyFromUrl;
} else {
    // If apiKey is not present in URL, use localStorage
    document.getElementById('apikey').value = localStorage.getItem('apikey');
}

function appendMessageToChatHistory(role, message) {
    const chatHistory = document.querySelector('.chat-history');
    chatHistory.innerHTML += `<div class="${role}">${message}</div>`;
}

function findDelimitedItems(str, startDelimiter = "```html\n", endDelimiter = "```") {
    str.replace("```HTML", "```html");
    var regex = new RegExp(`${startDelimiter}(.*?)${endDelimiter}`, 'gs');
    var matches = [];
    var match;

    while ((match = regex.exec(str)) !== null) {
        matches.push(match[1]);
    }

    return matches;
}

function escapeHTMLExceptPreviewButtons(input) {
    let safe_content = input.replace(/<[^>]*>/g, function (match) {
        if (match.indexOf('<button pb="true"') === 0 || match.indexOf('</button>') === 0) {
            return match;
        } else {
            return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    });

    safe_content = backtickToCodeTag(safe_content);

    return safe_content;
}

function backtickToCodeTag(str) {
    var count = 0;
    return str.replace(/```/g, function() {
        count += 1;
        return count % 2 ? '<code>' : '</code>';
    });
    return str;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function getCompletion(messages, model) {
    if (messages.length > 0)
        for (let i = 0; i < messages.length - 2; i++) {
            messages[i].content = escapeHTMLExceptPreviewButtons(messages[i].content);        
        }

    let API_URL = "https://api.openai.com/v1/chat/completions";
    let API_instruct_URL = "https://api.openai.com/v1/completions";
    let API_KEY = document.getElementById('apikey').value; 
   
    if(!API_KEY) {
        appendMessageToChatHistory('assistant', 'You need to add an <a href="https://platform.openai.com/account/api-keys" target="_blank">openai</a> API key to use this tool. Press the "key" button in the menu bar.');
        return null;
    }

    let sp = document.getElementById("systemPrompt").value; 
    // Fetch the response from the OpenAI API with the signal from AbortController

    let url = model == "gpt-3.5-turbo-instruct" ? API_instruct_URL : API_URL;

    let response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: model,
            temperature: parseFloat(document.getElementById("temperature").value),
            messages: [{"role": "system", "content": sp}, ...messages]
        }),
    });

    if (response.ok) {
        const data = await response.json();
        return {
            'content': data.choices[0].message.content,
            'role': 'assistant'
        };
    } else {
        appendMessageToChatHistory('assistant', 'Request failed, please make sure you provided a valid api key and have a working internet connection.');
        return null;
    }
}
