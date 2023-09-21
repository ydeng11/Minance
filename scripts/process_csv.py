import argparse
from enum import Enum
import pandas as pd
import re

class BankType(Enum):
    CITI = "CITI"
    AMEX = "AMEX"

def main(file_path, bank_type):
    print(f"Processing file: {file_path} for bank type: {bank_type}")
    data = pd.read_csv(file_path)
    data = process_data(data, bank_type)
    file_path_compoenents = file_path.split("/")
    file_path_compoenents[-1] = "processed_" + file_path_compoenents[-1]
    to_save_path = "/".join(file_path_compoenents)
    print("Save file to " + to_save_path)
    data.to_csv(to_save_path, index=False)

def process_data(data, bank_type):
    if bank_type == BankType.CITI.name:
        return process_citi(data)
    elif bank_type == BankType.AMEX.name:
        return process_amex(data)
    else:
        print(f"Invalid bank type: {bank_type}")
        SystemExit(1)

def process_citi(data):
    data['Amount'] = data['Credit'].combine_first(data['Debit'])
    data["Category"] = data["Description"].apply(extract_citi_category)
    data["Type"] = data["Amount"].apply(lambda x: "Sale" if x > 0 else "Payment")
    data["Post Date"] = data["Date"]
    data["Transaction Date"] = data["Date"]
    data["Memo"] = ""
    return data[["Post Date", "Transaction Date", "Category", "Description","Type", "Amount", "Memo"]]

def extract_citi_category(decription_col):
    description = decription_col.upper()
    if "GAS" in description:
        return 'GAS'
    elif "WHSE" in description:
        return 'Costco Wholesale'
    elif "AUTOPAY" in description:
        return 'Payments'
    elif "MEMBERSHIP" in description:
        return 'Costco Wholesale'
    elif "BILTMORE" in description:
        return 'Restaurants'
    else:
        return "Others"

def process_amex(data):
    data["Category"] = data["Description"].apply(extract_citi_category)
    data["Type"] = data["Amount"].apply(lambda x: "Sale" if x > 0 else "Payment")
    data["Post Date"] = data["Date"]
    data["Transaction Date"] = data["Date"]
    data["Memo"] = ""
    return data[["Post Date", "Transaction Date", "Category", "Description","Type", "Amount", "Memo"]]

def extract_amex_category(row):
    description = row['Description'].upper()
    grocery_pattern = '|'.join(["GROCERY", "SUPERMARKET", "MARKET", "FOODTOWN", "ENSON"])
    if re.search(grocery_pattern, description):
        return "Grocery"
    else:
        return "Others"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Read file path and bank type as arguments")
    parser.add_argument("--file_path", type=str, required=True, help="The path to the file")
    parser.add_argument("--bank_type", type=str, required=True, help="The bank type")

    args = parser.parse_args()
    
    main(args.file_path, args.bank_type)
