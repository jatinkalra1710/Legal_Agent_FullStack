from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import pytesseract
from PIL import Image
import pdfplumber
import docx
import io
import os
import asyncio
import logging

# Set up professional logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("LexIndia-Backend")

app = FastAPI(title="LexIndia AI Multi-Agent Backend", version="2.0")

# Allow requests from your Vercel frontend. 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update to your exact Vercel URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    logger.info("Gemini API Key configured successfully.")
else:
    logger.error("CRITICAL: GEMINI_API_KEY not found in environment variables.")

# Using gemini-2.5-flash for the best balance of speed and complex reasoning
model = genai.GenerativeModel('gemini-2.5-flash') 

class ExplainRequest(BaseModel):
    query: str

def extract_text_sync(file_bytes: bytes, filename: str) -> str:
    """Universal text extractor (Runs synchronously, will be wrapped in async)"""
    ext = filename.split('.')[-1].lower()
    
    try:
        if ext in ['png', 'jpg', 'jpeg']:
            logger.info(f"Running OCR on image: {filename}")
            image = Image.open(io.BytesIO(file_bytes))
            return pytesseract.image_to_string(image)
            
        elif ext == 'pdf':
            logger.info(f"Extracting text from PDF: {filename}")
            text = ""
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            return text
            
        elif ext in ['doc', 'docx']:
            logger.info(f"Extracting text from Word document: {filename}")
            doc = docx.Document(io.BytesIO(file_bytes))
            return "\n".join([para.text for para in doc.paragraphs])
            
        else:
            logger.warning(f"Unsupported file extension: {ext}")
            return ""
            
    except Exception as e:
        logger.error(f"Extraction error for {filename}: {str(e)}", exc_info=True)
        return ""

@app.get("/")
def health_check():
    return {"status": "LexIndia Backend Multi-Agent System is Online and Async-ready."}

@app.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    if not os.getenv("GEMINI_API_KEY"):
         raise HTTPException(status_code=500, detail="Gemini API Key is not configured on the server.")

    # Read file asynchronously
    file_bytes = await file.read()
    
    # 1. OCR / Text Parsing Phase (Offloaded to a background thread to prevent blocking)
    extracted_text = await asyncio.to_thread(extract_text_sync, file_bytes, file.filename)
    
    if not extracted_text or not extracted_text.strip():
        raise HTTPException(
            status_code=400, 
            detail="Could not extract text from document. Ensure it is a clear image, PDF, or Word document."
        )

    try:
        logger.info(f"Starting Multi-Agent analysis for: {file.filename}")
        
        # Agent 2: Classification (Using async AI call)
        class_prompt = f"You are an expert Indian Lawyer. Classify this legal document strictly into a category (e.g., GST Notice, Income Tax Notice, FIR, Subpoena, Contract, Property Deed). Be brief and precise. Document Text: {extracted_text[:4000]}"
        classification_response = await model.generate_content_async(class_prompt)
        classification = classification_response.text

        # Agent 3: Data Extraction (Using async AI call)
        extract_prompt = f"Extract key metadata from this {classification} document. Include Dates, Deadlines, Parties involved, Financial amounts, and Sections/Acts cited. Mark 'Not Found' if missing. Do not invent data. Return as a clean list. Document Text: {extracted_text[:4000]}"
        extraction_response = await model.generate_content_async(extract_prompt)
        extraction = extraction_response.text

        # Agent 4: Legal Analysis (Using async AI call)
        analysis_prompt = f"Act as Senior Legal Counsel. Provide a strict legal analysis based on this extracted data: {extraction}. What are the immediate legal implications for the recipient under Indian Law? Do not hallucinate laws. Document type: {classification}."
        analysis_response = await model.generate_content_async(analysis_prompt)
        analysis = analysis_response.text

        # Agent 5: Layman Simplification & Action Plan (Final Output)
        simple_prompt = f"""Based on this deep legal analysis: {analysis}
        Explain this situation to a common Indian citizen who has no legal background. 
        Use clear, empathetic, jargon-free English. 
        Format strictly into these sections:
        1. What is this document? (1 sentence)
        2. Why did you receive it?
        3. Red Flags & Urgency (What happens if you ignore it?)
        4. Step-by-Step Next Actions (What to do today, what to do this week)
        5. Should you hire a lawyer? (Yes/No and why)"""
        simplified_response = await model.generate_content_async(simple_prompt)
        simplified = simplified_response.text

        logger.info(f"Successfully completed analysis for: {file.filename}")

        return {
            "classification": classification.strip(),
            "extraction": extraction.strip(),
            "legal_analysis": analysis.strip(),
            "simplified": simplified.strip()
        }
    except Exception as e:
        logger.error(f"AI Processing Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI Processing Error: {str(e)}")

@app.post("/explain")
async def explain_law(request: ExplainRequest):
    if not os.getenv("GEMINI_API_KEY"):
         raise HTTPException(status_code=500, detail="Gemini API Key is not configured on the server.")

    system_instruction = """You are a highly patient legal educator specializing in Indian Law (IPC, CrPC, BNSS, BNS, BSA, Constitution, Corporate, etc). 
    Explain the requested Indian law, section, or act in extremely simple layman terms. 
    Do NOT use complex legal jargon. 
    Structure your response as follows:
    1. The Simple Meaning: (What does it mean in 1-2 sentences)
    2. Real-life Example: (Give a relatable everyday scenario in India)
    3. Key Points to Remember: (Bullet points)
    4. Punishment/Consequence (If applicable)"""
    
    prompt = f"{system_instruction}\n\nQuery: {request.query}"
    
    try:
        logger.info(f"Processing explain request for query: {request.query[:50]}...")
        # Use async AI generation here as well
        response = await model.generate_content_async(prompt)
        return {"explanation": response.text}
    except Exception as e:
        logger.error(f"Explanation Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate explanation. Please try again.")
