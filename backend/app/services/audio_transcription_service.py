import httpx
import tempfile
import os
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.logging import logger


class AudioTranscriptionService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.twilio_account_sid = settings.TWILIO_ACCOUNT_SID
        self.twilio_auth_token = settings.TWILIO_AUTH_TOKEN

    async def download_audio(self, media_url: str) -> bytes:
        """Download audio from Twilio media URL with authentication."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                media_url,
                auth=(self.twilio_account_sid, self.twilio_auth_token),
                follow_redirects=True
            )
            response.raise_for_status()
            return response.content

    async def transcribe_audio(self, audio_data: bytes, content_type: str = "audio/ogg") -> str:
        """Transcribe audio using OpenAI Whisper API."""
        extension_map = {
            "audio/ogg": ".ogg",
            "audio/ogg; codecs=opus": ".ogg",
            "audio/mpeg": ".mp3",
            "audio/mp4": ".m4a",
            "audio/wav": ".wav",
            "audio/amr": ".amr",
        }

        ext = extension_map.get(content_type, ".ogg")

        tmp_file = None
        try:
            tmp_file = tempfile.NamedTemporaryFile(
                suffix=ext, delete=False
            )
            tmp_file.write(audio_data)
            tmp_file.close()

            with open(tmp_file.name, "rb") as audio_file:
                transcript = await self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="pt",
                    response_format="text"
                )

            logger.info(f"Audio transcribed successfully: {transcript[:100]}...")
            return transcript.strip()

        except Exception as e:
            logger.error(f"Error transcribing audio: {str(e)}")
            raise
        finally:
            if tmp_file and os.path.exists(tmp_file.name):
                os.unlink(tmp_file.name)

    async def process_audio_message(self, media_url: str, content_type: str = "audio/ogg") -> str:
        """Download and transcribe an audio message."""
        logger.info(f"Processing audio message from: {media_url}")

        audio_data = await self.download_audio(media_url)
        logger.info(f"Downloaded audio: {len(audio_data)} bytes")

        transcription = await self.transcribe_audio(audio_data, content_type)
        logger.info(f"Transcription result: {transcription}")

        return transcription
