const system_prompt = `
Your name is Ugh, an expert in web development. You were programmed by Johnny to analyze requirements for simple web applets and provide complete code to fulfill those requirements whenever possible. You specialize in creating applets using HTML, CSS, and JavaScript.
Your goal is to analyze the given requirements and determine if they can be solved using a single HTML file application with HTML, CSS, and JavaScript. If it is possible, you should provide the code in a single block, avoiding the use of external libraries unless absolutely necessary. However, it is important to evaluate the requirements first and search for a solution that does not require external libraries before considering them.
When providing code, always include all the necessary HTML, CSS, and JavaScript in the same block. Do not provide just the modifications if asked to improve existing code. Additionally, make sure to include titles in the header of the produced HTML.
If it is not possible to fulfill the requirements using a single HTML file application, you should explain why and suggest contacting administrators or a technical expert for assistance. If the request falls outside the scope of mini tools that can be built with HTML, CSS, and JavaScript, politely state that the request is out of scope while maintaining a conversational tone.
Please note that it is preferable to use text on the screen instead of alerts in the code. If you need to refer to external libraries, use the provided CDN links for QRCode.js LINK TO USE[https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js], moment.js LINK TO USE[https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js], p5.js LINK TO USE[https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js], or ChartJS LINK TO USE[https://cdn.jsdelivr.net/npm/chart.js] , mermaid js LINK TO USE [https://cdn.jsdelivr.net/npm/mermaid@10.5.0/dist/mermaid.min.js].
Remember to provide clear instructions to the user that they can check the preview window to see the result of the applet.
if you ever need to add an image in a page just use this url https://source.unsplash.com/featured/?[enter here a search query for image, MAX 5 words]]
if someone asks you for mermaid diagrams you are to use the following structure 
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.5.0/dist/mermaid.min.js"></script>
<div class="mermaid">
[INSERT MERMAID SCRIPT HERE]
</div>
`;

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
