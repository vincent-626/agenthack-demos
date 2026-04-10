"""
Deterministic vulnerability rule engine.
Scans code for OWASP Top 10 patterns using regex + line-level analysis.
"""
import re
from typing import List, Dict, Any

RULES = [
    {
        "id": "sql-injection",
        "vulnerability_type": "SQL Injection",
        "owasp_category": "A03:2021 Injection",
        "severity": "CRITICAL",
        "languages": ["python", "javascript", "typescript", "php", "java", "go"],
        "description": (
            "User-controlled data is directly embedded in a SQL query via string formatting "
            "or concatenation, allowing attackers to manipulate the query structure. "
            "This can lead to unauthorized data access, data exfiltration, or complete database compromise."
        ),
        "fix_python": (
            "Use parameterized queries (prepared statements) instead of string formatting:\n\n"
            "# VULNERABLE:\n"
            'query = f"SELECT * FROM users WHERE id = {user_id}"\n\n'
            "# SAFE:\n"
            'cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))'
        ),
        "fix_js": (
            "Use parameterized queries with a DB driver:\n\n"
            "// VULNERABLE:\n"
            "db.query(`SELECT * FROM users WHERE id = ${userId}`);\n\n"
            "// SAFE:\n"
            'db.query("SELECT * FROM users WHERE id = ?", [userId]);'
        ),
        "patterns": [
            # Python f-strings in SQL
            r'(f["\']|f""")(.*?(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM).*?\{[^}]+\})',
            # Python .format() in SQL
            r'(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM)[^"\']*["\'].*?\.format\s*\(',
            # Python % formatting in SQL
            r'(SELECT|INSERT|UPDATE|DELETE)[^"\']*["\'].*?%\s*[\w(]',
            # String concat in SQL
            r'(SELECT|INSERT|UPDATE|DELETE|WHERE)\s*["\']?\s*\+\s*\w',
            # JS/TS template literals in SQL
            r'(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM)\s+.*?\$\{',
        ],
    },
    {
        "id": "xss",
        "vulnerability_type": "Cross-Site Scripting (XSS)",
        "owasp_category": "A03:2021 Injection",
        "severity": "HIGH",
        "languages": ["javascript", "typescript", "php"],
        "description": (
            "User-supplied data is written directly to the DOM via innerHTML or document.write "
            "without sanitization, enabling attackers to inject malicious scripts. "
            "This can lead to session hijacking, credential theft, or account takeover."
        ),
        "fix_js": (
            "Use textContent instead of innerHTML, or sanitize with DOMPurify:\n\n"
            "// VULNERABLE:\n"
            "element.innerHTML = userInput;\n\n"
            "// SAFE (text only):\n"
            "element.textContent = userInput;\n\n"
            "// SAFE (HTML allowed):\n"
            "element.innerHTML = DOMPurify.sanitize(userInput);"
        ),
        "patterns": [
            # innerHTML assignment with variable
            r'\.innerHTML\s*=\s*(?![\'"]\s*[<\w])[^;"\'][^;]*[\w$]',
            # innerHTML +=
            r'\.innerHTML\s*\+=',
            # document.write with variable
            r'document\.write\s*\([^"\']\w',
            # outerHTML
            r'\.outerHTML\s*=\s*(?![\'"]\s*<)[^;"\'][^;]*[\w$]',
        ],
    },
    {
        "id": "weak-crypto",
        "vulnerability_type": "Weak Cryptography",
        "owasp_category": "A02:2021 Cryptographic Failures",
        "severity": "HIGH",
        "languages": ["python", "javascript", "typescript", "java", "php", "go"],
        "description": (
            "MD5 or SHA-1 hashing algorithms are used, which are cryptographically broken and vulnerable "
            "to collision and preimage attacks. For password hashing, these are especially dangerous "
            "as they can be reversed with rainbow tables in seconds."
        ),
        "fix_python": (
            "Use a strong, purpose-built algorithm:\n\n"
            "# VULNERABLE:\n"
            "hashlib.md5(password.encode()).hexdigest()\n\n"
            "# SAFE (for passwords):\n"
            "import bcrypt\n"
            "bcrypt.hashpw(password.encode(), bcrypt.gensalt())\n\n"
            "# SAFE (for data integrity):\n"
            "hashlib.sha256(data).hexdigest()"
        ),
        "fix_js": (
            "Use SubtleCrypto with SHA-256 or argon2 for passwords:\n\n"
            "// VULNERABLE:\n"
            'CryptoJS.MD5(password)\n\n'
            "// SAFE (for data integrity):\n"
            "await crypto.subtle.digest('SHA-256', data);"
        ),
        "patterns": [
            # Python hashlib.md5 / hashlib.sha1
            r'hashlib\.(md5|sha1)\s*\(',
            # Python import md5
            r'import\s+md5',
            # JS CryptoJS.MD5/SHA1
            r'CryptoJS\.(MD5|SHA1)\s*\(',
            # Java MessageDigest MD5/SHA1
            r'MessageDigest\.getInstance\s*\(\s*["\']?(MD5|SHA-1|SHA1)["\']?\s*\)',
            # PHP md5() / sha1()
            r'\b(md5|sha1)\s*\(',
            # Go md5.New() / sha1.New()
            r'(md5|sha1)\.New\s*\(',
            r'crypto/(md5|sha1)',
        ],
    },
    {
        "id": "hardcoded-secrets",
        "vulnerability_type": "Hardcoded Secrets",
        "owasp_category": "A02:2021 Cryptographic Failures",
        "severity": "CRITICAL",
        "languages": ["python", "javascript", "typescript", "java", "php", "go"],
        "description": (
            "Sensitive credentials (passwords, API keys, JWT secrets) are hardcoded as string literals "
            "in source code. Attackers who access the codebase, compiled binary, or version history "
            "gain immediate access to these credentials."
        ),
        "fix_python": (
            "Load secrets from environment variables or a secrets manager:\n\n"
            "# VULNERABLE:\n"
            'API_KEY = "sk-1234567890abcdef"\n\n'
            "# SAFE:\n"
            "import os\n"
            'API_KEY = os.environ["API_KEY"]  # raises if not set\n'
            '# or: API_KEY = os.getenv("API_KEY")  # returns None if not set'
        ),
        "fix_js": (
            "Use environment variables:\n\n"
            "// VULNERABLE:\n"
            'const JWT_SECRET = "super-secret-key-123";\n\n'
            "// SAFE:\n"
            "const JWT_SECRET = process.env.JWT_SECRET;"
        ),
        "patterns": [
            # password = "..." (at least 8 chars)
            r'(?i)(password|passwd|pwd)\s*=\s*["\'][^"\']{8,}["\']',
            # API key / secret assignment
            r'(?i)(api_?key|apikey|secret_?key|secret|jwt_?secret|auth_?token|access_?token)\s*=\s*["\'][^"\']{8,}["\']',
            # Bearer token hardcoded
            r'(?i)(Authorization|Bearer)\s*[:\s]+["\']?[A-Za-z0-9+/._-]{20,}["\']?',
            # Private key patterns
            r'-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----',
        ],
    },
    {
        "id": "eval-injection",
        "vulnerability_type": "Code Injection via eval()",
        "owasp_category": "A03:2021 Injection",
        "severity": "CRITICAL",
        "languages": ["python", "javascript", "typescript", "php"],
        "description": (
            "User-controlled data is passed to eval(), exec(), or similar dynamic code execution "
            "functions. An attacker can inject arbitrary code that executes with the same privileges "
            "as the application, leading to full system compromise."
        ),
        "fix_js": (
            "Avoid eval() entirely; use safer alternatives:\n\n"
            "// VULNERABLE:\n"
            "eval(userInput);\n\n"
            "// SAFE (parsing JSON):\n"
            "JSON.parse(userInput);\n\n"
            "// SAFE (math expressions): use a library like mathjs\n"
            "math.evaluate(expression);"
        ),
        "fix_python": (
            "Avoid eval()/exec() with untrusted input:\n\n"
            "# VULNERABLE:\n"
            "eval(user_input)\n\n"
            "# SAFE (for expressions): use ast.literal_eval for literals only\n"
            "import ast\n"
            "ast.literal_eval(user_input)  # safe, only parses literals"
        ),
        "patterns": [
            # eval() with non-literal argument
            r'\beval\s*\(\s*(?!["\'])[^)]+\)',
            # Python exec() with variable
            r'\bexec\s*\(\s*(?!["\'])[^)]+\)',
            # PHP eval()
            r'\beval\s*\(\s*\$',
            # new Function() in JS
            r'new\s+Function\s*\(',
        ],
    },
    {
        "id": "path-traversal",
        "vulnerability_type": "Path Traversal",
        "owasp_category": "A01:2021 Broken Access Control",
        "severity": "HIGH",
        "languages": ["python", "javascript", "typescript", "php", "java", "go"],
        "description": (
            "File paths are constructed using user-supplied input without validation or normalization, "
            "allowing attackers to access files outside the intended directory using sequences like '../'. "
            "This can expose sensitive configuration files, credentials, or system files."
        ),
        "fix_python": (
            "Validate and normalize paths, and confirm they are within allowed directories:\n\n"
            "# VULNERABLE:\n"
            "open(os.path.join(base_dir, user_filename))\n\n"
            "# SAFE:\n"
            "import os\n"
            "safe_path = os.path.realpath(os.path.join(base_dir, user_filename))\n"
            "if not safe_path.startswith(os.path.realpath(base_dir)):\n"
            "    raise ValueError('Path traversal detected')\n"
            "open(safe_path)"
        ),
        "fix_js": (
            "Use path.resolve() and verify the result is within your base directory:\n\n"
            "// VULNERABLE:\n"
            "fs.readFile(path.join(baseDir, req.params.file));\n\n"
            "// SAFE:\n"
            "const safePath = path.resolve(baseDir, req.params.file);\n"
            "if (!safePath.startsWith(path.resolve(baseDir))) {\n"
            "  return res.status(403).send('Forbidden');\n"
            "}\n"
            "fs.readFile(safePath);"
        ),
        "patterns": [
            # Python open() with variable
            r'\bopen\s*\(\s*(?!(["\']\w))[^)]*\+[^)]*\)',
            r'\bopen\s*\(\s*f["\']',
            # os.path.join with user variable
            r'os\.path\.join\s*\([^)]*(?:request|user|param|input|query|body|args)[^)]*\)',
            # Node.js fs with variable
            r'fs\.(readFile|readFileSync|writeFile|createReadStream)\s*\(\s*(?!["\'\/])[^)]+\)',
            # PHP file_get_contents with variable
            r'file_get_contents\s*\(\s*\$',
        ],
    },
    {
        "id": "insecure-random",
        "vulnerability_type": "Insecure Randomness",
        "owasp_category": "A02:2021 Cryptographic Failures",
        "severity": "MEDIUM",
        "languages": ["python", "javascript", "typescript", "java", "php"],
        "description": (
            "A non-cryptographic random number generator is used for security-sensitive purposes "
            "such as generating tokens, session IDs, or one-time passwords. These generators are "
            "predictable and can be exploited to forge tokens or predict future values."
        ),
        "fix_python": (
            "Use the secrets module for cryptographically secure random values:\n\n"
            "# VULNERABLE:\n"
            "token = str(random.randint(100000, 999999))\n\n"
            "# SAFE:\n"
            "import secrets\n"
            "token = secrets.token_urlsafe(32)  # 256 bits of entropy"
        ),
        "fix_js": (
            "Use crypto.randomBytes() or crypto.randomUUID():\n\n"
            "// VULNERABLE:\n"
            "const token = Math.random().toString(36).slice(2);\n\n"
            "// SAFE:\n"
            "const token = require('crypto').randomBytes(32).toString('hex');\n"
            "// or in modern Node.js:\n"
            "const id = crypto.randomUUID();"
        ),
        "patterns": [
            # Math.random() used for token/secret/key/session/password
            r'Math\.random\(\).*?(token|secret|key|session|password|otp|code|nonce)',
            r'(token|secret|key|session|password|otp|code|nonce).*?Math\.random\(\)',
            # Python random for security context
            r'random\.(random|randint|choice|randrange)\(\).*?(token|secret|key|session|password|otp)',
            r'(token|secret|key|session|password|otp).*?random\.(random|randint|choice|randrange)\(',
            # PHP rand() / mt_rand() for security
            r'\b(rand|mt_rand)\s*\([^)]*\)',
        ],
    },
    {
        "id": "log-injection",
        "vulnerability_type": "Log Injection",
        "owasp_category": "A09:2021 Security Logging and Monitoring Failures",
        "severity": "MEDIUM",
        "languages": ["python", "javascript", "typescript", "java", "php", "go"],
        "description": (
            "User-controlled data is written directly to log files without sanitization. "
            "Attackers can inject newline characters to forge log entries, covering their tracks "
            "or misleading security monitoring systems with false events."
        ),
        "fix_python": (
            "Sanitize user input before logging (strip newlines, or use structured logging):\n\n"
            "# VULNERABLE:\n"
            'logger.info(f"User login: {username}")\n\n'
            "# SAFE:\n"
            "safe_username = username.replace('\\n', '').replace('\\r', '')\n"
            'logger.info("User login", extra={"username": safe_username})  # structured'
        ),
        "fix_js": (
            "Strip control characters or use structured logging:\n\n"
            "// VULNERABLE:\n"
            "console.log(`Login attempt: ${username}`);\n\n"
            "// SAFE:\n"
            "const safeUser = username.replace(/[\\r\\n]/g, '');\n"
            "logger.info('Login attempt', { username: safeUser }); // structured"
        ),
        "patterns": [
            # Python logger with f-string user variables
            r'logger\.(info|warning|error|debug|critical)\s*\(\s*f["\'].*?\{(?:user|request|input|param|body|name|data)',
            # console.log with template literal user data
            r'console\.(log|warn|error)\s*\(\s*`.*?\$\{(?:user|request|input|param|body|name)',
            # Java logger
            r'(log|logger)\.(info|warn|error|debug)\s*\([^)]*\+\s*(?:user|request|input|param)',
            # Go log.Print
            r'log\.(Print|Printf|Println)\s*\([^)]*(?:r\.FormValue|r\.URL|request)',
        ],
    },
    {
        "id": "ssrf",
        "vulnerability_type": "Server-Side Request Forgery (SSRF)",
        "owasp_category": "A10:2021 Server-Side Request Forgery",
        "severity": "HIGH",
        "languages": ["python", "javascript", "typescript", "java", "php", "go"],
        "description": (
            "The application makes HTTP requests to URLs derived from user-supplied input without "
            "validation. Attackers can redirect requests to internal services (metadata APIs, "
            "databases, admin panels) to exfiltrate data or pivot within the internal network."
        ),
        "fix_python": (
            "Validate URLs against an allowlist of permitted hosts:\n\n"
            "# VULNERABLE:\n"
            "response = requests.get(user_url)\n\n"
            "# SAFE:\n"
            "from urllib.parse import urlparse\n"
            "ALLOWED_HOSTS = {'api.example.com', 'cdn.example.com'}\n"
            "parsed = urlparse(user_url)\n"
            "if parsed.netloc not in ALLOWED_HOSTS:\n"
            "    raise ValueError('URL not in allowlist')\n"
            "response = requests.get(user_url)"
        ),
        "fix_js": (
            "Validate against an allowlist before making requests:\n\n"
            "// VULNERABLE:\n"
            "const response = await fetch(req.body.url);\n\n"
            "// SAFE:\n"
            "const ALLOWED_HOSTS = ['api.example.com'];\n"
            "const parsed = new URL(req.body.url);\n"
            "if (!ALLOWED_HOSTS.includes(parsed.hostname)) {\n"
            "  return res.status(400).json({ error: 'URL not allowed' });\n"
            "}\n"
            "const response = await fetch(req.body.url);"
        ),
        "patterns": [
            # Python requests with variable URL
            r'requests\.(get|post|put|delete|head|patch)\s*\(\s*(?!["\'https?://])[^)]+\)',
            r'requests\.(get|post|put|delete|head|patch)\s*\(\s*(?:url|user_url|target|endpoint|link|href)',
            # Python httpx with variable
            r'httpx\.(get|post|AsyncClient)\s*\([^)]*(?:url|user_url|target|endpoint)',
            # JS fetch with variable URL
            r'\bfetch\s*\(\s*(?:req\.|request\.|user|url|target|endpoint|link)',
            # axios with variable
            r'axios\.(get|post|put|delete)\s*\(\s*(?:req\.|request\.|user|url|target)',
            # PHP curl with variable
            r'curl_setopt\s*\([^,]+,\s*CURLOPT_URL\s*,\s*\$(?!["\'])',
        ],
    },
    {
        "id": "xxe",
        "vulnerability_type": "XML External Entity (XXE)",
        "owasp_category": "A05:2021 Security Misconfiguration",
        "severity": "HIGH",
        "languages": ["python", "javascript", "typescript", "java", "php"],
        "description": (
            "XML is parsed without disabling external entity processing, allowing attackers to "
            "reference external entities that can read local files, trigger SSRF, or cause "
            "denial of service via billion laughs expansion attacks."
        ),
        "fix_python": (
            "Use defusedxml which disables dangerous features by default:\n\n"
            "# VULNERABLE:\n"
            "from xml.etree import ElementTree as ET\n"
            "tree = ET.fromstring(user_xml)\n\n"
            "# SAFE:\n"
            "import defusedxml.ElementTree as ET\n"
            "tree = ET.fromstring(user_xml)  # external entities disabled by default"
        ),
        "fix_java": (
            "Disable external entities in the DocumentBuilder factory:\n\n"
            "// VULNERABLE:\n"
            "DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();\n\n"
            "// SAFE:\n"
            "DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();\n"
            'factory.setFeature("http://xml.org/sax/features/external-general-entities", false);\n'
            'factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);\n'
            "DocumentBuilder builder = factory.newDocumentBuilder();"
        ),
        "patterns": [
            # Python xml.etree without defusedxml
            r'from\s+xml\.etree.*import|import\s+xml\.etree',
            r'from\s+xml\.(dom|sax|parsers).*import|import\s+xml\.(dom|sax)',
            r'ElementTree\.(parse|fromstring|XML)\s*\(',
            # Java SAXParser/DocumentBuilder without protection
            r'SAXParserFactory\.newInstance\(\)',
            r'DocumentBuilderFactory\.newInstance\(\)',
            r'XMLInputFactory\.newInstance\(\)',
            # PHP simplexml / DOMDocument without options
            r'simplexml_load_string\s*\(\s*\$',
            r'DOMDocument\s*\(\)',
        ],
    },
]


def get_line_number(code: str, match_start: int) -> int:
    """Return 1-based line number for a character position in code."""
    return code[:match_start].count('\n') + 1


def get_fix(rule: Dict, language: str) -> str:
    """Get the most appropriate fix for the given language."""
    lang = language.lower()
    if lang in ("javascript", "typescript"):
        return rule.get("fix_js", rule.get("fix_python", "Use safe alternatives — see OWASP guidance."))
    elif lang == "java":
        return rule.get("fix_java", rule.get("fix_python", "Use safe alternatives — see OWASP guidance."))
    elif lang == "php":
        return rule.get("fix_php", rule.get("fix_python", "Use safe alternatives — see OWASP guidance."))
    else:
        return rule.get("fix_python", rule.get("fix_js", "Use safe alternatives — see OWASP guidance."))


def scan_code(code: str, language: str) -> List[Dict[str, Any]]:
    """
    Run the deterministic rule engine on the given code.
    Returns a list of findings, each with line numbers and fix suggestions.
    """
    findings = []
    seen_lines = set()  # avoid duplicate findings on same line
    lang = language.lower()
    lines = code.split('\n')

    for rule in RULES:
        if lang not in rule["languages"]:
            continue

        for pattern in rule["patterns"]:
            try:
                for match in re.finditer(pattern, code, re.IGNORECASE | re.MULTILINE):
                    line_num = get_line_number(code, match.start())
                    key = (rule["id"], line_num)
                    if key in seen_lines:
                        continue
                    seen_lines.add(key)

                    # Get a few lines of context
                    start_line = max(0, line_num - 2)
                    end_line = min(len(lines), line_num + 1)
                    snippet_lines = lines[start_line:end_line]
                    snippet = '\n'.join(snippet_lines)

                    findings.append({
                        "id": f"{rule['id']}-L{line_num}",
                        "vulnerability_type": rule["vulnerability_type"],
                        "owasp_category": rule["owasp_category"],
                        "severity": rule["severity"],
                        "line_numbers": [line_num],
                        "code_snippet": snippet,
                        "description": rule["description"],
                        "fix": get_fix(rule, language),
                        "source": "deterministic",
                    })
                    break  # one finding per rule per scan is enough for dedup
            except re.error:
                continue

    return findings
