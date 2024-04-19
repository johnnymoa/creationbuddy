var messages = [];
var applets = [];

async function submitPrompt() {
    const loader = document.getElementById('loader');
    const submitButton = document.getElementById('submit-button');
    const chatInput = document.getElementById('prompt-input');
    const userMessage = chatInput.value;

    if (userMessage.trim() === '') {
        return;
    }
    let newMessage = {
        "content": userMessage,
        "role": "user"
    };

    messages.push(newMessage);

    // Add user message to the chat history
    appendMessageToChatHistory("user",escapeHTMLExceptPreviewButtons(userMessage));

    // Clear the input field
    chatInput.value = '';

    loader.style.display = 'block';
    submitButton.style.display = 'none';
    let message
    try {
        // Call the getCompletion function asynchronously
        message = await getCompletion(messages, document.getElementById("modelSelect").value);
    } finally {
        loader.style.display = 'none';
        submitButton.style.display = 'block';
    }

    if(!message)return;
    // Add bot response to the chat history
    let items = findDelimitedItems(message.content);
    let new_safe_content = message.content;
    for (let i = 0; i < items.length; i++) {
        let uid = generateUUID();
        new_safe_content = new_safe_content.replace("```html\n"+items[i]+"```", `<button pb="true" id="${uid}" class="preview-button">preview applet</button>`)
        applets[uid] = items[i];
    }

    appendMessageToChatHistory("assistant",escapeHTMLExceptPreviewButtons(new_safe_content));

    messages.push(message);


    var buttons = document.getElementsByClassName("preview-button");
    if (buttons.length > 0) {
        var lastButton = buttons[buttons.length - 1];
        lastButton.click();
    }
}

document.getElementById("prompt-input").addEventListener("keydown", function (event) {
    if (event.key === 'Enter' && !event.metaKey) {
        event.preventDefault();
        submitPrompt();
    } else if (event.key === 'Enter' && event.metaKey) {
        document.getElementById("prompt-input").value += "\n";
    }else  if (event.key === 'Tab') {
        event.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + '\t' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 1;
    }
});

document.getElementById("previewCode").addEventListener("keydown", function (event) {
   if (event.key === 'Tab') {
        document.getElementById("previewFrame").classList.remove("emptyFrame");
        event.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + '\t' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 1;
    }
});

//submit button
document.getElementById('submit-button').addEventListener('click', submitPrompt);

//preview button
document.body.addEventListener("click", function (event) {
    if (event.target.classList.contains("preview-button")) {
        let code = document.getElementById('previewCode')
        let iframe = document.getElementById("previewFrame");
        let newIframe = document.createElement('iframe');
        newIframe.id = 'previewFrame';
        iframe.parentNode.replaceChild(newIframe, iframe);
        iframe = document.getElementById("previewFrame");
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(applets[event.target.id]);
        code.value = applets[event.target.id];
        iframe.contentWindow.document.close();
        code.style.display = 'none';
        code.textContent = applets[event.target.id];
        iframe.style.display = 'block';
        document.getElementById("previewFrame");
    }
});

//Header Buttons
document.getElementById('exportBtn').onclick = function () {
    let content = document.getElementById('previewCode').value;
    var iframe = document.getElementById('previewFrame');
    var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    var file = new Blob([content], { type: 'text/html' });
    var fileURL = URL.createObjectURL(file);
    var title = iframeDocument.title || iframe.src.replace(/\//g, "_").replace('.html', '');

    var a = document.createElement("a");
    a.href = fileURL;
    a.download = title + ".html";
    document.body.appendChild(a);
    a.click();
};

document.getElementById('clearBtn').onclick = function () {
    messages = [];
    document.querySelector('.chat-history').innerHTML = "";
    let code = document.getElementById('previewCode')
    let iframe = document.getElementById("previewFrame");
    iframe.src = "about:blank";
    code.textContent = "";
    code.style.display = 'none';
    iframe.style.display = 'block';
    document.getElementById("previewFrame").classList.add("emptyFrame");

};

document.getElementById('codeBtn').onclick = function () {
    let code = document.getElementById('previewCode')
    let iframe = document.getElementById("previewFrame");
    if (code.style.display == 'none') {
        code.style.display = 'block';
        iframe.style.display = 'none';
    } else {
        let newIframe = document.createElement('iframe');
        newIframe.id = 'previewFrame';
        iframe.parentNode.replaceChild(newIframe, iframe);
        iframe = document.getElementById("previewFrame");
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(code.value);
        iframe.contentWindow.document.close();

        code.style.display = 'none';
        iframe.style.display = 'block';
    }
};

document.getElementById('apikeyBtn').onclick = function () {
    let apikey = document.getElementById('apikey');
    apikey.style.display = (apikey.style.display == 'none') ? 'inline' : 'none';
    document.getElementById('apikeyBtn').innerHTML = (apikey.style.display == 'none') ? 'key' : 'save';
    localStorage.setItem('apikey', apikey.value);
};



//custom prompt management
let modal = document.getElementById("myModal");
modal = document.querySelector('#myModal');
let span = document.getElementsByClassName("close")[0];

span.onclick = function () {
    modal.style.display = "none";
};

span.addEventListener("touchend", function (e) {
    modal.style.display = "none";
}, { passive: false });

window.onclick = function (event) {
    if (event.target == modal) {
    modal.style.display = "none";
    }
};

window.addEventListener("touchend", function (e) {
    modal.style.display = "none";
}, { passive: false });

document.getElementById("systemBtn").onclick = () => {
    modal.style.display = "block";
};

document.getElementById('personalitySelect').onchange = function (e) {
    document.getElementById('personalitySelect2').value =  e.target.value;
    document.getElementById("systemPrompt").value = '';
    document.getElementById("systemPrompt").value = document.getElementById(e.target.value).textContent;
};

 document.getElementById('personalitySelect2').onchange = function (e) {
    document.getElementById('personalitySelect').value =  e.target.value;
    document.getElementById("systemPrompt").value = '';
    document.getElementById("systemPrompt").value = document.getElementById(e.target.value).textContent;
    if(e.target.value == "freestyle")modal.style.display = "block";
};


function checkModelSelect() {
    // Function to get the query string parameter
    function getQueryStringParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Mapping shorthand model values to select option values
    const modelMapping = {
        '3.5t': 'gpt-3.5-turbo-1106',
        '4': 'gpt-4',
        '4t': 'gpt-4-1106-preview'
    };

    // Get model parameter from URL
    const modelParam = getQueryStringParam('model');
    if (modelParam && modelMapping[modelParam]) {
        const selectElement = document.getElementById('modelSelect');
        selectElement.value = modelMapping[modelParam];
    }
}

// Call the function when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', checkModelSelect);



function isValidOption(value) {
    const options = ["chat", "creationbuddy", "slides", "diagram", "visual", "custom"];
    return options.includes(value);
}

// Function to check and set the personality based on URL parameter
function checkPersonalitySelect() {
    const urlParams = new URLSearchParams(window.location.search);
    const personalityParam = urlParams.get('template');
    console.log(personalityParam);
    if (isValidOption(personalityParam)) { 
        document.getElementById('personalitySelect').value = personalityParam;
        document.getElementById('personalitySelect2').value = personalityParam;
        document.getElementById("systemPrompt").value = document.getElementById(personalityParam).textContent;
    }
}

// Call the function when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', checkPersonalitySelect);





