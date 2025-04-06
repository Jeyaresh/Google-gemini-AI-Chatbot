const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");


       //API Setup
const API_KEY = "AIzaSyA--jpQWgMlj1btRHr-vg_ksVcrDmMbIV4";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let typingIntervel, controller;
const chatHistory = [];
const userData = { message: "", file: {} };

//Function to create message element
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}


//scroll to the bottom of the container
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });



//simulating typing effect for bot responses
const typingEffect = (text, textElement , botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;



    //setting interval to typing each word
    typingIntervel= setInterval(() => {
   if(wordIndex < words.length){
    textElement.textContent += (wordIndex === 0 ? "" : " ")+ words[wordIndex++];
    scrollToBottom();
   }else{ 
    clearInterval(typingIntervel);
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
       
   }
    }, 40)
}

//make the API CALL and generate the bot response

    const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();




    //Add message to the user history
    chatHistory.push({
        role:"user",
        parts: [{ text: userData.message }, ...(userData.file.data ?[{ inline_data: (({ fileName, isImage, ...rest }) =>rest)(userData.file) }] : [])]
    });
    try{


        //send the chat history to the API to get the response
const response = await fetch(API_URL, {
    method: "POST",
    headers:{ "Content-Type": "application/json"},
    body: JSON.stringify( {contents: chatHistory}),
    signal: controller.signal
});

const data = await response.json();
if(!response.ok) throw new Error (data.error.message)


    //process the responce text and display with typing effect
    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    typingEffect(responseText, textElement, botMsgDiv);

    chatHistory.push({ role: "model", parts: [{ text: responseText }] });

       
    }catch(error){
       textElement.style.color = "#d62939";
       textElement.textContent = error.name === "AbortError" ? "Response Generation Stopped." : error.message;
       botMsgDiv.classList.remove("loading");
       document.body.classList.remove("bot-responding");

    }finally {
        userData.file = {};
    }
}


//handle the form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if(!userMessage ||  document.body.classList.contains("bot-responding")) return;

promptInput.value = "";
userData.message = userMessage;
document.body.classList.add("bot-responding", "chats-active");
fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");



    //generate the user message and add it to the chats container
    const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" 
        class="img-attachment" />` : `<p class="file-attachment"><span
        class="materials-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
        `;
    
    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
    
    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout (() => {

        //generate the bot message html  and add it to the chats container after 600ms time
    const botMsgHTML = `<img src="gemini-chatbot-logo.svg" alt="" class="avatar"><p class="message-text">Just a sec... </p>`;
    const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();

    generateResponse(botMsgDiv);

    }, 600);

}


//handle the input changhe (file upload)
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if(!file) return;



    const isImage = file.type.startsWith("image/");
   const reader = new FileReader();
   reader.readAsDataURL(file);

   reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split  (",")[1]
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    //store file data in user obj
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
   }
});


//cancel file upload 
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});



//stop ongoing bot response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    userData.file = {};
    controller?.abort();
    clearInterval(typingIntervel);
    chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
    document.body.classList.remove("bot-responding");
    
});


//DeleteChats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    document.body.classList.remove("bot-responding", "chats-active");
});



//handle suggestions click
document.querySelectorAll(".suggestions-item").forEach(item => {
     item.addEventListener("click", () => {
          promptInput.value = item.querySelector(".text").textContent;
          promptForm.dispatchEvent(new Event("submit"));
     });
});


// show/hide controls for mobile on prompt input focus
document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains
        ('hidecontrols') && (target.id === "add-file-btn" || target.id === "stop-response-btn"));
        wrapper.classList.toggle("hide-controls", shouldHide);
})





//Toggling themes

themeToggle.addEventListener("click", () => {
   const isLightTheme = document.body.classList.toggle("light-theme");
   localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
   themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
});


//set initial theme from local storage
   const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
   document.body.classList.toggle("light-theme", isLightTheme);
   themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";


promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());