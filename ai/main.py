from fastapi import FastAPI
from schemas import GeoRequest, GeoResponse
from nlp_model import NLPExtractor
from geotools import GeoUtils

app = FastAPI()
nlp = NLPExtractor()
geo = GeoUtils()


@app.post("/parse-geo", response_model=GeoResponse)
async def parse_geo(request: GeoRequest):
    params = nlp.extract_params(request.text)
    polygon = geo.location_to_polygon(params["location"])

    return {
        "type_data": params["type_data"],
        "polygon": polygon,
        "metadata": {
            "location": params["location"],
            "year": params["year"]
        }
    }