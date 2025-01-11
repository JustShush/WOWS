import requests
import re
import json
import time
from urllib.parse import urlparse

# Webhook URL validation constants
WEBHOOK_VALIDATION = {
    'ID_LENGTH': 17,
    'TOKEN_LENGTH': {'MIN': 60, 'MAX': 80}
}

def is_valid_webhook(url):
    try:
        url_path = urlparse(url).path
        parts = url_path.split('/')

        if len(parts) != 5:
            return False

        empty, api, webhooks, id, token = parts

        if empty != '' or api != 'api' or webhooks != 'webhooks':
            return False

        if not re.match(r'^\d{17,19}$', id):
            return False

        if not re.match(r'^[A-Za-z0-9_-]+$', token):
            return False

        if not (WEBHOOK_VALIDATION['TOKEN_LENGTH']['MIN'] <= len(token) <= WEBHOOK_VALIDATION['TOKEN_LENGTH']['MAX']):
            return False

        if re.match(r'^[X]+$', token) or re.match(r'^[0-9]+$', token) or re.match(r'^[a-zA-Z]+$', token) or re.match(r'^[_-]+$', token):
            return False

        return True
    except Exception:
        return False

def search_grep_webhooks():
    webhooks = set()
    regex_query = 'https:\\/\\/discord\\.com\\/api\\/webhooks\\/\\d+\\/[A-Za-z0-9_-]+'

    headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.8',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1'
    }

    invalid_count = 0
    valid_count = 0
    page = 1

    while True:
        try:
            print(f"Fetching page {page}...")
            url = f"https://grep.app/api/search?q={requests.utils.quote(regex_query)}&regexp=true" + (f"&page={page}" if page > 1 else "")
            response = requests.get(url, headers=headers)

            if response.status_code != 200:
                print(f"Error fetching page {page}: {response.status_code}")
                break

            data = response.json()

            # Check if there are no hits
            if not data.get('hits') or not data['hits'].get('hits') or len(data['hits']['hits']) == 0:
                print(f"\nNo more results found after page {page - 1}")
                break

            for hit in data['hits']['hits']:
                snippet = hit['content']['snippet']
                webhook_regex = r'https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+'
                matches = re.findall(webhook_regex, snippet)
                if matches:
                    for webhook in matches:
                        if is_valid_webhook(webhook):
                            webhooks.add(webhook)
                            valid_count += 1
                        else:
                            invalid_count += 1
                            print(f"Invalid webhook found: {webhook}")

            print(f"Page {page} - Current total valid webhooks: {len(webhooks)}")

            # Add delay between requests
            time.sleep(1)
            page += 1

        except requests.exceptions.RequestException as e:
            print(f"Error fetching page {page}: {e}")
            break

    # Save results
    webhooks_array = list(webhooks)
    output_file = f"discord_webhooks_{time.strftime('%Y-%m-%d')}.json"
    with open(output_file, 'w') as f:
        json.dump(webhooks_array, f, indent=2)

    # Print summary
    print('\nResults Summary:')
    print(f"Total valid webhooks found: {valid_count}")
    print(f"Total invalid webhooks filtered out: {invalid_count}")
    print(f"Unique valid webhooks saved: {len(webhooks_array)}")
    print(f"Saved to: {output_file}")

    # Optional: Print all found webhooks
    print('\nFound webhooks:')
    for webhook in webhooks_array:
        print(webhook)

# Run the search
search_grep_webhooks()
