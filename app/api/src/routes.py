import logging
from fastapi import APIRouter, status, UploadFile, File, Depends, HTTPException
from schemas import Prediction
from config import get_pipeline
from utils import validate_audio_file, InvalidFileFormat


logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health-check")
async def health_check():
    return status.HTTP_200_OK


@router.post("/process", response_model=Prediction)
async def analyze_for_deepfakes(file: UploadFile = File(description="audio file"), pipeline=Depends(get_pipeline)):
    try:
        audio_name: str = file.filename 
        validate_audio_file(audio_name=audio_name)

        logger.info(f"Обработка файла: {audio_name}")

        audio_content: bytes = await file.read()
        prediction: Prediction = await pipeline(audio_content, audio_name)

        logger.info(f"Обработка файла {audio_name} успешно заверешна. Результат: {prediction.label}.")

        return prediction
    
    except InvalidFileFormat as err:
        logger.info(f"Некорректный входной запрос. {err}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{err}")

    except Exception as err:
        logger.error(f"Ошибка обработки: {err}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{err}")