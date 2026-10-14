def classify(text):
    return "math" if text.startswith("math:") else "general"


def pick_agent(intent):
    return "math-agent" if intent == "math" else "local"


def handle_request(text):
    intent = classify(text)
    return pick_agent(intent)


if __name__ == "__main__":
    print(handle_request("math: 1 + 1"))
