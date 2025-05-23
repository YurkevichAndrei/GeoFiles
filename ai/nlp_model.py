from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification, BertForTokenClassification


class NLPExtractor:
    def __init__(self):
        tokenizer = AutoTokenizer.from_pretrained("botryan96/GeoBERT")
        model = BertForTokenClassification.from_pretrained("botryan96/GeoBERT", from_tf=True)
        self.model = pipeline(
            "ner",
            model=model,
            tokenizer=tokenizer,
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
