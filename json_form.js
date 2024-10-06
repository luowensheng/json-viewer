

class JSONFormViewer extends HTMLElement {
    constructor() {
        super();

        // Create a shadow root
        this.shadow = this.attachShadow({ mode: 'open' });

        // Set the input value based on the 'value' attribute

        // Append wrapper to shadow DOM

        // Add styles to shadow DOM
        this.styles = document.createElement('style');
        this.itemwidth = this.getAttribute('width') || '';

        this.itemvalue = this.getAttribute('value') || '';
        this.itemtitle = this.getAttribute('title') || '';
        this.itemcontext = this.getAttribute('context') || '';


        this.#update()
    }

    #addevents(){
        document.querySelector(".submit")?.addEventListener("click", ()=>{

            this.dispatchEvent(new CustomEvent('submit', {
                // detail: { value: event.target.value }
              }));
        })
    }

    #update() {

        if (!this.itemvalue){
            // console.log(this.itemvalue)
            return;
        }
        this.shadow.innerHTML = ""
        displayForm(JSON.parse(this.itemvalue), this.itemtitle, this.itemcontext, this.shadow)
        this.#addevents()
        this.styles.textContent = getJSONViewerStyles(this.itemwidth);
        this.shadow.appendChild(this.styles);
    }

    on(event, f){
        if (!this.shadowRoot){
            return;
        }
        
        this.shadowRoot.querySelector(`button.${event}`)?.addEventListener("click", f)
    }

    toJSON(){
       const firstItem = this.shadowRoot.querySelector("[typeof]")
       return elementToJSON(firstItem)
    }

    // Observe 'value' attribute changes
    static get observedAttributes() {
        return ['value', "title", "width", "context"];
    }

    // Handle changes to the 'value' attribute
    attributeChangedCallback(name, oldValue, newValue) {

        // console.log({name, oldValue, newValue})
        if (!this.shadowRoot) {
            return
        }

        switch (name) {
            case "value":
                this.itemvalue = newValue;
                this.#update()
                break;
            
            case "title":
                this.itemtitle = newValue;
                const titleItem = this.shadowRoot.querySelector("[title-val]")

                if (titleItem){
                    titleItem.textContent = newValue
                }
                break;
            case "width":
                this.itemwidth = newValue;
                this.#update()
                break;
            
            case "context":
                this.itemcontext = newValue
                const form = this.shadowRoot.querySelector(".form")
                form.querySelector(".menu")?.remove()
                addActionButtons(form, this.itemcontext)
                this.#addevents()

                break;

            default:
                break;
        }
    }
}

const FORMATTER = {
    "checkbox": function(element) {
        return element.hasAttribute("checked")
    },
    "number": function(element) {
        return parseInt(element.value)
    },
    "text": function(element) {
        return element.value || null
    },
}

/**
* @param {HTMLElement} element
*/
function elementToJSON(element) {

    switch (element.getAttribute("typeof")) {
        case "is-input":
            console.log({type: element.type, value: element.value, checkbox: element.getAttribute("checked")})
            return FORMATTER[element.type](element)

        case "is-array":
            const arr = [];
            element = element.querySelector(".collapsible-content");

            for (let child of element.children){    

                child = child.children[0];
                let value;

                if (child.hasAttribute("typeof")){
                    key = child.getAttribute("key")
                    value = elementToJSON(child)
                } else {
                    const input = child.querySelector("[name]");
                    if (!input){
                        continue;
                    }
                    key = input.getAttribute("name");
                    value = input.value;
                }
                arr.push(value)
            }

            return arr;
        
        case "is-object":
            const obj = {};
            for (const child of element.children){

                let key, value;

                if (child.hasAttribute("typeof")){
                    key = child.getAttribute("key")
                    value = elementToJSON(child)
                } else {
                    const input = child.querySelector("[name]")
                    if (!input){
                        continue;
                    }
                    key = input.getAttribute("name");
                    value = elementToJSON(input);
                }

                obj[key] = value
            }
            return obj;
        default:
            console.log({failed: element})
            break;
    }

}

// Register the custom element
customElements.define('json-form', JSONFormViewer);


function objectToElement(data, key, text) {

    let element;
    switch (typeof data) {
        case "boolean":
            const toggle = document.createElement("input")
            toggle.classList.add("boolean")
            toggle.name = key
            toggle.type = "checkbox"
            if (data === true) {
                toggle.setAttribute("checked", "")
            }
            element = toggle
            break;
        case "number":
        case "bigint":
            const number = document.createElement("input")
            number.type = "number"
            number.name = key
            number.classList.add("number")
            number.value = data
            element = number
            break;
        case "undefined":
        case "string":
            const string = document.createElement("input")
            string.value = data
            string.name = key
            string.type = "text"
            string.classList.add("string")
            element = string
            break;
    }

    if (data == null) {
        const string = document.createElement("input")
        string.value = data
        string.type = "text"
        element = string
    }


    if (element) {

        element.setAttribute("content", "")
        element.setAttribute("typeof", "is-input", "")

        if (key) {
            // element.setAttribute("key", key)

            const wrapper = document.createElement("div");
            wrapper.classList.add("input-wrapper")
            const label = document.createElement("label")

            if (element.type == "checkbox") {
                wrapper.classList.add("toggle-wrapper")
                wrapper.appendChild(element);
                wrapper.appendChild(label);
                label.textContent = text

            } else {
                label.textContent = `${text}:`
                wrapper.appendChild(label);
                wrapper.appendChild(element);
            }

            return wrapper;
        }

        return element;
    }


    if (typeof data != "object") {
        throw new Error(`Invalid type: ${typeof data}`);
    }

    if (data instanceof Array) {

        console.log("The object is a list (array).", data);
        const arr = document.createElement("fieldset");
        arr.setAttribute("typeof", "is-array")

        if (key) {
            arr.setAttribute("key", key);
            const keyElement = document.createElement("legend")
            keyElement.textContent = text
            arr.appendChild(keyElement)

            keyElement.addEventListener('click', () => {
                keyElement.classList.toggle('collapsed');
                arr.querySelector(".collapsible-content").classList.toggle('collapsed');
            });
        } else {
            // arr = document.createElement("div");
            // arr.classList.add("field")
        }
        arr.classList.add("array")

        // const toggle = document.createElement("div")
        // toggle.textContent = "324123412 m312,34123 "
        // arr.appendChild(toggle)

        const itemsWrapper = document.createElement("div")
        itemsWrapper.classList.add("collapsible-content")

        for (const item of data) {
            const child = objectToElement(item)
            const div = document.createElement("div")
            div.classList.add("array-element-wrapper")
            const deleteBtn = document.createElement("button")
            deleteBtn.classList.add("delete")

            deleteBtn.textContent = "X"

            deleteBtn.addEventListener("click", () => {
                div.remove()
            })
            div.appendChild(child)
            div.appendChild(deleteBtn)
            child.classList.add("array-element")
            itemsWrapper.appendChild(div)

           
        }

        arr.appendChild(itemsWrapper)

        const button = document.createElement("button")
        // button.textContent = `Add ${text}`
        button.textContent = `Add`

        const temp = itemsWrapper.children[itemsWrapper.children.length - 1].cloneNode(true)

        arr.appendChild(button)

        temp.querySelectorAll("[content]").forEach(item => {
            item.value = ""
        })

        button.addEventListener("click", () => {
            // arr.innerHTML += template
            const newItem = temp.cloneNode(true)
            itemsWrapper.appendChild(newItem)
            newItem.querySelector(".delete").addEventListener("click", () => {
                newItem.remove()
            })
        })

        return arr
    }

    const objectElement = document.createElement("fieldset")
    if (key) {
        objectElement.setAttribute("key", key);
        const keyElement = document.createElement("legend")
        keyElement.textContent = text
        objectElement.appendChild(keyElement)
    }

    objectElement.classList.add("object")
    objectElement.setAttribute("typeof", "is-object")


    for (const itemKey of Object.keys(data)) {

        const value = data[itemKey]

        const el = objectToElement(value, itemKey, createName(itemKey))
        el.classList.add("object-value")
        objectElement.appendChild(el)
    }

    return objectElement
}

function isUpperCase(char) {
    return char === char.toUpperCase();
}

function createName(key) {
    /**
    * @type {string} 
    */
    const name = key[0].toUpperCase() + key.slice(1)
    const newName = []
    for (const char of name) {
        if (isUpperCase(char) && newName.length > 0) {
            newName.push(" ")
        }
        newName.push(char)
    }
    return newName.join("").replace("Is ", "")
}

function displayForm(data, title, context="", host = document.body) {

    const form = objectToElement(data)
    form.classList.add("form")

    const titleElement = document.createElement("h1")
    titleElement.textContent = title
    titleElement.classList.add("title")
    titleElement.setAttribute("title-val", "")
    form.prepend(titleElement)

    addActionButtons(form, context)

    host.appendChild(form)
}


function addActionButtons(form, context) {

    const menu = document.createElement("div")
    menu.classList.add("menu")

    switch (context) {
        case "api":
            {
                const submitButton = document.createElement("button")

                submitButton.classList.add("submit")
                submitButton.textContent = "Submit"

                menu.appendChild(submitButton)
            }
            break;

        case "api-output":
                return;

        case "file":
            {
                const submitButton = document.createElement("button")
                const deleteButton = document.createElement("button")

                submitButton.classList.add("save")
                submitButton.textContent = "Save"

                deleteButton.textContent = "Delete"
                deleteButton.classList.add("delete")


                menu.appendChild(submitButton)
                menu.appendChild(deleteButton)
            }

            break;
        default:
            break;
    }

    form.appendChild(menu)
}



function getJSONViewerStyles(width) {
    if (!width){
        width = "500px"
    }
    return `

.form {

    --default-gray: #ddd;
    font-family: Arial, sans-serif;

    display: flex;
    flex-direction: column;

    width: ${width} !important;


    padding: 10px;
    border-radius: 8px;
    border: none;

    &>* {
        padding: 10px;
        display: flex;
        flex-direction: row;
        gap: 5px;

        min-width: fit-content;

    }

    h1 {
        color: #2c3e50;
        /* border-bottom: 2px solid #3498db; */
        border-bottom: 2px solid black;

        padding-bottom: 10px;
        text-align: center;
        width: 100%;
    }

    input,
    textarea {
        padding: 10px;
        border: 1px solid #ddd;
    }


    input[type="text"],
    input[type="number"],
    textarea {
        width: 100%;
        padding: 8px;
        margin-bottom: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    input[type="checkbox"] {
        margin-right: 5px;
    }

    button {
        background-color: rgb(42, 42, 42);

        color: white;
        padding: 10px 15px;
        border: none;
        border-radius: 4px;
        cursor: pointer;

        width: fit-content;
    }
    button:hover {
        background-color: black;

    }

    .array-element-wrapper{
        display: flex;
        flex-direction: row;
        gap: 10px;

        align-items: center;

        width: 100%;
    }

    .delete {
        color: white;
        background-color: #e74c3c;;
        height: fit-content;
        width: fit-content;
    }
    .delete:hover {
        background-color: red;
    }

    .submit {
        background-color: green;
    }



    textarea {
        resize: vertical;
        min-height: 50px;
        max-height: 200px;
        overflow: scroll;
    }

    fieldset {
        border: 1px solid var(--default-gray);
        padding: 15px;
        margin-bottom: 20px;
        border-radius: 5px;

    }

    legend {
        font-weight: bold;
        color: #2c3e50;
    }

    label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
    }

    * {
        box-sizing: border-box;
    }

}


.input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-left: 20px;
}

.title {
    font-weight: bolder;
    font-size: larger;
    text-align: center;
}

.object-key {
    color: gray;

}

.array,
.object {
    display: flex;
    flex-direction: column;
    margin-left: 20px;
    margin-right: 20px;


    margin-top: 10px;

    padding: 10px;

    width: 100%;
    gap: 10px;

}


.boolean {
    border: 1px solid red;
    background-color: yellowgreen;

}

.wrapper {
    display: flex;
    flex-direction: row;
    gap: 5px;
    padding: 10px;


}

.collapsible-content {
    display: flex;
    flex-direction: column;
    gap: 5px;
    overflow: hidden;
    transition: max-height 0.3s ease-out;

}


.collapsible-content.collapsed {
    max-height: 0;
   
}

.hide {
    display: none !important;
}

.number {}

.string {}

.array-element {
   width: 100%;
   padding: 10px;
   min-width: fit-content;
   border: none;
}

.object-value {
    border: none;
}

.object {
    border: none !important;
}


.toggle-wrapper {
    display: flex;
    flex-direction: row;

    gap: 5px;

    align-items: center;
}
    `;
}