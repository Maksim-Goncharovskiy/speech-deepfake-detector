import os
import json
import tempfile
import asyncio
import librosa 
import numpy as np 
import tritonclient.grpc as grpcclient
from tritonclient.utils import np_to_triton_dtype
from schemas import ModelThresholds, ModelResponse, ClassLabel, ConfidenceLevel, Prediction


class AudioPreprocessor:
    def __init__(self, sample_rate: int = 16_000, duration_sec: float = 5.0):
        self.sample_rate = sample_rate
        self.duration_sec = duration_sec
        self.n_samples = int(self.sample_rate * self.duration_sec)


    def _load_audio(self, audio_content: bytes, audio_name: str) -> np.ndarray:
        audio_format = audio_name.split('.')[-1]
        
        with tempfile.NamedTemporaryFile(suffix=audio_format, delete=False) as temp_audio_file:
            temp_audio_file.write(audio_content)
        
        audio, _ = librosa.load(temp_audio_file.name, sr=self.sample_rate, mono=True)

        if os.path.exists(temp_audio_file.name):
            os.remove(temp_audio_file.name)

        return audio


    def _change_duration(self, audio: np.ndarray) -> np.ndarray:
        return np.resize(audio, self.n_samples)


    def preprocess(self, audio_content: bytes, audio_name: str):
        audio = self._load_audio(audio_content=audio_content, audio_name=audio_name)
        audio = self._change_duration(audio=audio)
        return np.array([audio])
    


class TritonClient:
    def __init__(self, triton_host: str, triton_port: str, model_name: str):
        self.triton_url = f"{triton_host}:{triton_port}"
        self.model_name = model_name
        self.triton_client = None
    

    async def _configure_client(self):
        if self.triton_client is None:
            self.triton_client = grpcclient.InferenceServerClient(self.triton_url)
    

    async def inference(self, audio: np.ndarray):
        await self._configure_client()

        inputs = []
        inputs.append(grpcclient.InferInput("input_waveform", audio.shape, np_to_triton_dtype(audio.dtype)))
        inputs[0].set_data_from_numpy(audio)

        outputs = []
        outputs.append(grpcclient.InferRequestedOutput("probas"))
        outputs.append(grpcclient.InferRequestedOutput("metadata"))

        response = self.triton_client.infer(
            model_name=self.model_name,
            inputs=inputs,
            outputs=outputs
        )

        proba: float = response.as_numpy("probas")[0][0]
        metadata = response.as_numpy("metadata")[0]

        thresholds = json.loads(metadata)['thresholds']

        return ModelResponse(
            fake_proba=proba, 
            thresholds=ModelThresholds(
                optimal=thresholds["base"],
                fake_low=thresholds["confidence"]["fake"]["low"],
                fake_high=thresholds["confidence"]["fake"]["low"],
                real_low=thresholds["confidence"]["fake"]["low"],
                real_high=thresholds["confidence"]["real"]["high"]
            ))
    


class DeepfakeDetectionPipeline:
    def __init__(self, preprocessor: AudioPreprocessor, triton_client: TritonClient):
        self.preprocessor = preprocessor 
        self.triton_client = triton_client
    
    
    async def __call__(self, audio_content: bytes, audio_name: str):
        audio: np.ndarray = self.preprocessor.preprocess(audio_content, audio_name)
        model_response: ModelResponse = await self.triton_client.inference(audio)

        proba: float = model_response.fake_proba
        threshold = model_response.thresholds.optimal

        label = ClassLabel.fake if proba >= threshold else ClassLabel.real 
        confidence: ConfidenceLevel = None 

        if label == ClassLabel.fake:
            low_threshold = model_response.thresholds.fake_low
            high_threshold = model_response.thresholds.fake_high
            if proba <= low_threshold:
                confidence = ConfidenceLevel.low 
            elif low_threshold < proba < high_threshold:
                confidence = ConfidenceLevel.medium 
            else: 
                confidence = ConfidenceLevel.high
            
        else:
            low_threshold = model_response.thresholds.real_low
            high_threshold = model_response.thresholds.real_high
            if proba >= low_threshold:
                confidence = ConfidenceLevel.low 
            elif high_threshold < proba < low_threshold:
                confidence = ConfidenceLevel.medium 
            else: 
                confidence = ConfidenceLevel.high
        
        return Prediction(label=label, confidence=confidence)