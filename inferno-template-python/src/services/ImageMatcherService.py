# services/ImageMatcherService.py
from util.Logger import get_logger
from config.InfernoTemplateConfig import InfernoTemplateConfig

logger = get_logger(__name__)
config = InfernoTemplateConfig()
    
class InfernoTemplateService:
    """Service class to handle image matching operations with proper dependency management"""
    
    def __init__(self):
        pass

# Create a global instance to maintain backward compatibility
_service_instance = None

def get_service():
    """Get the global service instance"""
    global _service_instance
    if _service_instance is None:
        _service_instance = InfernoTemplateService()
    return _service_instance