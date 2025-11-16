import msal
import os
import requests
import base64

TOKEN_CACHE_FILE = "config/token_cache.json"
SCOPES = ["https://graph.microsoft.com/Mail.Send"]


class OutlookMailer:
    def __init__(self, client_id: str):
        self.client_id = client_id
        self.cache = msal.SerializableTokenCache()

        if os.path.exists(TOKEN_CACHE_FILE):
            self.cache.deserialize(open(TOKEN_CACHE_FILE, "r").read())

        self.app = msal.PublicClientApplication(
            client_id,
            token_cache=self.cache
        )

    def _save_cache(self):
        if self.cache.has_state_changed:
            with open(TOKEN_CACHE_FILE, "w") as f:
                f.write(self.cache.serialize())

    def _get_access_token(self):
        accounts = self.app.get_accounts()

        if accounts:
            result = self.app.acquire_token_silent(SCOPES, account=accounts[0])
            if result and "access_token" in result:
                return result["access_token"]

        # device code
        flow = self.app.initiate_device_flow(scopes=SCOPES)
        print("Go to:", flow["verification_uri"])
        print("Enter:", flow["user_code"])

        result = self.app.acquire_token_by_device_flow(flow)
        if "access_token" not in result:
            raise Exception("Device login failed", result)

        return result["access_token"]

    def send_email(self, to_email: str, subject: str, body: str, attachment_path: str):
        token = self._get_access_token()
        self._save_cache()

        # Encode PDF attachment
        attachment_bytes = open(attachment_path, "rb").read()
        encoded = base64.b64encode(attachment_bytes).decode()

        attachment = {
            "@odata.type": "#microsoft.graph.fileAttachment",
            "name": os.path.basename(attachment_path),
            "contentType": "application/pdf",
            "contentBytes": encoded
        }

        email_data = {
            "message": {
                "subject": subject,
                "body": {"contentType": "Text", "content": body},
                "toRecipients": [{"emailAddress": {"address": to_email}}],
                "attachments": [attachment]
            }
        }

        res = requests.post(
            "https://graph.microsoft.com/v1.0/me/sendMail",
            headers={"Authorization": f"Bearer {token}"},
            json=email_data
        )

        return res.status_code, res.text
