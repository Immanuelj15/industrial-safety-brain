import os
import tempfile
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import re
from typing import List, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_community.document_loaders import PyPDFLoader

# Get API key from environment variable
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Global variables for vector store and LLM
vectorstore = None
embeddings = None
llm = None
indexed_files = []

# Mock documents
MOCK_DOCS = [
    {
        "name": "SOP-coke-oven-v12.txt",
        "content": "Safety rules for gas pressure thresholds in coke oven batteries: The maximum allowable gas pressure is 150 PSI. If pressure exceeds 150 PSI, all personnel must evacuate the primary battery area immediately and activate the emergency vent valves. Tags: Coke Oven, Gas Pressure, Emergency."
    },
    {
        "name": "Shift-Log-Jan-2026.txt",
        "content": "Maintenance notes detailing a faulty pressure valve on 'Pump-102-B'. The valve was inspected on Jan 14th, 2026 and found to be leaking inert gas. Scheduled for complete replacement during the next maintenance window on Jan 22nd. Tags: Maintenance, Pump-102-B, Valve, Leak."
    },
    {
        "name": "OISD-Standard-118.txt",
        "content": "Regulatory requirements for hot work permits near hazardous gases: A Level-1 Hot Work Permit is strictly required for any welding or grinding within 50 meters of active gas lines. Atmospheric testing must be conducted every 30 minutes during the hot work. Tags: OISD, Regulation, Hot Work Permit, Compliance."
    }
]

def extract_entities(text: str) -> List[str]:
    """Simulated Knowledge Graph Entity Extraction"""
    tags = []
    text_lower = text.lower()
    if "pump" in text_lower: tags.append("Equipment: Pump")
    if "valve" in text_lower: tags.append("Equipment: Valve")
    if "pressure" in text_lower: tags.append("Parameter: Pressure")
    if "safety" in text_lower or "regulation" in text_lower or "compliance" in text_lower:
        tags.append("Category: Compliance/Safety")
    if "maintenance" in text_lower or "repair" in text_lower or "faulty" in text_lower:
        tags.append("Category: Maintenance")
    return tags

@asynccontextmanager
async def lifespan(app: FastAPI):
    global vectorstore, embeddings, llm, indexed_files
    
    try:
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    except Exception as e:
        print(f"Error loading embeddings: {e}")
    
    # Get API key from environment variable
    api_key = os.getenv("GROQ_API_KEY")
    
    if api_key:
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            groq_api_key=api_key
        )
        print("Groq LLM initialized successfully!")
    else:
        print("ERROR: GROQ_API_KEY not found in .env file!")
        print("Please create a .env file with: GROQ_API_KEY=your_key_here")
        
    docs = []
    for m in MOCK_DOCS:
        entities = extract_entities(m["content"])
        docs.append(Document(page_content=m["content"], metadata={"source": m["name"], "entities": entities}))
        indexed_files.append({"name": m["name"], "status": "Indexed", "entities": entities})
        
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    splits = text_splitter.split_documents(docs)
    
    if embeddings:
        vectorstore = FAISS.from_documents(splits, embeddings)
        print("Vector database initialized with mock documents.")
        
    yield

app = FastAPI(title="Industrial Knowledge Intelligence Platform", lifespan=lifespan)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    mode: Optional[str] = "chat"

class Citation(BaseModel):
    source: str
    snippet: str
    confidence_score: int
    entities: List[str]

class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not llm:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured.")
    if not vectorstore:
        raise HTTPException(status_code=500, detail="Vector store not initialized.")
        
    results = vectorstore.similarity_search_with_score(request.query, k=3)
    
    context_text = ""
    citations = []
    seen_sources = set()
    
    for doc, score in results:
        confidence = max(0, min(100, int(100 - (score * 40))))
        context_text += f"Source: {doc.metadata.get('source', 'Unknown')}\nContent: {doc.page_content}\n\n"
        
        source = doc.metadata.get("source", "Unknown")
        if source not in seen_sources:
            citations.append(Citation(
                source=source,
                snippet=doc.page_content,
                confidence_score=confidence,
                entities=doc.metadata.get("entities", [])
            ))
            seen_sources.add(source)
            
    system_instruction = "You are an Industrial Operations & Safety AI Assistant."
    if request.mode == "rca":
        system_instruction = "You are an Industrial Root Cause Analysis (RCA) Agent. Analyze the context to identify failure patterns, predictive maintenance recommendations, and root causes."
    elif request.mode == "compliance":
        system_instruction = "You are an Industrial Regulatory Compliance Agent. Map the context against regulatory requirements and identify any compliance gaps or quality deviations."

    prompt = PromptTemplate(
        template="""{system_instruction}
Use the following pieces of retrieved context to answer the question FACTUALLY and STRICTLY.
If you don't know the answer or the context does not contain the information, just say that you don't know.
Do not make up any information.

Context:
{context}

Question: {question}

Answer:""",
        input_variables=["system_instruction", "context", "question"]
    )
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        answer = chain.invoke({
            "system_instruction": system_instruction,
            "context": context_text,
            "question": request.query
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
            
    return ChatResponse(answer=answer, citations=citations)

@app.get("/api/documents")
async def get_documents():
    return {"documents": indexed_files}
    
@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    global vectorstore, indexed_files
    
    try:
        file_ext = os.path.splitext(file.filename)[1].lower()
        docs = []
        
        if file_ext == '.pdf':
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name
                
            loader = PyPDFLoader(tmp_path)
            raw_docs = loader.load()
            
            for d in raw_docs:
                entities = extract_entities(d.page_content)
                d.metadata["source"] = file.filename
                d.metadata["entities"] = entities
                docs.append(d)
                
            os.remove(tmp_path)
            
        else:
            content = await file.read()
            text = content.decode("utf-8", errors="ignore")
            entities = extract_entities(text)
            docs.append(Document(page_content=text, metadata={"source": file.filename, "entities": entities}))
            
        if not docs:
            raise HTTPException(status_code=400, detail="Could not extract text from file.")
            
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        splits = text_splitter.split_documents(docs)
        
        vectorstore.add_documents(splits)
        
        all_entities = list(set([ent for d in docs for ent in d.metadata.get("entities", [])]))
        
        if not any(f["name"] == file.filename for f in indexed_files):
            indexed_files.append({"name": file.filename, "status": "Indexed", "entities": all_entities})
            
        return {"message": f"Successfully indexed {file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)