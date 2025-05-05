import requests
from geopy.geocoders import Nominatim


class GeoUtils:
    @staticmethod
    def location_to_polygon(location_name: str) -> dict:
        geolocator = Nominatim(user_agent="geoapi")
        location = geolocator.geocode(location_name + ", Россия")
        if not location:
            raise ValueError("Локация не найдена")

        # Получаем полигон через OSM Boundaries API
        osm_url = f"https://nominatim.openstreetmap.org/search.php?q={location_name}&polygon_geojson=1&format=json"
        response = requests.get(osm_url).json()
        return response[0]["geojson"]