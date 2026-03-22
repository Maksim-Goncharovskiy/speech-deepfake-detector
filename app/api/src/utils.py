class InvalidFileFormat(ValueError):
    def __init__(self, file_format: str):
        super().__init__(f"Неподдерживаемый формат аудиофайла: {file_format}") 


def validate_audio_file(audio_name: str):
    audio_format = audio_name.split('.')[-1]
    if audio_format not in {"wav", "mp3", "webm", "ogg", "flac"}:
        raise InvalidFileFormat(file_format=audio_format)