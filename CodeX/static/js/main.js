ace.require("ace/ext/language_tools");

        const editor = ace.edit("editor");
        editor.setTheme("ace/theme/twilight");
        editor.session.setMode("ace/mode/c_cpp");
        editor.setFontSize(13);
        editor.setOptions({
            fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showGutter: true,
            highlightActiveLine: true,
            showPrintMargin: false,
            // Fixes for cursor positioning
            useWorker: false,
            fixedWidthGutter: true
        });
        
        // Important fix for cursor positioning
        editor.renderer.setPadding(0);
        editor.renderer.setScrollMargin(10, 10, 0, 0);

        // Automatically set cursor position to beginning of function body
        function positionCursor() {
            const session = editor.getSession();
            const lines = session.getLength();
            for (let i = 0; i < lines; i++) {
                const line = session.getLine(i);
                if (line.includes('numOfSubarrays') && line.includes('{')) {
                    editor.gotoLine(i + 2);
                    editor.focus();
                    break;
                }
            }
        }

        // Set some C++ code initially
        editor.setValue(`#include <iostream>
using namespace std;
int main(){
    cout << "Hello World" << endl;
}`, -1);

        // Force redraw of editor to fix any rendering issues
        setTimeout(() => {
            editor.resize(true);
            editor.renderer.updateFull();
            positionCursor();
            
            // Focus on chat input since AI Chat is the default active tab
            document.getElementById('chat-input').focus();
        }, 100);

        // Tab switching functionality
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                // Add active class to the clicked tab
                this.classList.add('active');
                
                // Hide all panel contents
                document.querySelectorAll('.panel-content').forEach(panel => panel.classList.remove('active'));
                
                // Show the selected panel content
                const target = this.getAttribute('data-target');
                document.getElementById(`${target}-panel`).classList.add('active');
                
                // Resize editors if needed
                if (target === 'input') {
                    setTimeout(() => {
                        inputEditor.resize();
                        inputEditor.renderer.updateFull();
                    }, 10);
                } else if (target === 'chat') {
                    // Focus on chat input
                    setTimeout(() => {
                        chatInput.focus();
                    }, 10);
                }
            });
        });

        // Language selector
        const languageSelector = document.getElementById('language-selector');
        languageSelector.addEventListener('change', () => {
            const language = languageSelector.value;
            const modeMap = {
                'cpp': 'c_cpp',
                'python': 'python',
                'javascript': 'javascript',
                'java': 'java'
            };
            editor.session.setMode(`ace/mode/${modeMap[language]}`);

            const boilerplate = {
                'cpp': `#include <iostream>
using namespace std;
int main(){
    cout << "Hello World" << endl;
}`,
                'python': `print("Hello, World!")`,
                'javascript': `console.log("Hello, World!");`,
                'java': `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`
            };

            // Update filename based on selected language
            const filenameElement = document.getElementById('filename');
            if (language === 'java') {
                // For Java, use the class name from boilerplate
                const className = boilerplate[language].match(/public\s+class\s+(\w+)/)[1];
                filenameElement.textContent = `${className}.java`;
            } else {
                filenameElement.textContent = `Main.${language === 'cpp' ? 'cpp' : language === 'python' ? 'py' : 'js'}`;
            }

            editor.setValue(boilerplate[language], -1);
            setTimeout(() => {
                editor.resize(true);
                editor.renderer.updateFull();
                positionCursor();
            }, 100);
        });

        // Theme selector
        const themeSelector = document.getElementById('theme-selector');
        themeSelector.addEventListener('change', () => {
            const theme = themeSelector.value;
            editor.setTheme(`ace/theme/${theme === 'custom_twilight' ? 'twilight' : theme}`);

            // Remove any existing custom styles
            const existingGutterStyle = document.querySelector('style[data-gutter-custom]');
            if (existingGutterStyle) {
                existingGutterStyle.remove();
            }

            // Apply custom styling only for custom_twilight theme
            if (theme === 'custom_twilight') {
                const gutterStyle = document.createElement('style');
                gutterStyle.setAttribute('data-gutter-custom', '');
                gutterStyle.innerHTML = `
                    .ace-twilight .ace_gutter {
                        background: #1e1e1e !important;
                    }
                    .ace-twilight {
                        background-color: #1e1e1e !important;
                    }
                    .ace_scroller {
                        background-color: #1e1e1e !important;
                    }
                `;
                document.head.appendChild(gutterStyle);
            }

            setTimeout(() => {
                editor.resize(true);
                editor.renderer.updateFull();
            }, 100);
        });

        // Panel resizing logic
        const problemPanel = document.querySelector('.problem-panel');
        const codePanel = document.querySelector('.code-panel');
        const resizeHandleVertical = document.getElementById('resize-handle-vertical');
        const codeEditorContainer = document.querySelector('.code-editor-container');
        const outputContainer = document.querySelector('.output-container');
        const resizeHandleHorizontal = document.getElementById('resize-handle-horizontal');

        let isResizingVertical = false;
        let isResizingHorizontal = false;

        resizeHandleVertical.addEventListener('mousedown', (e) => {
            isResizingVertical = true;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });

        resizeHandleHorizontal.addEventListener('mousedown', (e) => {
            isResizingHorizontal = true;
            document.body.style.cursor = 'row-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (isResizingVertical) {
                const containerWidth = document.querySelector('.main-container').offsetWidth;
                const newProblemWidth = (containerWidth - e.clientX) / containerWidth * 100;
                if (newProblemWidth >= 20 && newProblemWidth <= 80) {
                    problemPanel.style.width = `${newProblemWidth}%`;
                    codePanel.style.width = `${100 - newProblemWidth}%`;
                    editor.resize();
                }
            }

            if (isResizingHorizontal) {
                const codePanelHeight = codePanel.offsetHeight;
                const newEditorHeight = ((e.clientY - codePanel.getBoundingClientRect().top) / codePanelHeight) * 100;
                if (newEditorHeight >= 30 && newEditorHeight <= 85) {
                    codeEditorContainer.style.height = `${newEditorHeight}%`;
                    outputContainer.style.height = `${100 - newEditorHeight}%`;
                    editor.resize();
                }
            }
        });

        document.addEventListener('mouseup', () => {
            isResizingVertical = false;
            isResizingHorizontal = false;
            document.body.style.cursor = 'default';
            // Force editor redraw on resize completion
            editor.resize(true);
            editor.renderer.updateFull();
        });

        // Add functionality to the window control buttons
        document.querySelector('.control-button.close').addEventListener('click', () => {
            // Show save modal first, then redirect to dashboard after saving
            showSaveModalWithRedirect();
        });
        
        document.querySelector('.control-button.minimize').addEventListener('click', () => {
            window.location.href = window.DASHBOARD_URL;
        });
        
        document.querySelector('.control-button.maximize').addEventListener('click', () => {
            const windowContainer = document.querySelector('.window-container');
            windowContainer.classList.toggle('fullscreen');
        });

        // Function to show save modal and redirect after saving
        function showSaveModalWithRedirect() {
            // Create modal
            const modal = document.createElement('div');
            modal.classList.add('modal', 'fade');
            modal.id = 'saveCodeModal';
            modal.setAttribute('tabindex', '-1');
            modal.setAttribute('aria-labelledby', 'saveCodeModalLabel');
            modal.setAttribute('aria-hidden', 'true');
            
            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content" style="background-color: var(--secondary-color); color: var(--text-color);">
                        <div class="modal-header" style="border-color: var(--border-color);">
                            <h5 class="modal-title" id="saveCodeModalLabel">Save Before Closing</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="modal-title" class="form-label">Title</label>
                                <input type="text" class="form-control" id="modal-title" required 
                                       style="background-color: var(--primary-color); color: var(--text-color); border-color: var(--border-color);">
                            </div>
                            <div class="mb-3">
                                <label for="modal-description" class="form-label">Description (optional)</label>
                                <textarea class="form-control" id="modal-description" rows="3"
                                          style="background-color: var(--primary-color); color: var(--text-color); border-color: var(--border-color);"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer" style="border-color: var(--border-color);">
                            <button type="button" class="btn btn-outline-accent" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-accent" id="save-code-confirm">Save & Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Initialize and show modal
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            
            // Handle save button click
            document.getElementById('save-code-confirm').addEventListener('click', () => {
                const title = document.getElementById('modal-title').value;
                const description = document.getElementById('modal-description').value;
                
                if (!title) {
                    alert('Please enter a title for your code.');
                    return;
                }
                
                // Fill the hidden form
                document.getElementById('code-title').value = title;
                document.getElementById('code-description').value = description;

                // FIXED APPROACH: Don't rely on the mode ID at all!
                // Instead, check the actual editor content to determine language
                const codeContent = editor.getValue();

                // Look for language-specific patterns
                if (codeContent.includes('import ') && codeContent.includes('print(') && !codeContent.includes('{')) {
                    // Python typically has imports and print() without curly braces
                    languageSelector.value = 'python';
                } else if (codeContent.includes('console.log(') || 
                        (codeContent.includes('function') && !codeContent.includes('public class'))) {
                    // JavaScript has console.log and functions without public class
                    languageSelector.value = 'javascript';
                } else if (codeContent.includes('public class') && codeContent.includes('public static void main')) {
                    // Java has public class and main method
                    languageSelector.value = 'java';
                } else if (codeContent.includes('#include') || codeContent.includes('cout <<')) {
                    // C++ has #include and cout
                    languageSelector.value = 'cpp';
                } else {
                    // Fallback to whatever is currently selected in the dropdown
                    console.log("Could not detect language from content, using dropdown value");
                }
                document.getElementById('code-language').value = languageSelector.value;
                document.getElementById('code-content').value = editor.getValue();
                document.getElementById('user-input').value = inputEditor.getValue();
                
                // Submit the form and redirect to dashboard
                const form = document.getElementById('save-code-form');
                form.setAttribute('action', '{% url "create_code" %}?redirect=deshboard');
                form.submit();
                
                // Close modal
                bsModal.hide();
            });
            
            // Clean up when modal is hidden
            modal.addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modal);
            });
        }

        // Run button functionality
        document.getElementById('run-button').addEventListener('click', () => {
            const editorContent = editor.getValue();
            const languageName = document.getElementById('language-selector').value;
            const userInput = inputEditor.getValue();
            
            // Get code_id if available
            const codeIdInput = document.getElementById('code-id');
            const codeId = codeIdInput ? codeIdInput.value : null;
            
            // Update output
            const outputContent = document.querySelector('.output-content');
            const loadingOverlay = document.getElementById('output-loading');
            
            // Show loading overlay
            loadingOverlay.style.display = 'flex';
            
            // Prepare data for submission
            const data = {
                code: editorContent,
                language: languageName,
                input: userInput
            };
            
            // Add snippet_id if code-id element exists
            if (codeId) {
                data.snippet_id = codeId;
            }
            
            // Display initial output state
            outputContent.innerHTML = '<p style="color: #ddd; text-align: center;">Running code...</p>';
            
            // Call the backend to execute code
            fetch('/execute_code/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(data => {
                // Hide loading indicator
                loadingOverlay.style.display = 'none';
                
                if (data.status === 'success') {
                    // Format input and output
                    let outputDisplay = '';
                    
                    // If there's input, show it with the output
                    if (userInput.trim() && !userInput.startsWith('# Input')) {
                        outputDisplay = `--- Input ---\n${userInput}\n\n--- Output ---\n${data.output}`;
                    } else {
                        outputDisplay = data.output;
                    }
                    
                    outputContent.innerHTML = `
                        <div style="margin-bottom: 10px;">
                            <span class="badge bg-primary">${languageName}</span>
                            <span class="text-light ms-2">Execution completed</span>
                        </div>
                        <pre style="color: #ddd; background-color: #111; padding: 15px; border-radius: 6px; overflow-x: auto; margin-bottom: 0;">${outputDisplay}</pre>`;
                    
                    if (data.stderr && data.stderr.trim() !== '') {
                        outputContent.innerHTML += `
                            <div style="margin-top: 10px;">
                                <span class="badge bg-danger">Errors</span>
                            </div>
                            <pre style="color: #ff5f57; background-color: #111; padding: 15px; border-radius: 6px; overflow-x: auto; margin-bottom: 0;">${data.stderr}</pre>`;
                    }
                } else {
                    outputContent.innerHTML = `
                        <div style="margin-bottom: 10px;">
                            <span class="badge bg-danger">Error</span>
                        </div>
                        <pre style="color: #ff5f57; background-color: #111; padding: 15px; border-radius: 6px; overflow-x: auto; margin-bottom: 0;">${data.message}</pre>`;
                }
            })
            .catch(error => {
                // Hide loading indicator
                loadingOverlay.style.display = 'none';
                
                outputContent.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <span class="badge bg-danger">Network Error</span>
                    </div>
                    <pre style="color: #ff5f57; background-color: #111; padding: 15px; border-radius: 6px; overflow-x: auto; margin-bottom: 0;">${error.message}</pre>`;
            });
        });

        // Save button functionality
        document.getElementById('save-button').addEventListener('click', () => {
            // Open modal to get title and description
            showSaveModal();
        });

        // Function to show save modal
        function showSaveModal() {
            // Create modal
            const modal = document.createElement('div');
            modal.classList.add('modal', 'fade');
            modal.id = 'saveCodeModal';
            modal.setAttribute('tabindex', '-1');
            modal.setAttribute('aria-labelledby', 'saveCodeModalLabel');
            modal.setAttribute('aria-hidden', 'true');
            
            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content" style="background-color: var(--secondary-color); color: var(--text-color);">
                        <div class="modal-header" style="border-color: var(--border-color);">
                            <h5 class="modal-title" id="saveCodeModalLabel">Save Code</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="modal-title" class="form-label">Title</label>
                                <input type="text" class="form-control" id="modal-title" required 
                                       style="background-color: var(--primary-color); color: var(--text-color); border-color: var(--border-color);">
                            </div>
                            <div class="mb-3">
                                <label for="modal-description" class="form-label">Description (optional)</label>
                                <textarea class="form-control" id="modal-description" rows="3"
                                          style="background-color: var(--primary-color); color: var(--text-color); border-color: var(--border-color);"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer" style="border-color: var(--border-color);">
                            <button type="button" class="btn btn-outline-accent" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-accent" id="save-code-confirm">Save Code</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Initialize and show modal
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            
            // Handle save button click
            document.getElementById('save-code-confirm').addEventListener('click', () => {
                const title = document.getElementById('modal-title').value;
                const description = document.getElementById('modal-description').value;
                
                if (!title) {
                    alert('Please enter a title for your code.');
                    return;
                }
                
                // Fill the hidden form
                document.getElementById('code-title').value = title;
                document.getElementById('code-description').value = description;

                // FIXED APPROACH: Don't rely on the mode ID at all!
                // Instead, check the actual editor content to determine language
                const codeContent = editor.getValue();

                // Look for language-specific patterns
                if (codeContent.includes('import ') && codeContent.includes('print(') && !codeContent.includes('{')) {
                    // Python typically has imports and print() without curly braces
                    languageSelector.value = 'python';
                } else if (codeContent.includes('console.log(') || 
                        (codeContent.includes('function') && !codeContent.includes('public class'))) {
                    // JavaScript has console.log and functions without public class
                    languageSelector.value = 'javascript';
                } else if (codeContent.includes('public class') && codeContent.includes('public static void main')) {
                    // Java has public class and main method
                    languageSelector.value = 'java';
                } else if (codeContent.includes('#include') || codeContent.includes('cout <<')) {
                    // C++ has #include and cout
                    languageSelector.value = 'cpp';
                } else {
                    // Fallback to whatever is currently selected in the dropdown
                    console.log("Could not detect language from content, using dropdown value");
                }

                console.log("Detected language:", languageSelector.value);
                document.getElementById('code-language').value = languageSelector.value;
                document.getElementById('code-content').value = editor.getValue();
                document.getElementById('user-input').value = inputEditor.getValue();
                
                // Submit the form
                document.getElementById('save-code-form').submit();
                
                // Close modal
                bsModal.hide();
            });
            
            // Clean up when modal is hidden
            modal.addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modal);
            });
        }

        // Initialize the input editor
        const inputEditor = ace.edit("input-editor");
        inputEditor.setTheme("ace/theme/twilight");
        inputEditor.session.setMode("ace/mode/text");
        inputEditor.setFontSize(13);
        inputEditor.setOptions({
            fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
            showGutter: false,
            highlightActiveLine: false,
            showPrintMargin: false,
            enableBasicAutocompletion: false,
            enableLiveAutocompletion: false,
            enableSnippets: false,
            useWorker: false,
            padding: 10,
            scrollPastEnd: false,
            highlightSelectedWord: false
        });
        
        // Set placeholder for input
        inputEditor.setValue(`# Input Data

Enter any input data that your program needs to process.

Example:
5
10
15`, -1);

        // Sync input editor theme with main editor
        themeSelector.addEventListener('change', () => {
            const theme = themeSelector.value;
            inputEditor.setTheme(`ace/theme/${theme}`);
        });

        // Add CSS rules for the input editor
        const inputEditorStyle = document.createElement('style');
        inputEditorStyle.textContent = `
            #input-editor {
                padding: 10px !important;
            }
            #input-editor .ace_scroller {
                left: 10px !important;
                right: 10px !important;
                top: 10px !important;
                bottom: 10px !important;
            }
            #input-editor .ace_content {
                padding: 0 !important;
                width: calc(100% - 10px) !important;
                left: 0 !important;
            }
            #input-editor .ace_text-layer {
                padding: 0;
            }
            #input-editor .ace_line {
                padding-left: 0;
            }
        `;
        document.head.appendChild(inputEditorStyle);

        // Chat functionality
        const chatMessages = document.getElementById('chat-messages');
        const chatInput = document.getElementById('chat-input');
        const sendChatButton = document.getElementById('send-chat');
        let chatHistory = [];
        
        // Function to add a message to the chat
        function addChatMessage(message, sender) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message', sender);
            
            const messageContent = document.createElement('div');
            messageContent.classList.add('message-content');
            
            // Convert line breaks to <br> and handle code blocks
            let formattedMessage = message.replace(/\n/g, '<br>');
            
            // Handle headers (###)
            formattedMessage = formattedMessage.replace(/###\s+(.*?)(<br>|$)/g, '<h3>$1</h3>');
            formattedMessage = formattedMessage.replace(/##\s+(.*?)(<br>|$)/g, '<h2>$1</h2>');
            
            // Handle bullet points
            formattedMessage = formattedMessage.replace(/(<br>|^)\s*-\s+(.*?)(<br>|$)/g, 
                '<br><ul><li>$2</li></ul>');
            
            // Combine adjacent list items
            formattedMessage = formattedMessage.replace(/<\/ul><br><ul>/g, '');
            
            // Handle bolding with ** or __
            formattedMessage = formattedMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedMessage = formattedMessage.replace(/__(.*?)__/g, '<strong>$1</strong>');
            
            // Handle italics with * or _
            formattedMessage = formattedMessage.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
            formattedMessage = formattedMessage.replace(/_([^_]+)_/g, '<em>$1</em>');
            
            // Function to generate a unique ID for code blocks
            function generateCodeId() {
                return 'code-' + Math.random().toString(36).substr(2, 9);
            }
            
            // Handle code blocks with language
            formattedMessage = formattedMessage.replace(/```(\w+)?\s*([\s\S]*?)```/g, function(match, language, code) {
                const codeId = generateCodeId();
                const languageLabel = language ? 
                    `<div class="code-language-label">${language}</div>`
                : '';
                return `<pre class="code-block" data-code-id="${codeId}">${languageLabel}${code}</pre>`;
            });
            
            messageContent.innerHTML = formattedMessage;
            messageElement.appendChild(messageContent);
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Function to send a chat message
        async function sendChatMessage() {
            const message = chatInput.value.trim();
            if (!message) return;
            
            // Add user message to chat
            addChatMessage(message, 'user');
            chatInput.value = '';
            
            // Add a loading indicator
            const loadingElement = document.createElement('div');
            loadingElement.classList.add('chat-message', 'assistant');
            loadingElement.innerHTML = '<div class="message-content">Thinking...</div>';
            chatMessages.appendChild(loadingElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            try {
                // Get the current code and other information
                const code = editor.getValue();
                const language = document.getElementById('language-selector').value;
                const userInput = inputEditor.getValue();
                
                // Get code_id if available
                const codeIdInput = document.getElementById('code-id');
                const codeId = codeIdInput ? codeIdInput.value : null;
                
                // Prepare the context with code
                let contextMessage = `I'm working with the following ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
                
                // Add input data if available
                if (userInput && !userInput.startsWith('# Input')) {
                    contextMessage += `Input data:\n\`\`\`\n${userInput}\n\`\`\`\n\n`;
                }
                
                // Add the user's question
                contextMessage += message;
                
                // Prepare request data
                const requestData = {
                    prompt: contextMessage,
                    chat_history: chatHistory
                };
                
                // Add code_id if available
                if (codeId) {
                    requestData.code_id = codeId;
                }
                
                // Get AI response
                const response = await fetch(window.CHAT_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify(requestData)
                });
                
                const data = await response.json();
                
                // Hide loading indicator
                loadingElement.remove();
                
                if (data.status === 'success') {
                    // Format input and output
                    let outputDisplay = '';
                    
                    // If there's input, show it with the output
                    if (userInput.trim() && !userInput.startsWith('# Input')) {
                        outputDisplay = `--- Input ---\n${userInput}\n\n--- Output ---\n${data.output}`;
                    } else {
                        outputDisplay = data.output;
                    }
                    
                    outputContent.innerHTML = `
                        <div style="margin-bottom: 10px;">
                            <span class="badge bg-primary">${language}</span>
                            <span class="text-light ms-2">Execution completed</span>
                        </div>
                        <pre style="color: #ddd; background-color: #111; padding: 15px; border-radius: 6px; overflow-x: auto; margin-bottom: 0;">${outputDisplay}</pre>`;
                    
                    if (data.stderr && data.stderr.trim() !== '') {
                        outputContent.innerHTML += `
                            <div style="margin-top: 10px;">
                                <span class="badge bg-danger">Errors</span>
                            </div>
                            <pre style="color: #ff5f57; background-color: #111; padding: 15px; border-radius: 6px; overflow-x: auto; margin-bottom: 0;">${data.stderr}</pre>`;
                    }
                } else {
                    outputContent.innerHTML = `
                        <div style="margin-bottom: 10px;">
                            <span class="badge bg-danger">Error</span>
                        </div>
                        <pre style="color: #ff5f57; background-color: #111; padding: 15px; border-radius: 6px; overflow-x: auto; margin-bottom: 0;">${data.message}</pre>`;
                }
            } catch (error) {
                // Hide loading indicator
                loadingElement.remove();
                
                outputContent.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <span class="badge bg-danger">Network Error</span>
                    </div>
                    <pre style="color: #ff5f57; background-color: #111; padding: 15px; border-radius: 6px; overflow-x: auto; margin-bottom: 0;">${error.message}</pre>`;
            }
        }

        // Send chat button functionality
        sendChatButton.addEventListener('click', sendChatMessage);