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

app = FastAPI(title="LexIndia AI Multi-Agent Backend")

# Allow requests from your Vercel frontend. 
# Using "*" during setup is fine, but for production security, change this to your Vercel domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini (We use 2.5-flash for speed and complex reasoning)
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("WARNING: GEMINI_API_KEY not found in environment variables")

model = genai.GenerativeModel('gemini-2.5-flash') 

class ExplainRequest(BaseModel):
    query: str

def extract_text(file_bytes: bytes, filename: str) -> str:
    """Universal text extractor mapping to Agent 1 (OCR)"""
    ext = filename.split('.')[-1].lower()
    
    try:
        if ext in ['png', 'jpg', 'jpeg']:
            image = Image.open(io.BytesIO(file_bytes))
            # pytesseract relies on the system-level installation handled in the Dockerfile
            return pytesseract.image_to_string(image)
            
        elif ext == 'pdf':
            text = ""
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            return text
            
        elif ext in ['doc', 'docx']:
            doc = docx.Document(io.BytesIO(file_bytes))
            return "\n".join([para.text for para in doc.paragraphs])
            
    except Exception as e:
        print(f"Extraction error: {e}")
        return ""
        
    return ""

@app.get("/")
def health_check():
    return {"status": "Backend Multi-Agent System is Online."}

@app.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    if not os.getenv("GEMINI_API_KEY"):
         raise HTTPException(status_code=500, detail="Gemini API Key is not configured on the server.")

    # 1. OCR / Text Parsing Phase
    file_bytes = await file.read()
    extracted_text = extract_text(file_bytes, file.filename)
    
    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from document. Ensure it is a clear image, PDF, or Word document.")

    try:
        # Agent 2: Classification
        class_prompt = f"You are an expert Indian Lawyer. Classify this legal document strictly into a category (e.g., GST Notice, Income Tax Notice, FIR, Subpoena, Contract). Be brief. Document Text: {extracted_text[:4000]}"
        classification = model.generate_content(class_prompt).text

        # Agent 3: Data Extraction
        extract_prompt = f"Extract key metadata from this {classification} document. Include Dates, Deadlines, Parties involved, Financial amounts, and Sections/Acts cited. Mark 'Not Found' if missing. Return as a clean list. Document Text: {extracted_text[:4000]}"
        extraction = model.generate_content(extract_prompt).text

        # Agent 4: Legal Analysis
        analysis_prompt = f"Act as Senior Legal Counsel. Provide a strict legal analysis based on this extracted data: {extraction}. What are the immediate legal implications for the recipient under Indian Law? Document type: {classification}."
        analysis = model.generate_content(analysis_prompt).text

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
        simplified = model.generate_content(simple_prompt).text

        return {
            "classification": classification.strip(),
            "extraction": extraction.strip(),
            "legal_analysis": analysis.strip(),
            "simplified": simplified.strip()
        }
    except Exception as e:
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
        response = model.generate_content(prompt)
        return {"explanation": response.text}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))