# Creation Buddy

Creation Buddy is a web-based AI chat application that helps you build websites using generative AI. It's designed to be a collaborative partner for developers and designers, allowing you to generate and iteratively edit HTML, CSS, and JavaScript code in real-time.

## Features

-   **AI-Powered Code Generation:** Describe the website you want to build, and Creation Buddy will generate the complete HTML, CSS, and JS for you.
-   **Interactive Previews:** View a live preview of the generated website directly within the app.
-   **In-App Code Editor:** Edit the generated code in a side-by-side editor and see your changes reflected instantly in the preview.
-   **Chat-Based Interface:** Converse with the AI to refine your website, add new features, or fix issues.
-   **Context-Aware Conversations:** The app automatically manages the conversation context to ensure coherent and relevant responses from the AI, even in long chats.
-   **Chat Management:** Save, rename, and delete your conversations. You can also import and export all your chat data.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/creationbuddy.git
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd creationbuddy
    ```
3.  **Run a local web server:**
    Since the application is built with vanilla HTML, CSS, and JavaScript, you don't need a complex build setup. Just serve the files with a simple local server. If you have Python installed, you can use:
    ```bash
    python3 -m http.server
    ```
    Or, if you have Node.js and `serve` installed:
    ```bash
    npx serve
    ```
4.  **Open the application:**
    Open your web browser and navigate to `http://localhost:8000` (or the port your server is running on).
5.  **Enter your API Key:**
    To use the application, you'll need a Mistral AI API key. You can get one from the [Mistral AI documentation](https://docs.mistral.ai/getting-started/quickstart/). Enter your key in the designated field in the sidebar.

## How to Use

-   Start a new chat and type a prompt describing the website you want to create (e.g., "Build a portfolio website for a photographer").
-   The AI will generate the code. Click on the code block header in the chat to load it into the editor.
-   Use the "Code" and "Preview" tabs to switch between editing the code and viewing the live website.
-   Make changes in the editor, and the preview will update automatically.
-   Click "Save" to submit your edits back to the chat as a new message, allowing the AI to see your changes for future requests.
-   Continue the conversation to iterate on your design.

---

This project is powered by Mistral AI. 