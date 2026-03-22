from enum import Enum
from pydantic import BaseModel


class ModelThresholds(BaseModel):
    """
    Подобранные для модели пороговые значения
    * optimal - порог для разделения двух классов
    * fake_low, fake_high - пороги для интерпретации уверенности модели при предсказании класса fake. 
        optimal < fake_low < fake_high
    * real_low, real_high - пороги для интерпретации уверенности модели при предсказании класса real.
        real_high < real_low < optimal 
    """
    optimal: float 
    fake_low: float
    fake_high: float 
    real_low: float 
    real_high: float
    


class ModelResponse(BaseModel):
    fake_proba: float 
    thresholds: ModelThresholds


class ClassLabel(str, Enum):
    real = "real"
    fake = "fake"


class ConfidenceLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"



class Prediction(BaseModel):
    label: ClassLabel
    confidence: ConfidenceLevel 