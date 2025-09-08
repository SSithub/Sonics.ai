
# A brief write-up (max 200 words) detailing which Gemini 2.5 Flash Image (nano-banana) features were used and how they are central to the application.

<br>

>- The SONICS.ai application is fundamentally built upon the advanced multi-modal capabilities of the Gemini 2.5 Flash Image model (gemini-2.5-flash-image-preview). This model is central to the app's entire visual creation process.
>- Its core feature is the ability to process a combination of multiple input images and a detailed text prompt. SONICS.ai leverages this for intelligent image composition, where it provides the model with a background, character portraits, and a script. The model then artfully composites these elements into a cohesive comic panel, following complex instructions.
>- Furthermore, the model's capacity for iterative image editing powers the "Update" and "Tweak" functionalities. Users can refine character designs or adjust entire panels using natural language, providing a fluid and intuitive creative workflow.
>- Finally, the most critical feature is its sophisticated in-image text rendering. The application relies on the model to flawlessly render narration and dialogue within speech bubbles and caption boxes directly onto the panel, transforming disparate assets into a finished comic page. These features are not just supplemental; they are the engine driving the creation of every visual element from character design to the final page.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>


# Run and deploy Sonics.ai

This contains everything you need to run the app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
