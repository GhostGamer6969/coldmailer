import csv

def load_company_data(path: str):
    entries = []
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            clean = {k.strip(): v.strip() for k, v in row.items()}
            entries.append(clean)
    return entries
