# Sonics.ai

- [A brief write-up detailing which Gemini 2.5 Flash Image (nano-banana) features were used and how they are central to the application.
](#a-brief-write-up)
- [Architecture Diagram](#architecture-diagram)
- [Run and Deploy](#run-and-deploy)
- <a href="https://youtu.be/gZ8NMynV-vA" target="_blank">Watch Demo Video</a>
- [Sample comics generated](#sample-comics-generated)

---

## A brief write-up
***detailing which Gemini 2.5 Flash Image (nano-banana) features were used and how they are central to the application.***

<br>

The SONICS.ai application is fundamentally built leveraging the advanced multi-modal capabilities of the **Gemini 2.5 Flash Image model (nano banana)** (gemini-2.5-flash-image-preview). This model is central to the app's entire visual creation process.

<br>

Its core feature is the ability to process a combination of multiple input images and a detailed text prompt.

### Intelligent Panel Composition to ensure Character consistencies throughout the Comic

> SONICS.ai leverages this ***unique capability of nano-banana model*** to ensure **CHARACTER CONSISTENICES** ***across all panels of the comic*** by ensuring **intelligent image composition** for panel creation **logic**.
>- The model input is a background & character images (that were validated by user).
>- ***The nano-bana model is then prompted to artfully compose these elements into a cohesive comic panel, following complex instructions regarding character poses, text dialogues.***
>- And it clearly surpasses the expectations.

<br>

### User validations and natural language tweaks

>- Furthermore, the model's capacity for iterative image editing powers the "Update" and "Tweak" functionalities. Users can refine character designs or adjust entire panels using natural language, providing a fluid and intuitive creative workflow.
>- Finally, the most critical feature is its sophisticated in-image text rendering. The application relies on the model to flawlessly render narration and dialogue within speech bubbles and caption boxes directly onto the panel, transforming disparate assets into a finished comic page. These features are not just supplemental; they are the engine driving the creation of every visual element from character design to the final page.

<br>

---

## Architecture Diagram

![Architecture Diagram](architecture/architecture.png)

<br>

---

## Run and deploy

This contains everything you need to run the app locally.

##### Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

<br>

---

## Sample comics generated





