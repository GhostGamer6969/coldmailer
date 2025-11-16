def load_template(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def render_template(template: str, replacements: dict) -> str:
    for key, value in replacements.items():
        template = template.replace(f"[{key}]", value)
    return template
