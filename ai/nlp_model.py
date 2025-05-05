from transformers import pipeline


class NLPExtractor:
    def __init__(self):
        self.model = pipeline(
            "ner",
            model="bert-base-multilingual-cased",  # или ваша GeoBERTA
            aggregation_strategy="simple"
        )

    def extract_params(self, text: str) -> dict:
        entities = self.model(text)
        params = {
            "type_data": "satellite" if "спутниковые" in text.lower() else "unknown",
            "location": next((e["word"] for e in entities if e["entity_group"] == "LOC"), None),
            "year": int(next((e["word"] for e in entities if e["entity_group"] == "DATE"), 2024))
        }
        return params
