"""Google Gemini LLM Client"""
import os
import logging
from typing import Optional
import google.generativeai as genai

logger = logging.getLogger(__name__)

# Initialize Gemini with API key from environment
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    logger.warning("GEMINI_API_KEY not found in environment variables")
else:
    genai.configure(api_key=API_KEY)

def generate(prompt: str, max_tokens: int = 2000) -> str:
    """
    Generate text using Google Gemini 2.5 Flash model.
    
    Args:
        prompt: The prompt to send to Gemini
        max_tokens: Maximum tokens in response (default 2000)
    
    Returns:
        Generated text response
    
    Raises:
        ValueError: If GEMINI_API_KEY is not configured
        Exception: If API call fails
    """
    if not API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=0.7,
            )
        )
        
        return response.text
    except Exception as e:
        logger.error(f"Gemini API error: {str(e)}")
        raise

def generate_stream(prompt: str, max_tokens: int = 2000):
    """
    Generate text using Gemini with streaming.
    
    Args:
        prompt: The prompt to send to Gemini
        max_tokens: Maximum tokens in response
    
    Yields:
        Text chunks from Gemini
    
    Raises:
        ValueError: If GEMINI_API_KEY is not configured
        Exception: If API call fails
    """
    if not API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=0.7,
            ),
            stream=True
        )
        
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        logger.error(f"Gemini streaming API error: {str(e)}")
        raise

def check_connection() -> bool:
    """
    Check if Gemini API is accessible.
    
    Returns:
        True if API is working, False otherwise
    """
    if not API_KEY:
        return False
    
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        model.generate_content("ping", generation_config=genai.types.GenerationConfig(max_output_tokens=10))
        return True
    except Exception as e:
        logger.error(f"Gemini connection check failed: {str(e)}")
        return False
