/* ==========================================================================
   QuantumCalc - Comprehensive Math Engine & Application Script
   ========================================================================== */

(function () {
    "use strict";

    // Global App State
    const state = {
        expression: "",
        result: "0",
        isEvaluated: false,
        angleMode: "DEG", // "DEG" or "RAD"
        memory: 0,
        isMemorySet: false,
        theme: localStorage.getItem("qc_theme") || "dark",
        activeMode: "standard", // "standard", "scientific", "converter"
        history: JSON.parse(localStorage.getItem("qc_history") || "[]")
    };

    // DOM Elements
    const elements = {
        app: document.getElementById("app"),
        expressionDisplay: document.getElementById("expressionDisplay"),
        resultDisplay: document.getElementById("resultDisplay"),
        displayCard: document.getElementById("displayCard"),
        memoryBadge: document.getElementById("memoryBadge"),
        angleIndicator: document.getElementById("angleIndicator"),
        angleToggleBtn: document.getElementById("angleToggleBtn"),
        copyToast: document.getElementById("copyToast"),
        themeToggleBtn: document.getElementById("themeToggleBtn"),
        historyToggleBtn: document.getElementById("historyToggleBtn"),
        historyDrawer: document.getElementById("historyDrawer"),
        historyList: document.getElementById("historyList"),
        clearHistoryBtn: document.getElementById("clearHistoryBtn"),
        closeHistoryBtn: document.getElementById("closeHistoryBtn"),
        calcView: document.getElementById("calcView"),
        converterView: document.getElementById("converterView"),
        scientificKeypad: document.getElementById("scientificKeypad"),
        navButtons: document.querySelectorAll(".nav-btn"),
        // Converter Elements
        converterCategories: document.getElementById("converterCategories"),
        convertFromInput: document.getElementById("convertFromInput"),
        convertFromUnit: document.getElementById("convertFromUnit"),
        convertToInput: document.getElementById("convertToInput"),
        convertToUnit: document.getElementById("convertToUnit"),
        swapUnitsBtn: document.getElementById("swapUnitsBtn"),
        formulaPreview: document.getElementById("formulaPreview")
    };

    /* ==========================================================================
       1. Custom Safe Math Tokenizer & Parser (Zero-eval Engine)
       ========================================================================== */

    function sanitizePrecision(num) {
        if (typeof num !== "number" || isNaN(num)) return num;
        if (!isFinite(num)) return "Error";
        // Fix floating point issues like 0.1 + 0.2 = 0.30000000000000004
        return parseFloat(num.toFixed(11));
    }

    function factorial(n) {
        if (n < 0 || !Number.isInteger(n)) return NaN;
        if (n === 0 || n === 1) return 1;
        if (n > 170) return Infinity;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }

    // Tokenizer
    function tokenize(str) {
        const tokens = [];
        let i = 0;
        const len = str.length;

        while (i < len) {
            const ch = str[i];

            if (/\s/.test(ch)) {
                i++;
                continue;
            }

            // Numbers (including decimals)
            if (/[0-9.]/.test(ch)) {
                let numStr = "";
                while (i < len && /[0-9.]/.test(str[i])) {
                    numStr += str[i];
                    i++;
                }
                tokens.push({ type: "NUMBER", value: parseFloat(numStr) });
                continue;
            }

            // Constants
            if (ch === "π" || ch === "pi") {
                tokens.push({ type: "NUMBER", value: Math.PI });
                i += (ch === "pi" ? 2 : 1);
                continue;
            }
            if (ch === "e" && (i + 1 >= len || !/[a-z]/i.test(str[i + 1]))) {
                tokens.push({ type: "NUMBER", value: Math.E });
                i++;
                continue;
            }

            // Word Functions
            const funcMatch = str.slice(i).match(/^(sin|cos|tan|ln|log|sqrt|√)/i);
            if (funcMatch) {
                let fnName = funcMatch[0].toLowerCase();
                if (fnName === "√") fnName = "sqrt";
                tokens.push({ type: "FUNC", value: fnName });
                i += funcMatch[0].length;
                continue;
            }

            // Operators & Parentheses
            if (["+", "-", "×", "*", "÷", "/", "^", "!"].includes(ch)) {
                let op = ch;
                if (op === "*") op = "×";
                if (op === "/") op = "÷";
                tokens.push({ type: "OP", value: op });
                i++;
                continue;
            }

            if (ch === "(" || ch === ")") {
                tokens.push({ type: "PAREN", value: ch });
                i++;
                continue;
            }

            i++; // skip unrecognized
        }

        return tokens;
    }

    // Recursive Descent Expression Parser
    // Grammar rules: Expression -> Term ((+ | -) Term)*
    // Term -> Factor ((* | /) Factor)*
    // Factor -> Base (^ Base)*
    // Base -> Unary / Function / Primary
    function parseTokens(tokens) {
        let current = 0;

        function peek() {
            return tokens[current];
        }

        function consume() {
            return tokens[current++];
        }

        function parseExpression() {
            let left = parseTerm();
            while (peek() && peek().type === "OP" && (peek().value === "+" || peek().value === "-")) {
                const op = consume().value;
                const right = parseTerm();
                left = op === "+" ? left + right : left - right;
            }
            return left;
        }

        function parseTerm() {
            let left = parseFactor();
            while (peek() && peek().type === "OP" && (peek().value === "×" || peek().value === "÷")) {
                const op = consume().value;
                const right = parseFactor();
                if (op === "÷") {
                    if (right === 0) throw new Error("Divide by zero");
                    left = left / right;
                } else {
                    left = left * right;
                }
            }
            return left;
        }

        function parseFactor() {
            let left = parseUnary();
            while (peek() && peek().type === "OP" && peek().value === "^") {
                consume();
                const right = parseUnary();
                left = Math.pow(left, right);
            }
            return left;
        }

        function parseUnary() {
            // Unary minus/plus
            if (peek() && peek().type === "OP" && (peek().value === "-" || peek().value === "+")) {
                const op = consume().value;
                const operand = parseUnary();
                return op === "-" ? -operand : operand;
            }
            return parsePostfix();
        }

        function parsePostfix() {
            let val = parsePrimary();
            while (peek() && peek().type === "OP" && peek().value === "!") {
                consume();
                val = factorial(val);
            }
            return val;
        }

        function parsePrimary() {
            const token = peek();

            if (!token) throw new Error("Unexpected end of expression");

            if (token.type === "NUMBER") {
                consume();
                return token.value;
            }

            if (token.type === "FUNC") {
                const fn = consume().value;
                let arg;
                if (peek() && peek().type === "PAREN" && peek().value === "(") {
                    consume(); // consume (
                    arg = parseExpression();
                    if (peek() && peek().type === "PAREN" && peek().value === ")") {
                        consume(); // consume )
                    }
                } else {
                    arg = parsePrimary();
                }

                if (fn === "sin") {
                    const rad = state.angleMode === "DEG" ? (arg * Math.PI) / 180 : arg;
                    return Math.sin(rad);
                }
                if (fn === "cos") {
                    const rad = state.angleMode === "DEG" ? (arg * Math.PI) / 180 : arg;
                    return Math.cos(rad);
                }
                if (fn === "tan") {
                    const rad = state.angleMode === "DEG" ? (arg * Math.PI) / 180 : arg;
                    return Math.tan(rad);
                }
                if (fn === "ln") {
                    if (arg <= 0) throw new Error("Invalid domain");
                    return Math.log(arg);
                }
                if (fn === "log") {
                    if (arg <= 0) throw new Error("Invalid domain");
                    return Math.log10(arg);
                }
                if (fn === "sqrt") {
                    if (arg < 0) throw new Error("Invalid domain");
                    return Math.sqrt(arg);
                }
            }

            if (token.type === "PAREN" && token.value === "(") {
                consume();
                const expr = parseExpression();
                if (peek() && peek().type === "PAREN" && peek().value === ")") {
                    consume();
                }
                return expr;
            }

            throw new Error("Invalid syntax");
        }

        const result = parseExpression();
        return sanitizePrecision(result);
    }

    function safeEvaluate(str) {
        if (!str || str.trim() === "") return 0;
        try {
            // Replace implicit multiplication e.g., 2π -> 2×π or 5(3) -> 5×(3)
            let formatted = str
                .replace(/([0-9πe])\s*\(/g, "$1×(")
                .replace(/\)\s*([0-9πe])/g, ")×$1")
                .replace(/([0-9])\s*(π|e|sin|cos|tan|ln|log|sqrt|√)/gi, "$1×$2");

            const tokens = tokenize(formatted);
            if (tokens.length === 0) return 0;
            return parseTokens(tokens);
        } catch (err) {
            return "Error";
        }
    }

    /* ==========================================================================
       2. Calculator Logic & UI Operations
       ========================================================================== */

    function updateDisplay() {
        elements.expressionDisplay.textContent = state.expression;
        elements.resultDisplay.textContent = state.result;

        // Angle indicator
        elements.angleIndicator.textContent = state.angleMode;
        elements.angleToggleBtn.textContent = state.angleMode;

        // Memory badge
        if (state.isMemorySet) {
            elements.memoryBadge.style.display = "inline-block";
            elements.memoryBadge.textContent = `M: ${state.memory}`;
        } else {
            elements.memoryBadge.style.display = "none";
        }
    }

    function appendValue(val) {
        if (state.isEvaluated) {
            // If evaluating finished and user clicks number, start fresh
            if (/[0-9.πe]/.test(val)) {
                state.expression = "";
            }
            state.isEvaluated = false;
        }

        const lastChar = state.expression.slice(-1);
        const operators = ["+", "-", "×", "÷", "^"];

        // Prevent double operators
        if (operators.includes(lastChar) && operators.includes(val)) {
            state.expression = state.expression.slice(0, -1) + val;
        } else {
            state.expression += val;
        }

        // Live preview calculation
        const liveResult = safeEvaluate(state.expression);
        if (liveResult !== "Error" && !isNaN(liveResult)) {
            state.result = liveResult.toString();
        }

        updateDisplay();
    }

    function appendFunction(funcName) {
        if (state.isEvaluated) {
            state.expression = "";
            state.isEvaluated = false;
        }
        state.expression += `${funcName}(`;
        updateDisplay();
    }

    function calculateResult() {
        if (!state.expression) return;

        const evaluated = safeEvaluate(state.expression);
        if (evaluated === "Error" || isNaN(evaluated)) {
            state.result = "Error";
        } else {
            state.result = evaluated.toString();
            saveHistory(state.expression, state.result);
            state.isEvaluated = true;
        }
        updateDisplay();
    }

    function clearAll() {
        state.expression = "";
        state.result = "0";
        state.isEvaluated = false;
        updateDisplay();
    }

    function clearEntry() {
        state.expression = "";
        state.result = "0";
        updateDisplay();
    }

    function deleteLast() {
        if (state.expression.length > 0) {
            // Check if deleting a function name like "sin("
            const funcMatch = state.expression.match(/(sin\(|cos\(|tan\(|ln\(|log\(|sqrt\()$/);
            if (funcMatch) {
                state.expression = state.expression.slice(0, -funcMatch[0].length);
            } else {
                state.expression = state.expression.slice(0, -1);
            }

            if (state.expression === "") {
                state.result = "0";
            } else {
                const liveResult = safeEvaluate(state.expression);
                if (liveResult !== "Error" && !isNaN(liveResult)) {
                    state.result = liveResult.toString();
                }
            }
        }
        updateDisplay();
    }

    function toggleSign() {
        if (state.expression) {
            if (state.expression.startsWith("-")) {
                state.expression = state.expression.slice(1);
            } else {
                state.expression = "-" + state.expression;
            }
        } else if (state.result !== "0") {
            state.result = (parseFloat(state.result) * -1).toString();
        }
        updateDisplay();
    }

    function performSquare() {
        const val = parseFloat(state.result) || 0;
        const res = sanitizePrecision(val * val);
        state.expression = `(${val})²`;
        state.result = res.toString();
        state.isEvaluated = true;
        saveHistory(state.expression, state.result);
        updateDisplay();
    }

    function performReciprocal() {
        const val = parseFloat(state.result) || 0;
        if (val === 0) {
            state.result = "Error";
        } else {
            const res = sanitizePrecision(1 / val);
            state.expression = `1/(${val})`;
            state.result = res.toString();
            state.isEvaluated = true;
            saveHistory(state.expression, state.result);
        }
        updateDisplay();
    }

    /* ==========================================================================
       3. Memory Operations
       ========================================================================== */

    function handleMemory(action) {
        const currentVal = parseFloat(state.result) || 0;
        switch (action) {
            case "mc":
                state.memory = 0;
                state.isMemorySet = false;
                break;
            case "mr":
                appendValue(state.memory.toString());
                break;
            case "m-plus":
                state.memory += currentVal;
                state.isMemorySet = true;
                break;
            case "m-minus":
                state.memory -= currentVal;
                state.isMemorySet = true;
                break;
            case "ms":
                state.memory = currentVal;
                state.isMemorySet = true;
                break;
        }
        updateDisplay();
    }

    /* ==========================================================================
       4. Calculation History Side Drawer
       ========================================================================== */

    function saveHistory(expr, res) {
        if (!expr || res === "Error") return;
        state.history.unshift({ expression: expr, result: res, timestamp: new Date().toLocaleTimeString() });
        if (state.history.length > 30) state.history.pop();
        localStorage.setItem("qc_history", JSON.stringify(state.history));
        renderHistory();
    }

    function renderHistory() {
        if (state.history.length === 0) {
            elements.historyList.innerHTML = `
                <div class="history-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <p>No history yet</p>
                    <span>Calculations will appear here</span>
                </div>`;
            return;
        }

        elements.historyList.innerHTML = state.history
            .map(
                (item, idx) => `
                <div class="history-item" data-idx="${idx}">
                    <div class="history-expr">${item.expression} =</div>
                    <div class="history-result">${item.result}</div>
                </div>`
            )
            .join("");
    }

    /* ==========================================================================
       5. Unit Converter Module
       ========================================================================== */

    const unitData = {
        length: {
            units: ["Meter (m)", "Kilometer (km)", "Centimeter (cm)", "Millimeter (mm)", "Mile (mi)", "Yard (yd)", "Foot (ft)", "Inch (in)"],
            rates: { "Meter (m)": 1, "Kilometer (km)": 0.001, "Centimeter (cm)": 100, "Millimeter (mm)": 1000, "Mile (mi)": 0.000621371, "Yard (yd)": 1.09361, "Foot (ft)": 3.28084, "Inch (in)": 39.3701 }
        },
        weight: {
            units: ["Kilogram (kg)", "Gram (g)", "Milligram (mg)", "Pound (lb)", "Ounce (oz)"],
            rates: { "Kilogram (kg)": 1, "Gram (g)": 1000, "Milligram (mg)": 1000000, "Pound (lb)": 2.20462, "Ounce (oz)": 35.274 }
        },
        temperature: {
            units: ["Celsius (°C)", "Fahrenheit (°F)", "Kelvin (K)"]
        },
        area: {
            units: ["Square Meter (m²)", "Square Kilometer (km²)", "Square Foot (ft²)", "Acre (ac)", "Hectare (ha)"],
            rates: { "Square Meter (m²)": 1, "Square Kilometer (km²)": 0.000001, "Square Foot (ft²)": 10.7639, "Acre (ac)": 0.000247105, "Hectare (ha)": 0.0001 }
        },
        speed: {
            units: ["m/s", "km/h", "mph", "Knot"],
            rates: { "m/s": 1, "km/h": 3.6, "mph": 2.23694, "Knot": 1.94384 }
        }
    };

    let activeCat = "length";

    function initConverter() {
        populateUnits();
        calculateConversion();
    }

    function populateUnits() {
        const catObj = unitData[activeCat];
        elements.convertFromUnit.innerHTML = catObj.units.map(u => `<option value="${u}">${u}</option>`).join("");
        elements.convertToUnit.innerHTML = catObj.units.map(u => `<option value="${u}">${u}</option>`).join("");
        if (catObj.units.length > 1) {
            elements.convertToUnit.selectedIndex = 1;
        }
    }

    function calculateConversion() {
        const val = parseFloat(elements.convertFromInput.value);
        if (isNaN(val)) {
            elements.convertToInput.value = "";
            elements.formulaPreview.textContent = "-";
            return;
        }

        const fromU = elements.convertFromUnit.value;
        const toU = elements.convertToUnit.value;
        let convertedVal = 0;

        if (activeCat === "temperature") {
            if (fromU === toU) convertedVal = val;
            else if (fromU === "Celsius (°C)" && toU === "Fahrenheit (°F)") convertedVal = (val * 9) / 5 + 32;
            else if (fromU === "Celsius (°C)" && toU === "Kelvin (K)") convertedVal = val + 273.15;
            else if (fromU === "Fahrenheit (°F)" && toU === "Celsius (°C)") convertedVal = ((val - 32) * 5) / 9;
            else if (fromU === "Fahrenheit (°F)" && toU === "Kelvin (K)") convertedVal = ((val - 32) * 5) / 9 + 273.15;
            else if (fromU === "Kelvin (K)" && toU === "Celsius (°C)") convertedVal = val - 273.15;
            else if (fromU === "Kelvin (K)" && toU === "Fahrenheit (°F)") convertedVal = ((val - 273.15) * 9) / 5 + 32;
        } else {
            const rates = unitData[activeCat].rates;
            const baseValue = val / rates[fromU];
            convertedVal = baseValue * rates[toU];
        }

        const resultFormatted = sanitizePrecision(convertedVal);
        elements.convertToInput.value = resultFormatted;
        elements.formulaPreview.textContent = `1 ${fromU.split(" ")[0]} ≈ ${(1 / (unitData[activeCat].rates ? unitData[activeCat].rates[fromU] : 1) * (unitData[activeCat].rates ? unitData[activeCat].rates[toU] : 1)).toFixed(4)} ${toU.split(" ")[0]}`;
    }

    /* ==========================================================================
       6. Event Handlers & Initializers
       ========================================================================== */

    function bindEvents() {
        // Mode Switcher Buttons
        elements.navButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                elements.navButtons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const mode = btn.getAttribute("data-mode");
                setMode(mode);
            });
        });

        // Theme Toggle
        elements.themeToggleBtn.addEventListener("click", toggleTheme);

        // History Toggle
        elements.historyToggleBtn.addEventListener("click", () => {
            elements.historyDrawer.classList.toggle("open");
        });
        elements.closeHistoryBtn.addEventListener("click", () => {
            elements.historyDrawer.classList.remove("open");
        });
        elements.clearHistoryBtn.addEventListener("click", () => {
            state.history = [];
            localStorage.removeItem("qc_history");
            renderHistory();
        });

        // Recall item from history list
        elements.historyList.addEventListener("click", e => {
            const item = e.target.closest(".history-item");
            if (item) {
                const idx = item.getAttribute("data-idx");
                const historyObj = state.history[idx];
                if (historyObj) {
                    state.expression = historyObj.expression;
                    state.result = historyObj.result;
                    updateDisplay();
                    elements.historyDrawer.classList.remove("open");
                }
            }
        });

        // Angle Mode Toggle
        elements.angleToggleBtn.addEventListener("click", () => {
            state.angleMode = state.angleMode === "DEG" ? "RAD" : "DEG";
            updateDisplay();
        });

        // Display Copy Click
        elements.displayCard.addEventListener("click", () => {
            if (state.result && state.result !== "Error") {
                navigator.clipboard.writeText(state.result).then(() => {
                    elements.copyToast.classList.add("show");
                    setTimeout(() => elements.copyToast.classList.remove("show"), 1500);
                });
            }
        });

        // Keypad Clicks
        document.querySelectorAll(".keypad .btn, .scientific-keypad .sci-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const val = btn.getAttribute("data-val");
                const action = btn.getAttribute("data-action");

                if (val) {
                    appendValue(val);
                } else if (action) {
                    switch (action) {
                        case "equals": calculateResult(); break;
                        case "clear-all": clearAll(); break;
                        case "clear-entry": clearEntry(); break;
                        case "backspace": deleteLast(); break;
                        case "action-toggle-sign": toggleSign(); break;
                        case "action-sq": performSquare(); break;
                        case "action-recip": performReciprocal(); break;
                        case "func": appendFunction(val); break;
                        case "insert": appendValue(val); break;
                        case "op": appendValue(val); break;
                    }
                }
            });
        });

        // Memory Bar Clicks
        document.querySelectorAll(".memory-bar .mem-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const action = btn.getAttribute("data-action");
                handleMemory(action);
            });
        });

        // Converter Controls
        elements.converterCategories.addEventListener("click", e => {
            if (e.target.classList.contains("cat-btn")) {
                document.querySelectorAll(".converter-categories .cat-btn").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                activeCat = e.target.getAttribute("data-cat");
                populateUnits();
                calculateConversion();
            }
        });
        elements.convertFromInput.addEventListener("input", calculateConversion);
        elements.convertFromUnit.addEventListener("change", calculateConversion);
        elements.convertToUnit.addEventListener("change", calculateConversion);
        elements.swapUnitsBtn.addEventListener("click", () => {
            const temp = elements.convertFromUnit.value;
            elements.convertFromUnit.value = elements.convertToUnit.value;
            elements.convertToUnit.value = temp;
            calculateConversion();
        });

        // Keyboard Support
        document.addEventListener("keydown", handleKeyboardInput);
    }

    function handleKeyboardInput(e) {
        if (state.activeMode === "converter") return; // don't hijack inputs in converter view

        const key = e.key;

        if (key >= "0" && key <= "9") appendValue(key);
        else if (key === ".") appendValue(".");
        else if (key === "+") appendValue("+");
        else if (key === "-") appendValue("-");
        else if (key === "*") appendValue("×");
        else if (key === "/") { e.preventDefault(); appendValue("÷"); }
        else if (key === "^") appendValue("^");
        else if (key === "(") appendValue("(");
        else if (key === ")") appendValue(")");
        else if (key === "Enter" || key === "=") { e.preventDefault(); calculateResult(); }
        else if (key === "Backspace") deleteLast();
        else if (key === "Escape") clearAll();

        // Highlight visual button matching pressed key
        highlightKeyButton(key);
    }

    function highlightKeyButton(key) {
        let selector = "";
        if (key >= "0" && key <= "9") selector = `[data-val="${key}"]`;
        else if (key === "+") selector = `[data-val="+"]`;
        else if (key === "-") selector = `[data-val="-"]`;
        else if (key === "*") selector = `[data-val="×"]`;
        else if (key === "/") selector = `[data-val="÷"]`;
        else if (key === "=" || key === "Enter") selector = `[data-action="equals"]`;
        else if (key === "Backspace") selector = `[data-action="backspace"]`;
        else if (key === "Escape") selector = `[data-action="clear-all"]`;

        if (selector) {
            const targetBtn = document.querySelector(`.keypad ${selector}`);
            if (targetBtn) {
                targetBtn.classList.add("pressed");
                setTimeout(() => targetBtn.classList.remove("pressed"), 150);
            }
        }
    }

    function setMode(mode) {
        state.activeMode = mode;
        if (mode === "standard") {
            elements.app.classList.remove("mode-scientific");
            elements.calcView.style.display = "flex";
            elements.converterView.style.display = "none";
            elements.angleToggleBtn.style.display = "none";
        } else if (mode === "scientific") {
            elements.app.classList.add("mode-scientific");
            elements.calcView.style.display = "flex";
            elements.converterView.style.display = "none";
            elements.angleToggleBtn.style.display = "inline-block";
        } else if (mode === "converter") {
            elements.app.classList.remove("mode-scientific");
            elements.calcView.style.display = "none";
            elements.converterView.style.display = "block";
            elements.angleToggleBtn.style.display = "none";
            initConverter();
        }
    }

    function toggleTheme() {
        state.theme = state.theme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", state.theme);
        localStorage.setItem("qc_theme", state.theme);
        updateThemeIcon();
    }

    function updateThemeIcon() {
        const sunIcon = elements.themeToggleBtn.querySelector(".sun-icon");
        const moonIcon = elements.themeToggleBtn.querySelector(".moon-icon");
        if (state.theme === "light") {
            sunIcon.style.display = "none";
            moonIcon.style.display = "block";
        } else {
            sunIcon.style.display = "block";
            moonIcon.style.display = "none";
        }
    }

    // Initialization
    function init() {
        document.documentElement.setAttribute("data-theme", state.theme);
        updateThemeIcon();
        renderHistory();
        updateDisplay();
        bindEvents();
    }

    init();
})();