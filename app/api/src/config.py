from dataclasses import dataclass
from environs import Env 
from pipeline import AudioPreprocessor, TritonClient, DeepfakeDetectionPipeline


@dataclass 
class TritonConfig:
    triton_host: str
    triton_port: int 
    model_name: str 


@dataclass 
class PreprocessingConfig:
    sample_rate: int
    duration: float 


@dataclass
class ApiConfig:
    api_host: str 
    api_port: int 


@dataclass 
class Config:
    triton: TritonConfig
    preprocessing: PreprocessingConfig
    api: ApiConfig 


def load_config() -> Config:
    env = Env()
    env.read_env()

    return Config(
        triton=TritonConfig(
            triton_host=env("TRITON_HOST", "localhost"),
            triton_port=int(env("TRITON_PORT", 8001)),
            model_name=env("MODEL_NAME", "xlsr")
        ),
        preprocessing=PreprocessingConfig(
            sample_rate=int(env("SAMPLE_RATE", 16000)),
            duration=float(env("DURATION", 5.0))
        ),
        api=ApiConfig(
            api_host=env("API_HOST", "0.0.0.0"),
            api_port=int(env("API_PORT", 8000))
        )
    )


def get_pipeline() -> DeepfakeDetectionPipeline:
    config = load_config()

    preprocessor = AudioPreprocessor(
        sample_rate=config.preprocessing.sample_rate, 
        duration_sec=config.preprocessing.duration)
    
    triton_client = TritonClient(
        triton_host=config.triton.triton_host,
        triton_port=config.triton.triton_port,
        model_name=config.triton.model_name
    )

    return DeepfakeDetectionPipeline(preprocessor=preprocessor, triton_client=triton_client)
