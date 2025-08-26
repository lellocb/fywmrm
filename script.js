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

// This URL is set automatically by Coolify during deployment.
const YOUR_BACKEND_URL = "@@YOUR_BACKEND_URL"; 
const API_PROXY_ENDPOINT = `${YOUR_BACKEND_URL}/api/predictions`;

// NO MORE MODEL_VERSION NEEDED!

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

async function generateImage(uploadedImageBase64) {
    setLoadingState(true);
    
    // This payload is correct.
    const inputPayload = { ...HARDCODED_SETTINGS, input_image: uploadedImageBase64 };
    
    try {
        const initialResponse = await fetch(API_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // --- THIS IS THE CORRECTED PART ---
            // The body should be an object with an "input" key.
            // We are no longer sending a "version" key.
            body: JSON.stringify({ input: inputPayload }),
        });

        if (!initialResponse.ok) {
            const error = await initialResponse.json();
            // Try to get a more specific error message from Replicate
            throw new Error(error.detail || "An error occurred while starting the prediction.");
        }

        let prediction = await initialResponse.json();
        
        // Polling logic is correct and stays the same
        while (prediction.status !== "succeeded" && prediction.status !== "failed") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const pollResponse = await fetch(`${API_PROXY_ENDPOINT}/${prediction.id}`);
            prediction = await pollResponse.json();
        }
        
        if (prediction.status === "failed") {
            throw new Error(prediction.error);
        }
        
        displayResult(prediction.output[0]);

    } catch (error) {
        console.error("Full error:", error); // Log the full error for debugging
        displayError(error.message);
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    chooseImageBtn.disabled = isLoading;
    chooseImageBtn.textContent = isLoading ? "Processing..." : "Choose Another Image";
    resultContainer.innerHTML = isLoading ? '<div class="loader"></div>' : '<div class="info-text">Your transformed image will appear here.</div>';
    downloadLink.style.display = "none";
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

