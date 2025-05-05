from pydantic import BaseModel
from typing import Optional, Dict, Any, Union


class GeoRequest(BaseModel):
    text: str  # Пример: "Спутниковые снимки на Екатеринбург за 2024 год"


class GeoResponse(BaseModel):
    type_data: str
    polygon: Dict[str, Any]  # GeoJSON
    metadata: Dict[str, Optional[Union[str, int]]]
