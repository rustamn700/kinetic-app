import httpx
import logging

logger = logging.getLogger(__name__)

class OpenFoodFactsClient:
    URL = "https://world.openfoodfacts.org/cgi/search.pl"

    async def search(self, query: str):
        params = {
            "search_terms": query,
            "search_simple": 1,
            "json": 1,
            "page_size": 1
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                res = await client.get(self.URL, params=params)
                data = res.json()
                if data.get("products"):
                    return data["products"][0]
            except Exception as e:
                logger.error(f"OpenFoodFacts API error: {e}")
        return None