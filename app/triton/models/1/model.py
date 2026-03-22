import os
import json 

import numpy as np
import torch
import torch.nn as nn 
import torch.nn.init as init
from transformers import Wav2Vec2Model, Wav2Vec2Config

import triton_python_backend_utils as pb_utils



class Wav2Vec2FeatureExtractor(nn.Module):
    def __init__(self, model_config: str):
        """
        Параметры:
            * model_config - путь до json-файла с конфигурацией модели.
        """
        super().__init__()
        
        config = Wav2Vec2Config.from_json_file(model_config)
        self.model = Wav2Vec2Model(config)
            
        self.hidden_size = self.model.config.hidden_size 
        self.num_layers = self.model.config.num_hidden_layers

        
    def forward(self, waveforms: torch.Tensor) -> tuple[torch.Tensor, list[torch.Tensor]]:
        """
        Возвращает:
            * features [batch_size, self.num_layers, 2*self.hidden_size] - статистические векторы для каждого слоя
        """
        # убираем размерность канала за ненадобностью 
        if waveforms.dim() == 3 and waveforms.shape[1] == 1:
            waveforms = waveforms.squeeze(1)
            
        outputs = self.model(
            input_values=waveforms,
            output_hidden_states=True
        )
        
        # первый элемент - это выход CNN энкодера, его мы пропустим
        layer_outputs = outputs.hidden_states[1:]  
        layer_outputs = torch.stack(layer_outputs, dim=1)

        mean_pooled = layer_outputs.mean(dim=2)
        std_pooled = layer_outputs.mean(dim=2)

        features = torch.cat([mean_pooled, std_pooled], dim=-1)
        
        return features



class LayerAttentionPool(nn.Module):
    def __init__(self, features_dim: int, hidden_dim: int = 256):
        super().__init__()
        
        self.layer_attention = nn.Sequential(
            nn.LayerNorm(features_dim),
            nn.Linear(features_dim, hidden_dim),
            nn.GELU(),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid()
        )
        
    def forward(self, features: torch.Tensor) -> torch.Tensor:
        weights = self.layer_attention(features)
        aggregated = (features * weights).sum(dim=1)
        return aggregated
    


class Wav2Vec2DeepfakeDetector(nn.Module):
    def __init__(self, 
                 ssl_model_config: str,
                 attention_dim: int = 256, hidden_dim: int = 256, dropout: float = 0.3):
        super().__init__()

        self.feature_extractor = Wav2Vec2FeatureExtractor(model_config=ssl_model_config)

        features_dim = self.feature_extractor.hidden_size * 2
        
        self.layer_aggregator = LayerAttentionPool(features_dim=features_dim, hidden_dim=attention_dim)
        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Sequential(
            nn.Linear(features_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Linear(hidden_dim, 1)
        )

        self._init_weights(self.layer_aggregator)
        self._init_weights(self.classifier)

        
    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            init.normal_(module.weight, mean=0.0, std=1.0)
            if module.bias is not None:
                init.zeros_(module.bias)
        elif isinstance(module, nn.LayerNorm):
            init.ones_(module.weight)
            init.zeros_(module.bias)

    
    def forward(self, wavs: torch.Tensor):
        features = self.feature_extractor(wavs)
        aggregated = self.layer_aggregator(features)
        logits = self.classifier(self.dropout(aggregated))
        return logits



class TritonPythonModel:
    def initialize(self, args):
        self.device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
        
        model_path = args['model_repository'] + "/" + args['model_version']
        config_path = os.path.join(model_path, "config.json")
        weights_path = os.path.join(model_path, "weights.pt")
        metadata_path = os.path.join(model_path, "metadata.json")
        
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Config file not found at {config_path}")
        
        if not os.path.exists(weights_path):
            raise FileNotFoundError(f"Weights file not found at {weights_path}")
        
        if not os.path.exists(metadata_path):
            raise FileNotFoundError(f"Metadata file not found at {metadata_path}")

        self.model = Wav2Vec2DeepfakeDetector(ssl_model_config=config_path)
        
        checkpoint = torch.load(weights_path, map_location=self.device)['model_state_dict']
        
        self.model.load_state_dict(checkpoint)
            
        self.model.to(self.device)
        self.model.eval() 

        with open(metadata_path, 'r') as metadata_file:
            data = json.load(metadata_file)
            self.metadata = json.dumps(data)


    def execute(self, requests):
        responses = []
        
        for request in requests:
            input_tensor = pb_utils.get_input_tensor_by_name(request, "input_waveform")
            
            if input_tensor is None:
                return pb_utils.InferenceResponse(output_tensors=[], error=pb_utils.TritonError("Missing input"))

            input_np = input_tensor.as_numpy()
            
            input_tensor_torch = torch.from_numpy(input_np).to(self.device).float()
            
            if input_tensor_torch.dim() == 3 and input_tensor_torch.shape[1] == 1:
                input_tensor_torch = input_tensor_torch.squeeze(1)

            with torch.no_grad():
                outputs = self.model(input_tensor_torch)
                probs = torch.sigmoid(outputs)
                output_data = probs.cpu().numpy()

            probas = pb_utils.Tensor("probas", output_data.astype(np.float32))

            metadata_array = np.array([self.metadata.encode('utf-8')], dtype=object)
            metadata = pb_utils.Tensor("metadata", metadata_array)
            
            inference_response = pb_utils.InferenceResponse(output_tensors=[probas, metadata])
            responses.append(inference_response)
            
        return responses