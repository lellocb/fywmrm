// --- ❗ ACTION REQUIRED: CONFIGURE YOUR STYLE HERE ❗ ---
const HARDCODED_SETTINGS = {
    // 1. Find a LoRA file online (e.g., on huggingface.co) and paste its URL here.
    lora_weights: "https://huggingface.co/myapps/kontext-fywmrem/resolve/main/kontext_fywmrm_v2_000001500.safetensors",
    
    // 2. Add the trigger words for the LoRA. Check the LoRA's page for these.
    prompt: "remove the watermark",

    // 3. (Optional) Fine-tune the parameters.
    lora_strength: 1.0,
    guidance: 2.5,
    num_inference_steps: 30,
    aspect_ratio: "match_input_image",
};
// ----------------------------------------------------

// The backend URL is now set directly in the code.
const YOUR_BACKEND_URL = "https://fywmrm.ideamint.space";
const API_PROXY_ENDPOINT = `${YOUR_BACKEND_URL}/api/predictions`;

const chooseImageBtn = document.getElementById("choose-image-btn");
const imageUpload = document.getElementById("image-upload");
const imagePreview = document.getElementById("image-preview");
const imagePreviewContainer = document.getElementById("image-preview-container");
const resultContainer = document.getElementById("result-container");
const downloadLink = document.getElementById("download-link");

chooseImageBtn.addEventListener("click", () => imageUpload.click());

imageUpload.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        imagePreview.src = reader.result;
        imagePreview.style.display = "block";
        imagePreviewContainer.querySelector('span').style.display = 'none';
        generateImage(reader.result);
    };
    reader.readAsDataURL(file);
});

// --- REVISED UI LOGIC ---
function startLoadingUI() {
    chooseImageBtn.disabled = true;
    chooseImageBtn.textContent = "Processing...";
    resultContainer.innerHTML = '<div class="loader"></div>';
    downloadLink.style.display = "none";
}

function stopLoadingUI() {
    chooseImageBtn.disabled = false;
    chooseImageBtn.textContent = "Choose Another Image";
}
// -----------------------

async function generateImage(uploadedImageBase64) {
    startLoadingUI(); // <-- Use the new function to set the loading state

    const inputPayload = { ...HARDCODED_SETTINGS, input_image: uploadedImageBase64 };

    try {
        const initialResponse = await fetch(API_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: inputPayload }),
        });

        if (!initialResponse.ok) {
            const error = await initialResponse.json();
            throw new Error(error.detail || "An error occurred while starting the prediction.");
        }

        let prediction = await initialResponse.json();
        
        while (prediction.status !== "succeeded" && prediction.status !== "failed") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const pollResponse = await fetch(`${API_PROXY_ENDPOINT}/${prediction.id}`);
            prediction = await pollResponse.json();
        }
        
        if (prediction.status === "failed") {
            throw new Error(prediction.error);
        }
        
        displayResult(prediction.output[0]); // This will now work and not be overwritten

    } catch (error) {
        console.error("Full error:", error);
        displayError(error.message);
    } finally {
        stopLoadingUI(); // <-- Use the new function to just reset the button
    }
}

function displayResult(imageUrl) {
    resultContainer.innerHTML = `<img src="${imageUrl}" alt="Generated result">`;
    setupDownload(imageUrl);
    downloadLink.style.display = "inline-block";
}

function displayError(message) {
    resultContainer.innerHTML = `<div class="info-text" style="color: red;">Error: ${message}</div>`;
}

async function setupDownload(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        downloadLink.href = URL.createObjectURL(blob);
    } catch (error) {
        downloadLink.href = imageUrl;
        downloadLink.target = "_blank";
    }
}
