from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import uvicorn
import os

from schemas import GeoRequest, GeoResponse
from nlp_model import NLPExtractor
from geotools import GeoUtils

os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
app = FastAPI()
nlp = NLPExtractor()
geo = GeoUtils()

# origins = [
#     "http://localhost",  # Замените, если ваш фронтенд на другом домене
#     "http://127.0.0.1",
#     "http://localhost:5000",  # Добавьте это если Nginx слушает порт 80, а не 8000
#     "http://127.0.0.1:5000"  # Добавьте это если Nginx слушает порт 80, а не 8000
#     # Добавьте все нужные вам домены
# ]
#
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


@app.post("/parse-geo", response_model=GeoResponse)
async def parse_geo(request: GeoRequest):
    print(request.text)
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

# if __name__ == "__main__":
#     uvicorn.run(app, host="127.0.0.1", port=5000)
